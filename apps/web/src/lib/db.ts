import { Pool, type PoolClient } from "@neondatabase/serverless";

// Reused across warm serverless invocations rather than created per request
// — Pool handles its own connection lifecycle over Neon's WebSocket/HTTP
// transport, so a module-level singleton is the right pattern here (same as
// any other serverless Postgres client).
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

// Every authenticated query MUST go through this — it's the one place that
// implements the RLS handoff documented in packages/database/README.md:
// Neon has no auth.uid() (that's a Supabase-only convenience), so RLS
// policies instead read a `current_user_id()` Postgres function backed by a
// session variable. That variable only exists for the lifetime of one
// transaction on one connection, so set_config() and the actual query MUST
// run on the same client inside the same transaction — never two separate
// pool.query() calls, which could each land on a different connection.
export async function withUserContext<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.current_user_id', $1, true)", [userId]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {
      // Connection may already be broken if the error came from the driver
      // itself — nothing more to do, the pool will discard this client.
    });
    throw err;
  } finally {
    client.release();
  }
}
