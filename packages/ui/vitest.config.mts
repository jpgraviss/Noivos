import { defineConfig } from "vitest/config";

// Tests here target pure, extractable calculation logic (e.g.
// StackedProgressBar's segment-width math) — not full component rendering,
// which would need react-native/react-native-web test scaffolding this
// package doesn't otherwise need. Mirrors apps/web/vitest.config.mts.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
