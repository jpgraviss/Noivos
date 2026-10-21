import { withUserContext } from "./db";

// Notifications (PRD §12.14) — the `notifications` table has existed
// since 0001_init.sql, unused until now. Tone requirement from the PRD:
// "every notification must read as encouraging/neutral-informative, never
// a warning or a nag" — every template below is phrased as good news or a
// plain fact, never urgency language.
//
// Only two of the PRD's example triggers are built here — partner joined,
// goal reached — because they're the only ones this app can fire
// synchronously from an existing request. "Bill due" and "weekly meeting
// reminder" are time-based and need a real job scheduler (Inngest, per
// Backend Architecture's own decision) that doesn't exist in this project
// yet; "savings milestone" has no defined threshold; "challenge completed"
// needs SE-76 (Community features) to exist first. All four are real,
// separate, not-yet-buildable gaps, not silently dropped.
export function describeNotification(notificationType: string, payload: Record<string, unknown>): string {
  switch (notificationType) {
    case "partner_joined":
      return `${payload.partnerName} joined your Partnership 🎉`;
    case "goal_funded":
      return `${payload.goalName} is fully funded!`;
    default:
      return "You have a new update.";
  }
}

// Deliberately its own transaction, separate from whatever primary write
// triggered it — same posture as lib/activity.ts's logActivityEvent, for
// the same reason (a notification failing to insert shouldn't roll back
// the real action that triggered it). Runs as the *actor* (the user whose
// action triggered this), not the recipient — migration 0021's
// notifications_insert RLS policy allows inserting for yourself or for
// anyone who shares an active Partnership with you, which covers every
// real call site here (notifying your own partner of your own action).
export async function createNotification(
  actorUserId: string,
  recipientId: string,
  notificationType: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await withUserContext(actorUserId, async (client) => {
      await client.query(`insert into notifications (recipient_id, notification_type, payload) values ($1, $2, $3::jsonb)`, [
        recipientId,
        notificationType,
        JSON.stringify(payload),
      ]);
    });
  } catch (err) {
    console.error(`createNotification(${notificationType}) failed (best-effort, not rethrown)`, err);
  }
}
