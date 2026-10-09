// Pure access rules for share links, shared by demo and (later) real-user mode.

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

/** Six digits, nothing else. */
export const PIN_PATTERN = /^\d{6}$/;
