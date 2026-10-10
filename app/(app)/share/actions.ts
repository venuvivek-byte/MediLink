"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { createShare, revokeShare, type ActionResult, type CreateShareResult } from "@/lib/sharing/service";

const NOT_SIGNED_IN = { ok: false, error: "Your session has ended. Please sign in again." } as const;

// Each action re-checks the session itself: server actions are public
// endpoints and must never trust that the page that rendered them was authorised.

export async function createShareAction(input: unknown): Promise<CreateShareResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const result = await createShare(session, input);
  if (result.ok) revalidatePath("/share");
  return result;
}

export async function revokeShareAction(input: unknown): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return NOT_SIGNED_IN;
  const result = await revokeShare(session, input);
  if (result.ok) revalidatePath("/share");
  return result;
}
