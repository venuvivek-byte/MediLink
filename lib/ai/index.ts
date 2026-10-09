import "server-only";
import type { AppConfig } from "@/lib/config/schema";
import { DocumentError } from "@/lib/documents/errors";
import type { PageText } from "@/lib/documents/pdf-text";
import { extractionSchema, EXTRACTION_SCHEMA_VERSION } from "./extraction-schema";
import { verifyExtraction, type VerifiedExtraction } from "./verify";
import { GeminiExtractionProvider } from "./providers/gemini";
import { OpenAIExtractionProvider } from "./providers/openai";
import { ProviderError, type ExtractionProvider } from "./providers/types";

export const AI_TIMEOUT_MS = 60_000;
export const AI_MAX_ATTEMPTS = 3;

/** The configured real provider, or null when none is configured. Never falls back to simulated. */
export function getConfiguredProvider(config: AppConfig): ExtractionProvider | null {
  if (!config.ai.configured || !config.ai.model) return null;
  const key = config.ai.provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
  if (!key) return null;
  if (config.ai.provider === "gemini") return new GeminiExtractionProvider(key, config.ai.model);
  if (config.ai.provider === "openai") return new OpenAIExtractionProvider(key, config.ai.model);
  return null;
}

export interface ExtractionOutcome {
  provider: string;
  model: string;
  isSimulated: boolean;
  schemaVersion: string;
  verified: VerifiedExtraction;
  /** Schema-validated raw extraction, stored for traceability. */
  raw: unknown;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs the provider with a per-attempt timeout and retries ONLY transient
 * failures (timeouts, 429, 5xx) with backoff. Output that fails schema
 * validation is never repaired or partially used.
 */
export async function runExtraction(
  provider: ExtractionProvider,
  pages: PageText[],
  options: { timeoutMs?: number; maxAttempts?: number; backoffMs?: number } = {}
): Promise<ExtractionOutcome> {
  const timeoutMs = options.timeoutMs ?? AI_TIMEOUT_MS;
  const maxAttempts = options.maxAttempts ?? AI_MAX_ATTEMPTS;
  const backoffMs = options.backoffMs ?? 1000;

  let raw: unknown;
  for (let attempt = 1; ; attempt++) {
    try {
      raw = await provider.extract({ pages, signal: AbortSignal.timeout(timeoutMs) });
      break;
    } catch (error) {
      const kind = error instanceof ProviderError ? error.kind : "transient";
      if (kind === "auth") throw new DocumentError("ai_not_configured");
      if (kind === "invalid_output") throw new DocumentError("ai_invalid_output", true);
      if (kind === "invalid_request") throw new DocumentError("ai_unavailable");
      if (attempt >= maxAttempts) throw new DocumentError("ai_unavailable", true);
      await sleep(backoffMs * 2 ** (attempt - 1));
    }
  }

  const parsed = extractionSchema.safeParse(raw);
  if (!parsed.success) throw new DocumentError("ai_invalid_output", true);

  return {
    provider: provider.name,
    model: provider.model,
    isSimulated: provider.isSimulated,
    schemaVersion: EXTRACTION_SCHEMA_VERSION,
    verified: verifyExtraction(parsed.data, pages),
    raw: parsed.data,
  };
}
