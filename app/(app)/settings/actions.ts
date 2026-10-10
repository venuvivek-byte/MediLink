"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { updateProfile, type ActionResult } from "@/lib/sharing/service";

const NOT_SIGNED_IN = { ok: false, error: "Your session has ended. Please sign in again." } as const;

// Re-checks the session itself (server actions are public endpoints).
export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const result = await updateProfile(session, input);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
