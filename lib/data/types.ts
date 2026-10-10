// Data Transfer Objects: the only shapes the UI receives. They never carry
// storage paths, token/PIN hashes, or raw extraction blobs.

/**
 * - `pending_review`: imported (e.g. by OCR/AI) but not yet confirmed by the patient.
 * - `patient_reviewed`: the patient checked and confirmed it against the source.
 *   This is NOT clinical verification by a healthcare professional.
 */
export type ReviewStatus = "pending_review" | "patient_reviewed";

/** `uncertain` means the record does not say whether the medicine is still taken. */
export type MedicationStatus = "current" | "historical" | "discontinued" | "uncertain";

export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

export type DocumentType = "prescription" | "lab_report" | "discharge_summary" | "other";

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string | null;
}

export interface PatientProfile {
  displayName: string;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  emergencyContact: EmergencyContact | null;
}

export interface DocumentSummary {
  id: string;
  filename: string;
  mimeType: string;
  documentType: DocumentType | null;
  documentDate: string | null;
  providerName: string | null;
  facilityName: string | null;
  processingStatus: ProcessingStatus;
  /** Patient-facing reason when processing failed. Never contains document text. */
  processingError: string | null;
  reviewStatus: ReviewStatus;
  /** The patient cancelled the import; the original file is kept until deleted. */
  cancelled: boolean;
  pageCount: number | null;
  uploadedAt: string | null;
}

export interface TimelineEvent {
  id: string;
  eventType: string;
  eventDate: string | null;
  title: string;
  summary: string | null;
  providerName: string | null;
  facilityName: string | null;
  reviewStatus: ReviewStatus;
  sourceDocumentId: string | null;
  sourcePage: number | null;
}

export interface Medication {
  id: string;
  name: string;
  normalizedName: string;
  ingredient: string | null;
  strength: string | null;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  startDate: string | null;
  endDate: string | null;
  status: MedicationStatus;
  reviewStatus: ReviewStatus;
  prescriberName: string | null;
  facilityName: string | null;
  sourceDocumentId: string | null;
  /** Page of the source document the entry was confirmed from. */
  sourcePage: number | null;
}

export interface LabResult {
  id: string;
  testName: string;
  normalizedTestName: string;
  value: string | null;
  unit: string | null;
  /** Exactly as printed on the source report, if present. */
  referenceRange: string | null;
  /** High/low marker exactly as printed on the report (e.g. "H"); null if none. Never computed. */
  reportFlag: string | null;
  testDate: string | null;
  reviewStatus: ReviewStatus;
  sourceDocumentId: string | null;
  sourcePage: number | null;
}

export interface Condition {
  id: string;
  name: string;
  status: "active" | "resolved" | "unknown";
  reviewStatus: ReviewStatus;
  sourceDocumentId: string | null;
  sourcePage: number | null;
}

export interface Allergy {
  id: string;
  substance: string;
  reaction: string | null;
  reviewStatus: ReviewStatus;
  sourceDocumentId: string | null;
  sourcePage: number | null;
}

export type RecordKind = "medication" | "lab_result" | "condition" | "allergy" | "medical_event";

/** The patient decided these records are NOT duplicates; that exact set is not flagged again. */
export interface DuplicateDecision {
  kind: "medication" | "lab_result";
  /** Sorted record ids. */
  recordIds: string[];
}

export type ShareCategory = "medications" | "conditions" | "lab_results" | "allergies" | "documents" | "timeline";

export interface ShareLinkSummary {
  id: string;
  label: string;
  categories: ShareCategory[];
  /** False: only records the patient has reviewed are shown to the clinician. */
  includeUnreviewed: boolean;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string | null;
  lastAccessedAt: string | null;
  /** Set after repeated wrong PINs. */
  lockedUntil: string | null;
}

/** The patient's live emergency link settings. Never includes the token or its hash. */
export interface EmergencySettings {
  id: string;
  showBloodGroup: boolean;
  showDateOfBirth: boolean;
  showAllergies: boolean;
  showConditions: boolean;
  showEmergencyContact: boolean;
  medicationIds: string[];
  patientNote: string | null;
  expiresAt: string;
  createdAt: string;
  lastAccessedAt: string | null;
}

export type AccessOutcome = "granted" | "pin_failed" | "locked" | "expired" | "revoked";

/** One attempt to open a share or emergency link. The IP is stored only as a keyed hash and never shown. */
export interface AccessLogEntry {
  id: string;
  target: "share" | "emergency";
  shareId: string | null;
  outcome: AccessOutcome;
  userAgent: string | null;
  occurredAt: string;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  occurredAt: string | null;
  /** Allow-listed, non-sensitive details only. */
  details: { label: string; value: string }[];
}
