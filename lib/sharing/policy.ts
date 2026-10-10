// Pure access rules for share links, shared by demo and real-user mode.
import type { ShareCategory } from "@/lib/data/types";

export type ShareState = "active" | "expired" | "revoked";

export function shareState(
  share: { expiresAt: string; revokedAt: string | null },
  now: Date = new Date()
): ShareState {
  // Revocation wins over expiry so the patient sees why access ended.
  if (share.revokedAt) return "revoked";
  const expires = new Date(share.expiresAt).getTime();
  if (!Number.isFinite(expires) || expires <= now.getTime()) return "expired";
  return "active";
}

export function isLocked(lockedUntil: string | null, now: Date = new Date()): boolean {
  if (!lockedUntil) return false;
  const until = new Date(lockedUntil).getTime();
  return Number.isFinite(until) && until > now.getTime();
}

/** Six digits, nothing else. */
export const PIN_PATTERN = /^\d{6}$/;

/** Categories a patient can put in a share link (must match create_record_share in 008). */
export const SHAREABLE_CATEGORIES = ["allergies", "conditions", "medications", "lab_results", "timeline"] as const satisfies readonly ShareCategory[];

export const SHARE_CATEGORY_LABELS: Record<(typeof SHAREABLE_CATEGORIES)[number], string> = {
  allergies: "Allergies",
  conditions: "Conditions",
  medications: "Medications",
  lab_results: "Lab results",
  timeline: "Visit timeline",
};

/** Share link lifetimes offered to the patient, in hours (database allows 1 hour to 90 days). */
export const SHARE_EXPIRY_OPTIONS = [
  { hours: 24, label: "24 hours" },
  { hours: 24 * 7, label: "7 days" },
  { hours: 24 * 30, label: "30 days" },
  { hours: 24 * 90, label: "90 days" },
] as const;

/** Emergency link lifetimes, in days (database allows 1 to 400 days). */
export const EMERGENCY_EXPIRY_OPTIONS = [
  { days: 30, label: "30 days" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
] as const;

/** Mirrors claim_share_pin_attempt: 5 attempts per 15 minutes, 20 in total. */
export const PIN_ATTEMPTS_PER_WINDOW = 5;
