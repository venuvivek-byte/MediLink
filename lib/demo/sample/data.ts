// ============================================================================
// "Try sample" patient — Meera Krishnan (entirely synthetic)
// ============================================================================
// Every person, clinic, lab and value here is made up. The story is built so
// each page has something to show: 18 months of lab trends (thyroid, iron,
// vitamin D, cholesterol), current and past medicines, a duplicate medicine
// prescribed by two doctors, a repeat blood test within 90 days, share links
// in every state, an emergency card and an access history.
//
// This file must stay free of runtime imports: scripts/sample/generate-files.mjs
// loads it with Node's type stripping to render the original PDFs from the
// same records, so a value on a page always matches its source document.

import type { Tables } from "@/lib/types/database.types";

export const SAMPLE_PATIENT_ID = "sample-patient-meera-krishnan";
export const SAMPLE_SHARE_TOKEN = "sample-clinician-share-link";
export const SAMPLE_SHARE_PIN = "246810";
export const SAMPLE_EMERGENCY_TOKEN = "sample-emergency-card";
export const SAMPLE_ACTIVE_SHARE_ID = "5a3e0000-0000-4000-8000-00000000a001";

const P = SAMPLE_PATIENT_ID;
const META = { is_sample: true } as const;
/** Deterministic, valid v4-shaped UUIDs: the file route only accepts UUIDs. */
const uuid = (prefix: string, n: number) => `5a3e0000-0000-4000-8000-${prefix}${String(n).padStart(12 - prefix.length, "0")}`;
/** Times are written as India local time (the sample lives in Chennai). */
const at = (date: string, time = "10:00:00") => `${date}T${time}+05:30`;

export const SAMPLE_PROFILE: Tables<"profiles"> = {
  user_id: P,
  display_name: "Meera Krishnan",
  date_of_birth: "1986-08-22",
  blood_group: "A+",
  emergency_contact: { name: "Arjun Krishnan", phone: "+91 90000 11223", relationship: "Brother" },
  patient_info: {},
  metadata: META,
  created_at: at("2025-03-10", "08:30:00"),
  updated_at: at("2026-06-02", "18:05:00"),
};

// ─── Source documents ────────────────────────────────────────────────────────

export interface SampleLab {
  test: string;
  key: string;
  value: string;
  unit: string;
  range: string;
  /** Exactly as printed on the report; never computed. */
  flag: "H" | "L" | null;
}

export interface SampleDocument {
  id: string;
  date: string;
  type: "prescription" | "lab_report" | "discharge_summary";
  filename: string;
  provider: string;
  facility: string;
  /** Clinic/lab address line printed under the letterhead. */
  address: string;
  eventType: "lab" | "prescription" | "procedure" | "consultation";
  title: string;
  summary: string;
  labs?: SampleLab[];
  /** Free text printed on the document (diagnosis, advice, findings). */
  notes?: string[];
}

const L = {
  tsh: (value: string, flag: "H" | "L" | null = null): SampleLab => ({ test: "TSH", key: "tsh", value, unit: "mIU/L", range: "0.4-4.0", flag }),
  hb: (value: string, flag: "H" | "L" | null = null): SampleLab => ({ test: "Hemoglobin", key: "hemoglobin", value, unit: "g/dL", range: "12.0-15.5", flag }),
  ferritin: (value: string, flag: "H" | "L" | null = null): SampleLab => ({ test: "Serum Ferritin", key: "ferritin", value, unit: "ng/mL", range: "15-150", flag }),
  vitd: (value: string, flag: "H" | "L" | null = null): SampleLab => ({ test: "25-OH Vitamin D", key: "vitamin d", value, unit: "ng/mL", range: "30-100", flag }),
  ldl: (value: string, flag: "H" | "L" | null = null): SampleLab => ({ test: "LDL Cholesterol", key: "ldl cholesterol", value, unit: "mg/dL", range: "<100", flag }),
  fbs: (value: string, flag: "H" | "L" | null = null): SampleLab => ({ test: "Fasting Blood Sugar", key: "fasting blood sugar", value, unit: "mg/dL", range: "70-100", flag }),
};

const METRO = { facility: "Metro Diagnostics Lab", address: "12 Lake View Road, Chennai 600034", provider: "Dr. S. Balaji, Pathologist" };
const SUNRISE = { facility: "Sunrise Endocrine Clinic", address: "4th Floor, Harbour Towers, Chennai 600017", provider: "Dr. Kavitha Raman" };

export const SAMPLE_DOCUMENTS: SampleDocument[] = [
  {
    id: uuid("d", 1), date: "2025-03-10", type: "lab_report", filename: "Metro_Diagnostics_Baseline_Mar2025.pdf", ...METRO,
    eventType: "lab", title: "Baseline blood tests — Metro Diagnostics",
    summary: "TSH 8.6 (H), hemoglobin 9.8 (L), ferritin 8 (L) and vitamin D 14 (L) recorded. LDL 142 (H).",
    labs: [L.tsh("8.6", "H"), L.hb("9.8", "L"), L.ferritin("8", "L"), L.vitd("14", "L"), L.ldl("142", "H"), L.fbs("92")],
  },
  {
    id: uuid("d", 2), date: "2025-03-14", type: "prescription", filename: "Sunrise_Endocrine_Rx_Mar2025.pdf", ...SUNRISE,
    eventType: "prescription", title: "Hypothyroidism diagnosed — Sunrise Endocrine Clinic",
    summary: "Dr. Kavitha Raman started levothyroxine 50 mcg, ferrous ascorbate and weekly vitamin D.",
    notes: ["Diagnosis: Primary hypothyroidism. Iron deficiency anaemia. Vitamin D deficiency.", "Advice: Take levothyroxine on an empty stomach, 30 minutes before breakfast.", "Review with repeat TSH, CBC and ferritin in 3 months."],
  },
  {
    id: uuid("d", 3), date: "2025-06-12", type: "lab_report", filename: "Metro_Diagnostics_Followup_Jun2025.pdf", ...METRO,
    eventType: "lab", title: "3-month follow-up tests — Metro Diagnostics",
    summary: "TSH 6.1 (H), hemoglobin 10.9 (L), ferritin 18 and vitamin D 22 (L) recorded.",
    labs: [L.tsh("6.1", "H"), L.hb("10.9", "L"), L.ferritin("18"), L.vitd("22", "L")],
  },
  {
    id: uuid("d", 4), date: "2025-06-15", type: "prescription", filename: "Sunrise_Endocrine_Rx_Jun2025.pdf", ...SUNRISE,
    eventType: "prescription", title: "Thyroid dose increased — Sunrise Endocrine Clinic",
    summary: "Levothyroxine increased from 50 mcg to 75 mcg. Weekly vitamin D course completed.",
    notes: ["Diagnosis: Primary hypothyroidism, TSH still above range.", "Stop levothyroxine 50 mcg. Start 75 mcg from tomorrow.", "Continue ferrous ascorbate."],
  },
  {
    id: uuid("d", 5), date: "2025-09-15", type: "lab_report", filename: "Metro_Diagnostics_Sep2025.pdf", ...METRO,
    eventType: "lab", title: "Thyroid back in range — Metro Diagnostics",
    summary: "TSH 3.8, hemoglobin 11.8 (L), ferritin 34, vitamin D 31 and fasting sugar 96 recorded.",
    labs: [L.tsh("3.8"), L.hb("11.8", "L"), L.ferritin("34"), L.vitd("31"), L.fbs("96")],
  },
  {
    id: uuid("d", 6), date: "2025-09-20", type: "prescription", filename: "Sunrise_Endocrine_Rx_Sep2025.pdf", ...SUNRISE,
    eventType: "prescription", title: "Maintenance plan — Sunrise Endocrine Clinic",
    summary: "Levothyroxine 75 mcg continued. Daily vitamin D 1000 IU started for maintenance.",
    notes: ["Diagnosis: Hypothyroidism, controlled on current dose.", "Continue levothyroxine 75 mcg. Start cholecalciferol 1000 IU daily."],
  },
  {
    id: uuid("d", 7), date: "2025-11-05", type: "prescription", filename: "Lakeview_Neuro_Rx_Nov2025.pdf",
    provider: "Dr. Rohan Desai", facility: "Lakeview Neuro Centre", address: "88 Temple Street, Chennai 600004",
    eventType: "consultation", title: "Migraine consultation — Lakeview Neuro Centre",
    summary: "Dr. Rohan Desai diagnosed migraine without aura; sumatriptan as needed and propranolol for prevention.",
    notes: ["Diagnosis: Migraine without aura (4-5 episodes a month).", "Keep a headache diary. Avoid skipping meals.", "Note: allergic to sulfa drugs (patient reported)."],
  },
  {
    id: uuid("d", 8), date: "2026-01-14", type: "lab_report", filename: "Metro_Diagnostics_Annual_Jan2026.pdf", ...METRO,
    eventType: "lab", title: "Annual health check — Metro Diagnostics",
    summary: "TSH 2.6, hemoglobin 12.6, ferritin 52, vitamin D 38, LDL 128 (H) and fasting sugar 94 recorded.",
    labs: [L.tsh("2.6"), L.hb("12.6"), L.ferritin("52"), L.vitd("38"), L.ldl("128", "H"), L.fbs("94")],
  },
  {
    id: uuid("d", 9), date: "2026-02-03", type: "lab_report", filename: "Riverside_Hospital_CBC_Feb2026.pdf",
    provider: "Dr. M. Fathima, Pathologist", facility: "Riverside Hospital Laboratory", address: "1 Riverside Avenue, Chennai 600028",
    eventType: "lab", title: "Pre-procedure blood count — Riverside Hospital",
    summary: "Hemoglobin 12.5 recorded before endoscopy, 20 days after the January test.",
    labs: [L.hb("12.5")],
  },
  {
    id: uuid("d", 10), date: "2026-02-10", type: "prescription", filename: "Greenleaf_Clinic_Rx_Feb2026.pdf",
    provider: "Dr. Sneha Pillai", facility: "Greenleaf Family Clinic", address: "23 Park Lane, Chennai 600020",
    eventType: "prescription", title: "Acidity and stomach pain — Greenleaf Family Clinic",
    summary: "Dr. Sneha Pillai prescribed pantoprazole 40 mg before breakfast and referred to a gastroenterologist.",
    notes: ["Complaint: Burning upper abdominal pain for 3 weeks.", "Referred to gastroenterology for endoscopy."],
  },
  {
    id: uuid("d", 11), date: "2026-03-02", type: "discharge_summary", filename: "Riverside_Gastro_Endoscopy_Mar2026.pdf",
    provider: "Dr. Anil Varghese", facility: "Riverside Gastro Care", address: "1 Riverside Avenue, Chennai 600028",
    eventType: "procedure", title: "Day-care endoscopy — Riverside Gastro Care",
    summary: "Upper GI endoscopy showed mild antral gastritis. Pantoprazole 40 mg prescribed for 8 weeks.",
    notes: ["Procedure: Upper GI endoscopy under light sedation. Discharged the same day.", "Findings: Mild antral gastritis. No ulcer. Rapid urease test negative.", "Diagnosis: Gastritis."],
  },
  {
    id: uuid("d", 12), date: "2026-05-20", type: "lab_report", filename: "Metro_Diagnostics_May2026.pdf", ...METRO,
    eventType: "lab", title: "Thyroid and iron review — Metro Diagnostics",
    summary: "TSH 2.2, hemoglobin 12.9 and ferritin 61 recorded.",
    labs: [L.tsh("2.2"), L.hb("12.9"), L.ferritin("61")],
  },
  {
    id: uuid("d", 13), date: "2026-09-18", type: "lab_report", filename: "Metro_Diagnostics_Sep2026.pdf", ...METRO,
    eventType: "lab", title: "Latest results — Metro Diagnostics",
    summary: "TSH 2.4, hemoglobin 13.1, vitamin D 41, LDL 118 (H) and fasting sugar 98 recorded.",
    labs: [L.tsh("2.4"), L.hb("13.1"), L.vitd("41"), L.ldl("118", "H"), L.fbs("98")],
  },
];

const DOC = Object.fromEntries(SAMPLE_DOCUMENTS.map((d) => [d.date + d.type, d]));
const doc = (date: string, type: SampleDocument["type"]) => DOC[date + type];

// ─── Medications (also printed on their prescription PDFs) ─────────────────

export interface SampleMedication {
  id: string;
  doc: SampleDocument;
  name: string;
  normalized: string;
  ingredient: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string | null;
  instructions: string | null;
  start: string;
  end: string | null;
  status: "active" | "historical" | "discontinued";
}

const RX_MAR25 = doc("2025-03-14", "prescription");
const RX_JUN25 = doc("2025-06-15", "prescription");
const RX_SEP25 = doc("2025-09-20", "prescription");
const RX_NOV25 = doc("2025-11-05", "prescription");
const RX_FEB26 = doc("2026-02-10", "prescription");
const DS_MAR26 = doc("2026-03-02", "discharge_summary");

export const SAMPLE_MEDICATION_SPECS: SampleMedication[] = [
  { id: uuid("e", 1), doc: RX_MAR25, name: "Levothyroxine 50 mcg", normalized: "levothyroxine", ingredient: "Levothyroxine Sodium", strength: "50 mcg", dosage: "1 tablet", frequency: "Once daily, empty stomach", duration: "Until review", instructions: "30 minutes before breakfast", start: "2025-03-15", end: "2025-06-15", status: "discontinued" },
  { id: uuid("e", 2), doc: RX_MAR25, name: "Ferrous Ascorbate 100 mg", normalized: "ferrous ascorbate", ingredient: "Ferrous Ascorbate", strength: "100 mg", dosage: "1 tablet", frequency: "Once daily after lunch", duration: "6 months", instructions: null, start: "2025-03-15", end: "2026-01-20", status: "historical" },
  { id: uuid("e", 3), doc: RX_MAR25, name: "Cholecalciferol 60,000 IU", normalized: "cholecalciferol", ingredient: "Cholecalciferol (Vitamin D3)", strength: "60,000 IU", dosage: "1 sachet", frequency: "Once a week", duration: "8 weeks", instructions: "With milk", start: "2025-03-15", end: "2025-05-10", status: "historical" },
  { id: uuid("e", 4), doc: RX_JUN25, name: "Levothyroxine 75 mcg", normalized: "levothyroxine", ingredient: "Levothyroxine Sodium", strength: "75 mcg", dosage: "1 tablet", frequency: "Once daily, empty stomach", duration: "Long term", instructions: "30 minutes before breakfast", start: "2025-06-16", end: null, status: "active" },
  { id: uuid("e", 5), doc: RX_SEP25, name: "Cholecalciferol 1000 IU", normalized: "cholecalciferol", ingredient: "Cholecalciferol (Vitamin D3)", strength: "1000 IU", dosage: "1 tablet", frequency: "Once daily", duration: "Long term", instructions: null, start: "2025-09-21", end: null, status: "active" },
  { id: uuid("e", 6), doc: RX_NOV25, name: "Sumatriptan 50 mg", normalized: "sumatriptan", ingredient: "Sumatriptan Succinate", strength: "50 mg", dosage: "1 tablet", frequency: "At migraine onset, max 2 a day", duration: "As needed", instructions: null, start: "2025-11-05", end: null, status: "active" },
  { id: uuid("e", 7), doc: RX_NOV25, name: "Propranolol 20 mg", normalized: "propranolol", ingredient: "Propranolol Hydrochloride", strength: "20 mg", dosage: "1 tablet", frequency: "Twice daily", duration: "3 months, then review", instructions: null, start: "2025-11-05", end: null, status: "active" },
  { id: uuid("e", 8), doc: RX_FEB26, name: "Pantoprazole 40 mg", normalized: "pantoprazole", ingredient: "Pantoprazole Sodium", strength: "40 mg", dosage: "1 tablet", frequency: "Once daily before breakfast", duration: "4 weeks", instructions: null, start: "2026-02-10", end: null, status: "active" },
  { id: uuid("e", 9), doc: DS_MAR26, name: "Pantoprazole 40 mg", normalized: "pantoprazole", ingredient: "Pantoprazole Sodium", strength: "40 mg", dosage: "1 tablet", frequency: "Once daily before breakfast", duration: "8 weeks", instructions: null, start: "2026-03-02", end: null, status: "active" },
];

// ─── Database-shaped rows ────────────────────────────────────────────────────

const trace = (page: number | null, excerpt: string | null) => ({ extraction_id: null, source_page: page, source_excerpt: excerpt });

export const SAMPLE_DOCUMENT_ROWS: Tables<"documents">[] = SAMPLE_DOCUMENTS.map((d, i) => ({
  id: d.id,
  patient_id: P,
  storage_path: `sample/${d.id}.pdf`,
  original_filename: d.filename,
  mime_type: "application/pdf",
  document_type: d.type,
  document_date: d.date,
  provider_name: d.provider,
  facility_name: d.facility,
  extraction_status: "done",
  verification_status: "verified",
  extracted_data: null,
  content_sha256: null,
  size_bytes: null,
  page_count: 1,
  processing_error: null,
  processing_attempts: 1,
  processing_started_at: at(d.date, "18:00:00"),
  processed_at: at(d.date, "18:00:40"),
  cancelled_at: null,
  metadata: META,
  created_at: at(d.date, `18:0${i % 10}:00`),
  updated_at: at(d.date, "18:05:00"),
}));

export const SAMPLE_LAB_ROWS: Tables<"lab_results">[] = SAMPLE_DOCUMENTS.flatMap((d) =>
  (d.labs ?? []).map((lab, i) => ({
    id: uuid(`f${d.id.slice(-2)}`, i + 1),
    patient_id: P,
    source_document_id: d.id,
    test_name: lab.test,
    normalized_test_name: lab.key,
    result_value: lab.value,
    unit: lab.unit,
    reference_range: `${lab.range} ${lab.unit}`,
    is_abnormal: lab.flag !== null,
    report_flag: lab.flag,
    test_date: d.date,
    lab_name: d.facility,
    verification_status: "verified",
    ...trace(1, `${lab.test} ${lab.value} ${lab.unit}`),
    metadata: META,
    created_at: at(d.date, "18:10:00"),
    updated_at: at(d.date, "18:10:00"),
  }))
);

export const SAMPLE_MEDICATION_ROWS: Tables<"medications">[] = SAMPLE_MEDICATION_SPECS.map((m) => ({
  id: m.id,
  patient_id: P,
  source_document_id: m.doc.id,
  name: m.name,
  normalized_name: m.normalized,
  ingredient: m.ingredient,
  strength: m.strength,
  dosage: m.dosage,
  frequency: m.frequency,
  duration: m.duration,
  instructions: m.instructions,
  route: "Oral",
  start_date: m.start,
  end_date: m.end,
  status: m.status,
  verification_status: "verified",
  prescriber_name: m.doc.provider,
  facility_name: m.doc.facility,
  ...trace(1, m.name),
  metadata: META,
  created_at: at(m.doc.date, "18:10:00"),
  updated_at: at(m.end ?? m.doc.date, "18:10:00"),
}));

const condition = (n: number, name: string, status: "active" | "resolved", d: SampleDocument, diagnosed: string): Tables<"conditions"> => ({
  id: uuid("c", n),
  patient_id: P,
  name,
  status,
  diagnosed_date: diagnosed,
  verification_status: "verified",
  source_document_id: d.id,
  ...trace(1, name),
  metadata: META,
  created_at: at(d.date, "18:10:00"),
  updated_at: at(d.date, "18:10:00"),
});

export const SAMPLE_CONDITION_ROWS: Tables<"conditions">[] = [
  condition(1, "Primary Hypothyroidism", "active", RX_MAR25, "2025-03-14"),
  condition(2, "Iron Deficiency Anaemia", "resolved", RX_MAR25, "2025-03-14"),
  condition(3, "Vitamin D Deficiency", "resolved", RX_MAR25, "2025-03-14"),
  condition(4, "Migraine without Aura", "active", RX_NOV25, "2025-11-05"),
  condition(5, "Gastritis", "active", DS_MAR26, "2026-03-02"),
];

export const SAMPLE_ALLERGY_ROWS: Tables<"allergies">[] = [
  {
    id: uuid("a", 1), patient_id: P, substance: "Sulfonamide antibiotics", reaction: "Hives and itching",
    verification_status: "verified", source_document_id: RX_NOV25.id, ...trace(1, "allergic to sulfa drugs"),
    metadata: META, created_at: at("2025-11-05", "18:10:00"), updated_at: at("2025-11-05", "18:10:00"),
  },
  {
    id: uuid("a", 2), patient_id: P, substance: "Peanuts", reaction: "Lip swelling and wheezing",
    verification_status: "verified", source_document_id: null, ...trace(null, null),
    metadata: { ...META, source: "patient_reported" }, created_at: at("2025-03-10", "08:40:00"), updated_at: at("2025-03-10", "08:40:00"),
  },
];

export const SAMPLE_EVENT_ROWS: Tables<"medical_events">[] = SAMPLE_DOCUMENTS.map((d, i) => ({
  id: uuid("b", i + 1),
  patient_id: P,
  document_id: d.id,
  event_type: d.eventType,
  event_date: d.date,
  title: d.title,
  summary: d.summary,
  provider_name: d.provider,
  facility_name: d.facility,
  structured_data: null,
  verification_status: "verified",
  ...trace(1, null),
  metadata: META,
  created_at: at(d.date, "18:10:00"),
  updated_at: at(d.date, "18:10:00"),
}));

// ─── Sharing, emergency card, history ────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;

const SHARE_ROWS: Tables<"record_shares">[] = [
  {
    id: SAMPLE_ACTIVE_SHARE_ID, patient_id: P, token_hash: "sample-active-share", pin_hash: "sample-not-a-real-hash",
    scope: { categories: ["medications", "conditions", "lab_results", "allergies"] },
    label: "Dr. Varghese — gastro follow-up", document_ids: [], date_range_start: null, date_range_end: null,
    expires_at: "", // rolling: see sampleShares()
    revoked_at: null, consent_given_at: at("2026-09-22", "09:00:00"), failed_pin_attempts: 0, locked_until: null,
    last_accessed_at: at("2026-09-24", "11:42:00"), metadata: META, created_at: at("2026-09-22", "09:00:00"),
  },
  {
    id: uuid("a00", 2), patient_id: P, token_hash: "sample-revoked-share", pin_hash: "sample-not-a-real-hash",
    scope: { categories: ["medications", "allergies"] },
    label: "Pharmacy — medicines only", document_ids: [], date_range_start: null, date_range_end: null,
    expires_at: at("2026-07-01", "09:00:00"), revoked_at: at("2026-06-05", "17:30:00"),
    consent_given_at: at("2026-06-01", "09:00:00"), failed_pin_attempts: 0, locked_until: null,
    last_accessed_at: at("2026-06-01", "12:15:00"), metadata: META, created_at: at("2026-06-01", "09:00:00"),
  },
  {
    id: uuid("a00", 3), patient_id: P, token_hash: "sample-expired-share", pin_hash: "sample-not-a-real-hash",
    scope: { categories: ["lab_results", "conditions", "timeline"] },
    label: "Dr. Raman — thyroid review", document_ids: [], date_range_start: null, date_range_end: null,
    expires_at: at("2026-01-21", "09:00:00"), revoked_at: null,
    consent_given_at: at("2026-01-14", "19:00:00"), failed_pin_attempts: 0, locked_until: null,
    last_accessed_at: at("2026-01-16", "10:05:00"), metadata: META, created_at: at("2026-01-14", "19:00:00"),
  },
];

/** The active link always expires 14 days after `now`, so the sample link keeps working. */
export function sampleShares(now: Date = new Date()): Tables<"record_shares">[] {
  const rolling = new Date(now.getTime() + 14 * DAY).toISOString();
  return SHARE_ROWS.map((row) => (row.expires_at ? row : { ...row, expires_at: rolling }));
}

export const SAMPLE_EMERGENCY_ROW: Tables<"emergency_access"> = {
  id: uuid("a10", 1),
  patient_id: P,
  token_hash: "sample-emergency",
  show_blood_group: true,
  show_date_of_birth: true,
  show_allergies: true,
  show_conditions: true,
  show_emergency_contact: true,
  medication_ids: [uuid("e", 4), uuid("e", 6), uuid("e", 7)],
  patient_note: "Severe peanut allergy. On daily thyroid tablets. Migraine: may be sensitive to bright light.",
  consent_given_at: at("2025-11-10", "20:00:00"),
  expires_at: "2099-01-01T00:00:00Z",
  revoked_at: null,
  last_accessed_at: null,
  created_at: at("2025-11-10", "20:00:00"),
  updated_at: at("2026-03-05", "21:00:00"),
};

const audit = (n: number, event_type: string, created_at: string, extra: Partial<Tables<"audit_logs">> = {}, metadata: Record<string, string> = {}): Tables<"audit_logs"> => ({
  id: uuid("a20", n), patient_id: P, share_id: null, document_id: null, event_type, metadata: { ...META, ...metadata }, created_at, ...extra,
});

export const SAMPLE_AUDIT_ROWS: Tables<"audit_logs">[] = [
  ...SAMPLE_DOCUMENTS.flatMap((d, i) => [
    audit(i * 2 + 1, "document_uploaded", at(d.date, "18:00:00"), { document_id: d.id }, { filename: d.filename }),
    audit(i * 2 + 2, "extraction_confirmed", at(d.date, "18:10:00"), { document_id: d.id }, { filename: d.filename }),
  ]),
  audit(50, "emergency_access_created", at("2025-11-10", "20:00:00")),
  audit(51, "share_created", at("2026-01-14", "19:00:00"), { share_id: uuid("a00", 3) }, { label: "Dr. Raman — thyroid review" }),
  audit(52, "record_edited", at("2026-01-20", "21:15:00"), {}, {}),
  audit(53, "emergency_access_updated", at("2026-03-05", "21:00:00")),
  audit(54, "share_created", at("2026-06-01", "09:00:00"), { share_id: uuid("a00", 2) }, { label: "Pharmacy — medicines only" }),
  audit(55, "profile_updated", at("2026-06-02", "18:05:00")),
  audit(56, "share_revoked", at("2026-06-05", "17:30:00"), { share_id: uuid("a00", 2) }, { label: "Pharmacy — medicines only" }),
  audit(57, "share_created", at("2026-09-22", "09:00:00"), { share_id: SAMPLE_ACTIVE_SHARE_ID }, { label: "Dr. Varghese — gastro follow-up" }),
];

const access = (n: number, outcome: string, occurred_at: string, target: { share_id?: string; emergency_access_id?: string }, user_agent: string): Tables<"share_access_logs"> => ({
  id: uuid("a30", n), patient_id: P, share_id: target.share_id ?? null, emergency_access_id: target.emergency_access_id ?? null,
  outcome, ip_hash: null, user_agent, occurred_at,
});

const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/138.0";
const PHONE = "Mozilla/5.0 (Linux; Android 15) Mobile Safari/537.36";

export const SAMPLE_ACCESS_ROWS: Tables<"share_access_logs">[] = [
  access(1, "granted", at("2026-01-16", "10:05:00"), { share_id: uuid("a00", 3) }, DESKTOP),
  access(2, "expired", at("2026-02-02", "09:30:00"), { share_id: uuid("a00", 3) }, DESKTOP),
  access(3, "granted", at("2026-06-01", "12:15:00"), { share_id: uuid("a00", 2) }, PHONE),
  access(4, "revoked", at("2026-06-09", "16:20:00"), { share_id: uuid("a00", 2) }, PHONE),
  access(5, "granted", at("2026-03-05", "21:02:00"), { emergency_access_id: SAMPLE_EMERGENCY_ROW.id }, PHONE),
  access(6, "pin_failed", at("2026-09-24", "11:40:00"), { share_id: SAMPLE_ACTIVE_SHARE_ID }, DESKTOP),
  access(7, "granted", at("2026-09-24", "11:42:00"), { share_id: SAMPLE_ACTIVE_SHARE_ID }, DESKTOP),
];
