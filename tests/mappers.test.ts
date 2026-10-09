import { describe, expect, it } from "vitest";
import { mapMedication, toReviewStatus } from "@/lib/data/mappers";
import type { Tables } from "@/lib/types/database.types";

const baseMed: Tables<"medications"> = {
  id: "m1",
  patient_id: "p",
  source_document_id: "d1",
  name: "Metformin 500mg",
  normalized_name: null,
  ingredient: null,
  strength: "500mg",
  dosage: null,
  frequency: null,
  route: null,
  start_date: null,
  end_date: null,
  status: "unknown",
  verification_status: "unverified",
  metadata: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  duration: null,
  instructions: null,
  prescriber_name: null,
  facility_name: null,
  extraction_id: null,
  source_page: null,
  source_excerpt: null,
};

describe("review status", () => {
  it("only an explicit 'verified' counts as patient-reviewed", () => {
    expect(toReviewStatus("verified")).toBe("patient_reviewed");
    for (const value of ["unverified", "pending", "VERIFIED", "", null]) {
      expect(toReviewStatus(value)).toBe("pending_review");
    }
  });
});

describe("medication mapping", () => {
  it("does not assume an unknown status is current", () => {
    expect(mapMedication({ ...baseMed, status: "unknown" }).status).toBe("uncertain");
    expect(mapMedication({ ...baseMed, status: "active" }).status).toBe("current");
    expect(mapMedication({ ...baseMed, status: "historical" }).status).toBe("historical");
  });

  it("derives a normalised name when the column is empty and keeps source traceability", () => {
    const med = mapMedication(baseMed);
    expect(med.normalizedName).toBe("metformin");
    expect(med.sourceDocumentId).toBe("d1");
  });

  it("reads prescriber and facility from their columns, never from free-form metadata", () => {
    const med = mapMedication({
      ...baseMed,
      prescriber_name: "Dr. Nair",
      facility_name: "Apollo",
      metadata: { provider: "Injected", facility: "Injected" },
    });
    expect(med.prescriberName).toBe("Dr. Nair");
    expect(med.facilityName).toBe("Apollo");
    expect(mapMedication({ ...baseMed, metadata: { provider: "Injected" } }).prescriberName).toBeNull();
  });
});
