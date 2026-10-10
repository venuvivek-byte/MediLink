import type { DemoDataset } from "../dataset";
import {
  SAMPLE_ACCESS_ROWS,
  SAMPLE_ACTIVE_SHARE_ID,
  SAMPLE_ALLERGY_ROWS,
  SAMPLE_AUDIT_ROWS,
  SAMPLE_CONDITION_ROWS,
  SAMPLE_DOCUMENT_ROWS,
  SAMPLE_EMERGENCY_ROW,
  SAMPLE_EMERGENCY_TOKEN,
  SAMPLE_EVENT_ROWS,
  SAMPLE_LAB_ROWS,
  SAMPLE_MEDICATION_ROWS,
  SAMPLE_PROFILE,
  SAMPLE_SHARE_PIN,
  SAMPLE_SHARE_TOKEN,
  sampleShares,
} from "./data";

/**
 * The "Try sample" patient: synthetic, read-only, bundled with the app. Its
 * original PDFs are rendered from the same records by
 * scripts/sample/generate-files.mjs into ./files.
 */
export const SAMPLE_DATASET: DemoDataset | null = {
  kind: "sample",
  patient: SAMPLE_PROFILE,
  conditions: SAMPLE_CONDITION_ROWS,
  allergies: SAMPLE_ALLERGY_ROWS,
  medications: SAMPLE_MEDICATION_ROWS,
  labResults: SAMPLE_LAB_ROWS,
  documents: SAMPLE_DOCUMENT_ROWS,
  events: SAMPLE_EVENT_ROWS,
  shares: sampleShares,
  auditLogs: SAMPLE_AUDIT_ROWS,
  emergencyAccess: SAMPLE_EMERGENCY_ROW,
  accessLogs: SAMPLE_ACCESS_ROWS,
  publicLinks: {
    shareToken: SAMPLE_SHARE_TOKEN,
    sharePin: SAMPLE_SHARE_PIN,
    shareId: SAMPLE_ACTIVE_SHARE_ID,
    emergencyToken: SAMPLE_EMERGENCY_TOKEN,
  },
  files: Object.fromEntries(SAMPLE_DOCUMENT_ROWS.map((d) => [d.id, `${d.id}.pdf`])),
};
