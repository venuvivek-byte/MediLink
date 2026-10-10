import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { getConfig, getSessionSecret } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";
import { createSignedToken, verifySignedToken } from "@/lib/security/signed-token";
import { FICTIONAL_DATASET, SAMPLE_DATASET } from "@/lib/demo/datasets";
import { DEMO_SESSION_COOKIE, DEMO_SESSION_TTL_SECONDS } from "./constants";

export type Session =
  | { kind: "demo"; patientId: string }
  | { kind: "live"; patientId: string; email: string | null };

export type DemoDatasetKind = "fictional" | "sample";

// Cookies issued before the sample existed carry no dataset: they are fictional.
const demoSessionSchema = z.object({ sid: z.string().uuid(), dataset: z.enum(["fictional", "sample"]).default("fictional") });

/** The read-only patient a demo cookie may open in the current mode, or null. */
function demoPatientFor(dataset: DemoDatasetKind, mode: "demo" | "live"): string | null {
  if (dataset === "sample") return SAMPLE_DATASET?.patient.user_id ?? null;
  return mode === "demo" ? FICTIONAL_DATASET.patient.user_id : null;
}

/** True for a read-only session on the bundled "Try sample" patient. */
export function isSampleSession(session: Session): boolean {
  return session.kind === "demo" && SAMPLE_DATASET !== null && session.patientId === SAMPLE_DATASET.patient.user_id;
}

/**
 * The one place that decides who the current patient is.
 *
 * - Demo sessions: a signed HttpOnly cookie naming a read-only dataset. The
 *   fictional patient is honoured ONLY when DEMO_MODE=true; the bundled
 *   sample is honoured in both modes. Neither ever touches Supabase.
 * - Real-user mode: Supabase `getUser()`, which validates the JWT with the
 *   auth server rather than trusting the cookie contents.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  // Sessions are checked strictly at request time: never during build-time
  // prerendering or runtime prefetch passes (which may carry cookies but
  // must not run expiry checks against the clock).
  await connection();
  const cookieStore = await cookies();
  const config = getConfig();

  const demoToken = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
  if (demoToken) {
    const payload = verifySignedToken(demoToken, getSessionSecret(), demoSessionSchema);
    const patientId = payload ? demoPatientFor(payload.dataset, config.mode) : null;
    if (patientId) return { kind: "demo", patientId };
  }
  if (config.mode === "demo") return null;

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

/**
 * Issues a read-only demo session cookie. The fictional patient is refused
 * outside demo mode; the sample is refused only if it has not been generated.
 */
export async function startDemoSession(dataset: DemoDatasetKind = "fictional"): Promise<void> {
  const config = getConfig();
  if (!demoPatientFor(dataset, config.mode)) {
    throw new Error(
      dataset === "sample" ? "The sample patient is not available." : "Demo sessions are disabled in real-user mode."
    );
  }
  const token = createSignedToken(
    { sid: crypto.randomUUID(), dataset },
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

/**
 * What the current (verified) session may do on patient pages. Read-only
 * sessions (fictional demo or sample) never edit; the sample can still open
 * the original files bundled with it.
 */
export async function sessionAccess(): Promise<{ canEdit: boolean; canOpenFiles: boolean; sample: boolean }> {
  const session = await requireSession();
  const sample = isSampleSession(session);
  return { canEdit: session.kind === "live", canOpenFiles: session.kind === "live" || sample, sample };
}
