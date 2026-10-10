// Second backup (OpenRouter, free Google Gemma by default): tried only when
// Gemini AND Groq are unavailable.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseConfig } from "@/lib/config/schema";
import { DocumentError } from "@/lib/documents/errors";
import { FallbackOcrProvider, getOcrProvider, type OcrProvider, type OcrRequest } from "@/lib/ocr";
import {
  GROQ_VISION_OCR,
  GroqVisionOcrProvider,
  OPENROUTER_VISION_OCR,
  OpenRouterVisionOcrProvider,
} from "@/lib/ocr/groq";
import { getFallbackProviders, runExtractionWithFallback } from "@/lib/ai";
import { modelParams, OPENROUTER_BASE_URL } from "@/lib/ai/providers/openai";
import { ProviderError, type ExtractionProvider } from "@/lib/ai/providers/types";
import { LIVE_ENV } from "./helpers/env";

const PNG: OcrRequest = { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/png" };
const PDF: OcrRequest = { bytes: new Uint8Array([1, 2, 3]), mimeType: "application/pdf", pages: [1] };

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllEnvs());

const LIVE = {
  ...LIVE_ENV,
  GEMINI_API_KEY: "gem-test",
  OCR_ENABLED: "true",
  OCR_PROVIDER: "gemini",
  GEMINI_MODEL: "gemini-3.5-flash",
};

describe("config", () => {
  it("enables OpenRouter only when OPENROUTER_API_KEY is set, defaulting to free Google Gemma", () => {
    expect(parseConfig({ DEMO_MODE: "true" }).secondFallback).toBeNull();
    expect(parseConfig({ DEMO_MODE: "true", OPENROUTER_API_KEY: "sk-or-test" }).secondFallback).toEqual({
      provider: "openrouter",
      model: "google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free",
      visionModel: "google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free",
    });
    const custom = parseConfig({ DEMO_MODE: "true", OPENROUTER_API_KEY: "sk-or-test", OPENROUTER_VISION_MODEL: "x/y:free" });
    expect(custom.secondFallback?.visionModel).toBe("x/y:free");
  });

  it("points the extraction client at OpenRouter", () => {
    expect(OPENROUTER_BASE_URL).toBe("https://openrouter.ai/api/v1");
  });

  it("sends a model list to OpenRouter only (its fallback for rate-limited free models)", () => {
    expect(modelParams("openrouter", "a/x:free, b/y:free")).toEqual({ model: "a/x:free", models: ["a/x:free", "b/y:free"] });
    expect(modelParams("openrouter", "a/x:free")).toEqual({ model: "a/x:free" });
    expect(modelParams("groq", "a,b")).toEqual({ model: "a" });
  });
});

describe("provider order", () => {
  it("builds Gemini -> Groq -> OpenRouter for extraction, skipping unset keys", () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test");
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
    const both = parseConfig({ ...LIVE, GROQ_API_KEY: "gsk_test", OPENROUTER_API_KEY: "sk-or-test" });
    expect(getFallbackProviders(both).map((p) => p.name)).toEqual(["groq", "openrouter"]);

    vi.stubEnv("GROQ_API_KEY", "");
    const onlyOpenRouter = parseConfig({ ...LIVE, OPENROUTER_API_KEY: "sk-or-test" });
    expect(getFallbackProviders(onlyOpenRouter).map((p) => p.name)).toEqual(["openrouter"]);
  });

  it("wraps OCR in the fallback chain only when a backup key exists", () => {
    vi.stubEnv("GEMINI_API_KEY", "gem-test");
    expect(getOcrProvider(parseConfig(LIVE))).not.toBeInstanceOf(FallbackOcrProvider);
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
    expect(getOcrProvider(parseConfig({ ...LIVE, OPENROUTER_API_KEY: "sk-or-test" }))).toBeInstanceOf(FallbackOcrProvider);
  });

  it("OCR_ENABLED=false switches every backup off too", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
    const off = parseConfig({ ...LIVE, OCR_ENABLED: "false", OPENROUTER_API_KEY: "sk-or-test" });
    expect(getOcrProvider(off)).not.toBeInstanceOf(FallbackOcrProvider);
  });
});

function ocr(name: string, impl: () => Promise<{ pageNumber: number; text: string; confidence: null }[]>): OcrProvider {
  return { name, available: true, recognize: vi.fn(impl) };
}
const reply = (content: string) =>
  vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ choices: [{ message: { content }, finish_reason: "stop" }] }));
const failing = (status: number) =>
  vi.fn(async () => {
    throw Object.assign(new Error("x"), { status });
  });
const groqWith = (create: ReturnType<typeof vi.fn>) =>
  new GroqVisionOcrProvider("gsk", "qwen", { chat: { completions: { create } } } as never);
const openRouterWith = (create: ReturnType<typeof vi.fn>) =>
  new OpenRouterVisionOcrProvider("sk-or", "google/gemma-4-31b-it:free", { chat: { completions: { create } } } as never);
const geminiDown = () =>
  ocr("gemini-vision", async () => {
    throw new DocumentError("ocr_unavailable", true);
  });

describe("OCR chain", () => {
  it("passes OpenRouter the whole model list", async () => {
    const create = reply("Rx");
    await new OpenRouterVisionOcrProvider("sk-or", "g/a:free,g/b:free", { chat: { completions: { create } } } as never).recognize(PNG);
    expect(create.mock.calls[0][0]).toMatchObject({ model: "g/a:free", models: ["g/a:free", "g/b:free"] });
  });

  it("reaches OpenRouter when Gemini and Groq are both unavailable, and records it", async () => {
    const groq = failing(429);
    const openRouter = reply("Tab Amoxicillin 500 mg");
    const pages = await new FallbackOcrProvider(geminiDown(), [groqWith(groq), openRouterWith(openRouter)]).recognize(PNG);
    expect(pages).toEqual([{ pageNumber: 1, text: "Tab Amoxicillin 500 mg", confidence: null, engine: OPENROUTER_VISION_OCR }]);
    expect(groq).toHaveBeenCalledOnce();
    const body = openRouter.mock.calls[0][0] as { model: string };
    expect(body.model).toBe("google/gemma-4-31b-it:free");
  });

  it("also moves on when Groq rejects its key", async () => {
    const pages = await new FallbackOcrProvider(geminiDown(), [groqWith(failing(401)), openRouterWith(reply("Rx"))]).recognize(PNG);
    expect(pages[0].engine).toBe(OPENROUTER_VISION_OCR);
  });

  it("stops at Groq when Groq works", async () => {
    const openRouter = reply("unused");
    const pages = await new FallbackOcrProvider(geminiDown(), [groqWith(reply("Rx")), openRouterWith(openRouter)]).recognize(PNG);
    expect(pages[0].engine).toBe(GROQ_VISION_OCR);
    expect(openRouter).not.toHaveBeenCalled();
  });

  it("never passes an unreadable document down the chain", async () => {
    const openRouter = reply("unused");
    const groqCantRead = groqWith(failing(400)); // ocr_failed: the document, not the service
    await expect(new FallbackOcrProvider(geminiDown(), [groqCantRead, openRouterWith(openRouter)]).recognize(PNG)).rejects.toMatchObject({
      code: "ocr_failed",
    });
    expect(openRouter).not.toHaveBeenCalled();
  });

  it("reports unavailable when every provider is down, and keeps PDFs with the primary", async () => {
    const chain = new FallbackOcrProvider(geminiDown(), [groqWith(failing(503)), openRouterWith(failing(503))]);
    await expect(chain.recognize(PNG)).rejects.toMatchObject({ code: "ocr_unavailable" });
    const openRouter = reply("unused");
    await expect(new FallbackOcrProvider(geminiDown(), [openRouterWith(openRouter)]).recognize(PDF)).rejects.toMatchObject({
      code: "ocr_unavailable",
    });
    expect(openRouter).not.toHaveBeenCalled();
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
const down = (name: ExtractionProvider["name"]) =>
  provider(name, async () => {
    throw new ProviderError("transient", "quota", 429);
  });

describe("extraction chain", () => {
  const fast = { backoffMs: 0 };

  it("reaches OpenRouter when Gemini and Groq are both unavailable", async () => {
    const outcome = await runExtractionWithFallback(down("gemini"), [down("groq"), provider("openrouter", async () => VALID)], PAGES, fast);
    expect(outcome).toMatchObject({ provider: "openrouter", model: "openrouter-model" });
  });

  it("never passes invalid output down the chain", async () => {
    const openRouter = provider("openrouter", async () => VALID);
    const groqGarbage = provider("groq", async () => ({ nonsense: true }));
    await expect(runExtractionWithFallback(down("gemini"), [groqGarbage, openRouter], PAGES, fast)).rejects.toMatchObject({
      code: "ai_invalid_output",
    });
    expect(openRouter.extract).not.toHaveBeenCalled();
  });

  it("reports unavailable when every provider is down", async () => {
    await expect(runExtractionWithFallback(down("gemini"), [down("groq"), down("openrouter")], PAGES, fast)).rejects.toMatchObject({
      code: "ai_unavailable",
    });
  });
});
