import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, cookiesMock, createSupabaseClientMock, redirectMock, supabaseState } from "./helpers/next-mocks";
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

async function loadRoute() {
  vi.resetModules();
  return import("@/app/api/documents/upload/route");
}

beforeEach(() => {
  cookieJar.clear();
  supabaseState.user = null;
});

describe("POST /api/documents/upload", () => {
  it("returns 401 JSON (not a redirect) without a session", async () => {
    useEnv(LIVE_ENV);
    const { POST } = await loadRoute();
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("refuses real files in demo mode", async () => {
    useEnv(DEMO_ENV);
    cookieJar.set(DEMO_SESSION_COOKIE, createSignedToken({ sid: crypto.randomUUID() }, TEST_SECRET, 60));
    const { POST } = await loadRoute();
    expect((await POST()).status).toBe(403);
  });

  it("reports 'not available' instead of fabricating an extraction in real-user mode", async () => {
    useEnv({ ...LIVE_ENV, AI_PROVIDER: "gemini", GEMINI_API_KEY: "k", GEMINI_MODEL: "m" });
    supabaseState.user = { id: "user-a", email: "a@example.com" };
    const { POST } = await loadRoute();
    const res = await POST();
    expect(res.status).toBe(501);
    expect(JSON.stringify(await res.json())).not.toMatch(/medications|extraction/i);
  });
});
