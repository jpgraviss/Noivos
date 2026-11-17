import { describe, it, expect } from "vitest";
import { buildBudgetSuggestionContextBlock } from "./ai";

// Only the pure formatting helper is tested here — askFinancialCoach/
// askPurchaseAdvisor/suggestBudgetAmounts all need a real Anthropic client
// to exercise meaningfully, same untested-by-design posture this file's
// other two AI calls already have.
describe("buildBudgetSuggestionContextBlock", () => {
  it("formats a category with an existing planned amount", () => {
    const block = buildBudgetSuggestionContextBlock([
      { categoryId: "c1", categoryName: "Dining Out", avgMonthlySpend: 312.4, monthsWithData: 3, currentPlannedAmount: 300 },
    ]);
    expect(block).toContain("Dining Out (id: c1)");
    expect(block).toContain("averaged $312/month");
    expect(block).toContain("over the last 3 months");
    expect(block).toContain("current planned amount is $300");
  });

  it("uses singular 'month' for exactly one month of history", () => {
    const block = buildBudgetSuggestionContextBlock([
      { categoryId: "c1", categoryName: "Dining Out", avgMonthlySpend: 100, monthsWithData: 1, currentPlannedAmount: null },
    ]);
    expect(block).toContain("over the last 1 month of");
    expect(block).not.toContain("1 months");
  });

  it("reports 'not set yet' when no budget_categories row exists for the current month", () => {
    const block = buildBudgetSuggestionContextBlock([
      { categoryId: "c1", categoryName: "Travel", avgMonthlySpend: 50, monthsWithData: 2, currentPlannedAmount: null },
    ]);
    expect(block).toContain("current planned amount is not set yet");
  });

  it("lists every category given, each on its own line", () => {
    const block = buildBudgetSuggestionContextBlock([
      { categoryId: "c1", categoryName: "Dining Out", avgMonthlySpend: 300, monthsWithData: 3, currentPlannedAmount: 300 },
      { categoryId: "c2", categoryName: "Groceries", avgMonthlySpend: 600, monthsWithData: 2, currentPlannedAmount: null },
    ]);
    expect(block.split("\n").filter((l) => l.startsWith("- "))).toHaveLength(2);
  });
});
