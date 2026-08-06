import { defineConfig } from "vitest/config";

// Unit tests for the pure/mockable business logic in src/lib — the parts
// that don't need a real Neon connection to verify (e.g. formatRelativeTime,
// the Money Meeting agenda rules, activity-feed sentence formatting). The
// project had zero automated tests before this; scoped intentionally narrow
// rather than trying to cover routes/components, which mostly need a real
// database or Clerk session this sandbox can't provide anyway.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
