import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { findWeddingDetails } from "@/lib/wedding";
import { logActivityEvent } from "@/lib/activity";
import { isGoalBasedChallengeType, CHALLENGE_GOAL_TYPE, computeGoalBasedProgress, computeWeddingCountdownProgress } from "@/lib/challenges";

interface ParticipationRow {
  id: string;
  challenge_id: string;
  type: string;
  challenge_name: string;
  partnership_id: string | null;
  user_id: string | null;
  progress_percent: number;
  completed_at: string | null;
  joined_at: string;
}

// Recomputes every one of this user's challenge participations against
// real, current goals/wedding data on every GET, the same "live snapshot,
// not a one-time seed" posture as this route's own freshness needs (unlike
// Budget rollover, which seeds once at month-creation and then leaves that
// carried-forward number alone — a challenge's progress should always
// reflect today's actual goal balance). Persists the recomputed value back
// to challenge_participations.progress_percent so the stored row is never
// stale if read some other way, and fires a best-effort challenge_completed
// activity event the one time a shared challenge's progress crosses 100%
// (never on every subsequent read once it's already complete) — same
// "exact crossing, not every load" discipline as SE-75's goal_funded
// notification.
export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Collected during the transaction below, fired after it commits — same
  // reasoning as every other logActivityEvent() call site in this app (see
  // that function's own comment): it runs in its own separate connection/
  // transaction, so it must never be called from inside withUserContext's
  // callback, where a logging failure could abort the real progress-update
  // writes that triggered it.
  const completions: { partnershipId: string; challengeName: string }[] = [];

  try {
    const data = await withUserContext(userId, async (client) => {
      await client.query(`insert into users (id) values ($1) on conflict (id) do nothing`, [userId]);

      const catalogResult = await client.query(
        `select id, type, name, description from challenges order by name asc`
      );

      const participationsResult = await client.query(
        `select cp.id, cp.challenge_id, c.type, c.name as challenge_name, cp.partnership_id, cp.user_id,
                cp.progress_percent::float8 as progress_percent, cp.completed_at::text as completed_at,
                cp.joined_at::text as joined_at
         from challenge_participations cp
         join challenges c on c.id = cp.challenge_id
         order by cp.joined_at asc`
      );
      const participations = participationsResult.rows as ParticipationRow[];

      const now = new Date();
      const participationsOut = [];
      for (const p of participations) {
        let progressPercent = p.progress_percent;

        if (isGoalBasedChallengeType(p.type)) {
          const goalType = CHALLENGE_GOAL_TYPE[p.type];
          const goalResult = p.partnership_id
            ? await client.query(
                `select g.id,
                        coalesce((select sum(amount) from goal_contributions where goal_id = g.id), 0)::float8 as total_contributed,
                        g.target_amount::float8 as target_amount
                 from goals g where g.goal_type = $1 and g.partnership_id = $2 limit 1`,
                [goalType, p.partnership_id]
              )
            : await client.query(
                `select g.id,
                        coalesce((select sum(amount) from goal_contributions where goal_id = g.id), 0)::float8 as total_contributed,
                        g.target_amount::float8 as target_amount
                 from goals g where g.goal_type = $1 and g.owner_id = $2 and g.partnership_id is null limit 1`,
                [goalType, p.user_id]
              );
          const goal = goalResult.rows[0];
          // No matching goal created yet — progress honestly stays 0 rather
          // than guessing, same posture as every other "no data yet" case
          // in this app.
          progressPercent = goal ? computeGoalBasedProgress(goal.total_contributed, goal.target_amount) : 0;
        } else if (p.type === "wedding_countdown" && p.partnership_id) {
          const details = await findWeddingDetails(p.partnership_id, client);
          if (details?.status === "graduated") {
            progressPercent = 100;
          } else {
            const weddingDate = details?.wedding_date ? new Date(details.wedding_date) : null;
            progressPercent = computeWeddingCountdownProgress(new Date(p.joined_at), weddingDate, now);
          }
        }

        const justCompleted = progressPercent >= 100 && !p.completed_at;
        const completedAt = justCompleted ? now.toISOString() : p.completed_at;

        await client.query(
          `update challenge_participations set progress_percent = $1, completed_at = $2 where id = $3`,
          [progressPercent, completedAt, p.id]
        );

        if (justCompleted && p.partnership_id) {
          completions.push({ partnershipId: p.partnership_id, challengeName: p.challenge_name });
        }

        participationsOut.push({
          id: p.id,
          challengeId: p.challenge_id,
          type: p.type,
          challengeName: p.challenge_name,
          shared: Boolean(p.partnership_id),
          progressPercent,
          completedAt,
          joinedAt: p.joined_at,
        });
      }

      return {
        catalog: catalogResult.rows.map((c) => ({ id: c.id, type: c.type, name: c.name, description: c.description as string | null })),
        participations: participationsOut,
      };
    });

    for (const c of completions) {
      void logActivityEvent(userId, c.partnershipId, "challenge_completed", { challengeName: c.challengeName });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/challenges failed", err);
    return NextResponse.json({ error: "Couldn't load Challenges." }, { status: 500 });
  }
}
