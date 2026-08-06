import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";
import { logActivityEvent } from "@/lib/activity";
import { tooLong, MAX_NOTE_LENGTH } from "@/lib/validate";

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

// The goal_contributions_write RLS policy (0004_tighten_goal_contributions_rls.sql)
// is what actually enforces "you can only contribute to a goal you own or
// share" — this route doesn't duplicate that check, it just surfaces the
// resulting insert failure as a clean 403 rather than a raw DB error leaking
// through, since the policy denial is exactly the signal that's happening.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id: goalId } = await params;

  let body: { amount?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
  }
  if (note && tooLong(note, MAX_NOTE_LENGTH)) {
    return NextResponse.json({ error: `Note must be ${MAX_NOTE_LENGTH} characters or fewer` }, { status: 400 });
  }

  try {
    const { contribution, activityInfo } = await withUserContext(userId, async (client) => {
      const result = await client.query(
        `insert into goal_contributions (goal_id, contributor_id, amount, note)
         values ($1, $2, $3, $4)
         returning id, contributor_id, amount::float8 as amount, contribution_date::text as contribution_date, note`,
        [goalId, userId, amount, note]
      );
      const goalInfo = await client.query(
        `select name, is_shared, partnership_id from goals where id = $1`,
        [goalId]
      );
      return { contribution: result.rows[0], activityInfo: goalInfo.rows[0] ?? null };
    });

    // Best-effort, fire-and-forget — see lib/activity.ts for why this runs
    // after the primary transaction has already committed rather than
    // inside it. Only logged for shared goals; a personal goal's
    // contributions stay off the shared Activity feed.
    if (activityInfo?.is_shared && activityInfo.partnership_id) {
      void logActivityEvent(userId, activityInfo.partnership_id, "goal_contribution", {
        goalName: activityInfo.name,
        amount: contribution.amount,
      });
    }

    return NextResponse.json({
      id: contribution.id,
      contributorId: contribution.contributor_id,
      amount: contribution.amount,
      date: contribution.contribution_date,
      note: contribution.note,
    });
  } catch (err) {
    // RLS denies the insert (goal not owned/shared) by returning zero rows
    // affected under a WITH CHECK failure, which the pg driver surfaces as
    // a generic "new row violates row-level security policy" error — not a
    // distinguishable error code, so this is treated as the 403 case.
    console.error(`POST /api/goals/${goalId}/contributions failed`, err);
    return NextResponse.json(
      { error: "Couldn't add that contribution — the goal may not exist or isn't yours." },
      { status: 403 }
    );
  }
}
