import type { PoolClient } from "@neondatabase/serverless";

// Shared by every /api/partnership* route. Finds this user's currently-
// active Partnership membership, if any. "Active" means a
// partnership_members row with left_at still null AND the partnership
// itself isn't disconnected — was_partnership_member() (the RLS helper in
// 0002_rls.sql) deliberately ignores left_at so a disconnected member keeps
// frozen read access, but application logic like this needs the stricter
// "are you still really in this" check.
export async function findActiveMembership(userId: string, client: PoolClient) {
  const result = await client.query(
    `select pm.partnership_id, p.status
     from partnership_members pm
     join partnerships p on p.id = pm.partnership_id
     where pm.user_id = $1 and pm.left_at is null and p.status <> 'disconnected'
     limit 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}
