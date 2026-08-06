import { describe, it, expect } from "vitest";
import { describeActivityEvent } from "./activity";

// describeActivityEvent turns a raw (event_type, payload) row into the
// sentence that actually shows up in HomeScreen's Activity card and
// AppShell's Recent Activity dropdown — a wrong branch here means a real
// user reads a garbled or wrong activity line, so every event_type this
// app currently emits (packages/database/README.md's Activity Feed entry)
// gets its own case.
describe("describeActivityEvent", () => {
  it("describes a goal contribution", () => {
    expect(describeActivityEvent("Marcus", "goal_contribution", { amount: 340, goalName: "Our Wedding" })).toBe(
      "Marcus added $340 to Our Wedding"
    );
  });

  it("formats large contribution amounts with thousands separators", () => {
    expect(describeActivityEvent("Ava", "goal_contribution", { amount: 12500, goalName: "Emergency Fund" })).toBe(
      "Ava added $12,500 to Emergency Fund"
    );
  });

  it("describes a budget expense with a merchant name", () => {
    expect(
      describeActivityEvent("Marcus", "budget_expense", { amount: 84, merchantName: "Trader Joe's", categoryName: "Groceries" })
    ).toBe("Marcus logged $84 at Trader Joe's (Groceries)");
  });

  it("describes a budget expense with no merchant name (manual entry)", () => {
    expect(describeActivityEvent("Ava", "budget_expense", { amount: 84, merchantName: null, categoryName: "Groceries" })).toBe(
      "Ava logged $84 for Groceries"
    );
  });

  it("describes a wedding vendor being added", () => {
    expect(describeActivityEvent("Ava", "wedding_vendor_added", { vendorName: "Golden Hour Photography" })).toBe(
      "Ava added Golden Hour Photography to Vendors"
    );
  });

  it("describes a completed wedding checklist item", () => {
    expect(describeActivityEvent("Marcus", "wedding_checklist_completed", { title: "Book florist" })).toBe(
      'Marcus completed "Book florist"'
    );
  });

  it("describes a family contribution gift", () => {
    expect(
      describeActivityEvent("Ava", "wedding_family_contribution", { amount: 5000, contributorName: "Mom & Dad" })
    ).toBe("Ava logged a $5,000 gift from Mom & Dad");
  });

  it("falls back to a generic sentence for an unrecognized event_type", () => {
    // Guards against a future event_type shipping without a matching case
    // here silently rendering "undefined" instead of something readable.
    expect(describeActivityEvent("Ava", "some_future_event_type", {})).toBe("Ava made an update");
  });
});
