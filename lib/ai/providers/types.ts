import type { PageText } from "@/lib/documents/pdf-text";

export interface ExtractionRequest {
  pages: PageText[];
  /** Aborts the provider call (timeouts). */
  signal?: AbortSignal;
}

/** A provider returns RAW model output; validation happens in lib/ai/index.ts. */
export interface ExtractionProvider {
  readonly name: "gemini" | "openai" | "simulated";
  readonly model: string;
  readonly isSimulated: boolean;
  extract(request: ExtractionRequest): Promise<unknown>;
}

/** Provider failure classified for retry decisions. Never carries document content. */
export class ProviderError extends Error {
  constructor(
    public readonly kind: "transient" | "auth" | "invalid_request" | "invalid_output",
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export function classifyHttpStatus(status: number | undefined): ProviderError["kind"] {
  if (status === undefined) return "transient"; // network error / timeout
  if (status === 401 || status === 403) return "auth";
  if (status === 408 || status === 429 || status >= 500) return "transient";
  return "invalid_request";
}
