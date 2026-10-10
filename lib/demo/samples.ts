// Synthetic sample documents for demo mode. Fictional content only.
// Each sample has its page text (as if extracted) and a pre-written,
// clearly simulated extraction. Demo mode runs these through the SAME
// validation and evidence checks as real documents.
import type { Extraction } from "@/lib/ai/extraction-schema";
import type { PageText } from "@/lib/documents/pdf-text";

export interface DemoSample {
  id: string;
  title: string;
  filename: string;
  pages: PageText[];
  simulatedOutput: Extraction;
}

const base = {
  encounter_date: null,
  patient_name: "Ananya Rao",
  diagnoses: [],
  medications: [],
  lab_results: [],
  allergies: [],
  instructions: [],
  unreadable_notes: [],
} satisfies Partial<Extraction>;

export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: "care-clinic-rx",
    title: "Prescription — Care Clinic (handwritten-style scan)",
    filename: "Sample_Prescription_CareClinic.pdf",
    pages: [
      {
        pageNumber: 1,
        text: [
          "CARE CLINIC & DIAGNOSTICS",
          "Dr. R. K. Singhal, MD (Medicine)",
          "Date: 09/10/2025    Rx No: 7821",
          "Patient: Ananya Rao   52y / F",
          "Dx: Type 2 DM",
          "Rx",
          "1. Tab Glimepiride 1 mg   1-0-0   before breakfast",
          "2. Tab Metformin 500 mg   1-0-1   after food",
          "3. Tab Vit D3 60K   once weekly   x 8 wks",
          "Advice: Monitor blood sugar twice weekly. Review after 3 months.",
          "Signed: Dr. R. K. Singhal",
        ].join("\n"),
      },
    ],
    simulatedOutput: {
      ...base,
      document_type: "prescription",
      // The source date is ambiguous (9 Oct or 10 Sep): the review screen flags it.
      document_date: "2025-10-09",
      provider_name: "Dr. R. K. Singhal, MD (Medicine)",
      facility_name: "CARE CLINIC & DIAGNOSTICS",
      diagnoses: [{ name: "Type 2 DM", uncertain: false, evidence: { page: 1, quote: "Dx: Type 2 DM" } }],
      medications: [
        {
          name: "Tab Glimepiride",
          strength: "1 mg",
          dosage: null,
          frequency: "1-0-0",
          duration: null,
          route: null,
          instructions: "before breakfast",
          uncertain: false,
          evidence: { page: 1, quote: "Tab Glimepiride 1 mg   1-0-0   before breakfast" },
        },
        {
          name: "Tab Metformin",
          strength: "500 mg",
          dosage: null,
          frequency: "1-0-1",
          duration: null,
          route: null,
          instructions: "after food",
          uncertain: false,
          evidence: { page: 1, quote: "Tab Metformin 500 mg   1-0-1   after food" },
        },
        {
          // Deliberately uncertain: "60K" is an abbreviation the patient should confirm.
          name: "Tab Vit D3",
          strength: "60K",
          dosage: null,
          frequency: "once weekly",
          duration: "8 wks",
          route: null,
          instructions: null,
          uncertain: true,
          evidence: { page: 1, quote: "Tab Vit D3 60K   once weekly   x 8 wks" },
        },
      ],
      instructions: [
        {
          text: "Monitor blood sugar twice weekly. Review after 3 months.",
          evidence: { page: 1, quote: "Monitor blood sugar twice weekly" },
        },
      ],
    },
  },
  {
    id: "lab-panel",
    title: "Lab report — City Diagnostics",
    filename: "Sample_LabReport_CityDiagnostics.pdf",
    pages: [
      {
        pageNumber: 1,
        text: [
          "CITY DIAGNOSTICS LABORATORY",
          "Patient: Ananya Rao   Sample collected: 2025-10-01",
          "Test                 Result  Flag  Unit     Biological Ref. Range",
          "HbA1c                7.0     H     %        < 5.7",
          "Fasting Glucose      128     H     mg/dL    70 - 100",
          "Serum Creatinine     0.9           mg/dL    0.6 - 1.2",
          "TSH                  2.4           uIU/mL   0.4 - 4.0",
        ].join("\n"),
      },
    ],
    simulatedOutput: {
      ...base,
      document_type: "lab_report",
      document_date: "2025-10-01",
      provider_name: null,
      facility_name: "CITY DIAGNOSTICS LABORATORY",
      lab_results: [
        ["HbA1c", "7.0", "H", "%", "< 5.7", "HbA1c                7.0     H"],
        ["Fasting Glucose", "128", "H", "mg/dL", "70 - 100", "Fasting Glucose      128     H"],
        ["Serum Creatinine", "0.9", null, "mg/dL", "0.6 - 1.2", "Serum Creatinine     0.9"],
        // Simulated mis-read: the source says 2.4, the "AI" says 4.2. The
        // evidence check catches it and the review screen flags it.
        ["TSH", "4.2", null, "uIU/mL", "0.4 - 4.0", "TSH                  2.4"],
      ].map(([test_name, value, flag, unit, reference_range, quote]) => ({
        test_name: test_name!,
        value,
        unit,
        reference_range,
        flag,
        result_date: "2025-10-01",
        uncertain: false,
        evidence: { page: 1, quote: quote! },
      })),
    },
  },
];

export function getDemoSample(id: string): DemoSample | undefined {
  return DEMO_SAMPLES.find((s) => s.id === id);
}
