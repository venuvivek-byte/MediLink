"use server";

import { redirect } from "next/navigation";
import { getConfig } from "@/lib/config/env";
import { startDemoSession } from "@/lib/auth/session";
import { SAMPLE_DATASET } from "@/lib/demo/datasets";

export async function startDemoSessionAction(): Promise<{ error: string } | never> {
  if (getConfig().mode !== "demo") {
    return { error: "Demo access is disabled in real-user mode." };
  }
  await startDemoSession("fictional");
  redirect("/");
}

/** "Try sample": a read-only session on the bundled sample patient. Works in both modes. */
export async function startSampleSessionAction(): Promise<{ error: string } | never> {
  if (!SAMPLE_DATASET) {
    return { error: "The sample is not available right now." };
  }
  await startDemoSession("sample");
  redirect("/");
}
