import { describe, it, expect, vi } from "vitest";
import type { PoolClient } from "@neondatabase/serverless";
import { findOrCreateManualAccount, DEFAULT_CATEGORIES } from "./budget";

// findOrCreateManualAccount's whole job is deduplication: every logged
// expense should land on the same one "Manual Entries" account per user,
// not a fresh one each time. A regression here (e.g. someone "simplifying"
// away the existence check) would silently fragment a user's spending
// across duplicate accounts — worth locking in even though the actual SQL
// needs a real Neon connection to fully verify.
function fakeClient(existingRows: unknown[], insertedRow: unknown): { client: PoolClient; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn().mockResolvedValueOnce({ rows: existingRows }).mockResolvedValueOnce({ rows: [insertedRow] });
  return { client: { query } as unknown as PoolClient, query };
}

describe("findOrCreateManualAccount", () => {
  it("returns the existing manual account's id without inserting a new one", async () => {
    const { client, query } = fakeClient([{ id: "acct-existing" }], null);
    const id = await findOrCreateManualAccount("user-1", client);
    expect(id).toBe("acct-existing");
    // Only the select ran — no insert attempted once an existing account
    // was found.
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("creates a new manual account when the user has none yet", async () => {
    const { client, query } = fakeClient([], { id: "acct-new" });
    const id = await findOrCreateManualAccount("user-1", client);
    expect(id).toBe("acct-new");
    expect(query).toHaveBeenCalledTimes(2);
    // The insert must be scoped to this exact user, not left to default to
    // someone else's account.
    expect(query.mock.calls[1][1]).toEqual(["user-1"]);
  });

  it("falls back to the winner's account when it loses the create race", async () => {
    // Two concurrent requests can both pass the initial "does one exist?"
    // check (migration 0008 adds a real unique index to make the INSERT
    // itself race-safe, but the SELECT-then-INSERT shape here still means
    // both can reach the insert). The losing request's ON CONFLICT DO
    // NOTHING insert returns zero rows — not an error — so it must fall
    // back to re-selecting the row the winner actually created.
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] }) // initial select: nothing yet
      .mockResolvedValueOnce({ rows: [] }) // insert loses the race: no row returned
      .mockResolvedValueOnce({ rows: [{ id: "acct-winner" }] }); // fallback select finds it
    const client = { query } as unknown as PoolClient;

    const id = await findOrCreateManualAccount("user-1", client);
    expect(id).toBe("acct-winner");
    expect(query).toHaveBeenCalledTimes(3);
  });
});

// DEFAULT_CATEGORIES is what a first-time user's Budget bootstraps from —
// a silently-introduced negative or zero planned amount would ship a
// broken-looking category (a StackedProgressBar segment with a negative
// width, or a $0 category that always reads "over budget").
describe("DEFAULT_CATEGORIES", () => {
  it("every category has a positive planned amount and a non-empty name", () => {
    for (const c of DEFAULT_CATEGORIES) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.plannedAmount).toBeGreaterThan(0);
    }
  });
});
