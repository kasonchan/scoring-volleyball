import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.integration.test.ts"],
    // All DB tests share one MySQL database; parallel files race on truncate/seed.
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30_000,
    globalTeardown: "./src/test/global-teardown.ts",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
