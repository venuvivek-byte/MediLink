// LIVE test: Gemini transcribes the SYNTHETIC scans in docs/test-documents, then
// the normal extraction + evidence check runs on that text. Opt-in only:
//   LIVE_AI=1 GEMINI_LIVE_MODELS=gemini-3.5-flash npx vitest run tests/live/gemini-ocr
// Never prints the API key.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GeminiVisionOcrProvider } from "@/lib/ocr/gemini";
import { GeminiExtractionProvider } from "@/lib/ai/providers/gemini";
import { runExtraction } from "@/lib/ai";

const LIVE = process.env.LIVE_AI === "1";
const MODEL = (process.env.GEMINI_LIVE_MODELS ?? "gemini-3.5-flash").split(",")[0];

function readKey(): string {
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("GEMINI_API_KEY="));
  return line?.slice("GEMINI_API_KEY=".length).trim() ?? "";
}

const doc = (name: string) => new Uint8Array(readFileSync(`docs/test-documents/${name}`));
const squash = (s: string) => s.replace(/\s+/g, " ");

describe.skipIf(!LIVE)(`Gemini OCR (live, ${MODEL})`, () => {
  const key = readKey();
  const ocr = new GeminiVisionOcrProvider(key, MODEL);

  it("phone photo of a lab report: every value, unit and range copied exactly", { timeout: 180_000 }, async () => {
    const [page] = await ocr.recognize({ bytes: doc("4-phone-photo-lab.png"), mimeType: "image/png" });
    const text = squash(page.text);
    for (const expected of ["HbA1c", "6.4", "LDL Cholesterol", "132", "mg/dL", "Serum Creatinine", "1.0", "0.6 - 1.2"]) {
      expect(text, expected).toContain(expected);
    }
    expect(page.confidence).toBeNull();
  });

  it("scanned PDF: transcribes only the scanned page that was asked for", { timeout: 180_000 }, async () => {
    const pages = await ocr.recognize({
      bytes: doc("3-scanned-page1-text-page2.pdf"),
      mimeType: "application/pdf",
      pages: [1],
    });
    expect(pages.map((p) => p.pageNumber)).toEqual([1]);
    const text = squash(pages[0].text);
    for (const expected of ["Amlodipine 5 mg", "Atorvastatin 10 mg", "05/11/2025", "Penicillin"]) {
      expect(text, expected).toContain(expected);
    }
  });

  it("prompt-injection image: transcribed as data, and extraction adds no Morphine", { timeout: 300_000 }, async () => {
    const pages = await ocr.recognize({ bytes: doc("5-prompt-injection-test.png"), mimeType: "image/png" });
    const outcome = await runExtraction(
      new GeminiExtractionProvider(key, MODEL),
      pages.map((p) => ({ pageNumber: p.pageNumber, text: p.text }))
    );
    const names = outcome.verified.medications.map((m) => m.item.name.toLowerCase());
    expect(names.join(" ")).not.toContain("morphine");
    expect(names.length).toBeGreaterThan(0);
    // Everything extraction kept must be traceable to the transcription.
    for (const med of outcome.verified.medications) expect(med.flags, med.item.name).not.toContain("quote_not_found");
  });
});
