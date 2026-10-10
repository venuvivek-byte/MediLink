import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import {
  EMERGENCY_ROW_COLUMNS,
  SHARE_ROW_COLUMNS,
  mapAccessLog,
  mapAllergy,
  mapAuditEvent,
  mapDuplicateDecision,
  mapCondition,
  mapDocument,
  mapEmergencySettings,
  mapLabResult,
  mapMedication,
  mapProfile,
  mapShareLink,
  mapTimelineEvent,
} from "./mappers";
import { DataAccessError, type PatientRepository } from "./repository";

type Client = SupabaseClient<Database>;
type PostgrestLikeError = { code?: string } | null;

/**
 * Reads through the user-scoped client, so RLS applies. Every query ALSO
 * filters on patient_id explicitly: if a policy were ever misconfigured, the
 * app still would not render another patient's rows.
 */
export class SupabasePatientRepository implements PatientRepository {
  readonly source = "supabase" as const;

  constructor(
    private readonly client: Client,
    private readonly patientId: string
  ) {}

  private check<T>(entity: string, result: { data: T | null; error: PostgrestLikeError }): T {
    if (result.error) {
      // Log the error code only: messages can echo query values.
      console.error(`[data] failed to load ${entity}`, { code: result.error.code ?? "unknown" });
      throw new DataAccessError(entity);
    }
    return result.data as T;
  }

  async getProfile() {
    const row = this.check(
      "profile",
      await this.client.from("profiles").select("*").eq("user_id", this.patientId).maybeSingle()
    );
    return row ? mapProfile(row) : null;
  }

  async listDocuments() {
    const rows = this.check(
      "documents",
      await this.client
        .from("documents")
        .select("*")
        .eq("patient_id", this.patientId)
        .order("created_at", { ascending: false })
    );
    return rows.map(mapDocument);
  }

  async listTimelineEvents() {
    const rows = this.check(
      "timeline",
      await this.client
        .from("medical_events")
        .select("*")
        .eq("patient_id", this.patientId)
        .order("event_date", { ascending: false, nullsFirst: false })
    );
    return rows.map(mapTimelineEvent);
  }

  async listMedications() {
    const rows = this.check(
      "medications",
      await this.client
        .from("medications")
        .select("*")
        .eq("patient_id", this.patientId)
        .order("start_date", { ascending: false, nullsFirst: false })
    );
    return rows.map(mapMedication);
  }

  async listLabResults() {
    const rows = this.check(
      "lab results",
      await this.client
        .from("lab_results")
        .select("*")
        .eq("patient_id", this.patientId)
        .order("test_date", { ascending: false, nullsFirst: false })
    );
    return rows.map(mapLabResult);
  }

  async listConditions() {
    const rows = this.check(
      "conditions",
      await this.client.from("conditions").select("*").eq("patient_id", this.patientId)
    );
    return rows.map(mapCondition);
  }

  async listAllergies() {
    const rows = this.check(
      "allergies",
      await this.client.from("allergies").select("*").eq("patient_id", this.patientId)
    );
    return rows.map(mapAllergy);
  }

  async listShareLinks() {
    // Explicit column list: token_hash and pin_hash never leave the database.
    const rows = this.check(
      "share links",
      await this.client
        .from("record_shares")
        .select(SHARE_ROW_COLUMNS)
        .eq("patient_id", this.patientId)
        .order("created_at", { ascending: false })
    );
    return rows.map(mapShareLink);
  }

  async listAuditEvents() {
    const rows = this.check(
      "audit history",
      await this.client
        .from("audit_logs")
        .select("*")
        .eq("patient_id", this.patientId)
        .order("created_at", { ascending: false })
        .limit(200)
    );
    return rows.map(mapAuditEvent);
  }

  async listDuplicateDecisions() {
    const rows = this.check(
      "duplicate decisions",
      await this.client
        .from("duplicate_decisions")
        .select("*")
        .eq("patient_id", this.patientId)
    );
    return rows.map(mapDuplicateDecision).filter((d): d is NonNullable<typeof d> => d !== null);
  }

  async getEmergencySettings() {
    // Explicit column list: token_hash never leaves the database.
    const row = this.check(
      "emergency link",
      await this.client
        .from("emergency_access")
        .select(EMERGENCY_ROW_COLUMNS)
        .eq("patient_id", this.patientId)
        .is("revoked_at", null)
        .maybeSingle()
    );
    return row ? mapEmergencySettings(row) : null;
  }

  async listAccessLogs() {
    const rows = this.check(
      "access history",
      await this.client
        .from("share_access_logs")
        .select("id, share_id, emergency_access_id, outcome, user_agent, occurred_at")
        .eq("patient_id", this.patientId)
        .order("occurred_at", { ascending: false })
        .limit(200)
    );
    return rows.map(mapAccessLog).filter((e): e is NonNullable<typeof e> => e !== null);
  }
}
