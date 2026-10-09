// Security response headers applied to every route (see next.config.ts).
//
// CSP without nonces: nonce-based CSP requires dynamic rendering and is
// incompatible with Partial Prerendering, which this app uses. Next.js needs
// inline bootstrap scripts, so script-src allows 'unsafe-inline' but no
// external origins. Everything else is locked to this origin, plus the
// Supabase project for the browser auth client.

export function buildSecurityHeaders(options: { supabaseUrl?: string; isDev: boolean }) {
  let supabaseOrigin = "";
  if (options.supabaseUrl) {
    try {
      supabaseOrigin = new URL(options.supabaseUrl).origin;
    } catch {
      supabaseOrigin = "";
    }
  }

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${options.isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}${options.isDev ? " ws: wss:" : ""}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "worker-src 'self' blob:",
    // No upgrade-insecure-requests: it can break `next start` on http://localhost,
    // and production already gets HSTS from Vercel.
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: csp },
    // Share links carry their token in the path: never send it to other sites.
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    // Private health application: keep every page out of search engines.
    { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ];
}
