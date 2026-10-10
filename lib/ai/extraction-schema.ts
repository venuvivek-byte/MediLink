// Structured extraction contract (schema version 2: adds the lab report flag).
//
// Rules encoded here:
// - Unknown/unreadable values are null, never guessed.
// - Values keep the document's original wording and units (strings, not
//   parsed numbers), so "500 mg" is never silently turned into 0.5 g.
// - Every clinical item carries evidence (page + verbatim quote) and an
//   `uncertain` flag. There are NO model-invented confidence percentages.
// - The document date and the date of a lab result/encounter are separate.
import { z } from "zod/v4";

export const EXTRACTION_SCHEMA_VERSION = "2";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isoDate = z
  .string()
  .regex(ISO_DATE)
  .refine((value) => {
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date")
  .nullable()
  .describe("YYYY-MM-DD only if the full date is written in the document; otherwise null.");

const text = (max: number, description: string) => z.string().trim().min(1).max(max).nullable().describe(description);

const evidence = z
  .object({
    page: z.number().int().min(1).max(50).describe("1-based page number where the quote appears."),
    quote: z.string().min(1).max(300).describe("Short VERBATIM excerpt copied exactly from that page."),
  })
  .describe("Where this item was found. The quote must be copied exactly, not paraphrased.");

const uncertain = z
  .boolean()
  .describe("true if any part is hard to read, ambiguous, abbreviated unclearly, or partly guessed.");

export const extractionSchema = z.object({
  document_type: z
    .enum(["prescription", "lab_report", "discharge_summary", "other"])
    .nullable()
    .describe("Type of document, or null if unclear."),
  document_date: isoDate.describe("Date the document was issued, if written."),
  encounter_date: isoDate.describe("Date of the visit/encounter if written and different from the document date."),
  patient_name: text(120, "Patient name exactly as printed, or null."),
  provider_name: text(120, "Doctor or clinician name exactly as printed, or null."),
  facility_name: text(160, "Hospital, clinic or laboratory name exactly as printed, or null."),
  diagnoses: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200).describe("Diagnosis/condition exactly as written."),
        uncertain,
        evidence,
      })
    )
    .max(30),
  medications: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200).describe("Medicine name exactly as written (brand or generic)."),
        strength: text(60, "Strength with original units, e.g. '500 mg', or null."),
        dosage: text(120, "Amount per dose as written, e.g. '1 tablet', or null."),
        frequency: text(120, "Frequency as written, e.g. 'BD', '1-0-1', or null."),
        duration: text(80, "Duration as written, e.g. '5 days', or null."),
        route: text(60, "Route as written, e.g. 'oral', or null."),
        instructions: text(300, "Other instructions for this medicine as written, or null."),
        uncertain,
        evidence,
      })
    )
    .max(40),
  lab_results: z
    .array(
      z.object({
        test_name: z.string().trim().min(1).max(200).describe("Test name exactly as written."),
        value: text(60, "Result value exactly as written, including qualifiers like '<' or 'positive'."),
        unit: text(40, "Unit exactly as written, or null."),
        reference_range: text(120, "Reference range exactly as printed on the report, or null."),
        flag: text(
          20,
          "High/low marker exactly as printed next to this result (e.g. 'H', 'L', '*', 'High'), or null if none is printed. Never derive it from the value or range."
        ),
        result_date: isoDate.describe("Sample/result date if written."),
        uncertain,
        evidence,
      })
    )
    .max(80),
  allergies: z
    .array(
      z.object({
        substance: z.string().trim().min(1).max(200),
        reaction: text(200, "Reaction as written, or null."),
        uncertain,
        evidence,
      })
    )
    .max(20),
  instructions: z
    .array(z.object({ text: z.string().trim().min(1).max(500), evidence }))
    .max(20)
    .describe("General doctor's instructions/advice not tied to one medicine."),
  unreadable_notes: z
    .array(z.string().max(200))
    .max(10)
    .describe("Short notes about parts that could not be read. Do not guess their content."),
});

export type Extraction = z.infer<typeof extractionSchema>;

/**
 * Keywords providers reject or handle inconsistently (Gemini returns 400 for
 * some). They are removed from the schema SENT to the model only: the full
 * Zod schema above is still enforced on every response, server-side.
 */
const PROVIDER_UNSUPPORTED_KEYWORDS = new Set([
  "$schema",
  "pattern",
  "minLength",
  "maxLength",
  "additionalProperties",
  "maxItems", // Gemini 3.x returns 400 for this schema with maxItems (verified live)
]);

function stripKeywords(node: unknown, inProperties = false): unknown {
  if (Array.isArray(node)) return node.map((n) => stripKeywords(n));
  if (!node || typeof node !== "object") return node;
  return Object.fromEntries(
    Object.entries(node)
      // Inside "properties", keys are field names, never keywords.
      .filter(([key]) => inProperties || !PROVIDER_UNSUPPORTED_KEYWORDS.has(key))
      .map(([key, value]) => [key, stripKeywords(value, !inProperties && key === "properties")])
  );
}

/** Structural JSON Schema sent to the model to shape its output. */
export function extractionJsonSchema(): Record<string, unknown> {
  return stripKeywords(z.toJSONSchema(extractionSchema, { target: "draft-7" })) as Record<string, unknown>;
}
