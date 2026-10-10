import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // pdf.js loads its worker (pdf.worker.mjs) relative to its own file; bundling
  // it into .next chunks breaks that lookup, so load it from node_modules.
  serverExternalPackages: ["pdfjs-dist"],
  // The worker is loaded with a dynamic import the build tracer cannot see, so
  // deployments (Vercel) would omit it unless it is listed explicitly.
  outputFileTracingIncludes: {
    "/api/documents/*/process": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
    // Original files of the read-only "Try sample" patient, read with fs at request time.
    "/api/documents/*/file": ["./lib/demo/sample/files/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          isDev: process.env.NODE_ENV === "development",
        }),
      },
    ];
  },
};

export default nextConfig;
