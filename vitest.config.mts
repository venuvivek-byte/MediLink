import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: fileURLToPath(new URL("./", import.meta.url)) },
      // `server-only` throws outside the react-server condition; tests run in Node.
      { find: /^server-only$/, replacement: fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)) },
    ],
  },
  test: {
    // Tests that parse PDFs cold-load pdf.js, which can exceed the 5s default on a busy machine.
    testTimeout: 20_000,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Tests must never depend on the developer's real .env.local.
    env: { NODE_ENV: "test" },
    restoreMocks: true,
    unstubEnvs: true,
  },
});
