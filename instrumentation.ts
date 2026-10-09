// Validates configuration once at server start so misconfiguration is
// reported immediately and clearly, not on the first page view.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { parseConfig, ConfigError } = await import("./lib/config/schema");
  try {
    const config = parseConfig(process.env);
    console.info(`[config] MyHealthVault starting in ${config.mode === "demo" ? "DEMO" : "REAL-USER"} mode`);
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`\n${error.message}\n`);
    }
    throw error;
  }
}
