import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { getConfig, getSessionSecret } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";
import { createSignedToken, verifySignedToken } from "@/lib/security/signed-token";
import { DEMO_PATIENT_ID } from "@/lib/demo/data";
import { DEMO_SESSION_COOKIE, DEMO_SESSION_TTL_SECONDS } from "./constants";

export type Session =
  | { kind: "demo"; patientId: string }
  | { kind: "live"; patientId: string; email: string | null };

const demoSessionSchema = z.object({ sid: z.string().uuid() });

/**
 * The one place that decides who the current patient is.
 *
 * - Demo mode: a signed HttpOnly cookie, honoured ONLY when DEMO_MODE=true.
 * - Real-user mode: Supabase `getUser()`, which validates the JWT with the
 *   auth server rather than trusting the cookie contents. The demo cookie is
 *   ignored entirely.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  // Sessions are checked strictly at request time: never during build-time
  // prerendering or runtime prefetch passes (which may carry cookies but
  // must not run expiry checks against the clock).
  await connection();
  const cookieStore = await cookies();
  const config = getConfig();

  if (config.mode === "demo") {
    const token = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
    const payload = verifySignedToken(token, getSessionSecret(), demoSessionSchema);
    return payload ? { kind: "demo", patientId: DEMO_PATIENT_ID } : null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { kind: "live", patientId: data.user.id, email: data.user.email ?? null };
});

/** For pages and layouts: redirects to /login when there is no valid session. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Issues a demo session cookie. Refuses outside demo mode. */
export async function startDemoSession(): Promise<void> {
  const config = getConfig();
  if (config.mode !== "demo") {
    throw new Error("Demo sessions are disabled in real-user mode.");
  }
  const token = createSignedToken(
    { sid: crypto.randomUUID() },
    getSessionSecret(),
    DEMO_SESSION_TTL_SECONDS
  );
  (await cookies()).set(DEMO_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: DEMO_SESSION_TTL_SECONDS,
  });
}

/** Clears both kinds of session. Safe to call in either mode. */
export async function endSession(): Promise<void> {
  const config = getConfig();
  (await cookies()).delete(DEMO_SESSION_COOKIE);
  if (config.mode === "live") {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
}
