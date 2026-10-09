// Row -> DTO mappers shared by the demo and Supabase repositories, so both
// modes present data identically.
import type { Json, Tables } from "@/lib/types/database.types";
import { normalizeMedicationName, normalizeTestName } from "@/lib/domain/normalize";
import type {
  Allergy,
  AuditEvent,
  Condition,
  DocumentSummary,
  DocumentType,
  EmergencyContact,
  LabResult,
  Medication,
  MedicationStatus,
  PatientProfile,
  ProcessingStatus,
  ReviewStatus,
  ShareCategory,
  ShareLinkSummary,
  TimelineEvent,
} from "./types";

function asRecord(value: Json | null | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function str(record: Record<string, Json | undefined>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function toReviewStatus(value: string | null): ReviewStatus {
  // Anything other than an explicit confirmation is treated as unreviewed.
  return value === "verified" ? "patient_reviewed" : "pending_review";
}

function toMedicationStatus(value: string | null): MedicationStatus {
  switch (value) {
    case "active":
    case "current":
      return "current";
    case "historical":
      return "historical";
    case "discontinued":
      return "discontinued";
    default:
      return "uncertain";
  }
}

function toProcessingStatus(value: string | null): ProcessingStatus {
  switch (value) {
    case "done":
    case "completed":
      return "completed";
    case "processing":
      return "processing";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}

const DOCUMENT_TYPES: DocumentType[] = ["prescription", "lab_report", "discharge_summary", "other"];

function toDocumentType(value: string | null): DocumentType | null {
  return DOCUMENT_TYPES.includes(value as DocumentType) ? (value as DocumentType) : null;
}

function toEmergencyContact(value: Json | null): EmergencyContact | null {
  const record = asRecord(value);
  const name = str(record, "name");
  const phone = str(record, "phone");
  if (!name || !phone) return null;
  return { name, phone, relationship: str(record, "relationship") };
}

export function mapProfile(row: Tables<"profiles">): PatientProfile {
  return {
    displayName: row.display_name,
    dateOfBirth: row.date_of_birth,
    bloodGroup: row.blood_group,
    emergencyContact: toEmergencyContact(row.emergency_contact),
  };
}

export function mapDocument(row: Tables<"documents">): DocumentSummary {
  return {
    id: row.id,
    filename: row.original_filename,
    mimeType: row.mime_type,
    documentType: toDocumentType(row.document_type),
    documentDate: row.document_date,
    providerName: row.provider_name,
    facilityName: row.facility_name,
    processingStatus: toProcessingStatus(row.extraction_status),
    reviewStatus: toReviewStatus(row.verification_status),
    uploadedAt: row.created_at,
  };
}

export function mapTimelineEvent(row: Tables<"medical_events">): TimelineEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    eventDate: row.event_date,
    title: row.title,
    summary: row.summary,
    providerName: row.provider_name,
    facilityName: row.facility_name,
    reviewStatus: toReviewStatus(row.verification_status),
    sourceDocumentId: row.document_id,
  };
}

export function mapMedication(row: Tables<"medications">): Medication {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name?.trim() || normalizeMedicationName(row.name),
    ingredient: row.ingredient,
    strength: row.strength,
    dosage: row.dosage,
    frequency: row.frequency,
    route: row.route,
    startDate: row.start_date,
    endDate: row.end_date,
    status: toMedicationStatus(row.status),
    reviewStatus: toReviewStatus(row.verification_status),
    prescriberName: row.prescriber_name,
    facilityName: row.facility_name,
    sourceDocumentId: row.source_document_id,
  };
}

export function mapLabResult(row: Tables<"lab_results">): LabResult {
  return {
    id: row.id,
    testName: row.test_name,
    normalizedTestName: row.normalized_test_name?.trim() || normalizeTestName(row.test_name),
    value: row.result_value,
    unit: row.unit,
    referenceRange: row.reference_range,
    testDate: row.test_date,
    reviewStatus: toReviewStatus(row.verification_status),
    sourceDocumentId: row.source_document_id,
  };
}

export function mapCondition(row: Tables<"conditions">): Condition {
  const status = row.status === "active" || row.status === "resolved" ? row.status : "unknown";
  return {
    id: row.id,
    name: row.name,
    status,
    reviewStatus: toReviewStatus(row.verification_status),
    sourceDocumentId: row.source_document_id,
  };
}

export function mapAllergy(row: Tables<"allergies">): Allergy {
  return {
    id: row.id,
    substance: row.substance,
    reaction: row.reaction,
    reviewStatus: toReviewStatus(row.verification_status),
    sourceDocumentId: row.source_document_id,
  };
}

const SHARE_CATEGORIES: ShareCategory[] = [
  "medications",
  "conditions",
  "lab_results",
  "allergies",
  "documents",
  "timeline",
];

/** Excludes token_hash and pin_hash by construction. */
export type ShareRow = Pick<
  Tables<"record_shares">,
  "id" | "label" | "scope" | "expires_at" | "revoked_at" | "created_at"
>;

export function mapShareLink(row: ShareRow): ShareLinkSummary {
  const scope = asRecord(row.scope);
  const rawCategories = Array.isArray(scope.categories) ? scope.categories : [];
  return {
    id: row.id,
    label: row.label?.trim() || "Clinician share",
    categories: rawCategories.filter((c): c is ShareCategory =>
      SHARE_CATEGORIES.includes(c as ShareCategory)
    ),
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

/** Only these metadata keys are ever shown; everything else is dropped. */
const AUDIT_DETAIL_LABELS: Record<string, string> = {
  filename: "File",
  label: "Share",
  accessor: "Accessed by",
};

export function mapAuditEvent(row: Tables<"audit_logs">): AuditEvent {
  const meta = asRecord(row.metadata);
  const details = Object.entries(AUDIT_DETAIL_LABELS).flatMap(([key, label]) => {
    const value = str(meta, key);
    return value ? [{ label, value }] : [];
  });
  return {
    id: row.id,
    eventType: row.event_type,
    occurredAt: row.created_at,
    details,
  };
}
