// Pure configuration parsing. No `server-only` import here so that the proxy
// and unit tests can use it; secrets are only ever read through
// `lib/config/env.ts` in application code.
import { z } from "zod";

export class ConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(
      `Invalid MyHealthVault configuration:\n${problems.map((p) => `  - ${p}`).join("\n")}`
    );
    this.name = "ConfigError";
  }
}

export type AppMode = "demo" | "live";

export interface AppConfig {
  mode: AppMode;
  isProduction: boolean;
  appUrl: string;
  /** Null in demo mode: demo mode never talks to Supabase. */
  supabase: { url: string; anonKey: string; serviceRoleKey: string | null } | null;
  /** Null only in non-production demo mode, where an ephemeral key is used. */
  sessionSecret: string | null;
  ai: {
    provider: "gemini" | "openai" | "none";
    model: string | null;
    /** True only when the selected provider has both a key and a model. */
    configured: boolean;
  };
  ocr: {
    enabled: boolean;
    /** "gemini": Gemini transcribes scans/photos (no OCR server; reuses the Gemini key). */
    provider: "paddleocr" | "gemini" | "none";
    /** Model used when provider is "gemini". */
    model: string | null;
    serviceUrl: string | null;
    /** Shared secret sent to the OCR service. Never exposed to the client. */
    serviceToken: string | null;
  };
  /**
   * Backup used only when the primary OCR/AI is unavailable (quota, outage,
   * timeout). Null when GROQ_API_KEY is not set. The key itself is read from
   * process.env by the provider, never stored here.
   */
  fallback: { provider: "groq"; model: string; visionModel: string } | null;
  /**
   * Second backup, tried only when Groq is also unavailable (or not set).
   * Null when OPENROUTER_API_KEY is not set. Defaults are FREE models.
   */
  secondFallback: { provider: "openrouter"; model: string; visionModel: string } | null;
  upload: { maxBytes: number };
}

/** Defaults checked against Groq's model list on 2026-10-10; override with GROQ_MODEL / GROQ_VISION_MODEL. */
export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";
export const GROQ_DEFAULT_VISION_MODEL = "qwen/qwen3.8-27b";

/**
 * Google Gemma 4 on OpenRouter's free tier: reads images and supports JSON
 * output. Free models are often rate-limited, so two are listed: OpenRouter
 * tries the second when the first is busy. Checked against OpenRouter's
 * model list on 2026-10-10; override with OPENROUTER_MODEL /
 * OPENROUTER_VISION_MODEL (comma-separated, in order of preference).
 */
export const OPENROUTER_DEFAULT_MODEL = "google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free";
export const OPENROUTER_DEFAULT_VISION_MODEL = OPENROUTER_DEFAULT_MODEL;

const PLACEHOLDER_PATTERN = /^(your[-_]|<|changeme|placeholder)|your-project/i;

/** Empty strings and copied-in placeholder values count as "not set". */
const optionalString = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed === "" || PLACEHOLDER_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}, z.string().optional());

const optionalBoolean = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? value.trim().toLowerCase() : undefined),
  z.enum(["true", "false"]).optional()
);

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).catch("development"),
  DEMO_MODE: optionalBoolean,
  NEXT_PUBLIC_DEMO_MODE: optionalString,
  NEXT_PUBLIC_APP_URL: optionalString,
  /** Set by Vercel: "production" | "preview" | "development". */
  VERCEL_ENV: optionalString,
  NEXT_PUBLIC_SUPABASE_URL: optionalString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SESSION_SECRET: optionalString,
  AI_PROVIDER: optionalString,
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: optionalString,
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: optionalString,
  OCR_ENABLED: optionalBoolean,
  OCR_PROVIDER: optionalString,
  OCR_SERVICE_URL: optionalString,
  OCR_SERVICE_TOKEN: optionalString,
  GROQ_API_KEY: optionalString,
  GROQ_MODEL: optionalString,
  GROQ_VISION_MODEL: optionalString,
  OPENROUTER_API_KEY: optionalString,
  OPENROUTER_MODEL: optionalString,
  OPENROUTER_VISION_MODEL: optionalString,
  MAX_UPLOAD_SIZE_MB: optionalString,
});

const MIN_SECRET_LENGTH = 32;
const MAX_UPLOAD_MB = 5;

function isSecureOrLoopbackUrl(value: string): boolean {
  const url = new URL(value);
  return url.protocol === "https:" || ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
}

function isPublicHttpsUrl(value: string): boolean {
  const url = new URL(value);
  return url.protocol === "https:" && !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Parses and validates environment variables. Error messages name variables
 * but never echo their values.
 */
export function parseConfig(env: Record<string, string | undefined>): AppConfig {
  const raw = rawEnvSchema.parse(env);
  const problems: string[] = [];
  const isProduction = raw.NODE_ENV === "production";

  if (raw.NEXT_PUBLIC_DEMO_MODE !== undefined && raw.DEMO_MODE === undefined) {
    problems.push(
      "NEXT_PUBLIC_DEMO_MODE is no longer read. Rename it to DEMO_MODE (server-only)."
    );
  }

  const mode: AppMode = raw.DEMO_MODE === "true" ? "demo" : "live";

  let supabase: AppConfig["supabase"] = null;
  if (mode === "live") {
    if (!raw.NEXT_PUBLIC_SUPABASE_URL || !raw.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      problems.push(
        "Real-user mode requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Set DEMO_MODE=true to run without Supabase."
      );
    } else if (!isHttpUrl(raw.NEXT_PUBLIC_SUPABASE_URL)) {
      problems.push("NEXT_PUBLIC_SUPABASE_URL must be an http(s) URL.");
    } else {
      supabase = {
        url: raw.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: raw.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceRoleKey: raw.SUPABASE_SERVICE_ROLE_KEY ?? null,
      };
    }
  }

  const sessionSecret = raw.SESSION_SECRET ?? null;
  if (sessionSecret !== null && sessionSecret.length < MIN_SECRET_LENGTH) {
    problems.push(`SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`);
  }
  if (sessionSecret === null && (mode === "live" || isProduction)) {
    problems.push(
      `SESSION_SECRET is required in real-user mode and in production (${MIN_SECRET_LENGTH}+ random characters).`
    );
  }

  const appUrl = raw.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!isHttpUrl(appUrl)) {
    problems.push("NEXT_PUBLIC_APP_URL must be an http(s) URL.");
  } else if (raw.VERCEL_ENV === "production" && (!raw.NEXT_PUBLIC_APP_URL || !isPublicHttpsUrl(appUrl))) {
    // Share links and emergency QR codes are built from this: never localhost in production.
    problems.push("NEXT_PUBLIC_APP_URL must be the public https address of the deployed app (e.g. https://myhealthvault-beryl.vercel.app).");
  }

  const providerInput = (raw.AI_PROVIDER ?? "none").toLowerCase();
  if (!["gemini", "openai", "none"].includes(providerInput)) {
    problems.push("AI_PROVIDER must be one of: gemini, openai, none.");
  }
  const provider = (["gemini", "openai"].includes(providerInput) ? providerInput : "none") as
    | "gemini"
    | "openai"
    | "none";
  const aiKey =
    provider === "gemini" ? raw.GEMINI_API_KEY : provider === "openai" ? raw.OPENAI_API_KEY : undefined;
  const aiModel =
    provider === "gemini" ? raw.GEMINI_MODEL : provider === "openai" ? raw.OPENAI_MODEL : undefined;

  const ocrProviderInput = (raw.OCR_PROVIDER ?? "none").toLowerCase();
  if (!["paddleocr", "gemini", "none"].includes(ocrProviderInput)) {
    problems.push("OCR_PROVIDER must be one of: paddleocr, gemini, none.");
  }
  const ocrProvider = (["paddleocr", "gemini"].includes(ocrProviderInput) ? ocrProviderInput : "none") as
    | "paddleocr"
    | "gemini"
    | "none";
  if (raw.OCR_SERVICE_URL && !isHttpUrl(raw.OCR_SERVICE_URL)) {
    problems.push("OCR_SERVICE_URL must be an http(s) URL.");
  } else if (raw.OCR_SERVICE_URL && isProduction && !isSecureOrLoopbackUrl(raw.OCR_SERVICE_URL)) {
    // Documents and the shared token travel to the OCR service: never in clear text.
    problems.push("OCR_SERVICE_URL must use https in production (http is allowed only for localhost).");
  }
  const ocrEnabled = raw.OCR_ENABLED === "true" && ocrProvider !== "none";
  if (ocrEnabled && mode === "live" && ocrProvider === "gemini") {
    if (!raw.GEMINI_API_KEY || !raw.GEMINI_MODEL) {
      problems.push("OCR_PROVIDER=gemini: set GEMINI_API_KEY and GEMINI_MODEL (or set OCR_ENABLED=false).");
    }
  }
  if (ocrEnabled && mode === "live" && ocrProvider === "paddleocr") {
    if (!raw.OCR_SERVICE_URL) problems.push("OCR is enabled: set OCR_SERVICE_URL (or set OCR_ENABLED=false).");
    if (!raw.OCR_SERVICE_TOKEN || raw.OCR_SERVICE_TOKEN.length < MIN_SECRET_LENGTH) {
      problems.push(`OCR is enabled: set OCR_SERVICE_TOKEN to ${MIN_SECRET_LENGTH}+ random characters (same value as the OCR service).`);
    }
  }

  let maxUploadMb = MAX_UPLOAD_MB;
  if (raw.MAX_UPLOAD_SIZE_MB !== undefined) {
    const parsed = Number(raw.MAX_UPLOAD_SIZE_MB);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_UPLOAD_MB) {
      problems.push(`MAX_UPLOAD_SIZE_MB must be a number greater than 0 and at most ${MAX_UPLOAD_MB}.`);
    } else {
      maxUploadMb = parsed;
    }
  }

  if (problems.length > 0) throw new ConfigError(problems);

  return {
    mode,
    isProduction,
    appUrl: appUrl.replace(/\/+$/, ""),
    supabase,
    sessionSecret,
    ai: {
      provider,
      model: aiModel ?? null,
      configured: provider !== "none" && Boolean(aiKey) && Boolean(aiModel),
    },
    ocr: {
      enabled: ocrEnabled,
      provider: ocrProvider,
      model: ocrProvider === "gemini" ? (raw.GEMINI_MODEL ?? null) : null,
      serviceUrl: raw.OCR_SERVICE_URL ?? null,
      serviceToken: raw.OCR_SERVICE_TOKEN ?? null,
    },
    fallback: raw.GROQ_API_KEY
      ? {
          provider: "groq",
          model: raw.GROQ_MODEL ?? GROQ_DEFAULT_MODEL,
          visionModel: raw.GROQ_VISION_MODEL ?? GROQ_DEFAULT_VISION_MODEL,
        }
      : null,
    secondFallback: raw.OPENROUTER_API_KEY
      ? {
          provider: "openrouter",
          model: raw.OPENROUTER_MODEL ?? OPENROUTER_DEFAULT_MODEL,
          visionModel: raw.OPENROUTER_VISION_MODEL ?? OPENROUTER_DEFAULT_VISION_MODEL,
        }
      : null,
    upload: { maxBytes: Math.floor(maxUploadMb * 1024 * 1024) },
  };
}
