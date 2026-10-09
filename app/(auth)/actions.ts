"use server";

import { redirect } from "next/navigation";
import { getConfig } from "@/lib/config/env";
import { startDemoSession } from "@/lib/auth/session";

export async function startDemoSessionAction(): Promise<{ error: string } | never> {
  if (getConfig().mode !== "demo") {
    return { error: "Demo access is disabled in real-user mode." };
  }
  await startDemoSession();
  redirect("/");
}
