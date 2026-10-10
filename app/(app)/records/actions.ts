"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { deleteRecord, dismissDuplicate, updateMedication, type RecordResult } from "@/lib/records/service";

const NOT_SIGNED_IN: RecordResult = { ok: false, error: "Your session has ended. Please sign in again." };

// Each action re-checks the session itself: server actions are public
// endpoints and must never trust that the page that rendered them was authorised.

export async function updateMedicationAction(input: unknown): Promise<RecordResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const result = await updateMedication(session, input);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function deleteRecordAction(input: unknown): Promise<RecordResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const result = await deleteRecord(session, input);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function dismissDuplicateAction(input: unknown): Promise<RecordResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const result = await dismissDuplicate(session, input);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
