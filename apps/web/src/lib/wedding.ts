import type { PoolClient } from "@neondatabase/serverless";

// Shared by every /api/wedding* route.
export async function findWeddingDetails(partnershipId: string, client: PoolClient) {
  const result = await client.query(
    `select id, wedding_date::text as wedding_date, guest_count_estimate, status
     from wedding_details where partnership_id = $1`,
    [partnershipId]
  );
  return result.rows[0] ?? null;
}
