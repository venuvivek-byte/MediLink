import "server-only";
import { randomBytes } from "node:crypto";
import { parseConfig, type AppConfig } from "./schema";

export { ConfigError, type AppConfig, type AppMode } from "./schema";

let cached: AppConfig | null = null;

/** Validated server configuration. Throws `ConfigError` with a safe message. */
export function getConfig(): AppConfig {
  if (!cached) cached = parseConfig(process.env);
  return cached;
}

// Survives dev-server hot reloads so demo sessions are not dropped on every edit.
const globalForSecret = globalThis as unknown as { __mhvEphemeralSecret?: string };

/**
 * Key for signing session cookies. Outside production, demo mode may run
 * without SESSION_SECRET; it then uses a per-process random key, so demo
 * sessions end when the server restarts.
 */
export function getSessionSecret(): string {
  const config = getConfig();
  if (config.sessionSecret) return config.sessionSecret;
  globalForSecret.__mhvEphemeralSecret ??= randomBytes(32).toString("hex");
  return globalForSecret.__mhvEphemeralSecret;
}

/** Non-secret facts that are safe to pass to client components. */
export function getPublicConfig() {
  const config = getConfig();
  return {
    mode: config.mode,
    maxUploadBytes: config.upload.maxBytes,
  } as const;
}

export type PublicConfig = ReturnType<typeof getPublicConfig>;
