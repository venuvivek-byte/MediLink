// HMAC-SHA256 signed, expiring payloads for HttpOnly cookies.
// Format: base64url(JSON payload) + "." + base64url(signature).
import { createHmac, timingSafeEqual } from "node:crypto";
import type { z } from "zod";

interface Expiring {
  exp: number; // seconds since epoch
}

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function createSignedToken<T extends object>(
  payload: T,
  secret: string,
  ttlSeconds: number,
  now: number = Date.now()
): string {
  const body: T & Expiring = { ...payload, exp: Math.floor(now / 1000) + ttlSeconds };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

/** Returns the payload only if the signature is valid, unexpired and matches the schema. */
export function verifySignedToken<S extends z.ZodTypeAny>(
  token: string | undefined | null,
  secret: string,
  schema: S,
  now: number = Date.now()
): z.infer<S> | null {
  if (!token || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;

  const expected = Buffer.from(sign(encoded, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof (decoded as Expiring).exp !== "number" ||
    (decoded as Expiring).exp <= Math.floor(now / 1000)
  ) {
    return null;
  }

  const parsed = schema.safeParse(decoded);
  return parsed.success ? parsed.data : null;
}
