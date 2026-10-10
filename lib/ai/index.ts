import "server-only";
import type { AppConfig } from "@/lib/config/schema";
import { DocumentError } from "@/lib/documents/errors";
import type { PageText } from "@/lib/documents/pdf-text";
import { extractionSchema, EXTRACTION_SCHEMA_VERSION } from "./extraction-schema";
import { verifyExtraction, type VerifiedExtraction } from "./verify";
import { GeminiExtractionProvider } from "./providers/gemini";
import { OpenAIExtractionProvider } from "./providers/openai";
import { isDocumentError } from "@/lib/documents/errors";
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

/** The backup provider (Groq), or null when GROQ_API_KEY is not set. */
export function getFallbackProvider(config: AppConfig): ExtractionProvider | null {
  const key = process.env.GROQ_API_KEY;
  if (!config.fallback || !key) return null;
  return new OpenAIExtractionProvider(key, config.fallback.model, "groq");
}

/** Backups in the order they are tried: Groq, then OpenRouter. Unset keys are skipped. */
export function getFallbackProviders(config: AppConfig): ExtractionProvider[] {
  const backups: ExtractionProvider[] = [];
  const groq = getFallbackProvider(config);
  if (groq) backups.push(groq);
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (config.secondFallback && openRouterKey) {
    backups.push(new OpenAIExtractionProvider(openRouterKey, config.secondFallback.model, "openrouter"));
  }
  return backups;
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

/**
 * Runs the primary provider; only if it is UNAVAILABLE (quota, outage,
 * timeouts after its own retries) or its key is rejected does the next
 * backup run, and so on down the list. A rejected key is logged as an error
 * so it is not silently hidden. Invalid output is never retried on another
 * provider: a model that returns garbage must not be papered over. The
 * outcome records which provider produced it.
 */
export async function runExtractionWithFallback(
  primary: ExtractionProvider,
  fallbacks: ExtractionProvider | ExtractionProvider[] | null,
  pages: PageText[],
  options?: Parameters<typeof runExtraction>[2]
): Promise<ExtractionOutcome> {
  const chain = [primary, ...(Array.isArray(fallbacks) ? fallbacks : fallbacks ? [fallbacks] : [])];
  for (let i = 0; ; i++) {
    try {
      return await runExtraction(chain[i], pages, options);
    } catch (error) {
      const next = chain[i + 1];
      const keyRejected = isDocumentError(error) && error.code === "ai_not_configured";
      if (!next || !isDocumentError(error) || (error.code !== "ai_unavailable" && !keyRejected)) throw error;
      if (keyRejected) console.error(`[ai] ${chain[i].name} rejected its API key; using backup ${next.name}`);
      else console.warn(`[ai] ${chain[i].name} unavailable; using backup ${next.name}`);
    }
  }
}
