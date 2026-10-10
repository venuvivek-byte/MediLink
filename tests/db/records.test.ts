// Migration 007: record management functions and duplicate decisions,
// executed on real Postgres with RLS.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expectDbError, TestDatabase } from "./harness";
import { seedPatient, type PatientRecords } from "./fixtures";

let db: TestDatabase;
let alice: PatientRecords;
let bob: PatientRecords;

beforeAll(async () => {
  db = await TestDatabase.create();
  alice = await seedPatient(db, "alice-records@example.test");
  bob = await seedPatient(db, "bob-records@example.test");
}, 60_000);

afterAll(async () => {
  await db?.close();
});

const as = (user: PatientRecords, sql: string, params: unknown[] = []) => db.asUser(user.userId, (tx) => tx.query(sql, params));
const owner = <T>(sql: string, params: unknown[] = []) => db.asOwner((d) => d.query<T>(sql, params));

async function newMedication(user: PatientRecords, name: string): Promise<string> {
  const { rows } = await as(
    user,
    "INSERT INTO public.medications (patient_id, name, status) VALUES ($1, $2, 'unknown') RETURNING id",
    [user.userId, name]
  );
  return (rows[0] as { id: string }).id;
}

async function auditCount(user: PatientRecords, eventType: string): Promise<number> {
  const { rows } = await owner<{ n: number }>(
    "SELECT count(*)::int n FROM public.audit_logs WHERE patient_id = $1 AND event_type = $2",
    [user.userId, eventType]
  );
  return rows[0].n;
}

describe("update_medication", () => {
  it("lets the patient set status and dates, and audits the change in the same transaction", async () => {
    const id = await newMedication(alice, "Tab Amlodipine 5 mg");
    const before = await auditCount(alice, "record_edited");
    await as(alice, "SELECT public.update_medication($1, 'active', '2025-11-05', NULL)", [id]);

    const { rows } = await owner("SELECT status, start_date::text, end_date FROM public.medications WHERE id = $1", [id]);
    expect(rows[0]).toEqual({ status: "active", start_date: "2025-11-05", end_date: null });
    expect(await auditCount(alice, "record_edited")).toBe(before + 1);
    const audit = await owner<{ metadata: unknown }>(
      "SELECT metadata FROM public.audit_logs WHERE patient_id = $1 AND event_type = 'record_edited' ORDER BY created_at DESC LIMIT 1",
      [alice.userId]
    );
    // Only the status names: no medicine name or other clinical text in the log.
    expect(audit.rows[0].metadata).toEqual({ kind: "medication", status_from: "unknown", status_to: "active" });
  });

  it("rejects an unknown status and an end date before the start date", async () => {
    const id = await newMedication(alice, "Tab X");
    expect(await expectDbError(as(alice, "SELECT public.update_medication($1, 'current', NULL, NULL)", [id]))).toMatch(/Invalid medication status/);
    expect(
      await expectDbError(as(alice, "SELECT public.update_medication($1, 'discontinued', '2025-05-02', '2025-05-01')", [id]))
    ).toMatch(/End date is before start date/);
  });

  it("another patient cannot change it, and nothing is audited for them", async () => {
    const before = await auditCount(bob, "record_edited");
    expect(
      await expectDbError(as(bob, "SELECT public.update_medication($1, 'discontinued', NULL, NULL)", [alice.medicationId]))
    ).toMatch(/Medication not found/);
    const { rows } = await owner("SELECT status FROM public.medications WHERE id = $1", [alice.medicationId]);
    expect(rows[0]).toEqual({ status: "active" });
    expect(await auditCount(bob, "record_edited")).toBe(before);
  });

  it("is not callable without signing in", async () => {
    expect(
      await expectDbError(db.asAnon((tx) => tx.query("SELECT public.update_medication($1, 'active', NULL, NULL)", [alice.medicationId])))
    ).toMatch(/permission denied/);
  });
});

describe("delete_health_record", () => {
  it.each(["medication", "lab_result", "condition", "allergy", "medical_event"] as const)(
    "deletes the patient's own %s and audits it",
    async (kind) => {
      const user = await seedPatient(db, `del-${kind}@example.test`);
      const id = {
        medication: user.medicationId,
        lab_result: user.labId,
        condition: user.conditionId,
        allergy: user.allergyId,
        medical_event: user.eventId,
      }[kind];
      await as(user, "SELECT public.delete_health_record($1, $2)", [kind, id]);
      const table = { medication: "medications", lab_result: "lab_results", condition: "conditions", allergy: "allergies", medical_event: "medical_events" }[kind];
      expect((await owner(`SELECT 1 FROM public.${table} WHERE id = $1`, [id])).rows).toHaveLength(0);
      const audit = await owner<{ metadata: unknown }>(
        "SELECT metadata FROM public.audit_logs WHERE patient_id = $1 AND event_type = 'record_deleted'",
        [user.userId]
      );
      expect(audit.rows).toEqual([{ metadata: { kind } }]);
    }
  );

  it("another patient cannot delete it", async () => {
    expect(await expectDbError(as(bob, "SELECT public.delete_health_record('lab_result', $1)", [alice.labId]))).toMatch(/Record not found/);
    expect((await owner("SELECT 1 FROM public.lab_results WHERE id = $1", [alice.labId])).rows).toHaveLength(1);
  });

  it("rejects an unknown kind (no dynamic SQL is ever built from it)", async () => {
    expect(
      await expectDbError(as(alice, "SELECT public.delete_health_record('profiles; DROP TABLE x', $1)", [alice.labId]))
    ).toMatch(/Invalid record kind/);
  });

  it("removes duplicate decisions that referred to the deleted record", async () => {
    const a = await newMedication(alice, "Tab Y 1");
    const b = await newMedication(alice, "Tab Y 2");
    await as(alice, "SELECT public.dismiss_duplicate('medication', $1)", [[a, b]]);
    await as(alice, "SELECT public.delete_health_record('medication', $1)", [a]);
    const { rows } = await owner("SELECT 1 FROM public.duplicate_decisions WHERE $1 = ANY (record_ids)", [b]);
    expect(rows).toHaveLength(0);
  });
});

describe("dismiss_duplicate", () => {
  it("stores the decision with the ids sorted and de-duplicated, once", async () => {
    const a = await newMedication(alice, "Tab Z 1");
    const b = await newMedication(alice, "Tab Z 2");
    await as(alice, "SELECT public.dismiss_duplicate('medication', $1)", [[b, a, b]]);
    await as(alice, "SELECT public.dismiss_duplicate('medication', $1)", [[a, b]]);
    const { rows } = await owner<{ record_ids: string[] }>(
      "SELECT record_ids FROM public.duplicate_decisions WHERE patient_id = $1 AND $2 = ANY (record_ids)",
      [alice.userId, a]
    );
    expect(rows).toEqual([{ record_ids: [a, b].sort() }]);
  });

  it("refuses records that are not all the caller's own, or not of the stated kind", async () => {
    const mine = await newMedication(alice, "Tab W");
    expect(
      await expectDbError(as(alice, "SELECT public.dismiss_duplicate('medication', $1)", [[mine, bob.medicationId]]))
    ).toMatch(/Record not found/);
    expect(
      await expectDbError(as(alice, "SELECT public.dismiss_duplicate('lab_result', $1)", [[mine, alice.medicationId]]))
    ).toMatch(/Record not found/);
  });

  it("needs at least two distinct records", async () => {
    expect(
      await expectDbError(as(alice, "SELECT public.dismiss_duplicate('medication', $1)", [[alice.medicationId, alice.medicationId]]))
    ).toMatch(/2 to 20 records/);
  });

  it("decisions are private: another patient sees none of them", async () => {
    const { rows } = await as(bob, "SELECT count(*)::int n FROM public.duplicate_decisions");
    expect(rows[0]).toEqual({ n: 0 });
    expect(await expectDbError(db.asAnon((tx) => tx.query("SELECT * FROM public.duplicate_decisions")))).toMatch(/permission denied/);
  });

  it("a patient cannot insert a decision on someone else's behalf", async () => {
    expect(
      await expectDbError(
        as(bob, "INSERT INTO public.duplicate_decisions (patient_id, record_kind, record_ids) VALUES ($1, 'medication', $2)", [
          alice.userId,
          [alice.medicationId, bob.medicationId],
        ])
      )
    ).toMatch(/row-level security/);
  });
});

describe("confirm_extraction (007)", () => {
  it("stores the lab flag exactly as printed on the report", async () => {
    const user = await seedPatient(db, "flag@example.test");
    const review = {
      header: { document_type: "lab_report", document_date: "2025-11-02" },
      lab_results: [
        { test_name: "LDL Cholesterol", value: "132", unit: "mg/dL", reference_range: "< 100", flag: "H", source_page: 1, source_excerpt: "LDL 132 H" },
        { test_name: "Creatinine", value: "1.0", unit: "mg/dL", reference_range: "0.6 - 1.2", flag: null, source_page: 1, source_excerpt: "Creatinine 1.0" },
      ],
    };
    await as(user, "SELECT public.confirm_extraction($1, $2)", [user.extractionId, JSON.stringify(review)]);
    const { rows } = await owner(
      "SELECT test_name, report_flag FROM public.lab_results WHERE extraction_id = $1 ORDER BY test_name",
      [user.extractionId]
    );
    expect(rows).toEqual([
      { test_name: "Creatinine", report_flag: null },
      { test_name: "LDL Cholesterol", report_flag: "H" },
    ]);
  });
});
