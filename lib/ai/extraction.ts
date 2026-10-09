import { ExtractionResult } from "./schema";
import { GeminiExtractionProvider } from "./providers/gemini";
import { OpenAIExtractionProvider } from "./providers/openai";

// Legacy entry point, not called by any route as of Phase 1; replaced by the
// provider pipeline in Phase 3. It must never fabricate a result: with no
// provider configured it throws instead of returning sample data.
export async function extractMedicalDocument(
  fileBuffer: Buffer,
  mimeType: string,
  documentType: "prescription" | "lab_report" | "discharge_summary" | "other" = "other"
): Promise<ExtractionResult> {
  const providerType = process.env.AI_PROVIDER || "gemini";

  if (providerType === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAIExtractionProvider().extract(fileBuffer, mimeType, documentType);
  }
  if (providerType === "gemini" && process.env.GEMINI_API_KEY) {
    return new GeminiExtractionProvider().extract(fileBuffer, mimeType, documentType);
  }
  throw new Error("No AI extraction provider is configured.");
}
