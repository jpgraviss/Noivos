import { describe, it, expect, vi } from "vitest";
import type { PoolClient } from "@neondatabase/serverless";
import { findActiveMembership } from "./partnership";

// findActiveMembership backs nearly every write route in the app (every
// route that needs to know "does this user have a real, currently-active
// Partnership to attach this write to" calls it first) — a regression here
// has the widest possible blast radius of any single function in the
// codebase, so it's worth locking in even though the actual SQL still
// needs a real Neon connection to fully verify. Its WHERE clause combines
// two conditions deliberately: `left_at is null` (this user hasn't left)
// AND `p.status <> 'disconnected'` (the Partnership itself hasn't ended) —
// stricter than was_partnership_member()'s RLS check, which the function's
// own comment explains ignores left_at on purpose so a disconnected member
// keeps frozen read access. Only the query's shape/params are checked here
// (via the mock call args), not the WHERE clause's real behavior against
// Postgres, which this sandbox can't exercise.
function fakeClient(rows: unknown[]): { client: PoolClient; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn().mockResolvedValueOnce({ rows });
  return { client: { query } as unknown as PoolClient, query };
}

describe("findActiveMembership", () => {
  it("returns the membership row when the user has an active Partnership", async () => {
    const { client } = fakeClient([{ partnership_id: "p-1", status: "active" }]);
    const result = await findActiveMembership("user-1", client);
    expect(result).toEqual({ partnership_id: "p-1", status: "active" });
  });

  it("returns null, not undefined, when the user has no active Partnership", async () => {
    const { client } = fakeClient([]);
    const result = await findActiveMembership("user-1", client);
    expect(result).toBeNull();
  });

  it("scopes the query to the exact user passed in", async () => {
    const { client, query } = fakeClient([]);
    await findActiveMembership("user-42", client);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual(["user-42"]);
  });

  it("only ever runs one query — callers rely on this being a single round trip", async () => {
    const { client, query } = fakeClient([{ partnership_id: "p-1", status: "active" }]);
    await findActiveMembership("user-1", client);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
