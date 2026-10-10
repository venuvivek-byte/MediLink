import { describe, expect, it } from "vitest";
import { buildLabSeries, findDuplicateLabEntries, findDuplicateMedications, findRepeatTests } from "@/lib/domain/insights";
import { normalizeMedicationName } from "@/lib/domain/normalize";
import type { LabResult, Medication } from "@/lib/data/types";

function med(overrides: Partial<Medication>): Medication {
  return {
    id: crypto.randomUUID(),
    name: "Metformin 500mg",
    normalizedName: "metformin",
    ingredient: null,
    strength: "500mg",
    dosage: null,
    frequency: "BD",
    route: null,
    startDate: "2025-01-01",
    endDate: null,
    status: "current",
    reviewStatus: "patient_reviewed",
    prescriberName: null,
    facilityName: null,
    sourceDocumentId: null,
    sourcePage: null,
    ...overrides,
  };
}

function lab(overrides: Partial<LabResult>): LabResult {
  return {
    id: crypto.randomUUID(),
    testName: "HbA1c",
    normalizedTestName: "hba1c",
    value: "7.0",
    unit: "%",
    referenceRange: null,
    reportFlag: null,
    testDate: "2025-01-01",
    reviewStatus: "patient_reviewed",
    sourceDocumentId: null,
    sourcePage: null,
    ...overrides,
  };
}

describe("normalizeMedicationName", () => {
  it("strips strengths and dosage forms", () => {
    expect(normalizeMedicationName("Tab. Metformin 500 mg")).toBe("metformin");
    expect(normalizeMedicationName("METFORMIN 1000MG")).toBe("metformin");
    expect(normalizeMedicationName("Amoxicillin-Clavulanate 625mg")).toBe("amoxicillin-clavulanate");
  });
});

describe("findDuplicateMedications", () => {
  it("flags the same medicine in two current records and explains a dose difference", () => {
    const alerts = findDuplicateMedications([med({}), med({ strength: "1000mg", frequency: "OD" })]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].records).toHaveLength(2);
    expect(alerts[0].reason).toMatch(/different strengths or frequencies/);
  });

  it("does not compare against historical or discontinued records", () => {
    expect(findDuplicateMedications([med({}), med({ status: "historical" })])).toEqual([]);
    expect(findDuplicateMedications([med({}), med({ status: "discontinued" })])).toEqual([]);
  });

  it("does not flag different medicines", () => {
    expect(findDuplicateMedications([med({}), med({ name: "Amlodipine 5mg", normalizedName: "amlodipine" })])).toEqual([]);
  });

  it("flags the demo patient's two Metformin prescriptions", async () => {
    const { DemoPatientRepository } = await import("@/lib/data/demo-repository");
    const { DEMO_PATIENT_ID } = await import("@/lib/demo/data");
    const alerts = findDuplicateMedications(await new DemoPatientRepository(DEMO_PATIENT_ID).listMedications());
    expect(alerts.map((a) => a.key)).toEqual(["metformin"]);
  });
});

describe("duplicate decisions", () => {
  it("a 'not a duplicate' decision hides that exact medication group", () => {
    const a = med({ id: "m-a" });
    const b = med({ id: "m-b" });
    expect(findDuplicateMedications([a, b])).toHaveLength(1);
    expect(findDuplicateMedications([a, b], [{ kind: "medication", recordIds: ["m-b", "m-a"] }])).toEqual([]);
  });

  it("the alert comes back when a new record joins the group", () => {
    const records = [med({ id: "m-a" }), med({ id: "m-b" }), med({ id: "m-c" })];
    const alerts = findDuplicateMedications(records, [{ kind: "medication", recordIds: ["m-a", "m-b"] }]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].records.map((r) => r.id)).toEqual(["m-a", "m-b", "m-c"]);
  });

  it("a lab decision never hides a medication alert (kinds are separate)", () => {
    expect(findDuplicateMedications([med({ id: "x" }), med({ id: "y" })], [{ kind: "lab_result", recordIds: ["x", "y"] }])).toHaveLength(1);
  });
});

describe("findDuplicateLabEntries", () => {
  it("flags the same test, date, value and unit entered twice", () => {
    const alerts = findDuplicateLabEntries([lab({ id: "l1", value: "7.2" }), lab({ id: "l2", value: " 7.2 " }), lab({ id: "l3", value: "6.9" })]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].records.map((r) => r.id)).toEqual(["l1", "l2"]);
  });

  it("does not flag different dates, values or units", () => {
    expect(findDuplicateLabEntries([lab({ testDate: "2025-01-01" }), lab({ testDate: "2025-01-02" })])).toEqual([]);
    expect(findDuplicateLabEntries([lab({ value: "7.0" }), lab({ value: "7.1" })])).toEqual([]);
    expect(findDuplicateLabEntries([lab({ unit: "%" }), lab({ unit: "mmol/mol" })])).toEqual([]);
  });

  it("respects the patient's decision", () => {
    const labs = [lab({ id: "l1" }), lab({ id: "l2" })];
    expect(findDuplicateLabEntries(labs, [{ kind: "lab_result", recordIds: ["l1", "l2"] }])).toEqual([]);
  });
});

describe("findRepeatTests", () => {
  it("does not report same-day entries as a repeat (those are possible duplicates)", () => {
    expect(findRepeatTests([lab({ testDate: "2025-04-18" }), lab({ testDate: "2025-04-18" })])).toEqual([]);
  });

  it("flags the same test within 90 days and reports the gap", () => {
    const alerts = findRepeatTests([lab({ testDate: "2025-04-18" }), lab({ testDate: "2025-07-15" })]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].daysApart).toBe(88);
  });

  it("does not flag tests 90+ days apart or undated results", () => {
    expect(findRepeatTests([lab({ testDate: "2025-01-01" }), lab({ testDate: "2025-04-01" })])).toEqual([]);
    expect(findRepeatTests([lab({ testDate: null }), lab({ testDate: "2025-01-02" })])).toEqual([]);
  });
});

describe("buildLabSeries", () => {
  it("never mixes units in one series", () => {
    const series = buildLabSeries([
      lab({ testDate: "2025-01-01", unit: "%" }),
      lab({ testDate: "2025-02-01", unit: "%" }),
      lab({ testDate: "2025-03-01", unit: "mmol/mol", value: "53" }),
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].unit).toBe("%");
    expect(series[0].points).toHaveLength(2);
  });

  it("skips non-numeric values rather than guessing", () => {
    const series = buildLabSeries([
      lab({ testDate: "2025-01-01", value: "<5" }),
      lab({ testDate: "2025-02-01", value: "positive" }),
      lab({ testDate: "2025-03-01", value: "6.1" }),
    ]);
    expect(series).toEqual([]);
  });

  it("sorts points oldest to newest", () => {
    const [series] = buildLabSeries([lab({ testDate: "2025-03-01" }), lab({ testDate: "2025-01-01" })]);
    expect(series.points.map((p) => p.date)).toEqual(["2025-01-01", "2025-03-01"]);
  });
});
