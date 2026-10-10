import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { cookieJar, cookiesMock } from "./helpers/next-mocks";
import { DEMO_ENV, LIVE_ENV, useEnv } from "./helpers/env";
import { DEMO_EMERGENCY_TOKEN, DEMO_PATIENT_ID, DEMO_SHARE_PIN, DEMO_SHARE_TOKEN } from "@/lib/demo/data";
import { DemoPatientRepository } from "@/lib/data/demo-repository";
import type { AccessOutcome } from "@/lib/data/types";
import { shareState } from "@/lib/sharing/policy";
import type { AccessTarget, ClientInfo, PublicAccessStore, StoredEmergency, StoredShare } from "@/lib/sharing/store";
import { generateShareToken, hashToken } from "@/lib/sharing/tokens";

vi.mock("next/headers", () => ({ cookies: cookiesMock }));

/** Demo data with its first medication marked as not yet reviewed. */
class MixedReviewRepository extends DemoPatientRepository {
  async listMedications() {
    const [first, ...rest] = await super.listMedications();
    return [{ ...first, reviewStatus: "pending_review" as const }, ...rest];
  }
}

/**
 * In-memory stand-in for the service-role store. The SQL behind claim/record
 * is tested on real Postgres in tests/db/sharing.test.ts; this mirrors it so
 * the TypeScript flow (order of checks, fail-closed paths) can be tested.
 */
class FakeStore implements PublicAccessStore {
  shares = new Map<string, StoredShare>();
  emergencies = new Map<string, StoredEmergency>();
  attempts = new Map<string, number>();
  log: { target: AccessTarget; outcome: AccessOutcome; client: ClientInfo }[] = [];
  failRecord = false;

  async findShare(tokenHash: string) {
    return this.shares.get(tokenHash) ?? null;
  }
  async claimPinAttempt(shareId: string) {
    const share = [...this.shares.values()].find((s) => s.id === shareId)!;
    if (shareState(share) !== "active" || (share.lockedUntil && new Date(share.lockedUntil) > new Date())) return null;
    const n = (this.attempts.get(shareId) ?? 0) + 1;
    this.attempts.set(shareId, n);
    if (n % 5 === 0) share.lockedUntil = new Date(Date.now() + 15 * 60_000).toISOString();
    return n;
  }
  async findEmergency(tokenHash: string) {
    return this.emergencies.get(tokenHash) ?? null;
  }
  async recordAccess(target: AccessTarget, outcome: AccessOutcome, client: ClientInfo) {
    if (this.failRecord) throw new Error("[sharing] access log failed (test)");
    this.log.push({ target, outcome, client });
  }
  repositoryFor(patientId: string) {
    return new MixedReviewRepository(patientId);
  }
}

const fake = { store: new FakeStore() };
vi.mock("@/lib/sharing/store", () => ({ getPublicAccessStore: () => fake.store }));

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
    headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1", "user-agent": "TestBrowser/1.0" },
  });
}

const ctx = (token: string) => ({ params: Promise.resolve({ token }) });
const client: ClientInfo = { ipHash: null, userAgent: null };
const future = (days: number) => new Date(Date.now() + days * 86400_000).toISOString();

const PIN = "042917";

async function addShare(overrides: Partial<StoredShare> = {}) {
  const token = generateShareToken();
  const share: StoredShare = {
    id: `share-${fake.store.shares.size + 1}`,
    patientId: DEMO_PATIENT_ID,
    pinHash: await bcrypt.hash(PIN, 4),
    label: "Dr. Test",
    categories: ["medications", "allergies"],
    includeUnreviewed: false,
    expiresAt: future(7),
    revokedAt: null,
    createdAt: new Date().toISOString(),
    lastAccessedAt: null,
    lockedUntil: null,
    ...overrides,
  };
  fake.store.shares.set(hashToken(token), share);
  return { token, share };
}

beforeEach(() => {
  cookieJar.clear();
  fake.store = new FakeStore();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

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

describe("REAL-USER mode: share links", () => {
  beforeEach(() => useEnv(LIVE_ENV));

  it("does not resolve the demo tokens, malformed tokens or unknown tokens", async () => {
    const { resolveShareToken, openEmergencyLink } = await load();
    expect(await resolveShareToken(DEMO_SHARE_TOKEN)).toBeNull();
    expect(await resolveShareToken("short")).toBeNull();
    expect(await resolveShareToken(generateShareToken())).toBeNull();
    expect(await openEmergencyLink(DEMO_EMERGENCY_TOKEN, client)).toBeNull();
  });

  it("rejects the old hardcoded demo PIN for any token", async () => {
    const { POST } = await load();
    for (const token of [DEMO_SHARE_TOKEN, "any-random-token", generateShareToken()]) {
      const res = await POST(pinRequest(token, { pin: DEMO_SHARE_PIN }), ctx(token));
      expect(res.status).toBe(401);
      expect(res.headers.get("set-cookie")).toBeNull();
    }
  });

  it("grants the right PIN, logs it with a hashed IP, and issues a path-scoped cookie", async () => {
    const { token, share } = await addShare();
    const { POST } = await load();
    const res = await POST(pinRequest(token, { pin: PIN }), ctx(token));
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(new RegExp(`Path=/share/${token}`));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(fake.store.log).toHaveLength(1);
    const entry = fake.store.log[0];
    expect(entry).toMatchObject({ target: { shareId: share.id }, outcome: "granted", client: { userAgent: "TestBrowser/1.0" } });
    expect(entry.client.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(fake.store.log)).not.toContain("203.0.113.7");
  });

  it("logs wrong PINs and locks after 5 attempts, even for the right PIN", async () => {
    const { token } = await addShare();
    const { POST } = await load();
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await POST(pinRequest(token, { pin: "111111" }), ctx(token))).status);
    }
    expect(statuses).toEqual([401, 401, 401, 401, 429]);
    const locked = await POST(pinRequest(token, { pin: PIN }), ctx(token));
    expect(locked.status).toBe(429);
    expect(locked.headers.get("set-cookie")).toBeNull();
    expect(fake.store.log.map((e) => e.outcome)).toEqual(["pin_failed", "pin_failed", "pin_failed", "pin_failed", "pin_failed", "locked"]);
  });

  it("parallel guesses cannot exceed the attempt budget", async () => {
    const { token } = await addShare();
    const { POST } = await load();
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => POST(pinRequest(token, { pin: String(100000 + i) }), ctx(token)))
    );
    expect(fake.store.log.filter((e) => e.outcome === "pin_failed")).toHaveLength(5);
    expect(results.every((r) => r.status !== 200)).toBe(true);
  });

  it("refuses revoked and expired shares without checking the PIN, and logs why", async () => {
    const revoked = await addShare({ revokedAt: new Date().toISOString() });
    const expired = await addShare({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    const { POST } = await load();
    expect((await POST(pinRequest(revoked.token, { pin: PIN }), ctx(revoked.token))).status).toBe(401);
    expect((await POST(pinRequest(expired.token, { pin: PIN }), ctx(expired.token))).status).toBe(401);
    expect(fake.store.log.map((e) => e.outcome)).toEqual(["revoked", "expired"]);
    expect(fake.store.attempts.size).toBe(0);
  });

  it("fails closed when the granted access cannot be logged", async () => {
    const { token } = await addShare();
    fake.store.failRecord = true;
    const { POST } = await load();
    const res = await POST(pinRequest(token, { pin: PIN }), ctx(token));
    expect(res.status).toBe(503);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("loads only the shared categories, and only reviewed records unless allowed", async () => {
    const { token } = await addShare({ categories: ["medications"] });
    const { resolveShareToken, loadSharedRecords } = await load();
    const share = (await resolveShareToken(token))!;
    const records = await loadSharedRecords(share);
    expect(records.allergies).toBeNull();
    expect(records.labs).toBeNull();
    expect(records.timeline).toBeNull();
    const all = await new MixedReviewRepository(DEMO_PATIENT_ID).listMedications();
    const reviewed = all.filter((m) => m.reviewStatus === "patient_reviewed");
    expect(reviewed.length).toBeLessThan(all.length); // the fixture must contain both kinds
    expect(records.medications?.map((m) => m.id)).toEqual(reviewed.map((m) => m.id));

    const withUnreviewed = await loadSharedRecords({ ...share, includeUnreviewed: true });
    expect(withUnreviewed.medications).toHaveLength(all.length);
  });

  it("only honours a share session that matches the share and is still active", async () => {
    const { token } = await addShare();
    const { POST, resolveShareToken, hasValidShareSession, SHARE_SESSION_COOKIE } = await load();
    const share = (await resolveShareToken(token))!;
    expect(await hasValidShareSession(share)).toBe(false);
    const res = await POST(pinRequest(token, { pin: PIN }), ctx(token));
    cookieJar.set(SHARE_SESSION_COOKIE, /mhv_share_session=([^;]+)/.exec(res.headers.get("set-cookie") ?? "")![1]);
    expect(await hasValidShareSession(share)).toBe(true);
    expect(await hasValidShareSession({ ...share, state: "revoked" })).toBe(false);
    expect(await hasValidShareSession({ ...share, shareId: "share-other" })).toBe(false);
  });
});

describe("REAL-USER mode: emergency links", () => {
  beforeEach(() => useEnv(LIVE_ENV));

  const settings = {
    id: "em-1",
    showBloodGroup: false,
    showDateOfBirth: false,
    showAllergies: true,
    showConditions: false,
    showEmergencyContact: false,
    medicationIds: [] as string[],
    patientNote: null,
    expiresAt: future(30),
    createdAt: new Date().toISOString(),
    lastAccessedAt: null,
  };

  function addEmergency(overrides: Partial<StoredEmergency> = {}) {
    const token = generateShareToken();
    fake.store.emergencies.set(hashToken(token), { patientId: DEMO_PATIENT_ID, revokedAt: null, settings, ...overrides });
    return token;
  }

  it("shows only opted-in fields and logs the view", async () => {
    const token = addEmergency();
    const { openEmergencyLink } = await load();
    const view = (await openEmergencyLink(token, client))!;
    expect(view.allergies?.length).toBeGreaterThan(0);
    expect(view.bloodGroup).toBeUndefined();
    expect(view.dateOfBirth).toBeUndefined();
    expect(view.conditions).toBeUndefined();
    expect(view.emergencyContact).toBeUndefined();
    expect(view.medications).toBeUndefined();
    expect(fake.store.log).toEqual([{ target: { emergencyAccessId: "em-1" }, outcome: "granted", client }]);
  });

  it("refuses revoked and expired links and logs the attempt", async () => {
    const revoked = addEmergency({ revokedAt: new Date().toISOString() });
    const expired = addEmergency({ settings: { ...settings, expiresAt: new Date(Date.now() - 1000).toISOString() } });
    const { openEmergencyLink } = await load();
    expect(await openEmergencyLink(revoked, client)).toBeNull();
    expect(await openEmergencyLink(expired, client)).toBeNull();
    expect(fake.store.log.map((e) => e.outcome)).toEqual(["revoked", "expired"]);
  });

  it("still shows the information if the access log is down (responders must not be blocked)", async () => {
    const token = addEmergency();
    fake.store.failRecord = true;
    const { openEmergencyLink } = await load();
    expect(await openEmergencyLink(token, client)).not.toBeNull();
  });
});

describe("demo mode", () => {
  beforeEach(() => useEnv(DEMO_ENV));

  it("resolves only the exact demo tokens", async () => {
    const { resolveShareToken, openEmergencyLink } = await load();
    expect((await resolveShareToken(DEMO_SHARE_TOKEN))?.state).toBe("active");
    expect(await resolveShareToken(`${DEMO_SHARE_TOKEN}x`)).toBeNull();
    expect(await resolveShareToken("anything")).toBeNull();
    expect(await openEmergencyLink(DEMO_EMERGENCY_TOKEN, client)).not.toBeNull();
    expect(await openEmergencyLink("anything", client)).toBeNull();
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
});
