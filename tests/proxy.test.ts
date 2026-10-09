import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
// Next 16.4 docs name this `unstable_doesProxyMatch`, but the shipped package still
// exports the pre-rename `unstable_doesMiddlewareMatch`.
import { getRedirectUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "@/proxy";
import { DEMO_SESSION_COOKIE } from "@/lib/auth/constants";
import { DEMO_ENV, useEnv } from "./helpers/env";

const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("proxy matcher", () => {
  it.each([
    "/",
    "/timeline",
    "/documents",
    "/medications",
    "/lab-results",
    "/share", // the patient's private share-management page
    "/emergency", // the patient's private emergency-card page
    "/audit",
    "/settings",
    "/login",
  ])("runs on private/app page %s", (url) => {
    expect(matches(url)).toBe(true);
  });

  it.each([
    "/share/some-token", // public clinician page, token-authorised
    "/emergency/some-token", // public emergency page, token-authorised
    "/api/documents/upload", // route handlers authorise themselves (401 JSON)
    "/api/share/x/verify-pin",
    "/_next/static/chunk.js",
    "/_next/image",
    "/favicon.ico",
    "/logo.svg",
  ])("does not run on %s", (url) => {
    expect(matches(url)).toBe(false);
  });
});

describe("proxy redirects (demo mode)", () => {
  beforeEach(() => useEnv(DEMO_ENV));

  it("sends visitors without a session to /login", async () => {
    const res = await proxy(new NextRequest("http://localhost/medications?x=1"));
    expect(getRedirectUrl(res)).toBe("http://localhost/login");
  });

  it("lets a request with a session cookie through (the page then verifies its signature)", async () => {
    const req = new NextRequest("http://localhost/medications", {
      headers: { cookie: `${DEMO_SESSION_COOKIE}=anything` },
    });
    expect(getRedirectUrl(await proxy(req))).toBeNull();
  });

  it.each(["/auth/callback?code=x", "/auth/callback?code=x&flow=email"])(
    "lets %s through without a session",
    async (path) => {
      expect(getRedirectUrl(await proxy(new NextRequest(`http://localhost${path}`)))).toBeNull();
    }
  );

  it("does not treat look-alike paths as public", async () => {
    for (const path of ["/loginx", "/auth/confirm", "/auth/callbackx", "/auth", "/signup-data"]) {
      expect(getRedirectUrl(await proxy(new NextRequest(`http://localhost${path}`))), path).toBe("http://localhost/login");
    }
  });

  it("never redirects away from /login, so a forged cookie cannot cause a loop", async () => {
    const req = new NextRequest("http://localhost/login", {
      headers: { cookie: `${DEMO_SESSION_COOKIE}=forged` },
    });
    expect(getRedirectUrl(await proxy(req))).toBeNull();
  });
});
