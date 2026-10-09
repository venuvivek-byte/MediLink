// Migration 006: claim + confirm functions, executed on real Postgres.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expectDbError, TestDatabase } from "./harness";
import { hex64 } from "./fixtures";

let db: TestDatabase;
let alice: string;
let bob: string;

beforeAll(async () => {
  db = await TestDatabase.create();
  alice = await db.createUser("alice-pipe@example.test", { display_name: "Alice" });
  bob = await db.createUser("bob-pipe@example.test", { display_name: "Bob" });
}, 60_000);

afterAll(async () => {
  await db?.close();
});

async function newDocument(owner: string, seed: string): Promise<string> {
  return db.asUser(owner, async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      `INSERT INTO public.documents (patient_id, storage_path, original_filename, mime_type, content_sha256)
       VALUES ($1, $2, 'f.pdf', 'application/pdf', $3) RETURNING id`,
      [owner, `${owner}/${seed}/f.pdf`, hex64(seed)]
    );
    return rows[0].id;
  });
}

async function newExtraction(owner: string, documentId: string, status = "succeeded"): Promise<string> {
  return db.asUser(owner, async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      `INSERT INTO public.document_extractions (document_id, patient_id, schema_version, status, ai_provider, ai_model)
       VALUES ($1, $2, '1', $3, 'gemini', 'test') RETURNING id`,
      [documentId, owner, status]
    );
    return rows[0].id;
  });
}

const claim = (owner: string, documentId: string) =>
  db.asUser(owner, (tx) => tx.query("SELECT id, processing_attempts FROM public.claim_document_for_processing($1)", [documentId]));

describe("claim_document_for_processing", () => {
  it("claims a pending document once; a concurrent second claim gets nothing", async () => {
    const doc = await newDocument(alice, "claim1");
    expect((await claim(alice, doc)).rows).toHaveLength(1);
    expect((await claim(alice, doc)).rows).toHaveLength(0);
  });

  it("never lets another patient claim the document", async () => {
    const doc = await newDocument(alice, "claim2");
    expect((await claim(bob, doc)).rows).toHaveLength(0);
    const { rows } = await db.asOwner((d) => d.query("SELECT extraction_status FROM public.documents WHERE id = $1", [doc]));
    expect(rows[0]).toEqual({ extraction_status: "pending" });
  });

  it("allows a retry after failure, up to 3 attempts in total", async () => {
    const doc = await newDocument(alice, "claim3");
    for (let attempt = 1; attempt <= 3; attempt++) {
      expect((await claim(alice, doc)).rows, `attempt ${attempt}`).toHaveLength(1);
      await db.asUser(alice, (tx) => tx.query("UPDATE public.documents SET extraction_status = 'failed' WHERE id = $1", [doc]));
    }
    expect((await claim(alice, doc)).rows).toHaveLength(0);
  });

  it("recovers a run that crashed mid-processing after 10 minutes, not before", async () => {
    const doc = await newDocument(alice, "claim4");
    await claim(alice, doc);
    expect((await claim(alice, doc)).rows).toHaveLength(0);
    await db.asOwner((d) =>
      d.query("UPDATE public.documents SET processing_started_at = now() - interval '11 minutes' WHERE id = $1", [doc])
    );
    expect((await claim(alice, doc)).rows).toHaveLength(1);
  });

  it("does not reprocess a confirmed or cancelled document", async () => {
    const confirmed = await newDocument(alice, "claim5");
    await db.asUser(alice, (tx) => tx.query("UPDATE public.documents SET verification_status = 'verified' WHERE id = $1", [confirmed]));
    expect((await claim(alice, confirmed)).rows).toHaveLength(0);
    const cancelled = await newDocument(alice, "claim6");
    await db.asUser(alice, (tx) => tx.query("UPDATE public.documents SET cancelled_at = now() WHERE id = $1", [cancelled]));
    expect((await claim(alice, cancelled)).rows).toHaveLength(0);
  });
});

const REVIEW = {
  header: { document_type: "prescription", document_date: "2025-10-09", provider_name: "Dr. R. K. Singhal", facility_name: "Care Clinic" },
  medications: [
    { name: "Tab Glimepiride", strength: "1 mg", frequency: "1-0-0", status: null, source_page: 1, source_excerpt: "Tab Glimepiride 1 mg 1-0-0", normalized_name: "glimepiride" },
    { name: "Tab Telmisartan", strength: "40 mg", frequency: "0-0-1", status: "active", source_page: 1, source_excerpt: "Tab Telmisartan 40 mg", normalized_name: "telmisartan" },
  ],
  lab_results: [
    { test_name: "HbA1c", normalized_test_name: "hba1c", value: "7.2", unit: "%", reference_range: "< 5.7 %", result_date: "2025-10-01", source_page: 2, source_excerpt: "HbA1c 7.2 %" },
  ],
  conditions: [{ name: "Type 2 DM", source_page: 1, source_excerpt: "Dx: Type 2 DM" }],
  allergies: [{ substance: "Sulfa drugs", reaction: "rash", source_page: 1, source_excerpt: "Allergy: Sulfa drugs (rash)" }],
};

describe("confirm_extraction", () => {
  it("writes every confirmed record atomically, linked to its source, as patient-reviewed", async () => {
    const doc = await newDocument(alice, "confirm1");
    const ext = await newExtraction(alice, doc);
    await db.asUser(alice, (tx) => tx.query("SELECT public.confirm_extraction($1, $2)", [ext, JSON.stringify(REVIEW)]));

    const q = (sql: string) => db.asUser(alice, (tx) => tx.query(sql, [doc]));
    const meds = await q(
      "SELECT name, status, verification_status, extraction_id IS NOT NULL AS has_ext, source_page, prescriber_name, start_date::text FROM public.medications WHERE source_document_id = $1 ORDER BY name"
    );
    expect(meds.rows).toEqual([
      // No status given: stored as UNKNOWN, never assumed current.
      { name: "Tab Glimepiride", status: "unknown", verification_status: "verified", has_ext: true, source_page: 1, prescriber_name: "Dr. R. K. Singhal", start_date: "2025-10-09" },
      { name: "Tab Telmisartan", status: "active", verification_status: "verified", has_ext: true, source_page: 1, prescriber_name: "Dr. R. K. Singhal", start_date: "2025-10-09" },
    ]);
    const labs = await q("SELECT test_name, result_value, test_date::text, source_excerpt FROM public.lab_results WHERE source_document_id = $1");
    expect(labs.rows).toEqual([{ test_name: "HbA1c", result_value: "7.2", test_date: "2025-10-01", source_excerpt: "HbA1c 7.2 %" }]);
    expect((await q("SELECT count(*)::int n FROM public.conditions WHERE source_document_id = $1")).rows[0]).toEqual({ n: 1 });
    expect((await q("SELECT count(*)::int n FROM public.allergies WHERE source_document_id = $1")).rows[0]).toEqual({ n: 1 });
    expect((await q("SELECT event_type, title FROM public.medical_events WHERE document_id = $1")).rows).toEqual([
      { event_type: "prescription", title: "Prescription — Care Clinic" },
    ]);
    expect((await q("SELECT verification_status, document_date::text FROM public.documents WHERE id = $1")).rows[0]).toEqual({
      verification_status: "verified",
      document_date: "2025-10-09",
    });
    expect(
      (await q("SELECT event_type FROM public.audit_logs WHERE document_id = $1 AND event_type = 'extraction_confirmed'")).rows
    ).toHaveLength(1);
  });

  it("cannot be confirmed twice", async () => {
    const doc = await newDocument(alice, "confirm2");
    const ext = await newExtraction(alice, doc);
    await db.asUser(alice, (tx) => tx.query("SELECT public.confirm_extraction($1, $2)", [ext, JSON.stringify(REVIEW)]));
    expect(
      await expectDbError(db.asUser(alice, (tx) => tx.query("SELECT public.confirm_extraction($1, $2)", [ext, JSON.stringify(REVIEW)])))
    ).toMatch(/not awaiting review/);
  });

  it("another patient cannot confirm (or even see) the extraction", async () => {
    const doc = await newDocument(alice, "confirm3");
    const ext = await newExtraction(alice, doc);
    expect(
      await expectDbError(db.asUser(bob, (tx) => tx.query("SELECT public.confirm_extraction($1, $2)", [ext, JSON.stringify(REVIEW)])))
    ).toMatch(/not awaiting review/);
    const { rows } = await db.asOwner((d) => d.query("SELECT count(*)::int n FROM public.medications WHERE patient_id = $1", [bob]));
    expect(rows[0]).toEqual({ n: 0 });
  });

  it("is all-or-nothing: one invalid record rolls back everything", async () => {
    const doc = await newDocument(alice, "confirm4");
    const ext = await newExtraction(alice, doc);
    const bad = { ...REVIEW, medications: [...REVIEW.medications, { name: "Bad", status: "current", source_page: 1 }] };
    expect(
      await expectDbError(db.asUser(alice, (tx) => tx.query("SELECT public.confirm_extraction($1, $2)", [ext, JSON.stringify(bad)])))
    ).toMatch(/medications_status_check/);
    const counts = await db.asOwner((d) =>
      d.query<{ meds: number; labs: number; status: string }>(
        `SELECT (SELECT count(*)::int FROM public.medications WHERE source_document_id = $1) meds,
                (SELECT count(*)::int FROM public.lab_results WHERE source_document_id = $1) labs,
                (SELECT status FROM public.document_extractions WHERE id = $2) status`,
        [doc, ext]
      )
    );
    expect(counts.rows[0]).toEqual({ meds: 0, labs: 0, status: "succeeded" });
  });

  it("refuses extractions that failed or were cancelled", async () => {
    const doc = await newDocument(alice, "confirm5");
    const ext = await newExtraction(alice, doc, "failed");
    expect(
      await expectDbError(db.asUser(alice, (tx) => tx.query("SELECT public.confirm_extraction($1, $2)", [ext, JSON.stringify(REVIEW)])))
    ).toMatch(/not awaiting review/);
  });

  it("is not callable by anonymous users", async () => {
    expect(
      await expectDbError(db.asAnon((tx) => tx.query("SELECT public.confirm_extraction(gen_random_uuid(), '{}')")))
    ).toMatch(/permission denied/);
  });
});
