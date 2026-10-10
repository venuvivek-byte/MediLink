import type { PageText } from "./pdf-text";
import type { VerifiedExtraction } from "@/lib/ai/verify";

/** Everything the review screen needs; safe to send to the browser. */
export interface ReviewPayload {
  documentId: string;
  extractionId: string;
  documentName: string;
  verified: VerifiedExtraction;
  pages: PageText[];
  provider: string;
  model: string;
  isSimulated: boolean;
  /** Page text was transcribed from an image by the AI (no separate OCR engine). */
  textReadByAi: boolean;
  /**
   * How to show the original file next to the extracted entries:
   * images are shown inline (same-origin route); PDFs open in a new tab.
   * Null in demo mode (sample documents have no file).
   */
  original: { kind: "image" | "pdf"; url: string } | null;
}
