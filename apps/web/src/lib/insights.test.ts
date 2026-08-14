import { describe, it, expect } from "vitest";
import { buildInsights } from "./insights";

describe("buildInsights", () => {
  it("flags a category that's over its planned amount", () => {
    const result = buildInsights(
      [{ id: "c1", name: "Dining Out", planned: 300, spent: 340 }],
      []
    );
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain("Dining Out");
    expect(result[0].text).toContain("$40");
  });

  it("rounds a sub-$1 overage up, never down to a self-contradicting $0", () => {
    // Found 2026-08-13: Math.round(0.30) -> 0 used to print "running $0
    // over plan" for a category that's genuinely, provably over — a real
    // scenario with cents-precision transactions (e.g. $300.00 planned,
    // $300.30 spent).
    const result = buildInsights([{ id: "c1", name: "Dining Out", planned: 300, spent: 300.3 }], []);
    expect(result[0].text).toContain("$1");
    expect(result[0].text).not.toContain("$0");
  });

  it("does not flag a category at or under its planned amount", () => {
    const result = buildInsights(
      [
        { id: "c1", name: "Groceries", planned: 600, spent: 410 },
        { id: "c2", name: "Transportation", planned: 220, spent: 220 },
      ],
      []
    );
    expect(result).toEqual([{ id: "none", text: expect.any(String) }]);
  });

  it("flags a goal that's fully funded", () => {
    const result = buildInsights(
      [],
      [{ id: "g1", name: "New Camera", targetAmount: 1200, totalContributed: 1200 }]
    );
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain("New Camera");
    expect(result[0].text).toContain("fully funded");
  });

  it("flags a goal that's over-funded the same as exactly funded", () => {
    const result = buildInsights(
      [],
      [{ id: "g1", name: "New Camera", targetAmount: 1200, totalContributed: 1500 }]
    );
    expect(result[0].id).toBe("funded-g1");
  });

  it("flags a goal that's nearly funded (>=95%) but not yet complete", () => {
    const result = buildInsights(
      [],
      [{ id: "g1", name: "Emergency Fund", targetAmount: 1000, totalContributed: 960 }]
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("near-g1");
    expect(result[0].text).toContain("$40");
  });

  it("rounds a sub-$1 remaining amount up, never down to a self-contradicting $0", () => {
    // Same fix as the category case above, for the "nearly funded" branch:
    // this only runs when pct < 1 (the fully-funded branch above already
    // returns first), so remaining is always strictly > 0 — Math.round
    // used to print "nearly fully funded — $0 to go" for a goal genuinely
    // still short by e.g. $0.30.
    const result = buildInsights(
      [],
      [{ id: "g1", name: "Emergency Fund", targetAmount: 1000, totalContributed: 999.7 }]
    );
    expect(result[0].text).toContain("$1");
    expect(result[0].text).not.toContain("$0");
  });

  it("does not flag a goal below the 95% threshold", () => {
    const result = buildInsights(
      [],
      [{ id: "g1", name: "Emergency Fund", targetAmount: 1000, totalContributed: 940 }]
    );
    expect(result).toEqual([{ id: "none", text: expect.any(String) }]);
  });

  it("ignores a goal with a zero or negative target rather than dividing by zero", () => {
    const result = buildInsights([], [{ id: "g1", name: "Broken Goal", targetAmount: 0, totalContributed: 500 }]);
    expect(result).toEqual([{ id: "none", text: expect.any(String) }]);
  });

  it("returns a neutral fallback message when there's nothing to flag at all", () => {
    const result = buildInsights([], []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("none");
  });

  it("combines category and goal insights together", () => {
    const result = buildInsights(
      [{ id: "c1", name: "Dining Out", planned: 300, spent: 340 }],
      [{ id: "g1", name: "New Camera", targetAmount: 1200, totalContributed: 1200 }]
    );
    expect(result).toHaveLength(2);
  });

  it("produces stable, unique ids keyed off the source row's real id, not its name", () => {
    const result = buildInsights(
      [
        { id: "c1", name: "Dining Out", planned: 300, spent: 340 },
        { id: "c2", name: "Dining Out", planned: 100, spent: 150 },
      ],
      []
    );
    expect(result).toHaveLength(2);
    expect(new Set(result.map((r) => r.id)).size).toBe(2);
  });
});
