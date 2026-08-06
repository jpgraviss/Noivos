import { withUserContext } from "./db";

// Turns a raw (event_type, payload) row into the human-readable sentence
// HomeScreen's Activity card and AppShell's Recent Activity dropdown both
// expect. Moved here from api/activity/route.ts (2026-08-06) so it's a
// plain, importable, unit-testable function instead of a private helper
// only reachable through a live request — a new event_type still only ever
// needs a change in this one place, same intent as before the move.
export function describeActivityEvent(actorName: string, eventType: string, payload: Record<string, unknown>): string {
  switch (eventType) {
    case "goal_contribution":
      return `${actorName} added $${Number(payload.amount).toLocaleString()} to ${payload.goalName}`;
    case "budget_expense":
      return payload.merchantName
        ? `${actorName} logged $${Number(payload.amount).toLocaleString()} at ${payload.merchantName} (${payload.categoryName})`
        : `${actorName} logged $${Number(payload.amount).toLocaleString()} for ${payload.categoryName}`;
    case "wedding_vendor_added":
      return `${actorName} added ${payload.vendorName} to Vendors`;
    case "wedding_checklist_completed":
      return `${actorName} completed "${payload.title}"`;
    case "wedding_family_contribution":
      return `${actorName} logged a $${Number(payload.amount).toLocaleString()} gift from ${payload.contributorName}`;
    default:
      return `${actorName} made an update`;
  }
}

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
