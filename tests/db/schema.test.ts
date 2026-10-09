// Constraint, trigger and data-migration behaviour of the real migrations.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expectDbError, TestDatabase } from "./harness";
import { hex64, seedPatient, type PatientRecords } from "./fixtures";

let db: TestDatabase;
let a: PatientRecords;

beforeAll(async () => {
  db = await TestDatabase.create();
  a = await seedPatient(db, "dana@example.test");
}, 60_000);

afterAll(async () => {
  await db?.close();
});

const asA = (sql: string, params: unknown[] = []) => db.asUser(a.userId, (tx) => tx.query(sql, params));

describe("automatic profile creation", () => {
  it("creates a profile for every new user, with a cleaned display name", async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ display_name: "  Ana\u0007 Rao  " }, "Ana Rao"],
      [{ display_name: "" }, "Patient"],
      [{}, "Patient"],
      [{ display_name: "x".repeat(300) }, "x".repeat(120)],
      // Google OAuth metadata shape
      [{ full_name: "Ravi Kumar", name: "Ravi K", avatar_url: "https://x" }, "Ravi Kumar"],
      [{ name: "Meera" }, "Meera"],
      [{ display_name: "   ", full_name: "Fallback Name" }, "Fallback Name"],
    ];
    for (const [meta, expected] of cases) {
      const id = await db.createUser(`${crypto.randomUUID()}@example.test`, meta);
      const { rows } = await db.asUser(id, (tx) =>
        tx.query<{ display_name: string }>("SELECT display_name FROM public.profiles")
      );
      expect(rows, JSON.stringify(meta)).toEqual([{ display_name: expected }]);
    }
  });
});

describe("value constraints", () => {
  it.each([
    ["medications status 'current'", "UPDATE public.medications SET status = 'current'"],
    ["verification_status outside the two allowed values", "UPDATE public.allergies SET verification_status = 'Verified'"],
    ["verification_status NULL", "UPDATE public.allergies SET verification_status = NULL"],
    ["file larger than 5 MB", "UPDATE public.documents SET size_bytes = 5242881"],
    ["unsupported MIME type", "UPDATE public.documents SET mime_type = 'text/html'"],
    ["unknown document type", "UPDATE public.documents SET document_type = 'selfie'"],
    ["malformed SHA-256", "UPDATE public.documents SET content_sha256 = 'abc'"],
    ["medication ending before it started", "UPDATE public.medications SET start_date = '2025-02-01', end_date = '2025-01-01'"],
    ["blank medication name", "UPDATE public.medications SET name = '   '"],
    ["source page out of range", "UPDATE public.lab_results SET source_page = 0"],
    ["invalid blood group", "UPDATE public.profiles SET blood_group = 'Z+'"],
    ["blank display name", "UPDATE public.profiles SET display_name = ' '"],
  ])("rejects %s", async (_label, sql) => {
    expect(await expectDbError(asA(sql))).toMatch(/violates (check|not-null) constraint/);
  });

  it("rejects importing the same file twice for the same patient", async () => {
    const message = await expectDbError(
      asA(
        `INSERT INTO public.documents (patient_id, storage_path, original_filename, mime_type, content_sha256)
         SELECT patient_id, patient_id || '/doc-2/x.pdf', 'copy.pdf', 'application/pdf', content_sha256
         FROM public.documents WHERE id = $1`,
        [a.documentId]
      )
    );
    expect(message).toMatch(/documents_patient_sha256_unique/);
  });

  it("rejects share links without a valid hash, scope or bounded expiry", async () => {
    const insert = (tokenHash: string, pinHash: string, scope: string, expiry: string) =>
      asA(
        `INSERT INTO public.record_shares (patient_id, token_hash, pin_hash, scope, expires_at)
         VALUES ($1, $2, $3, $4::jsonb, now() + $5::interval)`,
        [a.userId, tokenHash, pinHash, scope, expiry]
      );
    const okScope = '{"categories":[]}';
    const okPin = "$2b$12$" + "y".repeat(53);
    expect(await expectDbError(insert("raw-token", okPin, okScope, "1 day"))).toMatch(/token_hash_check/);
    expect(await expectDbError(insert(hex64("1"), "123456", okScope, "1 day"))).toMatch(/pin_hash_check/);
    expect(await expectDbError(insert(hex64("2"), okPin, '{"categories":"all"}', "1 day"))).toMatch(/scope_check/);
    expect(await expectDbError(insert(hex64("3"), okPin, okScope, "91 days"))).toMatch(/expiry_check/);
    expect(await expectDbError(insert(hex64("4"), okPin, okScope, "-1 day"))).toMatch(/expiry_check/);
  });

  it("emergency links show nothing unless the patient opts in", async () => {
    const { rows } = await asA(
      "SELECT show_blood_group, show_date_of_birth, show_conditions, show_emergency_contact, medication_ids FROM public.emergency_access"
    );
    expect(rows[0]).toEqual({
      show_blood_group: false,
      show_date_of_birth: false,
      show_conditions: false,
      show_emergency_contact: false,
      medication_ids: [],
    });
  });
});

describe("traceability and timestamps", () => {
  it("deleting a source document keeps the record but clears only the link", async () => {
    const fresh = await seedPatient(db, `${crypto.randomUUID()}@example.test`);
    await db.asUser(fresh.userId, (tx) => tx.query("DELETE FROM public.documents WHERE id = $1", [fresh.documentId]));
    const { rows } = await db.asUser(fresh.userId, (tx) =>
      tx.query<{ patient_id: string; source_document_id: string | null }>(
        "SELECT patient_id, source_document_id FROM public.medications WHERE id = $1",
        [fresh.medicationId]
      )
    );
    expect(rows).toEqual([{ patient_id: fresh.userId, source_document_id: null }]);
  });

  it("updated_at moves on update", async () => {
    await db.asOwner((d) => d.query("UPDATE public.allergies SET updated_at = '2000-01-01' WHERE id = $1", [a.allergyId]));
    await asA("UPDATE public.allergies SET reaction = 'rash' WHERE id = $1", [a.allergyId]);
    const { rows } = await asA("SELECT updated_at > '2001-01-01' AS moved FROM public.allergies WHERE id = $1", [a.allergyId]);
    expect(rows[0]).toEqual({ moved: true });
  });
});

describe("upgrading a database that already has 001/002 data (like the hosted project)", () => {
  it("normalises legacy values and backfills profiles without losing rows", async () => {
    const legacy = await TestDatabase.create({ upTo: "002_storage.sql" });
    const uid = await legacy.asOwner(async (d) => {
      const { rows } = await d.query<{ id: string }>("INSERT INTO auth.users (email) VALUES ('legacy@example.test') RETURNING id");
      const id = rows[0].id;
      await d.query(
        `INSERT INTO public.documents (patient_id, storage_path, original_filename, mime_type, extraction_status, verification_status, metadata)
         VALUES ($1, $2, 'a.pdf', 'application/pdf', 'done', NULL, '{"facility":"Apollo"}')`,
        [id, `${id}/a.pdf`]
      );
      await d.query(
        `INSERT INTO public.medications (patient_id, name, status, verification_status, metadata)
         VALUES ($1, 'Metformin', 'current', 'weird', '{"provider":"Dr. Nair"}'), ($1, 'Amlodipine', NULL, 'verified', NULL)`,
        [id]
      );
      return id;
    });

    await legacy.applyMigrations({ from: "003" });

    const { rows: docs } = await legacy.asOwner((d) =>
      d.query("SELECT extraction_status, verification_status, facility_name FROM public.documents")
    );
    expect(docs).toEqual([{ extraction_status: "completed", verification_status: "unverified", facility_name: "Apollo" }]);

    const { rows: meds } = await legacy.asOwner((d) =>
      d.query("SELECT name, status, verification_status, prescriber_name FROM public.medications ORDER BY name")
    );
    expect(meds).toEqual([
      { name: "Amlodipine", status: "unknown", verification_status: "verified", prescriber_name: null },
      { name: "Metformin", status: "active", verification_status: "unverified", prescriber_name: "Dr. Nair" },
    ]);

    const { rows: profiles } = await legacy.asOwner((d) =>
      d.query("SELECT display_name FROM public.profiles WHERE user_id = $1", [uid])
    );
    expect(profiles).toEqual([{ display_name: "Patient" }]);
    await legacy.close();
  }, 60_000);
});

describe("supabase/scripts/remove-demo-seed.sql", () => {
  it("removes only the seeded demo user, and all of their rows with it", async () => {
    const { readFileSync } = await import("node:fs");
    const fresh = await TestDatabase.create();
    await fresh.asOwner((d) =>
      d.query(
        "INSERT INTO auth.users (id, email) VALUES ('a0000000-0000-0000-0000-000000000001', 'ananya.rao@example.com')"
      )
    );
    const seeded = "a0000000-0000-0000-0000-000000000001";
    await fresh.asUser(seeded, (tx) =>
      tx.query("INSERT INTO public.medications (patient_id, name, status) VALUES ($1, 'Metformin 500mg', 'active')", [seeded])
    );
    const other = await seedPatient(fresh, "keep-me@example.test");

    await fresh.asOwner((d) => d.exec(readFileSync("supabase/scripts/remove-demo-seed.sql", "utf8")));

    const count = async (sql: string, params: unknown[]) =>
      (await fresh.asOwner((d) => d.query<{ n: number }>(sql, params))).rows[0].n;
    expect(await count("SELECT count(*)::int n FROM auth.users WHERE id = $1", [seeded])).toBe(0);
    expect(await count("SELECT count(*)::int n FROM public.profiles WHERE user_id = $1", [seeded])).toBe(0);
    expect(await count("SELECT count(*)::int n FROM public.medications WHERE patient_id = $1", [seeded])).toBe(0);
    expect(await count("SELECT count(*)::int n FROM public.medications WHERE patient_id = $1", [other.userId])).toBe(1);
    expect(await count("SELECT count(*)::int n FROM auth.users", [])).toBe(1);
    await fresh.close();
  }, 60_000);
});
