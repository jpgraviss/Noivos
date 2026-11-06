import { describe, it, expect } from "vitest";
import {
  computeGoalBasedProgress,
  computeWeddingCountdownProgress,
  isGoalBasedChallengeType,
  CHALLENGE_GOAL_TYPE,
  GOAL_BASED_CHALLENGE_TYPES,
} from "./challenges";

describe("computeGoalBasedProgress", () => {
  it("computes a plain percentage of target reached", () => {
    expect(computeGoalBasedProgress(2500, 10000)).toBe(25);
  });

  it("caps at 100% once the goal is fully funded or overfunded", () => {
    expect(computeGoalBasedProgress(10000, 10000)).toBe(100);
    expect(computeGoalBasedProgress(15000, 10000)).toBe(100);
  });

  it("returns 0 for a zero or negative target rather than dividing by it", () => {
    expect(computeGoalBasedProgress(500, 0)).toBe(0);
    expect(computeGoalBasedProgress(500, -100)).toBe(0);
  });

  it("never goes negative even with a negative contribution total", () => {
    expect(computeGoalBasedProgress(-50, 10000)).toBe(0);
  });
});

describe("computeWeddingCountdownProgress", () => {
  it("returns 0 with no wedding date set yet", () => {
    expect(computeWeddingCountdownProgress(new Date("2026-01-01"), null, new Date("2026-06-01"))).toBe(0);
  });

  it("is 0% right at the moment of joining", () => {
    const joined = new Date("2026-01-01");
    expect(computeWeddingCountdownProgress(joined, new Date("2027-01-01"), joined)).toBe(0);
  });

  it("is 50% halfway between joining and the wedding date", () => {
    const joined = new Date("2026-01-01T00:00:00Z");
    const wedding = new Date("2026-01-11T00:00:00Z"); // 10 days out
    const halfway = new Date("2026-01-06T00:00:00Z"); // 5 days in
    expect(computeWeddingCountdownProgress(joined, wedding, halfway)).toBe(50);
  });

  it("caps at 100% once the wedding date has passed", () => {
    const joined = new Date("2026-01-01");
    const wedding = new Date("2026-01-11");
    expect(computeWeddingCountdownProgress(joined, wedding, new Date("2026-02-01"))).toBe(100);
  });

  it("reads as already complete when the wedding date was already in the past at join time", () => {
    const joined = new Date("2026-06-01");
    const wedding = new Date("2026-01-01");
    expect(computeWeddingCountdownProgress(joined, wedding, joined)).toBe(100);
  });
});

describe("isGoalBasedChallengeType / CHALLENGE_GOAL_TYPE", () => {
  it("recognizes every goal-based type and rejects the countdown type", () => {
    for (const t of GOAL_BASED_CHALLENGE_TYPES) {
      expect(isGoalBasedChallengeType(t)).toBe(true);
    }
    expect(isGoalBasedChallengeType("wedding_countdown")).toBe(false);
    expect(isGoalBasedChallengeType("not_a_real_type")).toBe(false);
  });

  it("maps every goal-based challenge type to a real goal_type", () => {
    for (const t of GOAL_BASED_CHALLENGE_TYPES) {
      expect(typeof CHALLENGE_GOAL_TYPE[t]).toBe("string");
      expect(CHALLENGE_GOAL_TYPE[t].length).toBeGreaterThan(0);
    }
  });
});
