import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { tooLong, tooLarge, MAX_NAME_LENGTH, MAX_AMOUNT } from "@/lib/validate";

const GOAL_TYPES = [
  "wedding",
  "house",
  "vacation",
  "emergency_fund",
  "vehicle",
  "baby",
  "debt_payoff",
  "retirement",
  "custom",
] as const;

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

// GET/POST both rely entirely on RLS to scope rows to what this user can
// actually see/write (goals_select/goals_write, packages/database/
// migrations/0002_rls.sql) — no manual "where owner_id = $1" filter needed
// here beyond what withUserContext's set_config() already establishes.
export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const goals = await withUserContext(userId, async (client) => {
      await client.query(`insert into users (id) values ($1) on conflict (id) do nothing`, [userId]);

      const goalsResult = await client.query(
        `select id, name, goal_type, target_amount::float8 as target_amount, target_date::text as target_date, is_shared
         from goals order by created_at asc`
      );
      const goalIds = goalsResult.rows.map((r) => r.id);

      const contributionsResult =
        goalIds.length > 0
          ? await client.query(
              `select gc.id, gc.goal_id, gc.contributor_id, u.display_name,
                      gc.amount::float8 as amount, gc.contribution_date::text as contribution_date, gc.note
               from goal_contributions gc
               join users u on u.id = gc.contributor_id
               where gc.goal_id = any($1::uuid[])
               order by gc.contribution_date asc`,
              [goalIds]
            )
          : { rows: [] };

      return goalsResult.rows.map((g) => ({
        id: g.id,
        name: g.name,
        goalType: g.goal_type,
        targetAmount: g.target_amount,
        targetDate: g.target_date,
        shared: g.is_shared,
        contributions: contributionsResult.rows
          .filter((c) => c.goal_id === g.id)
          .map((c) => ({
            id: c.id,
            contributorId: c.contributor_id,
            contributorName: c.display_name ?? "Someone",
            amount: c.amount,
            date: c.contribution_date,
            note: c.note,
          })),
      }));
    });
    return NextResponse.json({ goals });
  } catch (err) {
    console.error("GET /api/goals failed", err);
    return NextResponse.json({ error: "Something went wrong loading your goals." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { name?: unknown; goalType?: unknown; targetAmount?: unknown; targetDate?: unknown; shared?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const goalType = typeof body.goalType === "string" ? body.goalType : "custom";
  const targetAmount = typeof body.targetAmount === "number" ? body.targetAmount : Number(body.targetAmount);
  const targetDate = typeof body.targetDate === "string" && body.targetDate ? body.targetDate : null;
  const wantsShared = body.shared === true;

  if (!name) {
    return NextResponse.json({ error: "Goal name is required" }, { status: 400 });
  }
  if (tooLong(name, MAX_NAME_LENGTH)) {
    return NextResponse.json({ error: `Goal name must be ${MAX_NAME_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return NextResponse.json({ error: "Target amount must be a positive number" }, { status: 400 });
  }
  if (tooLarge(targetAmount, MAX_AMOUNT)) {
    return NextResponse.json({ error: `Target amount must be $${MAX_AMOUNT.toLocaleString()} or less` }, { status: 400 });
  }
  if (!(GOAL_TYPES as readonly string[]).includes(goalType)) {
    return NextResponse.json({ error: `goalType must be one of: ${GOAL_TYPES.join(", ")}` }, { status: 400 });
  }
  if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return NextResponse.json({ error: "targetDate must be in YYYY-MM-DD format" }, { status: 400 });
  }

  // Personal/Shared toggle (2026-08-08) — GoalsScreen.tsx's "Add a goal"
  // form only ever shows the choice when `hasPartnership` is true, but
  // this route can't trust that: it independently looks up the writer's
  // own real membership via findActiveMembership() (never trusting a
  // client-supplied partnershipId — there is no such field in this body at
  // all) and rejects `shared: true` outright if the writer genuinely has
  // no active Partnership, rather than silently downgrading to personal
  // (which would be a confusing, easy-to-miss surprise: you asked for
  // shared, got personal, no error). Unlike Budget (one shared budget per
  // Partnership per month, no per-item choice), goals genuinely need this
  // per-goal choice — the mock data itself always showed both shapes
  // coexisting for one user. Requires migration
  // 0012_fix_write_policy_membership_gaps.sql for goals_write's RLS to
  // actually accept a shared insert correctly scoped to the writer's real
  // membership — see packages/database/README.md.
  try {
    const result = await withUserContext(userId, async (client) => {
      await client.query(`insert into users (id) values ($1) on conflict (id) do nothing`, [userId]);

      let partnershipId: string | null = null;
      if (wantsShared) {
        const membership = await findActiveMembership(userId, client);
        if (!membership) return { needsPartnership: true as const };
        partnershipId = membership.partnership_id;
      }

      const goalResult = await client.query(
        `insert into goals (owner_id, partnership_id, is_shared, goal_type, name, target_amount, target_date)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id, name, goal_type, target_amount::float8 as target_amount, target_date::text as target_date, is_shared`,
        [userId, partnershipId, wantsShared, goalType, name, targetAmount, targetDate]
      );
      return { needsPartnership: false as const, goal: goalResult.rows[0] };
    });

    if (result.needsPartnership) {
      return NextResponse.json(
        { error: "You need a Partnership to create a shared goal — invite a partner first, or create this as personal." },
        { status: 400 }
      );
    }
    const goal = result.goal;
    return NextResponse.json({
      id: goal.id,
      name: goal.name,
      goalType: goal.goal_type,
      targetAmount: goal.target_amount,
      targetDate: goal.target_date,
      shared: goal.is_shared,
      contributions: [],
    });
  } catch (err) {
    console.error("POST /api/goals failed", err);
    return NextResponse.json({ error: "Something went wrong creating that goal." }, { status: 500 });
  }
}
