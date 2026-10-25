import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Build output is CommonJS; execute the source tests only, even after a build.
    include: ["src/**/*.test.ts"],
  },
});
