import "server-only";
import { z } from "zod";
import type { AppConfig } from "@/lib/config/schema";
import { DocumentError } from "@/lib/documents/errors";

// OCR is independent of the AI provider: it only turns page images into text
// (with confidence and page numbers). It never interprets clinical meaning.

export interface OcrPage {
  pageNumber: number;
  text: string;
  /** Mean recognition confidence from the engine (0..1), if provided. */
  confidence: number | null;
}

export interface OcrRequest {
  bytes: Uint8Array;
  mimeType: string;
  /** PDF pages to recognise (1-based); omit for images or all pages. */
  pages?: number[];
}

export interface OcrProvider {
  readonly name: string;
  readonly available: boolean;
  recognize(request: OcrRequest): Promise<OcrPage[]>;
}

export const OCR_TIMEOUT_MS = 120_000;

/** Used when OCR is disabled: scanned documents fail with a clear message. */
export class NoOcrProvider implements OcrProvider {
  readonly name = "none";
  readonly available = false;
  async recognize(): Promise<OcrPage[]> {
    throw new DocumentError("ocr_unavailable");
  }
}

const responseSchema = z.object({
  pages: z
    .array(
      z.object({
        page: z.number().int().min(1).max(50),
        text: z.string().max(100_000),
        confidence: z.number().min(0).max(1).nullable(),
      })
    )
    .max(50),
});

export class PaddleOcrProvider implements OcrProvider {
  readonly name = "paddleocr";
  readonly available = true;

  constructor(
    private readonly serviceUrl: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async recognize({ bytes, mimeType, pages }: OcrRequest): Promise<OcrPage[]> {
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array(bytes)], { type: mimeType }), "document");
    if (pages?.length) form.set("pages", pages.join(","));

    let response: Response;
    try {
      response = await this.fetchImpl(new URL("/ocr", this.serviceUrl), {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
        body: form,
        signal: AbortSignal.timeout(OCR_TIMEOUT_MS),
      });
    } catch {
      // Service down or timed out.
      throw new DocumentError("ocr_unavailable", true);
    }

    if (response.status === 401 || response.status === 403) {
      console.error("[ocr] service rejected our token");
      throw new DocumentError("ocr_unavailable");
    }
    if (response.status === 413) throw new DocumentError("file_too_large");
    if (response.status === 422 || response.status === 415) throw new DocumentError("ocr_failed");
    if (!response.ok) throw new DocumentError("ocr_failed", response.status >= 500);

    const parsed = responseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new DocumentError("ocr_failed");
    return parsed.data.pages.map((p) => ({ pageNumber: p.page, text: p.text.trim(), confidence: p.confidence }));
  }
}

export function getOcrProvider(config: AppConfig): OcrProvider {
  if (config.ocr.enabled && config.ocr.provider === "paddleocr" && config.ocr.serviceUrl && config.ocr.serviceToken) {
    return new PaddleOcrProvider(config.ocr.serviceUrl, config.ocr.serviceToken);
  }
  return new NoOcrProvider();
}
