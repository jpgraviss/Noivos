import { describe, it, expect, vi } from "vitest";
import type { PoolClient } from "@neondatabase/serverless";
import { buildAgenda } from "./moneyMeeting";

// buildAgenda runs two queries in a fixed order (over-budget categories,
// then due vendor balances) and turns the rows into agenda sentences — the
// actual SQL needs a real Neon connection to verify (out of reach in this
// sandbox), but the branching/formatting/ordering logic around the query
// results is plain JS and worth locking down on its own, since a rounding
// or off-by-one-comparison bug here would show a couple the wrong dollar
// amount or the wrong "is this over budget" verdict in their own meeting.
function fakeClient(overBudgetRows: unknown[], dueVendorRows: unknown[]): PoolClient {
  const query = vi
    .fn()
    .mockResolvedValueOnce({ rows: overBudgetRows })
    .mockResolvedValueOnce({ rows: dueVendorRows });
  return { query } as unknown as PoolClient;
}

describe("buildAgenda", () => {
  it("flags a category that's over its planned amount, rounding the overage", () => {
    const client = fakeClient([{ name: "Dining Out", planned: 300, spent: 340.4 }], []);
    return buildAgenda("p1", client).then((agenda) => {
      expect(agenda).toEqual(["Dining Out is $40 over this month — worth a look together?"]);
    });
  });

  it("does not flag a category that's exactly at its planned amount", () => {
    // spent === planned should read as "on budget," not "over" — a strict
    // `>` comparison, not `>=`.
    const client = fakeClient([{ name: "Groceries", planned: 600, spent: 600 }], []);
    return buildAgenda("p1", client).then((agenda) => {
      expect(agenda).toEqual(["Nothing urgent this week — a good week to check in on your goals together."]);
    });
  });

  it("does not flag a category under its planned amount", () => {
    const client = fakeClient([{ name: "Transportation", planned: 220, spent: 160 }], []);
    return buildAgenda("p1", client).then((agenda) => {
      expect(agenda).toEqual(["Nothing urgent this week — a good week to check in on your goals together."]);
    });
  });

  it("lists an upcoming vendor balance due", () => {
    const client = fakeClient([], [{ name: "Golden Hour Photography", due_date: "2026-08-15" }]);
    return buildAgenda("p1", client).then((agenda) => {
      expect(agenda).toEqual(["Golden Hour Photography balance due 2026-08-15 — confirm payment method"]);
    });
  });

  it("lists over-budget categories before due vendors, in that order", () => {
    const client = fakeClient(
      [{ name: "Dining Out", planned: 300, spent: 340 }],
      [{ name: "Sweet Table Catering", due_date: "2026-09-01" }]
    );
    return buildAgenda("p1", client).then((agenda) => {
      expect(agenda).toEqual([
        "Dining Out is $40 over this month — worth a look together?",
        "Sweet Table Catering balance due 2026-09-01 — confirm payment method",
      ]);
    });
  });

  it("falls back to a reassuring message when nothing is over budget or due", () => {
    const client = fakeClient([], []);
    return buildAgenda("p1", client).then((agenda) => {
      expect(agenda).toEqual(["Nothing urgent this week — a good week to check in on your goals together."]);
    });
  });

  it("handles multiple over-budget categories", () => {
    const client = fakeClient(
      [
        { name: "Dining Out", planned: 300, spent: 340 },
        { name: "Wedding Vendors", planned: 1500, spent: 1620 },
      ],
      []
    );
    return buildAgenda("p1", client).then((agenda) => {
      expect(agenda).toEqual([
        "Dining Out is $40 over this month — worth a look together?",
        "Wedding Vendors is $120 over this month — worth a look together?",
      ]);
    });
  });
});
