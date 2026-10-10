import { describe, expect, it, vi } from "vitest";
import { NoOcrProvider, OCR_MAX_TIMEOUT_MS, PaddleOcrProvider, getOcrProvider, ocrTimeoutMs } from "@/lib/ocr";
import { parseConfig } from "@/lib/config/schema";
import { TEST_SECRET } from "./helpers/env";

const TOKEN = "t".repeat(40);
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("PaddleOcrProvider", () => {
  it("sends the file with the shared token and maps pages", async () => {
    const fetchImpl = vi.fn(async () =>
      json(200, { pages: [{ page: 2, text: "  Rx: Tab Amlodipine 5 mg  ", confidence: 0.97 }] })
    );
    const ocr = new PaddleOcrProvider("http://127.0.0.1:8001", TOKEN, fetchImpl as unknown as typeof fetch);
    const pages = await ocr.recognize({ bytes: new Uint8Array([1, 2]), mimeType: "application/pdf", pages: [2] });
    expect(pages).toEqual([{ pageNumber: 2, text: "Rx: Tab Amlodipine 5 mg", confidence: 0.97 }]);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("http://127.0.0.1:8001/ocr");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    expect((init.body as FormData).get("pages")).toBe("2");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ["service down", async () => Promise.reject(new TypeError("fetch failed")), "ocr_unavailable", true],
    ["service too slow", async () => Promise.reject(new DOMException("timed out", "TimeoutError")), "ocr_timeout", true],
    ["token rejected", async () => json(401, {}), "ocr_unavailable", false],
    ["file too large", async () => json(413, {}), "file_too_large", false],
    ["unreadable file", async () => json(422, {}), "ocr_failed", false],
    ["server error", async () => json(500, {}), "ocr_failed", true],
    ["malformed response", async () => json(200, { pages: "nope" }), "ocr_failed", false],
  ])("maps %s to a safe error", async (_label, impl, code, retryable) => {
    const ocr = new PaddleOcrProvider("http://127.0.0.1:8001", TOKEN, vi.fn(impl) as unknown as typeof fetch);
    await expect(ocr.recognize({ bytes: new Uint8Array([1]), mimeType: "image/png" })).rejects.toMatchObject({
      code,
      retryable,
    });
  });
});

describe("ocrTimeoutMs", () => {
  it("grows with the number of pages but never exceeds the cap that keeps AI inside the route budget", () => {
    expect(ocrTimeoutMs(1)).toBe(50_000);
    expect(ocrTimeoutMs(3)).toBe(90_000);
    expect(ocrTimeoutMs(20)).toBe(OCR_MAX_TIMEOUT_MS);
    expect(ocrTimeoutMs(0)).toBe(50_000);
  });
});

describe("getOcrProvider", () => {
  const live = {
    DEMO_MODE: "false",
    NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "a",
    SESSION_SECRET: TEST_SECRET,
  };

  it("returns a disabled provider that fails clearly when OCR is off", async () => {
    const ocr = getOcrProvider(parseConfig(live));
    expect(ocr).toBeInstanceOf(NoOcrProvider);
    await expect(ocr.recognize({ bytes: new Uint8Array(), mimeType: "image/png" })).rejects.toMatchObject({
      code: "ocr_unavailable",
    });
  });

  it("returns PaddleOCR when fully configured", () => {
    const config = parseConfig({
      ...live,
      OCR_ENABLED: "true",
      OCR_PROVIDER: "paddleocr",
      OCR_SERVICE_URL: "http://127.0.0.1:8001",
      OCR_SERVICE_TOKEN: TOKEN,
    });
    expect(getOcrProvider(config)).toBeInstanceOf(PaddleOcrProvider);
  });
});
