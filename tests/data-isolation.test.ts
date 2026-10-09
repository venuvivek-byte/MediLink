import { describe, expect, it } from "vitest";
import { DemoPatientRepository } from "@/lib/data/demo-repository";
import { DEMO_PATIENT_ID } from "@/lib/demo/data";
import type { PatientRepository } from "@/lib/data/repository";

const LIST_METHODS = [
  "listDocuments",
  "listTimelineEvents",
  "listMedications",
  "listLabResults",
  "listConditions",
  "listAllergies",
  "listShareLinks",
  "listAuditEvents",
] as const satisfies readonly (keyof PatientRepository)[];

describe("repository patient isolation", () => {
  it("returns the demo patient's records to the demo patient", async () => {
    const repo = new DemoPatientRepository(DEMO_PATIENT_ID);
    expect(await repo.getProfile()).not.toBeNull();
    expect((await repo.listMedications()).length).toBeGreaterThan(0);
  });

  it("returns NOTHING to any other patient id (no fallback to demo data)", async () => {
    const repo = new DemoPatientRepository("someone-else");
    expect(await repo.getProfile()).toBeNull();
    for (const method of LIST_METHODS) {
      expect(await repo[method](), method).toEqual([]);
    }
  });

  it("exposes no way to pass a patient id per call", () => {
    for (const method of LIST_METHODS) {
      expect(DemoPatientRepository.prototype[method].length, method).toBe(0);
    }
  });
});

describe("DTOs do not leak sensitive fields", () => {
  const repo = new DemoPatientRepository(DEMO_PATIENT_ID);

  it("share links carry no token or PIN hashes", async () => {
    const serialized = JSON.stringify(await repo.listShareLinks());
    expect(serialized).not.toMatch(/token_hash|pin_hash|tokenHash|pinHash|\$2[aby]\$/);
  });

  it("documents carry no storage paths or raw extraction blobs", async () => {
    const serialized = JSON.stringify(await repo.listDocuments());
    expect(serialized).not.toMatch(/storage_path|storagePath|extracted_data|demo\//);
  });

  it("audit events only expose allow-listed details", async () => {
    const events = await repo.listAuditEvents();
    const labels = new Set(events.flatMap((e) => e.details.map((d) => d.label)));
    expect([...labels].every((l) => ["File", "Share", "Accessed by"].includes(l))).toBe(true);
    expect(JSON.stringify(events)).not.toMatch(/confidence|is_demo/);
  });
});
