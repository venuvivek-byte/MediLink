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
  reviewStatus: ReviewStatus;
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
}

export interface LabResult {
  id: string;
  testName: string;
  normalizedTestName: string;
  value: string | null;
  unit: string | null;
  /** Exactly as printed on the source report, if present. */
  referenceRange: string | null;
  testDate: string | null;
  reviewStatus: ReviewStatus;
  sourceDocumentId: string | null;
}

export interface Condition {
  id: string;
  name: string;
  status: "active" | "resolved" | "unknown";
  reviewStatus: ReviewStatus;
  sourceDocumentId: string | null;
}

export interface Allergy {
  id: string;
  substance: string;
  reaction: string | null;
  reviewStatus: ReviewStatus;
  sourceDocumentId: string | null;
}

export type ShareCategory = "medications" | "conditions" | "lab_results" | "allergies" | "documents" | "timeline";

export interface ShareLinkSummary {
  id: string;
  label: string;
  categories: ShareCategory[];
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string | null;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  occurredAt: string | null;
  /** Allow-listed, non-sensitive details only. */
  details: { label: string; value: string }[];
}
