// Backup provider (Groq) used only when the primary OCR/AI is unavailable.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseConfig } from "@/lib/config/schema";
import { DocumentError } from "@/lib/documents/errors";
import { FallbackOcrProvider, type OcrProvider, type OcrRequest } from "@/lib/ocr";
import { GroqVisionOcrProvider, GROQ_VISION_OCR } from "@/lib/ocr/groq";
import { runExtractionWithFallback } from "@/lib/ai";
import { ProviderError, type ExtractionProvider } from "@/lib/ai/providers/types";
import { attentionFor } from "@/components/documents/ReviewForm";

const PNG: OcrRequest = { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/png" };
const PDF: OcrRequest = { bytes: new Uint8Array([1, 2, 3]), mimeType: "application/pdf", pages: [1] };

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("config", () => {
  const base = { DEMO_MODE: "true" };
  it("enables the backup only when GROQ_API_KEY is set, with overridable models", () => {
    expect(parseConfig(base).fallback).toBeNull();
    expect(parseConfig({ ...base, GROQ_API_KEY: "gsk_test" }).fallback).toEqual({
      provider: "groq",
      model: "openai/gpt-oss-120b",
      visionModel: "qwen/qwen3.8-27b",
    });
    expect(parseConfig({ ...base, GROQ_API_KEY: "gsk_test", GROQ_VISION_MODEL: "other/vision" }).fallback?.visionModel).toBe("other/vision");
  });
});

function ocr(name: string, impl: () => Promise<{ pageNumber: number; text: string; confidence: null }[]>): OcrProvider {
  return { name, available: true, recognize: vi.fn(impl) };
}

function groqWith(create: (...args: unknown[]) => Promise<unknown>) {
  return new GroqVisionOcrProvider("gsk_test", "qwen/qwen3.8-27b", { chat: { completions: { create } } } as never);
}

describe("FallbackOcrProvider", () => {
  const ok = async () => [{ pageNumber: 1, text: "Tab Amoxicillin 500 mg", confidence: null }];

  it("uses the primary when it works, and records which provider read the page", async () => {
    const backup = groqWith(vi.fn());
    const pages = await new FallbackOcrProvider(ocr("gemini-vision", ok), backup).recognize(PNG);
    expect(pages[0].engine).toBe("gemini-vision");
  });

  it.each(["ocr_unavailable", "ocr_timeout"] as const)("uses the backup for a photo when the primary is %s", async (code) => {
    const create = vi.fn(async () => ({ choices: [{ message: { content: "Tab Amoxicillin 500 mg" }, finish_reason: "stop" }] }));
    const primary = ocr("gemini-vision", async () => {
      throw new DocumentError(code, true);
    });
    const pages = await new FallbackOcrProvider(primary, groqWith(create)).recognize(PNG);
    expect(pages).toEqual([{ pageNumber: 1, text: "Tab Amoxicillin 500 mg", confidence: null, engine: GROQ_VISION_OCR }]);
    expect(create).toHaveBeenCalledOnce();
  });

  it("does not hide real reading failures behind the backup", async () => {
    const create = vi.fn();
    const primary = ocr("gemini-vision", async () => {
      throw new DocumentError("ocr_failed");
    });
    await expect(new FallbackOcrProvider(primary, groqWith(create)).recognize(PNG)).rejects.toMatchObject({ code: "ocr_failed" });
    expect(create).not.toHaveBeenCalled();
  });

  it("keeps PDFs and oversized photos with the primary (the backup cannot read them)", async () => {
    const create = vi.fn();
    const primary = ocr("gemini-vision", async () => {
      throw new DocumentError("ocr_unavailable", true);
    });
    const fallback = new FallbackOcrProvider(primary, groqWith(create));
    await expect(fallback.recognize(PDF)).rejects.toMatchObject({ code: "ocr_unavailable" });
    await expect(fallback.recognize({ bytes: new Uint8Array(4 * 1024 * 1024), mimeType: "image/jpeg" })).rejects.toMatchObject({
      code: "ocr_unavailable",
    });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("GroqVisionOcrProvider", () => {
  it("sends the image as a data URL with the transcription rules", async () => {
    const create = vi.fn(async (...args: unknown[]) => ({ choices: [{ message: { content: " Rx \n" }, finish_reason: "stop" }], args }));
    await groqWith(create).recognize(PNG);
    const body = create.mock.calls[0][0] as { model: string; messages: { content: unknown }[] };
    expect(body.model).toBe("qwen/qwen3.8-27b");
    expect(String(body.messages[0].content)).toContain("[illegible]");
    expect(JSON.stringify(body.messages[1].content)).toContain("data:image/png;base64,AQID");
  });

  it.each([
    [{ status: 429 }, "ocr_unavailable"],
    [{ status: 401 }, "ocr_unavailable"],
    [{ status: 400 }, "ocr_failed"],
    [{ name: "TimeoutError" }, "ocr_timeout"],
  ])("maps %o to %s", async (error, code) => {
    const create = vi.fn(async () => {
      throw Object.assign(new Error("x"), error);
    });
    await expect(groqWith(create).recognize(PNG)).rejects.toMatchObject({ code });
  });

  it("rejects cut-off or empty transcriptions", async () => {
    const cut = vi.fn(async () => ({ choices: [{ message: { content: "Tab Amox" }, finish_reason: "length" }] }));
    await expect(groqWith(cut).recognize(PNG)).rejects.toMatchObject({ code: "ocr_failed" });
    const empty = vi.fn(async () => ({ choices: [{ message: { content: "  " }, finish_reason: "stop" }] }));
    await expect(groqWith(empty).recognize(PNG)).rejects.toMatchObject({ code: "ocr_failed" });
  });
});

const PAGES = [{ pageNumber: 1, text: "Tab Amoxicillin 500 mg TDS" }];
const VALID = {
  document_type: "prescription",
  document_date: null,
  encounter_date: null,
  patient_name: null,
  provider_name: null,
  facility_name: null,
  diagnoses: [],
  medications: [
    {
      name: "Tab Amoxicillin",
      strength: "500 mg",
      dosage: null,
      frequency: "TDS",
      duration: null,
      route: null,
      instructions: null,
      uncertain: false,
      evidence: { page: 1, quote: "Tab Amoxicillin 500 mg TDS" },
    },
  ],
  lab_results: [],
  allergies: [],
  instructions: [],
  unreadable_notes: [],
};

function provider(name: ExtractionProvider["name"], impl: () => Promise<unknown>): ExtractionProvider {
  return { name, model: `${name}-model`, isSimulated: false, extract: vi.fn(impl) };
}

describe("runExtractionWithFallback", () => {
  const fast = { backoffMs: 0 };

  it("uses the backup only after the primary is unavailable, and records it", async () => {
    const primary = provider("gemini", async () => {
      throw new ProviderError("transient", "quota", 429);
    });
    const backup = provider("groq", async () => VALID);
    const outcome = await runExtractionWithFallback(primary, backup, PAGES, fast);
    expect(outcome).toMatchObject({ provider: "groq", model: "groq-model" });
    expect(primary.extract).toHaveBeenCalledTimes(3);
  });

  it("never retries invalid output or auth problems on the backup", async () => {
    const backup = provider("groq", async () => VALID);
    const bad = provider("gemini", async () => ({ nonsense: true }));
    await expect(runExtractionWithFallback(bad, backup, PAGES, fast)).rejects.toMatchObject({ code: "ai_invalid_output" });
    const auth = provider("gemini", async () => {
      throw new ProviderError("auth", "bad key", 401);
    });
    await expect(runExtractionWithFallback(auth, backup, PAGES, fast)).rejects.toMatchObject({ code: "ai_not_configured" });
    expect(backup.extract).not.toHaveBeenCalled();
  });

  it("without a backup, the primary's error is unchanged", async () => {
    const primary = provider("gemini", async () => {
      throw new ProviderError("transient", "down", 503);
    });
    await expect(runExtractionWithFallback(primary, null, PAGES, fast)).rejects.toMatchObject({ code: "ai_unavailable" });
  });
});

describe("review: strict mode when the backup read the document", () => {
  it("requires a decision on every entry, even unflagged ones", () => {
    const clean = { values: { name: "Amoxicillin" }, flags: [] };
    expect(attentionFor(clean, true).needsDecision).toBe(false);
    expect(attentionFor(clean, true, true).needsDecision).toBe(true);
    expect(attentionFor({ values: { substance: "Penicillin" }, flags: [] }, false, true).needsDecision).toBe(true);
  });
});
