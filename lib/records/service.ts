import "server-only";
import { z } from "zod";
import type { Session } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { MedicationStatus, RecordKind } from "@/lib/data/types";

// Patient-initiated changes to confirmed records. Every change goes through a
// SECURITY INVOKER database function that applies it and writes the audit
// entry in one transaction; RLS still limits it to the patient's own rows.

export type RecordResult = { ok: true } | { ok: false; error: string };

const DEMO_READ_ONLY: RecordResult = { ok: false, error: "Changes are not saved in demo mode." };
const INVALID: RecordResult = { ok: false, error: "Some values are invalid. Check them and try again." };
const NOT_FOUND: RecordResult = { ok: false, error: "This record no longer exists. Refresh the page." };
const FAILED: RecordResult = { ok: false, error: "The change could not be saved. Nothing was changed; please try again." };

/** UI status -> stored status. "uncertain" is stored as "unknown"; nothing is ever assumed current. */
const STATUS_TO_DB: Record<MedicationStatus, string> = {
  current: "active",
  historical: "historical",
  discontinued: "discontinued",
  uncertain: "unknown",
};

const isoDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((v) => new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v)
      .nullable()
  )
  .nullable()
  .optional()
  .transform((v) => v ?? null);

export const medicationUpdateSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(["current", "historical", "discontinued", "uncertain"]),
    startDate: isoDate,
    endDate: isoDate,
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { message: "end_before_start" });

const RECORD_KINDS = ["medication", "lab_result", "condition", "allergy", "medical_event"] as const satisfies readonly RecordKind[];
export const deleteRecordSchema = z.object({ kind: z.enum(RECORD_KINDS), id: z.string().uuid() });

export const dismissDuplicateSchema = z.object({
  kind: z.enum(["medication", "lab_result"]),
  recordIds: z.array(z.string().uuid()).min(2).max(20),
});

function failure(error: { code?: string } | null, action: string): RecordResult {
  console.error(`[records] ${action} failed`, { code: error?.code ?? "unknown" });
  if (error?.code === "P0002") return NOT_FOUND;
  if (error?.code === "22023") return INVALID;
  return FAILED;
}

export async function updateMedication(session: Session, input: unknown): Promise<RecordResult> {
  if (session.kind !== "live") return DEMO_READ_ONLY;
  const parsed = medicationUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const endBeforeStart = parsed.error.issues.some((i) => i.message === "end_before_start");
    return endBeforeStart ? { ok: false, error: "The end date cannot be before the start date." } : INVALID;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_medication", {
    p_medication_id: parsed.data.id,
    p_status: STATUS_TO_DB[parsed.data.status],
    // Generated RPC types mark every argument non-null; SQL NULL clears the date.
    p_start_date: parsed.data.startDate as string,
    p_end_date: parsed.data.endDate as string,
  });
  return error ? failure(error, "update medication") : { ok: true };
}

export async function deleteRecord(session: Session, input: unknown): Promise<RecordResult> {
  if (session.kind !== "live") return DEMO_READ_ONLY;
  const parsed = deleteRecordSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_health_record", { p_kind: parsed.data.kind, p_id: parsed.data.id });
  return error ? failure(error, "delete record") : { ok: true };
}

export async function dismissDuplicate(session: Session, input: unknown): Promise<RecordResult> {
  if (session.kind !== "live") return DEMO_READ_ONLY;
  const parsed = dismissDuplicateSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const supabase = await createClient();
  const { error } = await supabase.rpc("dismiss_duplicate", {
    p_kind: parsed.data.kind,
    p_record_ids: parsed.data.recordIds,
  });
  return error ? failure(error, "dismiss duplicate") : { ok: true };
}
