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
  status: null,
  verification_status: null,
  metadata: null,
  created_at: null,
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
    expect(mapMedication({ ...baseMed, status: null }).status).toBe("uncertain");
    expect(mapMedication({ ...baseMed, status: "unknown" }).status).toBe("uncertain");
    expect(mapMedication({ ...baseMed, status: "active" }).status).toBe("current");
    expect(mapMedication({ ...baseMed, status: "historical" }).status).toBe("historical");
  });

  it("derives a normalised name when the column is empty and keeps source traceability", () => {
    const med = mapMedication(baseMed);
    expect(med.normalizedName).toBe("metformin");
    expect(med.sourceDocumentId).toBe("d1");
  });

  it("ignores non-string metadata instead of rendering it", () => {
    const med = mapMedication({ ...baseMed, metadata: { provider: 42, facility: ["x"] } });
    expect(med.prescriberName).toBeNull();
    expect(med.facilityName).toBeNull();
  });
});
