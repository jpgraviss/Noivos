import { describe, it, expect } from "vitest";
import { buildInsights, computeSavingsStreak } from "./insights";

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

  it("surfaces a recurring expense amount change", () => {
    const result = buildInsights([], [], [{ merchantName: "Netflix", oldAmount: 15.99, newAmount: 17.99 }]);
    expect(result).toEqual([{ id: "recurring-Netflix", text: "Netflix changed from $15.99 to $17.99 — worth a look?" }]);
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

  describe("rising category spend (SE-78)", () => {
    it("flags a category running well above its trailing pace", () => {
      const result = buildInsights([], [], [], [
        { categoryId: "c1", categoryName: "Dining Out", monthToDateSpent: 260, trailingAverageMonthToDate: 200, trailingMonthsWithData: 3 },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].text).toContain("Dining Out");
      expect(result[0].text).toContain("$60");
    });

    it("does not flag a category that only clears the ratio but not the dollar floor", () => {
      // 25% above $8 is $10 — clears the ratio, misses the $20 floor.
      const result = buildInsights([], [], [], [
        { categoryId: "c1", categoryName: "Parking", monthToDateSpent: 10, trailingAverageMonthToDate: 8, trailingMonthsWithData: 3 },
      ]);
      expect(result).toEqual([{ id: "none", text: expect.any(String) }]);
    });

    it("does not flag a category that only clears the dollar floor but not the ratio", () => {
      // $20 above $2,000 clears the floor but is nowhere near 25% higher.
      const result = buildInsights([], [], [], [
        { categoryId: "c1", categoryName: "Rent", monthToDateSpent: 2020, trailingAverageMonthToDate: 2000, trailingMonthsWithData: 3 },
      ]);
      expect(result).toEqual([{ id: "none", text: expect.any(String) }]);
    });

    it("does not flag a category with fewer than 2 trailing months of data", () => {
      const result = buildInsights([], [], [], [
        { categoryId: "c1", categoryName: "Dining Out", monthToDateSpent: 260, trailingAverageMonthToDate: 200, trailingMonthsWithData: 1 },
      ]);
      expect(result).toEqual([{ id: "none", text: expect.any(String) }]);
    });
  });

  describe("large/unusual purchase (SE-78)", () => {
    it("flags a purchase at least 2x and $50 above its category's typical size", () => {
      const result = buildInsights([], [], [], [], [
        { merchantName: "Best Buy", categoryName: "Electronics", amount: 400, typicalAmount: 120 },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].text).toContain("Best Buy");
      expect(result[0].text).toContain("$400");
      expect(result[0].text).toContain("$120");
    });

    it("does not flag a purchase that clears the ratio but not the dollar floor", () => {
      // 2x $20 is $40 — doubles the typical size but the gap is only $20.
      const result = buildInsights([], [], [], [], [
        { merchantName: "Corner Store", categoryName: "Groceries", amount: 40, typicalAmount: 20 },
      ]);
      expect(result).toEqual([{ id: "none", text: expect.any(String) }]);
    });

    it("falls back to the category name when the transaction has no merchant name", () => {
      const result = buildInsights([], [], [], [], [
        { merchantName: null, categoryName: "Electronics", amount: 400, typicalAmount: 120 },
      ]);
      expect(result[0].text).toContain("Electronics charge");
    });
  });

  describe("new subscription detected (SE-78)", () => {
    it("surfaces every detected-but-unconfirmed recurring candidate", () => {
      const result = buildInsights([], [], [], [], [], [
        { merchantName: "Spotify", avgAmount: 10.99, frequency: "monthly" },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].text).toContain("Spotify");
      expect(result[0].text).toContain("monthly");
    });
  });

  describe("savings streak (SE-78)", () => {
    it("flags a 3+ month streak of real goal contributions", () => {
      const result = buildInsights([], [], [], [], [], [], [0, 0, 50, 80, 120]);
      expect(result).toHaveLength(1);
      expect(result[0].text).toContain("3 months");
    });

    it("does not flag a streak under 3 months", () => {
      const result = buildInsights([], [], [], [], [], [], [50, 80]);
      expect(result).toEqual([{ id: "none", text: expect.any(String) }]);
    });

    it("stops counting at the most recent zero month, not through it", () => {
      const result = buildInsights([], [], [], [], [], [], [100, 0, 50, 80, 120]);
      expect(result[0].text).toContain("3 months");
    });
  });
});

describe("computeSavingsStreak", () => {
  it("counts the trailing run of positive months", () => {
    expect(computeSavingsStreak([0, 50, 80, 120])).toBe(3);
  });

  it("returns 0 for an empty array", () => {
    expect(computeSavingsStreak([])).toBe(0);
  });

  it("returns 0 when the most recent month is zero, even if earlier months were positive", () => {
    expect(computeSavingsStreak([80, 120, 0])).toBe(0);
  });

  it("counts every month when all are positive", () => {
    expect(computeSavingsStreak([10, 20, 30])).toBe(3);
  });
});
