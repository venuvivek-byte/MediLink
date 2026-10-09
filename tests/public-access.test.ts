import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { cookieJar, cookiesMock } from "./helpers/next-mocks";
import { DEMO_ENV, LIVE_ENV, useEnv } from "./helpers/env";
import { DEMO_EMERGENCY_TOKEN, DEMO_SHARE_PIN, DEMO_SHARE_TOKEN } from "@/lib/demo/data";
import { shareState } from "@/lib/sharing/policy";

vi.mock("next/headers", () => ({ cookies: cookiesMock }));

async function load() {
  vi.resetModules();
  const access = await import("@/lib/sharing/public-access");
  const route = await import("@/app/api/share/[token]/verify-pin/route");
  return { ...access, POST: route.POST };
}

function pinRequest(token: string, body: unknown) {
  return new NextRequest(`http://localhost/api/share/${token}/verify-pin`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const ctx = (token: string) => ({ params: Promise.resolve({ token }) });

beforeEach(() => cookieJar.clear());

describe("share policy", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("treats revoked as revoked even before expiry, and past expiry as expired", () => {
    expect(shareState({ expiresAt: "2027-01-01T00:00:00Z", revokedAt: "2025-12-31T00:00:00Z" }, now)).toBe("revoked");
    expect(shareState({ expiresAt: "2025-12-31T23:59:59Z", revokedAt: null }, now)).toBe("expired");
    expect(shareState({ expiresAt: "2026-01-01T00:00:00Z", revokedAt: null }, now)).toBe("expired");
    expect(shareState({ expiresAt: "not a date", revokedAt: null }, now)).toBe("expired");
    expect(shareState({ expiresAt: "2026-01-02T00:00:00Z", revokedAt: null }, now)).toBe("active");
  });
});

describe("public tokens in REAL-USER mode fail closed", () => {
  beforeEach(() => useEnv(LIVE_ENV));

  it("does not resolve the demo share or emergency tokens", async () => {
    const { resolveShareToken, resolveEmergencyToken } = await load();
    expect(resolveShareToken(DEMO_SHARE_TOKEN)).toBeNull();
    expect(resolveEmergencyToken(DEMO_EMERGENCY_TOKEN)).toBeNull();
  });

  it("rejects the old hardcoded PIN that used to unlock ANY token", async () => {
    const { POST } = await load();
    for (const token of [DEMO_SHARE_TOKEN, "any-random-token"]) {
      const res = await POST(pinRequest(token, { pin: DEMO_SHARE_PIN }), ctx(token));
      expect(res.status).toBe(401);
      expect(res.headers.get("set-cookie")).toBeNull();
    }
  });
});

describe("public tokens in demo mode", () => {
  beforeEach(() => useEnv(DEMO_ENV));

  it("resolves only the exact demo tokens", async () => {
    const { resolveShareToken, resolveEmergencyToken } = await load();
    expect(resolveShareToken(DEMO_SHARE_TOKEN)?.state).toBe("active");
    expect(resolveShareToken(`${DEMO_SHARE_TOKEN}x`)).toBeNull();
    expect(resolveShareToken("anything")).toBeNull();
    expect(resolveEmergencyToken(DEMO_EMERGENCY_TOKEN)).not.toBeNull();
    expect(resolveEmergencyToken("anything")).toBeNull();
  });

  it("rejects any 6 digits other than the PIN (the old client-side bypass)", async () => {
    const { POST } = await load();
    const res = await POST(pinRequest(DEMO_SHARE_TOKEN, { pin: "123456" }), ctx(DEMO_SHARE_TOKEN));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "This link or PIN is not valid." });
  });

  it("validates the request body", async () => {
    const { POST } = await load();
    for (const body of ["not json", { pin: "12345" }, { pin: "1234567" }, { pin: "abcdef" }, { pin: 482910 }, {}]) {
      const res = await POST(pinRequest(DEMO_SHARE_TOKEN, body), ctx(DEMO_SHARE_TOKEN));
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
  });

  it("issues a short-lived, HttpOnly, strict, path-scoped session cookie for the right PIN", async () => {
    const { POST } = await load();
    const res = await POST(pinRequest(DEMO_SHARE_TOKEN, { pin: DEMO_SHARE_PIN }), ctx(DEMO_SHARE_TOKEN));
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^mhv_share_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=strict/i);
    expect(cookie).toMatch(new RegExp(`Path=/share/${DEMO_SHARE_TOKEN}`));
    expect(cookie).toMatch(/Max-Age=900/);
    expect(cookie).not.toContain(DEMO_SHARE_PIN);
  });

  it("only honours a share session that matches the share and is still active", async () => {
    const { POST, resolveShareToken, hasValidShareSession, SHARE_SESSION_COOKIE } = await load();
    const share = resolveShareToken(DEMO_SHARE_TOKEN)!;
    expect(await hasValidShareSession(share)).toBe(false);

    const res = await POST(pinRequest(DEMO_SHARE_TOKEN, { pin: DEMO_SHARE_PIN }), ctx(DEMO_SHARE_TOKEN));
    const value = /mhv_share_session=([^;]+)/.exec(res.headers.get("set-cookie") ?? "")![1];
    cookieJar.set(SHARE_SESSION_COOKIE, value);
    expect(await hasValidShareSession(share)).toBe(true);

    // Revocation applies immediately, even with a valid cookie.
    expect(await hasValidShareSession({ ...share, state: "revoked" })).toBe(false);
    // A cookie for one share does not open another.
    expect(await hasValidShareSession({ ...share, shareId: "share-other" })).toBe(false);
  });
});
