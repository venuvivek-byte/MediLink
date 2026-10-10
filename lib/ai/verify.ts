import type { PageText } from "@/lib/documents/pdf-text";
import type { Extraction } from "./extraction-schema";

// Server-side check that the model did not invent anything: every quote, and
// the key value of every item, must be findable in the source text. Items
// that fail are forced to `uncertain` and carry a reason for the reviewer.

export type ReviewFlag =
  | "quote_not_found" // the evidence quote is not in the cited page
  | "value_not_found" // the key value (name/result) is not in the cited page
  | "page_not_found" // the cited page does not exist
  | "model_uncertain"; // the model itself marked the item uncertain

export interface Verified<T> {
  item: T;
  flags: ReviewFlag[];
  uncertain: boolean;
}

export type DateField = "document_date" | "encounter_date";

export interface VerifiedExtraction {
  /**
   * Header dates the model resolved from an ambiguous numeric date such as
   * 09/10/2025 (9 Oct or 10 Sep). The reviewer must confirm these.
   */
  ambiguousDates: DateField[];
  header: Pick<
    Extraction,
    "document_type" | "document_date" | "encounter_date" | "patient_name" | "provider_name" | "facility_name"
  >;
  diagnoses: Verified<Extraction["diagnoses"][number]>[];
  medications: Verified<Extraction["medications"][number]>[];
  lab_results: Verified<Extraction["lab_results"][number]>[];
  allergies: Verified<Extraction["allergies"][number]>[];
  instructions: Verified<Extraction["instructions"][number]>[];
  unreadable_notes: string[];
}

/** Lowercase, unify quotes/dashes, collapse whitespace: tolerant to layout, not to content. */
export function normalizeForMatch(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[‐-―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True if `token` appears in `text` as a separate token (bounded by the start,
 * the end, whitespace or brackets). Short markers such as a lab flag "H" would
 * otherwise "match" inside any word ("HbA1c").
 */
export function containsToken(text: string, token: string): boolean {
  const escaped = normalizeForMatch(token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[\\s()[\\]|,;:])${escaped}($|[\\s()[\\]|,;:])`).test(normalizeForMatch(text));
}

function verifyItem<T extends { evidence: { page: number; quote: string }; uncertain?: boolean }>(
  item: T,
  keyValues: (string | null | undefined)[],
  pageText: Map<number, string>,
  /** Short values that must appear as a separate token in the item's own quote. */
  quoteTokens: (string | null | undefined)[] = []
): Verified<T> {
  const flags: ReviewFlag[] = [];
  const page = pageText.get(item.evidence.page);
  if (page === undefined) {
    flags.push("page_not_found");
  } else {
    if (!page.includes(normalizeForMatch(item.evidence.quote))) flags.push("quote_not_found");
    const missingValue =
      keyValues.some((v) => v && !page.includes(normalizeForMatch(v))) ||
      quoteTokens.some((t) => t && !containsToken(item.evidence.quote, t));
    if (missingValue) flags.push("value_not_found");
  }
  if (item.uncertain) flags.push("model_uncertain");
  return { item, flags, uncertain: flags.length > 0 };
}

const NUMERIC_DATE = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g;

/**
 * True if `iso` (YYYY-MM-DD) could have come from a numeric date in the text
 * whose day and month are interchangeable (both 1..12 and different).
 */
export function isAmbiguousDate(iso: string | null, text: string): boolean {
  if (!iso) return false;
  const [y, m, d] = iso.split("-").map(Number);
  for (const match of text.matchAll(NUMERIC_DATE)) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    const year = Number(match[3]);
    if (year !== y || a === b || a > 12 || b > 12) continue;
    if ((a === d && b === m) || (a === m && b === d)) return true;
  }
  return false;
}

export function verifyExtraction(extraction: Extraction, pages: PageText[]): VerifiedExtraction {
  const pageText = new Map(pages.map((p) => [p.pageNumber, normalizeForMatch(p.text)]));
  const allText = pages.map((p) => p.text).join("\n");
  const ambiguousDates = (["document_date", "encounter_date"] as const).filter((field) =>
    isAmbiguousDate(extraction[field], allText)
  );
  return {
    ambiguousDates,
    header: {
      document_type: extraction.document_type,
      document_date: extraction.document_date,
      encounter_date: extraction.encounter_date,
      patient_name: extraction.patient_name,
      provider_name: extraction.provider_name,
      facility_name: extraction.facility_name,
    },
    diagnoses: extraction.diagnoses.map((d) => verifyItem(d, [d.name], pageText)),
    medications: extraction.medications.map((m) => verifyItem(m, [m.name], pageText)),
    lab_results: extraction.lab_results.map((l) => verifyItem(l, [l.test_name, l.value], pageText, [l.flag])),
    allergies: extraction.allergies.map((a) => verifyItem(a, [a.substance], pageText)),
    instructions: extraction.instructions.map((i) => verifyItem(i, [], pageText)),
    unreadable_notes: extraction.unreadable_notes,
  };
}
