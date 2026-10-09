import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "@/lib/security/headers";

const get = (headers: { key: string; value: string }[], key: string) => headers.find((h) => h.key === key)?.value;

describe("security headers", () => {
  const prod = buildSecurityHeaders({ supabaseUrl: "https://abc.supabase.co/", isDev: false });
  const csp = get(prod, "Content-Security-Policy")!;
  const directive = (name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `));

  it("blocks framing, plugins, base hijacking and off-site form posts", () => {
    expect(directive("frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive("object-src")).toBe("object-src 'none'");
    expect(directive("base-uri")).toBe("base-uri 'self'");
    expect(directive("form-action")).toBe("form-action 'self'");
    expect(get(prod, "X-Frame-Options")).toBe("DENY");
  });

  it("allows scripts from this origin only, and no eval in production", () => {
    expect(directive("script-src")).toBe("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("lets the browser talk only to this app and the configured Supabase origin", () => {
    expect(directive("connect-src")).toBe("connect-src 'self' https://abc.supabase.co");
  });

  it("never leaks share tokens through the Referer header and keeps pages out of search", () => {
    expect(get(prod, "Referrer-Policy")).toBe("no-referrer");
    expect(get(prod, "X-Robots-Tag")).toBe("noindex, nofollow");
    expect(get(prod, "X-Content-Type-Options")).toBe("nosniff");
  });

  it("ignores a malformed Supabase URL instead of emitting a broken policy", () => {
    const headers = buildSecurityHeaders({ supabaseUrl: "not a url", isDev: false });
    expect(get(headers, "Content-Security-Policy")).toContain("connect-src 'self';");
  });
});
