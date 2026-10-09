import "server-only";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { getConfig, getSessionSecret } from "@/lib/config/env";
import { createSignedToken, verifySignedToken } from "@/lib/security/signed-token";
import { DemoPatientRepository } from "@/lib/data/demo-repository";
import type { PatientRepository } from "@/lib/data/repository";
import type { ShareCategory } from "@/lib/data/types";
import {
  DEMO_EMERGENCY_TOKEN,
  DEMO_PATIENT_ID,
  DEMO_SHARE_PIN,
  DEMO_SHARE_TOKEN,
  demoShares,
} from "@/lib/demo/data";
import { mapShareLink } from "@/lib/data/mappers";
import { shareState, type ShareState } from "./policy";

// Public (unauthenticated) access via share and emergency tokens.
//
// PHASE 1 STATUS: only the fixed demo tokens resolve, and only in demo mode.
// In real-user mode every token is rejected until hashed token storage,
// PIN hashing and rate limiting are built (Phase 5). Failing closed here is
// deliberate.

export const SHARE_SESSION_COOKIE = "mhv_share_session";
export const SHARE_SESSION_TTL_SECONDS = 15 * 60;

export interface ResolvedShare {
  shareId: string;
  state: ShareState;
  categories: ShareCategory[];
  expiresAt: string;
  repository: PatientRepository;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function resolveShareToken(token: string): ResolvedShare | null {
  if (getConfig().mode !== "demo") return null;
  if (!safeEqual(token, DEMO_SHARE_TOKEN)) return null;

  const row = demoShares().find((s) => s.id === "share-001")!;
  const share = mapShareLink(row);
  return {
    shareId: share.id,
    state: shareState(share),
    categories: share.categories,
    expiresAt: share.expiresAt,
    repository: new DemoPatientRepository(DEMO_PATIENT_ID),
  };
}

export function verifySharePin(share: ResolvedShare, pin: string): boolean {
  // Demo only: the PIN is public and protects fictional data.
  return share.state === "active" && safeEqual(pin, DEMO_SHARE_PIN);
}

const shareSessionSchema = z.object({ shareId: z.string().min(1) });

export function createShareSessionCookie(share: ResolvedShare, token: string) {
  return {
    name: SHARE_SESSION_COOKIE,
    value: createSignedToken({ shareId: share.shareId }, getSessionSecret(), SHARE_SESSION_TTL_SECONDS),
    options: {
      httpOnly: true,
      secure: getConfig().isProduction,
      sameSite: "strict" as const,
      // Sent only to this one share page, never to the rest of the app.
      path: `/share/${encodeURIComponent(token)}`,
      maxAge: SHARE_SESSION_TTL_SECONDS,
    },
  };
}

/** Re-checks the share itself on every request, so revocation and expiry apply immediately. */
export async function hasValidShareSession(share: ResolvedShare): Promise<boolean> {
  if (share.state !== "active") return false;
  const token = (await cookies()).get(SHARE_SESSION_COOKIE)?.value;
  const payload = verifySignedToken(token, getSessionSecret(), shareSessionSchema);
  return payload?.shareId === share.shareId;
}

export function resolveEmergencyToken(token: string): PatientRepository | null {
  if (getConfig().mode !== "demo") return null;
  return safeEqual(token, DEMO_EMERGENCY_TOKEN) ? new DemoPatientRepository(DEMO_PATIENT_ID) : null;
}
