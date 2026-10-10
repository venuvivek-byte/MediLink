import "server-only";
import { timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { getConfig, getSessionSecret } from "@/lib/config/env";
import { createSignedToken, verifySignedToken } from "@/lib/security/signed-token";
import { DemoPatientRepository } from "@/lib/data/demo-repository";
import type { PatientRepository } from "@/lib/data/repository";
import { mapEmergencySettings, mapShareLink } from "@/lib/data/mappers";
import type { Allergy, Condition, LabResult, Medication, ShareCategory, TimelineEvent } from "@/lib/data/types";
import { datasetForPatient, publicDatasets, type DemoDataset } from "@/lib/demo/datasets";
import { buildEmergencyView, type EmergencyView } from "./emergency-view";
import { isLocked, PIN_ATTEMPTS_PER_WINDOW, shareState, type ShareState } from "./policy";
import { getPublicAccessStore, type ClientInfo, type PublicAccessStore } from "./store";
import { clientIpFrom, hashClientIp, hashToken, TOKEN_PATTERN } from "./tokens";

// Public (unauthenticated) access via share and emergency tokens.
//
// Example datasets: fixed public tokens that resolve only to bundled,
// read-only data. Demo mode: the fictional patient and the sample, and
// nothing else. Real-user mode: the sample's tokens (which can never match a
// real token: they are not TOKEN_PATTERN-shaped).
// Real-user mode: tokens are looked up by SHA-256 hash; PINs are bcrypt
// hashes checked after atomically reserving an attempt (5 per 15 minutes,
// 20 per link); every attempt is logged to the patient's access history.

export const SHARE_SESSION_COOKIE = "mhv_share_session";
export const SHARE_SESSION_TTL_SECONDS = 15 * 60;

export interface ResolvedShare {
  shareId: string;
  patientId: string;
  state: ShareState;
  locked: boolean;
  categories: ShareCategory[];
  includeUnreviewed: boolean;
  expiresAt: string;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function clientInfoFrom(headers: Headers): ClientInfo {
  return {
    ipHash: hashClientIp(clientIpFrom(headers), getSessionSecret()),
    userAgent: headers.get("user-agent")?.slice(0, 200) || null,
  };
}

function exampleFor(token: string, which: "shareToken" | "emergencyToken"): DemoDataset | null {
  return publicDatasets(getConfig().mode).find((d) => safeEqual(token, d.publicLinks[which])) ?? null;
}

/** True when the token is one of the fixed example links (labels the public page). */
export function isExampleToken(token: string): boolean {
  return exampleFor(token, "shareToken") !== null || exampleFor(token, "emergencyToken") !== null;
}

/** The public PIN of an example share link, shown on its PIN screen; null for real links. */
export function examplePinFor(token: string): string | null {
  return exampleFor(token, "shareToken")?.publicLinks.sharePin ?? null;
}

function exampleShare(dataset: DemoDataset): ResolvedShare | null {
  const row = dataset.shares().find((s) => s.id === dataset.publicLinks.shareId);
  if (!row) return null;
  const share = mapShareLink(row);
  return {
    shareId: share.id,
    patientId: dataset.patient.user_id,
    state: shareState(share),
    locked: false,
    categories: share.categories,
    includeUnreviewed: share.includeUnreviewed,
    expiresAt: share.expiresAt,
  };
}

/** Null for unknown tokens. Expired, revoked and locked shares resolve so callers can log and explain. */
export async function resolveShareToken(token: string, store?: PublicAccessStore): Promise<ResolvedShare | null> {
  const example = exampleFor(token, "shareToken");
  if (example) return exampleShare(example);
  if (getConfig().mode === "demo" || !TOKEN_PATTERN.test(token)) return null;
  const row = await (store ?? getPublicAccessStore()).findShare(hashToken(token));
  if (!row) return null;
  return {
    shareId: row.id,
    patientId: row.patientId,
    state: shareState(row),
    locked: isLocked(row.lockedUntil),
    categories: row.categories,
    includeUnreviewed: row.includeUnreviewed,
    expiresAt: row.expiresAt,
  };
}

export type PinResult = { ok: true; share: ResolvedShare } | { ok: false; reason: "invalid" | "locked" };

const INVALID: PinResult = { ok: false, reason: "invalid" };
const LOCKED: PinResult = { ok: false, reason: "locked" };

async function logQuietly(store: PublicAccessStore, ...args: Parameters<PublicAccessStore["recordAccess"]>) {
  try {
    await store.recordAccess(...args);
  } catch (error) {
    console.error((error as Error).message);
  }
}

export async function verifySharePin(
  token: string,
  pin: string,
  client: ClientInfo,
  store?: PublicAccessStore
): Promise<PinResult> {
  const example = exampleFor(token, "shareToken");
  if (example) {
    // Example links only: the PIN is public and protects bundled read-only data.
    const share = exampleShare(example);
    return share && share.state === "active" && safeEqual(pin, example.publicLinks.sharePin) ? { ok: true, share } : INVALID;
  }
  if (getConfig().mode === "demo" || !TOKEN_PATTERN.test(token)) return INVALID;

  const db = store ?? getPublicAccessStore();
  const row = await db.findShare(hashToken(token));
  if (!row) return INVALID;
  const target = { shareId: row.id };
  const state = shareState(row);
  if (state !== "active") {
    await logQuietly(db, target, state, client);
    return INVALID;
  }

  // Reserve the attempt BEFORE comparing, so parallel guesses all count.
  const attempt = await db.claimPinAttempt(row.id);
  if (attempt === null) {
    await logQuietly(db, target, "locked", client);
    return LOCKED;
  }

  if (!(await bcrypt.compare(pin, row.pinHash))) {
    await logQuietly(db, target, "pin_failed", client);
    return attempt % PIN_ATTEMPTS_PER_WINDOW === 0 ? LOCKED : INVALID;
  }

  // Fail closed: access is granted only once it is in the patient's history.
  await db.recordAccess(target, "granted", client);
  return {
    ok: true,
    share: {
      shareId: row.id,
      patientId: row.patientId,
      state,
      locked: false,
      categories: row.categories,
      includeUnreviewed: row.includeUnreviewed,
      expiresAt: row.expiresAt,
    },
  };
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

function repositoryFor(patientId: string, store?: PublicAccessStore): PatientRepository {
  const mode = getConfig().mode;
  const example = datasetForPatient(patientId);
  if (mode === "demo" || (example && publicDatasets(mode).includes(example))) return new DemoPatientRepository(patientId);
  return (store ?? getPublicAccessStore()).repositoryFor(patientId);
}

/** null = category not included in this share. */
export interface SharedRecords {
  patientName: string;
  allergies: Allergy[] | null;
  conditions: Condition[] | null;
  medications: Medication[] | null;
  labs: LabResult[] | null;
  timeline: TimelineEvent[] | null;
}

/** Loads only the categories in the share; unreviewed records only if the patient allowed them. */
export async function loadSharedRecords(share: ResolvedShare, store?: PublicAccessStore): Promise<SharedRecords> {
  const repo = repositoryFor(share.patientId, store);
  const has = (category: ShareCategory) => share.categories.includes(category);
  const allowed = <T extends { reviewStatus: string }>(rows: T[]) =>
    share.includeUnreviewed ? rows : rows.filter((r) => r.reviewStatus === "patient_reviewed");
  const load = async <T extends { reviewStatus: string }>(category: ShareCategory, fn: () => Promise<T[]>) =>
    has(category) ? allowed(await fn()) : null;

  const [profile, allergies, conditions, medications, labs, timeline] = await Promise.all([
    repo.getProfile(),
    load("allergies", () => repo.listAllergies()),
    load("conditions", () => repo.listConditions()),
    load("medications", () => repo.listMedications()),
    load("lab_results", () => repo.listLabResults()),
    load("timeline", () => repo.listTimelineEvents()),
  ]);
  return { patientName: profile?.displayName ?? "Patient", allergies, conditions, medications, labs, timeline };
}

/**
 * Resolves an emergency link and returns only what the patient opted into.
 * Every open is logged (repeat views from one client are collapsed by the
 * database). If logging fails the information is still shown: a first
 * responder must not be blocked by an audit outage.
 */
export async function openEmergencyLink(
  token: string,
  client: ClientInfo,
  store?: PublicAccessStore
): Promise<EmergencyView | null> {
  const example = exampleFor(token, "emergencyToken");
  let patientId: string;
  let settings;
  if (example) {
    if (!example.emergencyAccess) return null;
    patientId = example.patient.user_id;
    settings = mapEmergencySettings(example.emergencyAccess);
  } else if (getConfig().mode === "demo") {
    return null;
  } else {
    if (!TOKEN_PATTERN.test(token)) return null;
    const db = store ?? getPublicAccessStore();
    const row = await db.findEmergency(hashToken(token));
    if (!row) return null;
    const state = shareState({ expiresAt: row.settings.expiresAt, revokedAt: row.revokedAt });
    await logQuietly(db, { emergencyAccessId: row.settings.id }, state === "active" ? "granted" : state, client);
    if (state !== "active") return null;
    patientId = row.patientId;
    settings = row.settings;
  }

  const repo = repositoryFor(patientId, store);
  const [profile, allergies, conditions, medications] = await Promise.all([
    repo.getProfile(),
    settings.showAllergies ? repo.listAllergies() : Promise.resolve([]),
    settings.showConditions ? repo.listConditions() : Promise.resolve([]),
    settings.medicationIds.length > 0 ? repo.listMedications() : Promise.resolve([]),
  ]);
  if (!profile) return null;
  return buildEmergencyView(settings, { profile, allergies, conditions, medications });
}
