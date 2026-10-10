import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("next.config", () => {
  // Vitest loads pdf.js straight from node_modules, so only this guard catches
  // the Turbopack bundling bug: bundled pdf.js cannot find pdf.worker.mjs and
  // every PDF upload fails.
  it("keeps pdf.js out of the server bundle", () => {
    expect(nextConfig.serverExternalPackages).toContain("pdfjs-dist");
  });

  it("ships the pdf.js worker with the processing route", () => {
    expect(nextConfig.outputFileTracingIncludes?.["/api/documents/*/process"]).toContain(
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
    );
  });
});
