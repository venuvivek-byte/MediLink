import "server-only";
import OpenAI from "openai";
import { classifyHttpStatus } from "@/lib/ai/providers/types";
import { modelParams, openAICompatibleClient, type OpenAICompatibleName } from "@/lib/ai/providers/openai";
import { DocumentError } from "@/lib/documents/errors";
import { TRANSCRIPTION_INSTRUCTION } from "./gemini";
import { ocrTimeoutMs, type OcrPage, type OcrProvider, type OcrRequest } from "./index";

// Backup transcription for PHOTOS and image scans, used only when the primary
// OCR is unavailable (Groq first, then OpenRouter). Same rules as the Gemini transcription step; extraction
// then runs on the text as usual.
//
// Measured on real handwritten prescriptions (2026-10-10): fast and mostly
// right, but it did NOT use [illegible] where it could not read a word; it
// guessed instead. The review screen therefore treats every entry read by
// a backup provider as needing the patient's explicit check (see textReadBy).

/** Stored as the extraction's ocr_provider. */
export const GROQ_VISION_OCR = "groq-vision";
export const OPENROUTER_VISION_OCR = "openrouter-vision";

/** Every backup reader: the review screen asks the patient to check each entry they produced. */
export const BACKUP_VISION_OCR = [GROQ_VISION_OCR, OPENROUTER_VISION_OCR] as const;

/** Groq rejects base64 images above about 4 MB; larger photos stay with the primary OCR. */
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const LABELS: Record<Exclude<OpenAICompatibleName, "openai">, string> = { groq: "Groq", openrouter: "OpenRouter" };

/** Photo transcription through an OpenAI-compatible vision model (the backup readers). */
export class OpenAIVisionOcrProvider implements OcrProvider {
  readonly available = true;
  private readonly client: Pick<OpenAI, "chat">;

  constructor(
    private readonly service: "groq" | "openrouter",
    readonly name: string,
    apiKey: string,
    readonly model: string,
    client?: Pick<OpenAI, "chat">
  ) {
    this.client = client ?? openAICompatibleClient(service, apiKey);
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
          ...modelParams(this.service, this.model),
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
        console.error(`[ocr] ${LABELS[this.service]} rejected the API key`);
        throw new DocumentError("ocr_unavailable");
      }
      if (kind === "transient") throw new DocumentError("ocr_unavailable", true);
      throw new DocumentError("ocr_failed");
    }
    // A cut-off transcription would silently drop text: reject it.
    if (finishReason && finishReason !== "stop") throw new DocumentError("ocr_failed", true);
    const trimmed = (text ?? "").trim();
    if (!trimmed) throw new DocumentError("ocr_failed", true);
    return [{ pageNumber: 1, text: trimmed, confidence: null, engine: this.name }];
  }
}

export class GroqVisionOcrProvider extends OpenAIVisionOcrProvider {
  constructor(apiKey: string, model: string, client?: Pick<OpenAI, "chat">) {
    super("groq", GROQ_VISION_OCR, apiKey, model, client);
  }
}

/** Second backup (free Google Gemma by default); tried only when Groq is unavailable too. */
export class OpenRouterVisionOcrProvider extends OpenAIVisionOcrProvider {
  constructor(apiKey: string, model: string, client?: Pick<OpenAI, "chat">) {
    super("openrouter", OPENROUTER_VISION_OCR, apiKey, model, client);
  }
}
