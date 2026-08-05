import { withUserContext } from "./db";

// Deliberately its own transaction/connection, separate from whatever
// primary write triggered it — Postgres aborts an entire transaction after
// any statement error (a plain try/catch around one query inside the same
// transaction would NOT save it), so logging activity on the same
// connection as e.g. a goal contribution could roll back that real write
// if this insert fails for any reason (including: migration
// 0005_add_activity_feed_insert_policy.sql not yet applied). Calling this
// after the primary withUserContext has already committed keeps the two
// fully independent — a logging failure here is swallowed and never
// surfaces to the caller.
export async function logActivityEvent(
  userId: string,
  partnershipId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await withUserContext(userId, async (client) => {
      await client.query(
        `insert into activity_feed_events (partnership_id, actor_id, event_type, payload)
         values ($1, $2, $3, $4::jsonb)`,
        [partnershipId, userId, eventType, JSON.stringify(payload)]
      );
    });
  } catch (err) {
    console.error(`logActivityEvent(${eventType}) failed (best-effort, not rethrown)`, err);
  }
}
