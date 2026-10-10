import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMERGENCY_ROW_COLUMNS, mapEmergencySettings, mapShareLink } from "@/lib/data/mappers";
import { SupabasePatientRepository } from "@/lib/data/supabase-repository";
import type { PatientRepository } from "@/lib/data/repository";
import type { AccessOutcome, EmergencySettings, ShareLinkSummary } from "@/lib/data/types";

// Database access for PUBLIC (unauthenticated) share and emergency links.
//
// This is the only module that uses the service-role client, and every
// lookup starts from the SHA-256 of a 256-bit token. Callers get back one
// share or emergency row and a repository bound to that row's patient; they
// never choose a patient id themselves.

export interface StoredShare extends ShareLinkSummary {
  patientId: string;
  pinHash: string;
}

export interface StoredEmergency {
  patientId: string;
  settings: EmergencySettings;
  revokedAt: string | null;
}

export interface ClientInfo {
  ipHash: string | null;
  userAgent: string | null;
}

export type AccessTarget = { shareId: string } | { emergencyAccessId: string };

export interface PublicAccessStore {
  findShare(tokenHash: string): Promise<StoredShare | null>;
  /** Reserves one PIN attempt. Null when the share is locked, revoked or expired. */
  claimPinAttempt(shareId: string): Promise<number | null>;
  findEmergency(tokenHash: string): Promise<StoredEmergency | null>;
  recordAccess(target: AccessTarget, outcome: AccessOutcome, client: ClientInfo): Promise<void>;
  repositoryFor(patientId: string): PatientRepository;
}

export class PublicAccessError extends Error {
  constructor(action: string, code: string | undefined) {
    super(`[sharing] ${action} failed (${code ?? "unknown"})`);
    this.name = "PublicAccessError";
  }
}

class SupabasePublicAccessStore implements PublicAccessStore {
  private readonly client = createAdminClient();

  async findShare(tokenHash: string): Promise<StoredShare | null> {
    const { data, error } = await this.client
      .from("record_shares")
      .select("id, patient_id, pin_hash, label, scope, expires_at, revoked_at, created_at, last_accessed_at, locked_until")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (error) throw new PublicAccessError("share lookup", error.code);
    if (!data) return null;
    return { ...mapShareLink(data), patientId: data.patient_id, pinHash: data.pin_hash };
  }

  async claimPinAttempt(shareId: string): Promise<number | null> {
    const { data, error } = await this.client.rpc("claim_share_pin_attempt", { p_share_id: shareId });
    if (error) throw new PublicAccessError("PIN attempt", error.code);
    return typeof data === "number" ? data : null;
  }

  async findEmergency(tokenHash: string): Promise<StoredEmergency | null> {
    const { data, error } = await this.client
      .from("emergency_access")
      .select(`${EMERGENCY_ROW_COLUMNS}, patient_id, revoked_at`)
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (error) throw new PublicAccessError("emergency lookup", error.code);
    if (!data) return null;
    return { patientId: data.patient_id, revokedAt: data.revoked_at, settings: mapEmergencySettings(data) };
  }

  async recordAccess(target: AccessTarget, outcome: AccessOutcome, client: ClientInfo): Promise<void> {
    const { error } = await this.client.rpc("record_public_access", {
      // Generated RPC types mark every argument non-null; SQL NULL is intended.
      p_share_id: ("shareId" in target ? target.shareId : null) as string,
      p_emergency_access_id: ("emergencyAccessId" in target ? target.emergencyAccessId : null) as string,
      p_outcome: outcome,
      p_ip_hash: client.ipHash as string,
      p_user_agent: client.userAgent as string,
    });
    if (error) throw new PublicAccessError("access log", error.code);
  }

  repositoryFor(patientId: string): PatientRepository {
    // Same repository as the patient's own pages; every query filters on this id.
    return new SupabasePatientRepository(this.client, patientId);
  }
}

export function getPublicAccessStore(): PublicAccessStore {
  return new SupabasePublicAccessStore();
}
