import OpenAI from "openai";
import { ExtractionResult, ExtractionSchema } from "../schema";

export class OpenAIExtractionProvider {
  private client: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  async extract(
    fileBuffer: Buffer,
    mimeType: string,
    documentTypeHint: string
  ): Promise<ExtractionResult> {
    if (!this.client) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const base64Data = fileBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert medical records analysis AI. Extract document clinical data into structured JSON matching this schema:
document_type ('prescription' | 'lab_report' | 'discharge_summary' | 'other'),
document_date (YYYY-MM-DD string or null),
provider_name (string or null),
facility_name (string or null),
diagnoses: [{ name: string, confidence: number }],
medications: [{ name: string, strength: string | null, dosage: string | null, frequency: string | null, route: string | null, duration: string | null, confidence: number }],
lab_results: [{ test_name: string, value: string, unit: string | null, reference_range: string | null, is_abnormal: boolean | null, confidence: number }],
allergies: [{ substance: string, reaction: string | null }],
raw_confidence: number (0.0 to 1.0)`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this medical document (${documentTypeHint}) and output structured JSON.`,
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI extraction.");
    }

    const parsed = JSON.parse(content);
    return ExtractionSchema.parse(parsed);
  }
}
