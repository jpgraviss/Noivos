import { describe, it, expect, vi, afterEach } from "vitest";
import { daysUntil, daysUntilHumanDate } from "./date";

// daysUntil drives Wedding Mode's countdown ("N days until [date]") — real
// date math with a real consequence if it's wrong. Both "now" and the
// target date parse as local time (no trailing "Z"), so these fixtures
// stick to that same convention throughout rather than mixing UTC and
// local — the test would otherwise be timezone-flaky for the wrong reason.
describe("daysUntil", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when there's no date set yet", () => {
    expect(daysUntil(null)).toBeNull();
  });

  it("returns +0 (not -0) for the wedding date itself, any time of day", () => {
    // Math.ceil of a small negative fraction (target midnight minus "now"
    // later the same day) produces -0 before the || 0 normalization in the
    // source — toBe uses Object.is, which would fail this exact case if
    // that normalization regressed.
    vi.setSystemTime(new Date("2026-08-06T15:00:00"));
    expect(daysUntil("2026-08-06")).toBe(0);
    expect(Object.is(daysUntil("2026-08-06"), -0)).toBe(false);
  });

  it("returns 1 the day before, any time of day", () => {
    vi.setSystemTime(new Date("2026-08-05T09:00:00"));
    expect(daysUntil("2026-08-06")).toBe(1);
    vi.setSystemTime(new Date("2026-08-05T23:59:00"));
    expect(daysUntil("2026-08-06")).toBe(1);
  });

  it("counts a full month out correctly", () => {
    vi.setSystemTime(new Date("2026-07-07T12:00:00"));
    expect(daysUntil("2026-08-06")).toBe(30);
  });

  it("goes negative once the date has passed, rather than clamping to 0", () => {
    // Locks in existing behavior (not a value judgment on whether it's the
    // right UX) — a screen showing this would need to handle the negative
    // case itself if that's ever undesirable.
    vi.setSystemTime(new Date("2026-08-09T12:00:00"));
    expect(daysUntil("2026-08-06")).toBe(-3);
  });
});

// GoalsScreen.tsx's mock/fallback wedding countdown branch specifically —
// same math as daysUntil(), for the human-readable date format the mock
// data is authored in. Added 2026-08-11 alongside the fix for a real,
// verified bug: that branch used to render a separately-stored `daysLeft`
// literal that had already drifted 9 days out of sync with the mock's own
// `date` field.
describe("daysUntilHumanDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts days out correctly for a human-readable date", () => {
    vi.setSystemTime(new Date("2026-07-07T12:00:00"));
    expect(daysUntilHumanDate("August 6, 2026")).toBe(30);
  });

  it("returns +0 (not -0) for the date itself, any time of day", () => {
    vi.setSystemTime(new Date("2026-08-06T15:00:00"));
    expect(daysUntilHumanDate("August 6, 2026")).toBe(0);
    expect(Object.is(daysUntilHumanDate("August 6, 2026"), -0)).toBe(false);
  });

  it("goes negative once the date has passed", () => {
    vi.setSystemTime(new Date("2026-08-09T12:00:00"));
    expect(daysUntilHumanDate("August 6, 2026")).toBe(-3);
  });
});
