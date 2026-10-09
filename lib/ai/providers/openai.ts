import "server-only";
import OpenAI from "openai";
import { extractionJsonSchema } from "../extraction-schema";
import { buildUserPrompt, SYSTEM_INSTRUCTION } from "../prompt";
import { classifyHttpStatus, ProviderError, type ExtractionProvider, type ExtractionRequest } from "./types";

/**
 * OpenAI alternative behind the same interface. Covered by unit tests with a
 * mocked client only; not verified against the live API (no key configured).
 */
export class OpenAIExtractionProvider implements ExtractionProvider {
  readonly name = "openai" as const;
  readonly isSimulated = false;
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    readonly model: string
  ) {
    this.client = new OpenAI({ apiKey });
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
      throw new ProviderError(classifyHttpStatus(status), "OpenAI request failed", status);
    }
    if (!text) throw new ProviderError("invalid_output", "OpenAI returned no content");
    try {
      return JSON.parse(text);
    } catch {
      throw new ProviderError("invalid_output", "OpenAI returned non-JSON output");
    }
  }
}
