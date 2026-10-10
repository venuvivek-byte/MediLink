import "server-only";
import OpenAI from "openai";
import { classifyHttpStatus } from "@/lib/ai/providers/types";
import { GROQ_BASE_URL } from "@/lib/ai/providers/openai";
import { DocumentError } from "@/lib/documents/errors";
import { TRANSCRIPTION_INSTRUCTION } from "./gemini";
import { ocrTimeoutMs, type OcrPage, type OcrProvider, type OcrRequest } from "./index";

// Backup transcription for PHOTOS and image scans, used only when the primary
// OCR is unavailable. Same rules as the Gemini transcription step; extraction
// then runs on the text as usual.
//
// Measured on real handwritten prescriptions (2026-10-10): fast and mostly
// right, but it did NOT use [illegible] where it could not read a word; it
// guessed instead. The review screen therefore treats every entry read by
// this provider as needing the patient's explicit check (see textReadBy).

/** Stored as the extraction's ocr_provider. */
export const GROQ_VISION_OCR = "groq-vision";

/** Groq rejects base64 images above about 4 MB; larger photos stay with the primary OCR. */
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export class GroqVisionOcrProvider implements OcrProvider {
  readonly name = GROQ_VISION_OCR;
  readonly available = true;
  private readonly client: Pick<OpenAI, "chat">;

  constructor(
    apiKey: string,
    readonly model: string,
    client?: Pick<OpenAI, "chat">
  ) {
    this.client = client ?? new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
  }

  /** PDFs need page rendering this provider cannot do; very large photos exceed Groq's limit. */
  supports({ bytes, mimeType }: OcrRequest): boolean {
    return (mimeType === "image/jpeg" || mimeType === "image/png") && bytes.byteLength <= MAX_IMAGE_BYTES;
  }

  async recognize(request: OcrRequest): Promise<OcrPage[]> {
    if (!this.supports(request)) throw new DocumentError("ocr_unavailable");
    let text: string | null | undefined;
    let finishReason: string | null | undefined;
    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          temperature: 0,
          max_completion_tokens: 8192,
          messages: [
            { role: "system", content: `${TRANSCRIPTION_INSTRUCTION}\nReply with the transcribed text only, nothing else.` },
            {
              role: "user",
              content: [
                { type: "text", text: "Transcribe the attached image. It is page 1." },
                {
                  type: "image_url",
                  image_url: { url: `data:${request.mimeType};base64,${Buffer.from(request.bytes).toString("base64")}` },
                },
              ],
            },
          ],
        },
        { signal: AbortSignal.timeout(ocrTimeoutMs(1)) }
      );
      text = response.choices[0]?.message?.content;
      finishReason = response.choices[0]?.finish_reason;
    } catch (error) {
      const name = (error as { name?: string })?.name;
      if (name === "TimeoutError" || name === "AbortError" || name === "APIUserAbortError") {
        throw new DocumentError("ocr_timeout", true);
      }
      const status = (error as { status?: number }).status;
      const kind = classifyHttpStatus(status);
      if (kind === "auth") {
        console.error("[ocr] Groq rejected the API key");
        throw new DocumentError("ocr_unavailable");
      }
      if (kind === "transient") throw new DocumentError("ocr_unavailable", true);
      throw new DocumentError("ocr_failed");
    }
    // A cut-off transcription would silently drop text: reject it.
    if (finishReason && finishReason !== "stop") throw new DocumentError("ocr_failed", true);
    const trimmed = (text ?? "").trim();
    if (!trimmed) throw new DocumentError("ocr_failed", true);
    return [{ pageNumber: 1, text: trimmed, confidence: null, engine: GROQ_VISION_OCR }];
  }
}
