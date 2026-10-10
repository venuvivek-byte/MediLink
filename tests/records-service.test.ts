import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeSupabase } from "./helpers/fake-supabase";

const fake = { db: new FakeSupabase() };
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fake.db }));

import { deleteRecord, dismissDuplicate, updateMedication } from "@/lib/records/service";

const live = { kind: "live" as const, patientId: "11111111-1111-4111-8111-111111111111", email: null };
const demo = { kind: "demo" as const, patientId: "demo-patient" };
const ID = "22222222-2222-4222-8222-222222222222";
const ID2 = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  fake.db = new FakeSupabase();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("updateMedication", () => {
  it("maps the patient's choice to the stored status and sends one atomic call", async () => {
    expect(await updateMedication(live, { id: ID, status: "uncertain", startDate: "", endDate: null })).toEqual({ ok: true });
    expect(await updateMedication(live, { id: ID, status: "current", startDate: "2025-11-05", endDate: "" })).toEqual({ ok: true });
    expect(fake.db.rpcCalls).toEqual([
      { fn: "update_medication", args: { p_medication_id: ID, p_status: "unknown", p_start_date: null, p_end_date: null } },
      { fn: "update_medication", args: { p_medication_id: ID, p_status: "active", p_start_date: "2025-11-05", p_end_date: null } },
    ]);
  });

  it.each([
    ["an unknown status", { id: ID, status: "active" }],
    ["an invalid calendar date", { id: ID, status: "current", startDate: "2025-02-30" }],
    ["a non-uuid id", { id: "1; drop", status: "current" }],
  ])("rejects %s before touching the database", async (_label, input) => {
    expect(await updateMedication(live, input)).toMatchObject({ ok: false });
    expect(fake.db.rpcCalls).toHaveLength(0);
  });

  it("explains an end date before the start date", async () => {
    expect(await updateMedication(live, { id: ID, status: "discontinued", startDate: "2025-05-02", endDate: "2025-05-01" })).toEqual({
      ok: false,
      error: "The end date cannot be before the start date.",
    });
  });

  it("reports a record that no longer exists (or belongs to someone else) without detail", async () => {
    fake.db.failNext.rpc = { code: "P0002" };
    expect(await updateMedication(live, { id: ID, status: "current" })).toEqual({
      ok: false,
      error: "This record no longer exists. Refresh the page.",
    });
  });
});

describe("deleteRecord", () => {
  it("deletes through the audited function", async () => {
    expect(await deleteRecord(live, { kind: "lab_result", id: ID })).toEqual({ ok: true });
    expect(fake.db.rpcCalls).toEqual([{ fn: "delete_health_record", args: { p_kind: "lab_result", p_id: ID } }]);
  });

  it("refuses an unknown kind", async () => {
    expect(await deleteRecord(live, { kind: "profiles", id: ID })).toMatchObject({ ok: false });
    expect(fake.db.rpcCalls).toHaveLength(0);
  });

  it("never claims success when the database fails", async () => {
    fake.db.failNext.rpc = { code: "XX000" };
    expect(await deleteRecord(live, { kind: "medication", id: ID })).toMatchObject({ ok: false });
  });
});

describe("dismissDuplicate", () => {
  it("records the decision for the exact set of records", async () => {
    expect(await dismissDuplicate(live, { kind: "medication", recordIds: [ID, ID2] })).toEqual({ ok: true });
    expect(fake.db.rpcCalls).toEqual([{ fn: "dismiss_duplicate", args: { p_kind: "medication", p_record_ids: [ID, ID2] } }]);
  });

  it("needs at least two records", async () => {
    expect(await dismissDuplicate(live, { kind: "medication", recordIds: [ID] })).toMatchObject({ ok: false });
  });
});

describe("demo mode", () => {
  it("never writes anything", async () => {
    const readOnly = { ok: false, error: "Changes are not saved in demo mode." };
    expect(await updateMedication(demo, { id: ID, status: "current" })).toEqual(readOnly);
    expect(await deleteRecord(demo, { kind: "medication", id: ID })).toEqual(readOnly);
    expect(await dismissDuplicate(demo, { kind: "medication", recordIds: [ID, ID2] })).toEqual(readOnly);
    expect(fake.db.rpcCalls).toHaveLength(0);
  });
});
