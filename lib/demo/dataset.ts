import type { Tables } from "@/lib/types/database.types";

/**
 * One read-only patient that can be browsed without Supabase. Rows are typed
 * against the real database rows so they go through the same mappers as live
 * data (lib/data/mappers.ts).
 */
export interface DemoDataset {
  /** "fictional": hand-written patient, DEMO_MODE only. "sample": exported, anonymised account, any mode. */
  kind: "fictional" | "sample";
  patient: Tables<"profiles">;
  conditions: Tables<"conditions">[];
  allergies: Tables<"allergies">[];
  medications: Tables<"medications">[];
  labResults: Tables<"lab_results">[];
  documents: Tables<"documents">[];
  events: Tables<"medical_events">[];
  /** A function so rolling expiry dates are computed at request time. */
  shares: (now?: Date) => Tables<"record_shares">[];
  auditLogs: Tables<"audit_logs">[];
  emergencyAccess: Tables<"emergency_access"> | null;
  accessLogs: Tables<"share_access_logs">[];
  /** Fixed, public credentials. They only ever open this dataset. */
  publicLinks: { shareToken: string; sharePin: string; shareId: string; emergencyToken: string };
  /** Original files bundled with the app: document id -> file name in lib/demo/sample/files. */
  files: Record<string, string>;
}
