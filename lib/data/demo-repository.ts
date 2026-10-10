import {
  DEMO_ALLERGIES,
  DEMO_AUDIT_LOGS,
  DEMO_CONDITIONS,
  DEMO_DOCUMENTS,
  DEMO_LAB_RESULTS,
  DEMO_MEDICAL_EVENTS,
  DEMO_MEDICATIONS,
  DEMO_PATIENT,
  demoShares,
} from "@/lib/demo/data";
import {
  mapAllergy,
  mapAuditEvent,
  mapCondition,
  mapDocument,
  mapLabResult,
  mapMedication,
  mapProfile,
  mapShareLink,
  mapTimelineEvent,
} from "./mappers";
import type { PatientRepository } from "./repository";
import { byDateDesc } from "./sort";

/**
 * Fictional, in-memory data. Filters by patient id exactly like the database
 * does, so isolation behaviour can be tested without Supabase.
 */
export class DemoPatientRepository implements PatientRepository {
  readonly source = "demo" as const;

  constructor(private readonly patientId: string) {}

  private own<T extends { patient_id: string | null }>(rows: T[]): T[] {
    return rows.filter((row) => row.patient_id === this.patientId);
  }

  async getProfile() {
    return DEMO_PATIENT.user_id === this.patientId ? mapProfile(DEMO_PATIENT) : null;
  }

  async listDocuments() {
    return this.own(DEMO_DOCUMENTS).map(mapDocument).sort(byDateDesc((d) => d.documentDate ?? d.uploadedAt));
  }

  async listTimelineEvents() {
    return this.own(DEMO_MEDICAL_EVENTS).map(mapTimelineEvent).sort(byDateDesc((e) => e.eventDate));
  }

  async listMedications() {
    return this.own(DEMO_MEDICATIONS).map(mapMedication).sort(byDateDesc((m) => m.startDate));
  }

  async listLabResults() {
    return this.own(DEMO_LAB_RESULTS).map(mapLabResult).sort(byDateDesc((l) => l.testDate));
  }

  async listConditions() {
    return this.own(DEMO_CONDITIONS).map(mapCondition);
  }

  async listAllergies() {
    return this.own(DEMO_ALLERGIES).map(mapAllergy);
  }

  async listShareLinks() {
    return this.own(demoShares()).map(mapShareLink).sort(byDateDesc((s) => s.createdAt));
  }

  async listAuditEvents() {
    return this.own(DEMO_AUDIT_LOGS).map(mapAuditEvent).sort(byDateDesc((a) => a.occurredAt));
  }

  /** Demo mode is read-only: no decisions are ever stored. */
  async listDuplicateDecisions() {
    return [];
  }
}
