import "server-only";
import { GoogleGenAI } from "@google/genai";
import { extractionJsonSchema } from "../extraction-schema";
import { buildUserPrompt, SYSTEM_INSTRUCTION } from "../prompt";
import { classifyHttpStatus, ProviderError, type ExtractionProvider, type ExtractionRequest } from "./types";

/** Gemini via the current @google/genai SDK. Sends extracted TEXT only, never files. */
export class GeminiExtractionProvider implements ExtractionProvider {
  readonly name = "gemini" as const;
  readonly isSimulated = false;
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    readonly model: string
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async extract({ pages, signal }: ExtractionRequest): Promise<unknown> {
    let text: string | undefined;
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [{ role: "user", parts: [{ text: buildUserPrompt(pages) }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseJsonSchema: extractionJsonSchema(),
          temperature: 0,
          maxOutputTokens: 16384,
          abortSignal: signal,
        },
      });
      text = response.text;
    } catch (error) {
      const status = (error as { status?: number }).status;
      throw new ProviderError(classifyHttpStatus(status), "Gemini request failed", status);
    }
    if (!text) throw new ProviderError("invalid_output", "Gemini returned no content");
    try {
      return JSON.parse(text);
    } catch {
      throw new ProviderError("invalid_output", "Gemini returned non-JSON output");
    }
  }
}
