import { vi } from "vitest";

export const TEST_SECRET = "test-secret-0123456789-abcdefghijklmnopqrstuvwxyz";

const ALL_KEYS = [
  "DEMO_MODE",
  "NEXT_PUBLIC_DEMO_MODE",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SESSION_SECRET",
  "VERCEL_ENV",
  "AI_PROVIDER",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OCR_ENABLED",
  "OCR_PROVIDER",
  "OCR_SERVICE_URL",
  "MAX_UPLOAD_SIZE_MB",
];

/** Replaces process.env for the app's keys, so a developer's .env.local cannot leak into tests. */
export function useEnv(values: Record<string, string>) {
  for (const key of ALL_KEYS) vi.stubEnv(key, values[key] ?? "");
}

export const DEMO_ENV = { DEMO_MODE: "true", SESSION_SECRET: TEST_SECRET };

export const LIVE_ENV = {
  DEMO_MODE: "false",
  NEXT_PUBLIC_SUPABASE_URL: "https://example-test-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SESSION_SECRET: TEST_SECRET,
};
