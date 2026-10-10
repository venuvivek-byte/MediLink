import "server-only";
import OpenAI from "openai";
import { extractionJsonSchema } from "../extraction-schema";
import { buildUserPrompt, SYSTEM_INSTRUCTION } from "../prompt";
import { classifyHttpStatus, ProviderError, type ExtractionProvider, type ExtractionRequest } from "./types";

/** Groq serves an OpenAI-compatible API; only the address and the key differ. */
export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
/** OpenRouter is OpenAI-compatible too (the second backup). */
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export type OpenAICompatibleName = "openai" | "groq" | "openrouter";

const BASE_URLS: Record<OpenAICompatibleName, string | undefined> = {
  openai: undefined,
  groq: GROQ_BASE_URL,
  openrouter: OPENROUTER_BASE_URL,
};

/**
 * Model selection for a request. OpenRouter accepts a comma-separated list
 * ("a,b"): it tries them in order when one is rate-limited (its native model
 * fallback). Other services get the single model unchanged.
 */
export function modelParams(name: OpenAICompatibleName, model: string): { model: string; models?: string[] } {
  const list = model.split(",").map((m) => m.trim()).filter(Boolean);
  if (name !== "openrouter" || list.length < 2) return { model: list[0] ?? model };
  return { model: list[0], models: list };
}

/** Client for an OpenAI-compatible service. OpenRouter asks callers to identify the app. */
export function openAICompatibleClient(name: OpenAICompatibleName, apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: BASE_URLS[name],
    ...(name === "openrouter" ? { defaultHeaders: { "X-Title": "MyHealthVault" } } : {}),
  });
}

/**
 * OpenAI-compatible chat completions behind the same interface: OpenAI
 * itself, Groq (the backup when the primary provider is unavailable) or
 * OpenRouter (the second backup, when Groq is unavailable too).
 */
export class OpenAIExtractionProvider implements ExtractionProvider {
  readonly isSimulated = false;
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    readonly model: string,
    readonly name: OpenAICompatibleName = "openai"
  ) {
    this.client = openAICompatibleClient(name, apiKey);
  }

  async extract({ pages, signal }: ExtractionRequest): Promise<unknown> {
    let text: string | null | undefined;
    try {
      const response = await this.client.chat.completions.create(
        {
          ...modelParams(this.name, this.model),
          temperature: 0,
          messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user", content: buildUserPrompt(pages) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "medical_document_extraction", schema: extractionJsonSchema(), strict: false },
          },
        },
        { signal }
      );
      text = response.choices[0]?.message?.content;
    } catch (error) {
      const status = (error as { status?: number }).status;
      throw new ProviderError(classifyHttpStatus(status), `${this.name} request failed`, status);
    }
    if (!text) throw new ProviderError("invalid_output", `${this.name} returned no content`);
    try {
      return JSON.parse(text);
    } catch {
      throw new ProviderError("invalid_output", `${this.name} returned non-JSON output`);
    }
  }
}
