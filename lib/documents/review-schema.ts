// What the patient submits from the review screen. Validated server-side
// before anything is written. Empty strings mean "unknown" and become null.
import { z } from "zod";
import { normalizeMedicationName, normalizeTestName } from "@/lib/domain/normalize";
import { ILLEGIBLE_MARKER } from "@/lib/ai/verify";

/** Message for a submission that still contains "[illegible]" in a record field. */
export const ILLEGIBLE_ERROR = "illegible_marker";

// A record must never be saved with "[illegible]" in it: the patient either
// types what it says or removes the entry. (Source excerpts are exempt: they
// are verbatim quotes of the transcription.)
const readable = (v: string) => !ILLEGIBLE_MARKER.test(v);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(readable, ILLEGIBLE_ERROR)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

const requiredText = (max: number) => z.string().trim().min(1).max(max).refine(readable, ILLEGIBLE_ERROR);

const isoDate = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))), "Invalid date");

const source = {
  source_page: z.number().int().min(1).max(50).nullable().optional().transform((v) => v ?? null),
  source_excerpt: z
    .string()
    .trim()
    .max(1000)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
};

export const reviewSubmissionSchema = z
  .object({
    extractionId: z.string().uuid(),
    header: z.object({
      document_type: z
        .enum(["prescription", "lab_report", "discharge_summary", "other"])
        .nullable()
        .optional()
        .transform((v) => v ?? null),
      document_date: isoDate,
      provider_name: optionalText(120),
      facility_name: optionalText(160),
    }),
    medications: z
      .array(
        z.object({
          name: requiredText(200),
          strength: optionalText(60),
          dosage: optionalText(120),
          frequency: optionalText(120),
          duration: optionalText(80),
          route: optionalText(60),
          instructions: optionalText(300),
          // The patient decides; the default is "unknown", never "current".
          status: z.enum(["active", "historical", "discontinued", "unknown"]).default("unknown"),
          ...source,
        })
      )
      .max(40),
    lab_results: z
      .array(
        z.object({
          test_name: requiredText(200),
          value: optionalText(60),
          unit: optionalText(40),
          reference_range: optionalText(120),
          // High/low marker as printed on the report; never computed.
          flag: optionalText(20),
          result_date: isoDate,
          ...source,
        })
      )
      .max(80),
    conditions: z.array(z.object({ name: requiredText(200), ...source })).max(30),
    allergies: z.array(z.object({ substance: requiredText(200), reaction: optionalText(200), ...source })).max(20),
  })
  .transform((review) => ({
    ...review,
    medications: review.medications.map((m) => ({ ...m, normalized_name: normalizeMedicationName(m.name) })),
    lab_results: review.lab_results.map((l) => ({ ...l, normalized_test_name: normalizeTestName(l.test_name) })),
  }));

export type ReviewSubmission = z.input<typeof reviewSubmissionSchema>;
export type ValidReview = z.output<typeof reviewSubmissionSchema>;
