import { describe, it, expect, vi, afterEach } from "vitest";
import { formatRelativeTime } from "./formatRelativeTime";

// Fixed "now" so these are deterministic instead of racing the real clock —
// formatRelativeTime relies on Date.now() internally.
const NOW = new Date("2026-08-06T12:00:00.000Z").getTime();

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for anything under an hour", () => {
    vi.setSystemTime(NOW);
    expect(formatRelativeTime(new Date(NOW - 5 * 60_000).toISOString())).toBe("just now");
    expect(formatRelativeTime(new Date(NOW - 59 * 60_000).toISOString())).toBe("just now");
  });

  it("formats hours for 1-23 hours ago", () => {
    vi.setSystemTime(NOW);
    expect(formatRelativeTime(new Date(NOW - 2 * 3_600_000).toISOString())).toBe("2h ago");
    expect(formatRelativeTime(new Date(NOW - 23 * 3_600_000).toISOString())).toBe("23h ago");
  });

  it("formats days once past 24 hours", () => {
    vi.setSystemTime(NOW);
    expect(formatRelativeTime(new Date(NOW - 25 * 3_600_000).toISOString())).toBe("1d ago");
    expect(formatRelativeTime(new Date(NOW - 29 * 86_400_000).toISOString())).toBe("29d ago");
  });

  it("formats months once past 30 days", () => {
    vi.setSystemTime(NOW);
    expect(formatRelativeTime(new Date(NOW - 90 * 86_400_000).toISOString())).toBe("3mo ago");
  });

  it("never returns a negative duration for a timestamp in the future (clock skew)", () => {
    vi.setSystemTime(NOW);
    // A server/client clock skew could hand this a timestamp slightly ahead
    // of "now" — should clamp to "just now" rather than print "-1h ago" or
    // similar nonsense.
    expect(formatRelativeTime(new Date(NOW + 5 * 60_000).toISOString())).toBe("just now");
  });
});
