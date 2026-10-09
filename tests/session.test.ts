import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cookieJar,
  cookiesMock,
  createSupabaseClientMock,
  RedirectSignal,
  redirectMock,
  supabaseState,
} from "./helpers/next-mocks";
import { DEMO_ENV, LIVE_ENV, TEST_SECRET, useEnv } from "./helpers/env";
import { createSignedToken } from "@/lib/security/signed-token";
import { DEMO_SESSION_COOKIE } from "@/lib/auth/constants";

vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: createSupabaseClientMock }));

// Fresh modules per test: getConfig() memoises process.env.
async function loadSession() {
  vi.resetModules();
  return import("@/lib/auth/session");
}

function validDemoCookie(secret = TEST_SECRET) {
  return createSignedToken({ sid: crypto.randomUUID() }, secret, 3600);
}

beforeEach(() => {
  cookieJar.clear();
  supabaseState.user = null;
});

describe("getSession — demo mode", () => {
  beforeEach(() => useEnv(DEMO_ENV));

  it("accepts a correctly signed demo cookie", async () => {
    cookieJar.set(DEMO_SESSION_COOKIE, validDemoCookie());
    const { getSession } = await loadSession();
    expect(await getSession()).toEqual({ kind: "demo", patientId: expect.any(String) });
  });

  it("rejects the old hand-typed `patient_session=demo` style value", async () => {
    cookieJar.set(DEMO_SESSION_COOKIE, "demo");
    cookieJar.set("patient_session", "demo");
    const { getSession } = await loadSession();
    expect(await getSession()).toBeNull();
  });

  it("rejects a cookie signed with another secret", async () => {
    cookieJar.set(DEMO_SESSION_COOKIE, validDemoCookie("forged-secret-forged-secret-forged-secret"));
    const { getSession } = await loadSession();
    expect(await getSession()).toBeNull();
  });

  it("startDemoSession issues a cookie that getSession accepts", async () => {
    const { startDemoSession, getSession } = await loadSession();
    await startDemoSession();
    expect(cookieJar.get(DEMO_SESSION_COOKIE)).toBeTruthy();
    expect(await getSession()).not.toBeNull();
  });
});

describe("getSession — real-user mode", () => {
  beforeEach(() => useEnv(LIVE_ENV));

  it("IGNORES a perfectly valid demo cookie (the original auth bypass)", async () => {
    cookieJar.set(DEMO_SESSION_COOKIE, validDemoCookie());
    const { getSession } = await loadSession();
    expect(await getSession()).toBeNull();
  });

  it("uses the Supabase-verified user id as the patient id", async () => {
    supabaseState.user = { id: "user-a", email: "a@example.com" };
    const { getSession } = await loadSession();
    expect(await getSession()).toEqual({ kind: "live", patientId: "user-a", email: "a@example.com" });
  });

  it("refuses to start a demo session", async () => {
    const { startDemoSession } = await loadSession();
    await expect(startDemoSession()).rejects.toThrow(/disabled/);
    expect(cookieJar.has(DEMO_SESSION_COOKIE)).toBe(false);
  });

  it("requireSession redirects to /login without a user", async () => {
    const { requireSession } = await loadSession();
    await expect(requireSession()).rejects.toEqual(new RedirectSignal("/login"));
  });
});
