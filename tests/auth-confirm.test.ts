import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { cookiesMock } from "./helpers/next-mocks";
import { DEMO_ENV, LIVE_ENV, useEnv } from "./helpers/env";

const verifyOtp = vi.fn();
vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { verifyOtp } }) }));

async function confirm(query: string) {
  vi.resetModules();
  const { GET } = await import("@/app/auth/confirm/route");
  const res = await GET(new NextRequest(`http://localhost/auth/confirm${query}`));
  return res.headers.get("location");
}

beforeEach(() => {
  verifyOtp.mockReset();
  verifyOtp.mockResolvedValue({ error: null });
});

describe("GET /auth/confirm", () => {
  it("verifies the token hash and lands on the dashboard", async () => {
    useEnv(LIVE_ENV);
    expect(await confirm("?token_hash=abc&type=email")).toBe("http://localhost/");
    expect(verifyOtp).toHaveBeenCalledWith({ type: "email", token_hash: "abc" });
  });

  it("never redirects off-site, whatever `next` says", async () => {
    useEnv(LIVE_ENV);
    expect(await confirm("?token_hash=abc&type=email&next=https://evil.example")).toBe("http://localhost/");
    expect(await confirm("?token_hash=abc&type=email&next=//evil.example")).toBe("http://localhost/");
  });

  it.each([
    ["missing token", "?type=email"],
    ["password-recovery type (not supported here)", "?token_hash=abc&type=recovery"],
    ["no params", ""],
  ])("rejects %s without calling Supabase", async (_label, query) => {
    useEnv(LIVE_ENV);
    expect(await confirm(query)).toBe("http://localhost/login?error=confirmation_failed");
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("reports an invalid or expired link", async () => {
    useEnv(LIVE_ENV);
    verifyOtp.mockResolvedValue({ error: new Error("expired") });
    expect(await confirm("?token_hash=abc&type=email")).toBe("http://localhost/login?error=confirmation_failed");
  });

  it("is inert in demo mode", async () => {
    useEnv(DEMO_ENV);
    expect(await confirm("?token_hash=abc&type=email")).toBe("http://localhost/login?error=demo_mode");
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});
