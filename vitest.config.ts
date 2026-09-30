import { defineConfig } from "vitest/config";

// Same 70% gate as every other repository (conventions.md §3). main.ts is the wiring that
// runs on import against a real parent window; it is exercised by the round trip against the
// local stack, not here.
export default defineConfig({
  test: {
    environment: "jsdom",
    restoreMocks: true,
    include: ["src/test/ts/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/main/ts/**/*.ts"],
      exclude: ["src/main/ts/main.ts"],
      thresholds: { lines: 70, statements: 70, branches: 70, functions: 70 },
    },
  },
});
