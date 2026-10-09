import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth/session";

export async function POST() {
  try {
    await endSession();
  } catch {
    // The demo cookie is already cleared; a failed Supabase sign-out call
    // must not leave the user thinking they are still signed in locally.
    console.error("[auth] sign-out encountered an error");
  }
  return NextResponse.json({ ok: true });
}
