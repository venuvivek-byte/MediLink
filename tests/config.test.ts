import { describe, expect, it } from "vitest";
import { ConfigError, parseConfig } from "@/lib/config/schema";
import { TEST_SECRET } from "./helpers/env";

const live = {
  DEMO_MODE: "false",
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SESSION_SECRET: TEST_SECRET,
};

function problemsOf(env: Record<string, string | undefined>): string[] {
  try {
    parseConfig(env);
    return [];
  } catch (error) {
    if (error instanceof ConfigError) return error.problems;
    throw error;
  }
}

describe("parseConfig", () => {
  it("runs demo mode with no credentials at all", () => {
    const config = parseConfig({ DEMO_MODE: "true" });
    expect(config.mode).toBe("demo");
    expect(config.supabase).toBeNull();
    expect(config.ai.configured).toBe(false);
  });

  it("ignores Supabase credentials in demo mode so demo never contacts the database", () => {
    expect(parseConfig({ ...live, DEMO_MODE: "true" }).supabase).toBeNull();
  });

  it("defaults to real-user mode and refuses to start without Supabase (no silent demo fallback)", () => {
    expect(problemsOf({ SESSION_SECRET: TEST_SECRET })).toEqual([
      expect.stringContaining("NEXT_PUBLIC_SUPABASE_URL"),
    ]);
  });

  it("treats copied placeholder values as missing", () => {
    const problems = problemsOf({
      ...live,
      NEXT_PUBLIC_SUPABASE_URL: "https://your-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "your-anon-key",
    });
    expect(problems.some((p) => p.includes("NEXT_PUBLIC_SUPABASE_URL"))).toBe(true);
  });

  it("rejects the legacy NEXT_PUBLIC_DEMO_MODE flag with a rename instruction", () => {
    expect(problemsOf({ NEXT_PUBLIC_DEMO_MODE: "true" })).toContainEqual(
      expect.stringContaining("Rename it to DEMO_MODE")
    );
  });

  it("requires a strong SESSION_SECRET in real-user mode and in production", () => {
    expect(problemsOf({ ...live, SESSION_SECRET: undefined })).toContainEqual(
      expect.stringContaining("SESSION_SECRET is required")
    );
    expect(problemsOf({ ...live, SESSION_SECRET: "short" })).toContainEqual(
      expect.stringContaining("at least 32")
    );
    expect(problemsOf({ DEMO_MODE: "true", NODE_ENV: "production" })).toContainEqual(
      expect.stringContaining("SESSION_SECRET is required")
    );
  });

  it("never echoes secret values in error messages", () => {
    const secret = "super-secret-value-that-must-not-leak";
    try {
      parseConfig({ ...live, NEXT_PUBLIC_SUPABASE_URL: "not a url", SUPABASE_SERVICE_ROLE_KEY: secret, SESSION_SECRET: "x" + secret.slice(0, 5) });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain(secret);
      expect(String(error)).not.toContain(secret.slice(0, 5));
    }
  });

  it("caps uploads at 5 MB and defaults to 5 MB", () => {
    expect(parseConfig(live).upload.maxBytes).toBe(5 * 1024 * 1024);
    expect(parseConfig({ ...live, MAX_UPLOAD_SIZE_MB: "2" }).upload.maxBytes).toBe(2 * 1024 * 1024);
    expect(problemsOf({ ...live, MAX_UPLOAD_SIZE_MB: "50" })).toContainEqual(expect.stringContaining("MAX_UPLOAD_SIZE_MB"));
    expect(problemsOf({ ...live, MAX_UPLOAD_SIZE_MB: "abc" })).toContainEqual(expect.stringContaining("MAX_UPLOAD_SIZE_MB"));
  });

  it("only reports AI as configured when the selected provider has a key AND a model", () => {
    expect(parseConfig({ ...live, AI_PROVIDER: "gemini", GEMINI_API_KEY: "k" }).ai.configured).toBe(false);
    expect(parseConfig({ ...live, AI_PROVIDER: "gemini", GEMINI_API_KEY: "k", GEMINI_MODEL: "m" }).ai.configured).toBe(true);
    expect(parseConfig({ ...live, AI_PROVIDER: "openai", GEMINI_API_KEY: "k", GEMINI_MODEL: "m" }).ai.configured).toBe(false);
    expect(problemsOf({ ...live, AI_PROVIDER: "claude" })).toContainEqual(expect.stringContaining("AI_PROVIDER"));
  });

  it("does not enable OCR unless both the flag and a provider are set", () => {
    expect(parseConfig({ ...live, OCR_ENABLED: "true" }).ocr.enabled).toBe(false);
    expect(parseConfig({ ...live, OCR_ENABLED: "true", OCR_PROVIDER: "paddleocr" }).ocr.enabled).toBe(true);
  });
});
