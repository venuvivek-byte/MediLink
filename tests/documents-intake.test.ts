import { describe, expect, it } from "vitest";
import { detectMimeType, sanitizeFilename, validateUpload } from "@/lib/documents/file-validation";
import { extractPdfText } from "@/lib/documents/pdf-text";
import { DocumentError } from "@/lib/documents/errors";
import { makePdf } from "./fixtures/make-pdf";

const MB = 1024 * 1024;
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const pdf = (pages: string[]) => new Uint8Array(makePdf(pages));

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof DocumentError ? error.code : `unexpected:${String(error)}`;
  }
  return undefined;
}

describe("file validation", () => {
  it("detects PDF, PNG and JPEG by content", () => {
    expect(detectMimeType(pdf(["x"]))).toBe("application/pdf");
    expect(detectMimeType(PNG)).toBe("image/png");
    expect(detectMimeType(JPEG)).toBe("image/jpeg");
    expect(detectMimeType(new TextEncoder().encode("<html><script>"))).toBeNull();
  });

  it("accepts a valid file and returns its hash and real type", () => {
    const result = validateUpload(PNG, { mimeType: "image/png", filename: "scan.png" }, 5 * MB);
    expect(result.mimeType).toBe("image/png");
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.sizeBytes).toBe(PNG.length);
  });

  it.each([
    ["empty file", new Uint8Array(), "application/pdf", "file_empty"],
    ["HTML disguised as PDF", new TextEncoder().encode("<html>"), "application/pdf", "file_type_unsupported"],
    ["PNG renamed to .pdf", PNG, "application/pdf", "file_type_mismatch"],
    ["executable", Uint8Array.from([0x4d, 0x5a, 0x90, 0]), "application/octet-stream", "file_type_unsupported"],
  ])("rejects %s", (_label, bytes, mimeType, code) => {
    expect(codeOf(() => validateUpload(bytes, { mimeType, filename: "x" }, 5 * MB))).toBe(code);
  });

  it("enforces the size limit by actual byte length", () => {
    const big = new Uint8Array(5 * MB + 1);
    big.set(PNG);
    expect(codeOf(() => validateUpload(big, { mimeType: "image/png", filename: "x.png" }, 5 * MB))).toBe("file_too_large");
  });

  it("strips paths and control characters from display names", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("C:\\Users\\x\\Rx\u0000<script>.pdf")).toBe("Rxscript.pdf");
    expect(sanitizeFilename("..")).toBe("document");
    expect(sanitizeFilename("a".repeat(500))).toHaveLength(200);
  });
});

describe("PDF text extraction", () => {
  it("reads the text layer page by page, keeping page numbers", async () => {
    const result = await extractPdfText(
      pdf(["Apollo Clinic\nRx: Tab Metformin 500 mg BD after food", "SRL Diagnostics\nHbA1c 7.2 % (ref < 5.7 %)"])
    );
    expect(result.pageCount).toBe(2);
    expect(result.pagesNeedingOcr).toEqual([]);
    expect(result.textPages[0]).toMatchObject({ pageNumber: 1 });
    expect(result.textPages[0].text).toContain("Metformin 500 mg BD");
    expect(result.textPages[1].text).toContain("HbA1c 7.2 %");
  });

  it("flags pages with no text layer (scans) for OCR instead of dropping them", async () => {
    const result = await extractPdfText(pdf(["Page one has enough readable text here.", ""]));
    expect(result.textPages.map((p) => p.pageNumber)).toEqual([1]);
    expect(result.pagesNeedingOcr).toEqual([2]);
  });

  it("rejects documents over the page limit instead of truncating them", async () => {
    await expect(extractPdfText(pdf(Array(4).fill("Some page text that is long enough.")), 3)).rejects.toMatchObject({
      code: "too_many_pages",
    });
  });

  it("rejects a damaged PDF", async () => {
    const broken = pdf(["text"]).slice(0, 40);
    await expect(extractPdfText(broken)).rejects.toMatchObject({ code: "pdf_invalid" });
  });
});
