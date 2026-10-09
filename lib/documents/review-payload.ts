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
}
