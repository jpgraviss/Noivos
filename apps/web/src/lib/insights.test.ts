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
