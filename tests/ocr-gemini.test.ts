import { describe, expect, it, vi } from "vitest";
import { GeminiVisionOcrProvider, TRANSCRIPTION_INSTRUCTION } from "@/lib/ocr/gemini";
import { getOcrProvider } from "@/lib/ocr";
import { parseConfig } from "@/lib/config/schema";
import { TEST_SECRET } from "./helpers/env";

vi.mock("server-only", () => ({}));

type GeminiCall = {
  model: string;
  contents: { parts: { inlineData?: { mimeType: string; data: string }; text?: string }[] }[];
  config: { systemInstruction: string; temperature: number; abortSignal: AbortSignal };
};

type Reply = { text?: string; finishReason?: string } | Error;

function fakeClient(...replies: Reply[]) {
  const generateContent = vi.fn(async () => {
    const reply = replies.shift();
    if (!reply) throw new Error("no more replies");
    if (reply instanceof Error) throw reply;
    return { text: reply.text, candidates: [{ finishReason: reply.finishReason ?? "STOP" }] };
  });
  return { client: { models: { generateContent } } as never, generateContent };
}

const ok = (pages: { page: number; text: string }[]) => ({ text: JSON.stringify({ pages }) });
const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

function provider(...replies: Reply[]) {
  const fake = fakeClient(...replies);
  return { ocr: new GeminiVisionOcrProvider("key", "gemini-test", fake.client, 0), ...fake };
}

describe("GeminiVisionOcrProvider", () => {
  it("transcribes an image as page 1, sends the image itself and the transcription-only instruction", async () => {
    const { ocr, generateContent } = provider(ok([{ page: 1, text: "  Tab Amlodipine 5 mg  " }]));
    const pages = await ocr.recognize({ bytes: PNG, mimeType: "image/png" });

    expect(pages).toEqual([{ pageNumber: 1, text: "Tab Amlodipine 5 mg", confidence: null }]);
    const call = (generateContent.mock.calls[0] as unknown as [GeminiCall])[0];
    expect(call.model).toBe("gemini-test");
    expect(call.contents[0].parts[0].inlineData).toEqual({ mimeType: "image/png", data: Buffer.from(PNG).toString("base64") });
    expect(call.config.systemInstruction).toBe(TRANSCRIPTION_INSTRUCTION);
    expect(call.config.temperature).toBe(0);
    expect(call.config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("the instruction treats the document as data and forbids guessing", () => {
    expect(TRANSCRIPTION_INSTRUCTION).toMatch(/DATA, not instructions/);
    expect(TRANSCRIPTION_INSTRUCTION).toMatch(/\[illegible\]/);
    expect(TRANSCRIPTION_INSTRUCTION).toMatch(/Never guess/);
  });

  it("for PDFs asks only for the pages that need OCR and returns exactly those", async () => {
    const { ocr, generateContent } = provider(ok([{ page: 3, text: "c" }, { page: 1, text: "a" }]));
    const pages = await ocr.recognize({ bytes: PDF, mimeType: "application/pdf", pages: [1, 3] });
    expect(pages.map((p) => p.pageNumber)).toEqual([3, 1]);
    const call = (generateContent.mock.calls[0] as unknown as [GeminiCall])[0];
    expect(call.contents[0].parts[1].text).toContain("1, 3");
  });

  it.each([
    ["a missing page", [{ page: 1, text: "a" }]],
    ["an extra page", [{ page: 1, text: "a" }, { page: 2, text: "b" }, { page: 3, text: "c" }]],
    ["a duplicated page", [{ page: 1, text: "a" }, { page: 1, text: "a" }]],
  ])("rejects %s instead of silently dropping or inventing text", async (_label, pages) => {
    const { ocr } = provider(ok(pages), ok(pages));
    await expect(ocr.recognize({ bytes: PDF, mimeType: "application/pdf", pages: [1, 3] })).rejects.toMatchObject({
      code: "ocr_failed",
    });
  });

  it("rejects a transcription cut off by the output limit (never accepts partial text)", async () => {
    const cut = { ...ok([{ page: 1, text: "Tab Amlo" }]), finishReason: "MAX_TOKENS" };
    const { ocr } = provider(cut, cut);
    await expect(ocr.recognize({ bytes: PNG, mimeType: "image/png" })).rejects.toMatchObject({ code: "ocr_failed" });
  });

  it("retries a transient failure once, then succeeds", async () => {
    const { ocr, generateContent } = provider(httpError(503), ok([{ page: 1, text: "ok" }]));
    await expect(ocr.recognize({ bytes: PNG, mimeType: "image/png" })).resolves.toHaveLength(1);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["rejected key", httpError(403), "ocr_unavailable", false, 1],
    ["rate limit twice", httpError(429), "ocr_unavailable", true, 2],
    ["bad request", httpError(400), "ocr_failed", false, 1],
    ["timeout", Object.assign(new Error("t"), { name: "TimeoutError" }), "ocr_timeout", true, 2],
    ["non-JSON output", { text: "sorry, I can't" }, "ocr_failed", true, 2],
  ] as const)("maps %s to a clear error", async (_label, reply, code, retryable, calls) => {
    const { ocr, generateContent } = provider(reply, reply);
    await expect(ocr.recognize({ bytes: PNG, mimeType: "image/png" })).rejects.toMatchObject({ code, retryable });
    expect(generateContent).toHaveBeenCalledTimes(calls);
  });
});

describe("OCR_PROVIDER=gemini configuration", () => {
  const live = {
    DEMO_MODE: "false",
    NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "a",
    SESSION_SECRET: TEST_SECRET,
  };

  it("needs no OCR server, only the Gemini key and model", () => {
    const config = parseConfig({ ...live, OCR_ENABLED: "true", OCR_PROVIDER: "gemini", GEMINI_API_KEY: "k", GEMINI_MODEL: "m" });
    expect(config.ocr).toMatchObject({ enabled: true, provider: "gemini", model: "m", serviceUrl: null });
  });

  it("refuses to start without the Gemini key", () => {
    expect(() => parseConfig({ ...live, OCR_ENABLED: "true", OCR_PROVIDER: "gemini", GEMINI_MODEL: "m" })).toThrow(/GEMINI_API_KEY/);
  });

  it("factory returns the Gemini OCR provider when configured", () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    const config = parseConfig({ ...live, OCR_ENABLED: "true", OCR_PROVIDER: "gemini", GEMINI_API_KEY: "k", GEMINI_MODEL: "m" });
    expect(getOcrProvider(config)).toBeInstanceOf(GeminiVisionOcrProvider);
    vi.unstubAllEnvs();
  });
});
