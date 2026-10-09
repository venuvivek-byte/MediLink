import { GoogleGenerativeAI } from "@google/generative-ai";
import { ExtractionResult, ExtractionSchema } from "../schema";

export class GeminiExtractionProvider {
  private client: GoogleGenerativeAI | null = null;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
    }
    this.modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  }

  async extract(
    fileBuffer: Buffer,
    mimeType: string,
    documentTypeHint: string
  ): Promise<ExtractionResult> {
    if (!this.client) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
You are an expert medical records analysis AI. Analyze the attached medical document (${documentTypeHint}).
Extract all clinical information strictly adhering to the JSON schema:
- document_type: one of 'prescription', 'lab_report', 'discharge_summary', 'other'
- document_date: YYYY-MM-DD string if identifiable, else null
- provider_name: Doctor / Clinician name if present, else null
- facility_name: Hospital / Clinic / Lab name, else null
- diagnoses: Array of { name: string, confidence: number (0.0 to 1.0) }
- medications: Array of { name: string, strength: string | null, dosage: string | null, frequency: string | null, route: string | null, duration: string | null, confidence: number }
- lab_results: Array of { test_name: string, value: string, unit: string | null, reference_range: string | null, is_abnormal: boolean | null, confidence: number }
- allergies: Array of { substance: string, reaction: string | null }
- raw_confidence: overall extraction confidence score (0.0 to 1.0)

Extract ONLY what is explicitly stated or strongly readable. Do not hallucinate.
`;

    const base64Data = fileBuffer.toString("base64");
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
    ]);

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    return ExtractionSchema.parse(parsed);
  }
}
