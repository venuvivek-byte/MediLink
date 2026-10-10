import type {
  Allergy,
  AuditEvent,
  Condition,
  DocumentSummary,
  LabResult,
  Medication,
  PatientProfile,
  ShareLinkSummary,
  TimelineEvent,
  DuplicateDecision,
} from "./types";

/**
 * Read access to ONE patient's records. Implementations are constructed
 * with the patient id taken from the verified session and expose no way to
 * ask for another patient's data.
 */
export interface PatientRepository {
  readonly source: "demo" | "supabase";
  getProfile(): Promise<PatientProfile | null>;
  listDocuments(): Promise<DocumentSummary[]>;
  listTimelineEvents(): Promise<TimelineEvent[]>;
  listMedications(): Promise<Medication[]>;
  listLabResults(): Promise<LabResult[]>;
  listConditions(): Promise<Condition[]>;
  listAllergies(): Promise<Allergy[]>;
  listShareLinks(): Promise<ShareLinkSummary[]>;
  listAuditEvents(): Promise<AuditEvent[]>;
  listDuplicateDecisions(): Promise<DuplicateDecision[]>;
}

/** Thrown with a generic message; the cause is logged server-side without record contents. */
export class DataAccessError extends Error {
  constructor(entity: string) {
    super(`Could not load ${entity}. Please try again.`);
    this.name = "DataAccessError";
  }
}
