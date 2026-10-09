import { z } from "zod";

export const ExtractionSchema = z.object({
  document_type: z.enum(["prescription", "lab_report", "discharge_summary", "other"]),
  document_date: z.string().nullable(),
  provider_name: z.string().nullable(),
  facility_name: z.string().nullable(),
  diagnoses: z.array(
    z.object({
      name: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
  medications: z.array(
    z.object({
      name: z.string(),
      strength: z.string().nullable(),
      dosage: z.string().nullable(),
      frequency: z.string().nullable(),
      route: z.string().nullable(),
      duration: z.string().nullable(),
      confidence: z.number().min(0).max(1),
    })
  ),
  lab_results: z.array(
    z.object({
      test_name: z.string(),
      value: z.string(),
      unit: z.string().nullable(),
      reference_range: z.string().nullable(),
      is_abnormal: z.boolean().nullable(),
      confidence: z.number().min(0).max(1),
    })
  ),
  allergies: z.array(
    z.object({
      substance: z.string(),
      reaction: z.string().nullable(),
    })
  ),
  raw_confidence: z.number().min(0).max(1),
});

export type ExtractionResult = z.infer<typeof ExtractionSchema>;
