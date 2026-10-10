// Link tokens, PINs and client fingerprints for public share/emergency access.
// Only hashes are stored: the database never holds a usable token or PIN.
import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";

/** 32 random bytes, base64url: 43 characters, 256 bits. */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex, matching the `token_hash` CHECK constraint. Fine for 256-bit random tokens (no salt needed). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Six uniformly random digits; leading zeros kept. */
export function generatePin(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * The emergency link is derived from the row id with the server secret, so
 * the patient can see and reprint their QR code at any time while the
 * database still stores only its hash. Rotating SESSION_SECRET invalidates
 * every printed emergency card.
 */
export function emergencyTokenFor(emergencyAccessId: string, secret: string): string {
  return createHmac("sha256", secret).update(`mhv-emergency:${emergencyAccessId}`).digest("base64url");
}

/** Keyed hash of the client IP: lets the patient tell visitors apart without storing addresses. */
export function hashClientIp(ip: string | null, secret: string): string | null {
  if (!ip) return null;
  return createHmac("sha256", secret).update(`mhv-ip:${ip}`).digest("hex");
}

/** First address in x-forwarded-for (set by the hosting proxy), else x-real-ip. */
export function clientIpFrom(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || null;
}
