import { describe, it, expect, vi } from "vitest";
import type { PoolClient } from "@neondatabase/serverless";
import { findWeddingDetails } from "./wedding";

// Shared by every /api/wedding* route to check "does this Partnership have
// Wedding Mode started at all" before doing anything else — a wrong
// row/null distinction here would either hide a real user's real wedding
// data or let a "Start Wedding Mode" prompt show for someone who's already
// started it.
function fakeClient(rows: unknown[]): { client: PoolClient; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn().mockResolvedValueOnce({ rows });
  return { client: { query } as unknown as PoolClient, query };
}

describe("findWeddingDetails", () => {
  it("returns the wedding_details row when one exists for this Partnership", async () => {
    const row = { id: "wd-1", wedding_date: "2027-06-12", guest_count_estimate: 120, status: "active" };
    const { client } = fakeClient([row]);
    const result = await findWeddingDetails("p-1", client);
    expect(result).toEqual(row);
  });

  it("returns null, not undefined, when Wedding Mode hasn't been started", async () => {
    const { client } = fakeClient([]);
    const result = await findWeddingDetails("p-1", client);
    expect(result).toBeNull();
  });

  it("scopes the query to the exact Partnership passed in", async () => {
    const { client, query } = fakeClient([]);
    await findWeddingDetails("p-42", client);
    expect(query.mock.calls[0][1]).toEqual(["p-42"]);
  });
});
