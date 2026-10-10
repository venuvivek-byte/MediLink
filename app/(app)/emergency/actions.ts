"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import {
  createEmergencyAccess,
  revokeEmergencyAccess,
  updateEmergencyAccess,
  type ActionResult,
} from "@/lib/sharing/service";

const NOT_SIGNED_IN = { ok: false, error: "Your session has ended. Please sign in again." } as const;

// Each action re-checks the session itself (server actions are public endpoints).

export async function createEmergencyAccessAction(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const result = await createEmergencyAccess(session, input);
  if (result.ok) revalidatePath("/emergency");
  return result;
}

export async function updateEmergencyAccessAction(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const result = await updateEmergencyAccess(session, input);
  if (result.ok) revalidatePath("/emergency");
  return result;
}

export async function revokeEmergencyAccessAction(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const result = await revokeEmergencyAccess(session);
  if (result.ok) revalidatePath("/emergency");
  return result;
}
