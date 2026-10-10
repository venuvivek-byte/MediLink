import "server-only";
import OpenAI from "openai";
import { extractionJsonSchema } from "../extraction-schema";
import { buildUserPrompt, SYSTEM_INSTRUCTION } from "../prompt";
import { classifyHttpStatus, ProviderError, type ExtractionProvider, type ExtractionRequest } from "./types";

/** Groq serves an OpenAI-compatible API; only the address and the key differ. */
export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

/**
 * OpenAI-compatible chat completions behind the same interface: OpenAI
 * itself, or Groq (the backup when the primary provider is unavailable).
 */
export class OpenAIExtractionProvider implements ExtractionProvider {
  readonly isSimulated = false;
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    readonly model: string,
    readonly name: "openai" | "groq" = "openai"
  ) {
    this.client = new OpenAI({ apiKey, ...(name === "groq" ? { baseURL: GROQ_BASE_URL } : {}) });
  }

  async extract({ pages, signal }: ExtractionRequest): Promise<unknown> {
    let text: string | null | undefined;
    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.model,
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
