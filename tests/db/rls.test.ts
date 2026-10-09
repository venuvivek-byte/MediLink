// Row Level Security and privilege tests against the REAL migration files,
// executed by a real Postgres (PGlite) with a Supabase platform shim.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expectDbError, TestDatabase } from "./harness";
import { BCRYPT_LIKE, hex64, seedPatient, type PatientRecords } from "./fixtures";

let db: TestDatabase;
let a: PatientRecords;
let b: PatientRecords;

beforeAll(async () => {
  db = await TestDatabase.create();
  a = await seedPatient(db, "alice@example.test");
  b = await seedPatient(db, "bob@example.test");
}, 60_000);

afterAll(async () => {
  await db?.close();
});

// [table, id column, id of A's row]
const TABLES = () =>
  [
    ["profiles", "user_id", a.userId],
    ["documents", "id", a.documentId],
    ["document_extractions", "id", a.extractionId],
    ["document_pages", "document_id", a.documentId],
    ["medications", "id", a.medicationId],
    ["lab_results", "id", a.labId],
    ["conditions", "id", a.conditionId],
    ["allergies", "id", a.allergyId],
    ["medical_events", "id", a.eventId],
    ["record_shares", "id", a.shareId],
    ["emergency_access", "id", a.emergencyId],
  ] as const;

const PATIENT_TABLES = [
  "profiles",
  "documents",
  "document_extractions",
  "document_pages",
  "medications",
  "lab_results",
  "conditions",
  "allergies",
  "medical_events",
  "record_shares",
  "emergency_access",
  "audit_logs",
  "share_access_logs",
];

describe("cross-patient isolation", () => {
  it("B cannot SELECT any of A's rows, in any table", async () => {
    for (const [table, col, id] of TABLES()) {
      const { rows } = await db.asUser(b.userId, (tx) => tx.query(`SELECT 1 FROM public.${table} WHERE ${col} = $1`, [id]));
      expect(rows, table).toHaveLength(0);
    }
  });

  it("B sees exactly their own rows and nothing else", async () => {
    for (const [table] of TABLES()) {
      const owner = table === "profiles" ? "user_id" : "patient_id";
      const { rows } = await db.asUser(b.userId, (tx) =>
        tx.query<{ owner: string }>(`SELECT DISTINCT ${owner}::text AS owner FROM public.${table}`)
      );
      expect(rows.map((r) => r.owner), table).toEqual([b.userId]);
    }
  });

  it("B's UPDATE and DELETE against A's rows affect 0 rows", async () => {
    const mutable = ["documents", "medications", "lab_results", "conditions", "allergies", "medical_events"];
    for (const table of mutable) {
      const id = TABLES().find(([t]) => t === table)![2];
      const updated = await db.asUser(b.userId, (tx) =>
        tx.query(`UPDATE public.${table} SET verification_status = 'verified' WHERE id = $1`, [id])
      );
      const deleted = await db.asUser(b.userId, (tx) => tx.query(`DELETE FROM public.${table} WHERE id = $1`, [id]));
      expect(updated.affectedRows, `${table} update`).toBe(0);
      expect(deleted.affectedRows, `${table} delete`).toBe(0);
    }
    const profile = await db.asUser(b.userId, (tx) =>
      tx.query("UPDATE public.profiles SET display_name = 'pwned' WHERE user_id = $1", [a.userId])
    );
    expect(profile.affectedRows).toBe(0);
  });

  it("B cannot INSERT rows owned by A", async () => {
    const message = await expectDbError(
      db.asUser(b.userId, (tx) =>
        tx.query("INSERT INTO public.allergies (patient_id, substance) VALUES ($1, 'x')", [a.userId])
      )
    );
    expect(message).toMatch(/row-level security/);
  });

  it("B cannot move their own row to A (UPDATE ... SET patient_id)", async () => {
    const message = await expectDbError(
      db.asUser(b.userId, (tx) =>
        tx.query("UPDATE public.allergies SET patient_id = $1 WHERE id = $2", [a.userId, b.allergyId])
      )
    );
    expect(message).toMatch(/row-level security/);
  });

  it("B cannot link their own record to A's document or extraction (same-patient FKs)", async () => {
    const viaDocument = await expectDbError(
      db.asUser(b.userId, (tx) =>
        tx.query("INSERT INTO public.medications (patient_id, source_document_id, name) VALUES ($1, $2, 'x')", [
          b.userId,
          a.documentId,
        ])
      )
    );
    expect(viaDocument).toMatch(/foreign key/);
    const viaExtraction = await expectDbError(
      db.asUser(b.userId, (tx) =>
        tx.query("INSERT INTO public.lab_results (patient_id, extraction_id, test_name) VALUES ($1, $2, 'x')", [
          b.userId,
          a.extractionId,
        ])
      )
    );
    expect(viaExtraction).toMatch(/foreign key/);
  });

  it("a document row cannot point into another patient's storage folder", async () => {
    const message = await expectDbError(
      db.asUser(b.userId, (tx) =>
        tx.query(
          "INSERT INTO public.documents (patient_id, storage_path, original_filename, mime_type) VALUES ($1, $2, 'x.pdf', 'application/pdf')",
          [b.userId, `${a.userId}/stolen/x.pdf`]
        )
      )
    );
    expect(message).toMatch(/documents_storage_path_owner_check/);
  });
});

describe("anonymous (not signed in) access", () => {
  it("anon has no privileges on any patient table", async () => {
    for (const table of PATIENT_TABLES) {
      const message = await expectDbError(db.asAnon((tx) => tx.query(`SELECT 1 FROM public.${table} LIMIT 1`)));
      expect(message, table).toMatch(/permission denied/);
    }
  });

  it("anon cannot read storage objects or write audit events", async () => {
    const { rows } = await db.asAnon((tx) => tx.query("SELECT 1 FROM storage.objects"));
    expect(rows).toHaveLength(0);
    const message = await expectDbError(
      db.asAnon((tx) => tx.query("SELECT public.record_audit_event('share_created')"))
    );
    expect(message).toMatch(/permission denied/);
  });
});

describe("secrets are not readable through the API roles", () => {
  it("token and PIN hashes cannot be selected, even for the owner's own share", async () => {
    for (const sql of [
      "SELECT token_hash FROM public.record_shares",
      "SELECT pin_hash FROM public.record_shares",
      "SELECT * FROM public.record_shares",
      "SELECT token_hash FROM public.emergency_access",
    ]) {
      const message = await expectDbError(db.asUser(a.userId, (tx) => tx.query(sql)));
      expect(message, sql).toMatch(/permission denied/);
    }
  });

  it("the owner can read the non-secret share columns", async () => {
    const { rows } = await db.asUser(a.userId, (tx) =>
      tx.query("SELECT id, label, expires_at, revoked_at, failed_pin_attempts FROM public.record_shares")
    );
    expect(rows).toHaveLength(1);
  });

  it("patients cannot change hashes, attempt counters or lockouts", async () => {
    for (const set of [
      `pin_hash = '${BCRYPT_LIKE}'`,
      `token_hash = '${hex64("f")}'`,
      "failed_pin_attempts = 0",
      "locked_until = NULL",
      "expires_at = now() + interval '80 days'",
    ]) {
      const message = await expectDbError(
        db.asUser(a.userId, (tx) => tx.query(`UPDATE public.record_shares SET ${set} WHERE id = $1`, [a.shareId]))
      );
      expect(message, set).toMatch(/permission denied/);
    }
  });
});

describe("revocation", () => {
  it("is one-way and stamped with the server clock", async () => {
    const fresh = await seedPatient(db, "carol@example.test");
    await db.asUser(fresh.userId, (tx) =>
      tx.query("UPDATE public.record_shares SET revoked_at = '2000-01-01' WHERE id = $1", [fresh.shareId])
    );
    const { rows } = await db.asOwner((d) =>
      d.query<{ recent: boolean }>("SELECT revoked_at > now() - interval '1 minute' AS recent FROM public.record_shares WHERE id = $1", [
        fresh.shareId,
      ])
    );
    expect(rows[0].recent).toBe(true);

    const message = await expectDbError(
      db.asUser(fresh.userId, (tx) =>
        tx.query("UPDATE public.record_shares SET revoked_at = NULL WHERE id = $1", [fresh.shareId])
      )
    );
    expect(message).toMatch(/cannot be reactivated/);
  });

  it("applies to emergency links too, and only one live emergency link exists per patient", async () => {
    const message = await expectDbError(
      db.asUser(a.userId, (tx) =>
        tx.query(
          `INSERT INTO public.emergency_access (patient_id, token_hash, consent_given_at, expires_at)
           VALUES ($1, $2, now(), now() + interval '1 day')`,
          [a.userId, hex64("e2")]
        )
      )
    );
    expect(message).toMatch(/emergency_access_one_live/);
  });
});

describe("audit log", () => {
  it("patients may append their own patient events, and nothing else", async () => {
    // Allowed: own id, patient event type, own document.
    await db.asUser(a.userId, (tx) =>
      tx.query("INSERT INTO public.audit_logs (patient_id, document_id, event_type) VALUES ($1, $2, 'document_uploaded')", [
        a.userId,
        a.documentId,
      ])
    );
    const rejected: [string, string, unknown[]][] = [
      ["for another patient", "INSERT INTO public.audit_logs (patient_id, event_type) VALUES ($1, 'share_created')", [b.userId]],
      ["a clinician access event", "INSERT INTO public.audit_logs (patient_id, event_type) VALUES ($1, 'share_accessed')", [a.userId]],
      ["referencing another patient's document", "INSERT INTO public.audit_logs (patient_id, document_id, event_type) VALUES ($1, $2, 'document_uploaded')", [a.userId, b.documentId]],
      ["referencing another patient's share", "INSERT INTO public.audit_logs (patient_id, share_id, event_type) VALUES ($1, $2, 'share_revoked')", [a.userId, b.shareId]],
    ];
    for (const [label, sql, params] of rejected) {
      expect(await expectDbError(db.asUser(a.userId, (tx) => tx.query(sql, params))), label).toMatch(/row-level security/);
    }
  });

  it("audit rows cannot be backdated, edited or deleted", async () => {
    expect(
      await expectDbError(
        db.asUser(a.userId, (tx) =>
          tx.query("INSERT INTO public.audit_logs (patient_id, event_type, created_at) VALUES ($1, 'share_created', '2000-01-01')", [a.userId])
        )
      )
    ).toMatch(/permission denied/);
    expect(
      await expectDbError(db.asUser(a.userId, (tx) => tx.query("UPDATE public.audit_logs SET event_type = 'x'")))
    ).toMatch(/permission denied/);
    expect(await expectDbError(db.asUser(a.userId, (tx) => tx.query("DELETE FROM public.audit_logs")))).toMatch(
      /permission denied/
    );
  });

  it("record_audit_event stamps the caller's own id", async () => {
    const id = await db.asUser(a.userId, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        "SELECT public.record_audit_event('document_uploaded', $1, NULL, '{\"filename\":\"rx.pdf\"}') AS id",
        [a.documentId]
      );
      return rows[0].id;
    });
    const { rows } = await db.asOwner((d) =>
      d.query<{ patient_id: string }>("SELECT patient_id FROM public.audit_logs WHERE id = $1", [id])
    );
    expect(rows[0].patient_id).toBe(a.userId);
    const seenByB = await db.asUser(b.userId, (tx) => tx.query("SELECT 1 FROM public.audit_logs WHERE id = $1", [id]));
    expect(seenByB.rows).toHaveLength(0);
  });

  it("record_audit_event rejects other patients' documents/shares and clinician event types", async () => {
    expect(
      await expectDbError(
        db.asUser(b.userId, (tx) => tx.query("SELECT public.record_audit_event('document_uploaded', $1)", [a.documentId]))
      )
    ).toMatch(/row-level security/);
    expect(
      await expectDbError(
        db.asUser(b.userId, (tx) => tx.query("SELECT public.record_audit_event('share_revoked', NULL, $1)", [a.shareId]))
      )
    ).toMatch(/row-level security/);
    expect(
      await expectDbError(db.asUser(a.userId, (tx) => tx.query("SELECT public.record_audit_event('share_accessed')")))
    ).toMatch(/row-level security/);
  });

  it("access logs are written only by the service role and must match the share owner", async () => {
    expect(
      await expectDbError(
        db.asUser(a.userId, (tx) =>
          tx.query("INSERT INTO public.share_access_logs (patient_id, share_id, outcome) VALUES ($1, $2, 'granted')", [
            a.userId,
            a.shareId,
          ])
        )
      )
    ).toMatch(/permission denied/);

    await db.asService((tx) =>
      tx.query("INSERT INTO public.share_access_logs (patient_id, share_id, outcome) VALUES ($1, $2, 'pin_failed')", [
        a.userId,
        a.shareId,
      ])
    );
    expect(
      await expectDbError(
        db.asService((tx) =>
          tx.query("INSERT INTO public.share_access_logs (patient_id, share_id, outcome) VALUES ($1, $2, 'granted')", [
            b.userId,
            a.shareId,
          ])
        )
      )
    ).toMatch(/foreign key/);

    const own = await db.asUser(a.userId, (tx) => tx.query("SELECT 1 FROM public.share_access_logs"));
    const other = await db.asUser(b.userId, (tx) => tx.query("SELECT 1 FROM public.share_access_logs"));
    expect(own.rows.length).toBeGreaterThan(0);
    expect(other.rows).toHaveLength(0);
  });
});

describe("storage.objects", () => {
  it("B cannot list, read or delete A's files", async () => {
    const seen = await db.asUser(b.userId, (tx) =>
      tx.query("SELECT 1 FROM storage.objects WHERE name = $1", [a.objectName])
    );
    expect(seen.rows).toHaveLength(0);
    const deleted = await db.asUser(b.userId, (tx) => tx.query("DELETE FROM storage.objects WHERE name = $1", [a.objectName]));
    expect(deleted.affectedRows).toBe(0);
  });

  it("B cannot upload into A's folder or into another bucket", async () => {
    for (const [bucket, name] of [
      ["medical-documents", `${a.userId}/x/evil.pdf`],
      ["other-bucket", `${b.userId}/x/file.pdf`],
    ]) {
      const message = await expectDbError(
        db.asUser(b.userId, (tx) =>
          tx.query("INSERT INTO storage.objects (bucket_id, name, owner) VALUES ($1, $2, $3)", [bucket, name, b.userId])
        )
      );
      expect(message).toMatch(/row-level security|foreign key/);
    }
  });

  it("nobody but the service role can overwrite an uploaded original", async () => {
    const updated = await db.asUser(a.userId, (tx) =>
      tx.query("UPDATE storage.objects SET metadata = '{}' WHERE name = $1", [a.objectName])
    );
    expect(updated.affectedRows).toBe(0);
  });

  it("the bucket is private with a 5 MB PDF/JPEG/PNG limit", async () => {
    const { rows } = await db.asOwner((d) =>
      d.query<{ public: boolean; file_size_limit: number; allowed_mime_types: string[] }>(
        "SELECT public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'medical-documents'"
      )
    );
    expect(rows[0]).toEqual({
      public: false,
      file_size_limit: 5242880,
      allowed_mime_types: ["application/pdf", "image/jpeg", "image/png"],
    });
  });
});

describe("functions exposed to the API", () => {
  it("rls_auto_enable is not callable by anon or authenticated", async () => {
    expect(await expectDbError(db.asAnon((tx) => tx.query("SELECT public.rls_auto_enable()")))).toMatch(
      /permission denied/
    );
    expect(
      await expectDbError(db.asUser(a.userId, (tx) => tx.query("SELECT public.rls_auto_enable()")))
    ).toMatch(/permission denied/);
  });

  it("no function callable by API roles runs with elevated (SECURITY DEFINER) rights", async () => {
    const { rows } = await db.asOwner((d) =>
      d.query<{ fn: string }>(
        `SELECT p.oid::regprocedure::text AS fn
         FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.prosecdef
           AND (has_function_privilege('anon', p.oid, 'EXECUTE')
             OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))`
      )
    );
    expect(rows).toEqual([]);
  });

  it("handle_new_user cannot be called directly", async () => {
    expect(
      await expectDbError(db.asUser(a.userId, (tx) => tx.query("SELECT public.handle_new_user()")))
    ).toMatch(/permission denied|trigger functions can only be called as triggers/);
  });
});
