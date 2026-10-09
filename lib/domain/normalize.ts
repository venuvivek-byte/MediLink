// Deterministic name normalisation for grouping records. This is string
// matching only; it does not know about brand names, salts or synonyms.

const STRENGTH_PATTERN = /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|g|ml|iu|units?|%)\b/gi;
const FORM_WORDS = /\b(?:tab|tabs|tablet|tablets|cap|caps|capsule|capsules|syrup|inj|injection)\b\.?/gi;

export function normalizeMedicationName(name: string): string {
  return name
    .toLowerCase()
    .replace(STRENGTH_PATTERN, " ")
    .replace(FORM_WORDS, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTestName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
