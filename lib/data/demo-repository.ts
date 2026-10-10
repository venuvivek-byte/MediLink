import { datasetForPatient, type DemoDataset } from "@/lib/demo/datasets";
import {
  mapAccessLog,
  mapAllergy,
  mapAuditEvent,
  mapCondition,
  mapDocument,
  mapEmergencySettings,
  mapLabResult,
  mapMedication,
  mapProfile,
  mapShareLink,
  mapTimelineEvent,
} from "./mappers";
import type { PatientRepository } from "./repository";
import { byDateDesc } from "./sort";

/**
 * Read-only, in-memory data (the fictional demo patient or the bundled
 * sample). Filters by patient id exactly like the database does, so
 * isolation behaviour can be tested without Supabase.
 */
export class DemoPatientRepository implements PatientRepository {
  readonly source = "demo" as const;
  private readonly data: DemoDataset | null;

  constructor(private readonly patientId: string) {
    this.data = datasetForPatient(patientId);
  }

  private own<T extends { patient_id: string | null }>(pick: (d: DemoDataset) => T[]): T[] {
    return this.data ? pick(this.data).filter((row) => row.patient_id === this.patientId) : [];
  }

  async getProfile() {
    const patient = this.data?.patient;
    return patient && patient.user_id === this.patientId ? mapProfile(patient) : null;
  }

  async listDocuments() {
    return this.own((d) => d.documents).map(mapDocument).sort(byDateDesc((d) => d.documentDate ?? d.uploadedAt));
  }

  async listTimelineEvents() {
    return this.own((d) => d.events).map(mapTimelineEvent).sort(byDateDesc((e) => e.eventDate));
  }

  async listMedications() {
    return this.own((d) => d.medications).map(mapMedication).sort(byDateDesc((m) => m.startDate));
  }

  async listLabResults() {
    return this.own((d) => d.labResults).map(mapLabResult).sort(byDateDesc((l) => l.testDate));
  }

  async listConditions() {
    return this.own((d) => d.conditions).map(mapCondition);
  }

  async listAllergies() {
    return this.own((d) => d.allergies).map(mapAllergy);
  }

  async listShareLinks() {
    return this.own((d) => d.shares()).map(mapShareLink).sort(byDateDesc((s) => s.createdAt));
  }

  async listAuditEvents() {
    return this.own((d) => d.auditLogs).map(mapAuditEvent).sort(byDateDesc((a) => a.occurredAt));
  }

  /** Demo data is read-only: no decisions are ever stored. */
  async listDuplicateDecisions() {
    return [];
  }

  async getEmergencySettings() {
    return this.own((d) => (d.emergencyAccess ? [d.emergencyAccess] : [])).map(mapEmergencySettings)[0] ?? null;
  }

  async listAccessLogs() {
    return this.own((d) => d.accessLogs)
      .map(mapAccessLog)
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort(byDateDesc((e) => e.occurredAt));
  }
}
