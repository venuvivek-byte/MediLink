import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { cookiesMock } from "./helpers/next-mocks";
import { DEMO_ENV, LIVE_ENV, useEnv } from "./helpers/env";

const exchangeCodeForSession = vi.fn();
vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { exchangeCodeForSession } }) }));

async function callback(query: string) {
  vi.resetModules();
  const { GET } = await import("@/app/auth/callback/route");
  return (await GET(new NextRequest(`http://localhost/auth/callback${query}`))).headers.get("location");
}

beforeEach(() => {
  exchangeCodeForSession.mockReset();
  exchangeCodeForSession.mockResolvedValue({ error: null });
});

describe("GET /auth/callback (Google OAuth)", () => {
  it("exchanges the code and lands on the dashboard", async () => {
    useEnv(LIVE_ENV);
    expect(await callback("?code=abc123")).toBe("http://localhost/");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123");
  });

  it("ignores any redirect target in the URL (no open redirect)", async () => {
    useEnv(LIVE_ENV);
    for (const q of ["?code=abc&next=https://evil.example", "?code=abc&redirect_to=//evil.example", "?code=abc&next=/../x"]) {
      expect(await callback(q), q).toBe("http://localhost/");
    }
  });

  it("reports a cancelled consent screen without echoing provider text", async () => {
    useEnv(LIVE_ENV);
    const location = await callback("?error=access_denied&error_description=<script>alert(1)</script>");
    expect(location).toBe("http://localhost/login?error=oauth_cancelled");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("rejects a missing code", async () => {
    useEnv(LIVE_ENV);
    expect(await callback("")).toBe("http://localhost/login?error=oauth_failed");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("rejects a code that cannot be exchanged (expired, reused, or from another browser)", async () => {
    useEnv(LIVE_ENV);
    exchangeCodeForSession.mockResolvedValue({ error: new Error("invalid flow state") });
    expect(await callback("?code=stolen")).toBe("http://localhost/login?error=oauth_failed");
  });

  describe("email confirmation links (?flow=email)", () => {
    it("signs the user in when opened in the same browser", async () => {
      useEnv(LIVE_ENV);
      expect(await callback("?code=abc&flow=email")).toBe("http://localhost/");
    });

    it("says the email IS confirmed when opened on another device (code not exchangeable)", async () => {
      useEnv(LIVE_ENV);
      exchangeCodeForSession.mockResolvedValue({ error: new Error("code verifier missing") });
      expect(await callback("?code=abc&flow=email")).toBe("http://localhost/login?error=email_confirmed_sign_in");
    });

    it("reports an expired or already-used link", async () => {
      useEnv(LIVE_ENV);
      expect(await callback("?flow=email&error=access_denied&error_code=otp_expired")).toBe(
        "http://localhost/login?error=email_link_invalid"
      );
      expect(exchangeCodeForSession).not.toHaveBeenCalled();
    });
  });

  it("is inert in demo mode", async () => {
    useEnv(DEMO_ENV);
    expect(await callback("?code=abc")).toBe("http://localhost/login?error=demo_mode");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
