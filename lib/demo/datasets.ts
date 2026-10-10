import {
  DEMO_ACCESS_LOGS,
  DEMO_ALLERGIES,
  DEMO_AUDIT_LOGS,
  DEMO_CONDITIONS,
  DEMO_DOCUMENTS,
  DEMO_EMERGENCY_ACCESS,
  DEMO_EMERGENCY_TOKEN,
  DEMO_LAB_RESULTS,
  DEMO_MEDICAL_EVENTS,
  DEMO_MEDICATIONS,
  DEMO_PATIENT,
  DEMO_SHARE_PIN,
  DEMO_SHARE_TOKEN,
  demoShares,
} from "./data";
import type { DemoDataset } from "./dataset";
import { SAMPLE_DATASET } from "./sample";

export type { DemoDataset } from "./dataset";

export const FICTIONAL_DATASET: DemoDataset = {
  kind: "fictional",
  patient: DEMO_PATIENT,
  conditions: DEMO_CONDITIONS,
  allergies: DEMO_ALLERGIES,
  medications: DEMO_MEDICATIONS,
  labResults: DEMO_LAB_RESULTS,
  documents: DEMO_DOCUMENTS,
  events: DEMO_MEDICAL_EVENTS,
  shares: demoShares,
  auditLogs: DEMO_AUDIT_LOGS,
  emergencyAccess: DEMO_EMERGENCY_ACCESS,
  accessLogs: DEMO_ACCESS_LOGS,
  publicLinks: { shareToken: DEMO_SHARE_TOKEN, sharePin: DEMO_SHARE_PIN, shareId: "share-001", emergencyToken: DEMO_EMERGENCY_TOKEN },
  files: {},
};

/** Null until the sample has been generated (scripts/sample/README.md). */
export { SAMPLE_DATASET };

/** The dataset a demo session's patient id belongs to; null for any other id. */
export function datasetForPatient(patientId: string): DemoDataset | null {
  if (patientId === FICTIONAL_DATASET.patient.user_id) return FICTIONAL_DATASET;
  if (SAMPLE_DATASET && patientId === SAMPLE_DATASET.patient.user_id) return SAMPLE_DATASET;
  return null;
}

/**
 * Datasets whose public share/emergency links may resolve in the current
 * mode. The fictional patient only exists in DEMO_MODE; the sample is
 * read-only bundled data and is available in both modes.
 */
export function publicDatasets(mode: "demo" | "live"): DemoDataset[] {
  const all = mode === "demo" ? [FICTIONAL_DATASET, SAMPLE_DATASET] : [SAMPLE_DATASET];
  return all.filter((d): d is DemoDataset => d !== null);
}
