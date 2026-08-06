import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";
import { tooLong, MAX_NAME_LENGTH } from "@/lib/validate";

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
        `select id, name, goal_type, target_amount::float8 as target_amount, target_date::text as target_date
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

  let body: { name?: unknown; goalType?: unknown; targetAmount?: unknown; targetDate?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const goalType = typeof body.goalType === "string" ? body.goalType : "custom";
  const targetAmount = typeof body.targetAmount === "number" ? body.targetAmount : Number(body.targetAmount);
  const targetDate = typeof body.targetDate === "string" && body.targetDate ? body.targetDate : null;

  if (!name) {
    return NextResponse.json({ error: "Goal name is required" }, { status: 400 });
  }
  if (tooLong(name, MAX_NAME_LENGTH)) {
    return NextResponse.json({ error: `Goal name must be ${MAX_NAME_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return NextResponse.json({ error: "Target amount must be a positive number" }, { status: 400 });
  }
  if (!(GOAL_TYPES as readonly string[]).includes(goalType)) {
    return NextResponse.json({ error: `goalType must be one of: ${GOAL_TYPES.join(", ")}` }, { status: 400 });
  }
  if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return NextResponse.json({ error: "targetDate must be in YYYY-MM-DD format" }, { status: 400 });
  }

  try {
    const goal = await withUserContext(userId, async (client) => {
      await client.query(`insert into users (id) values ($1) on conflict (id) do nothing`, [userId]);
      const result = await client.query(
        `insert into goals (owner_id, goal_type, name, target_amount, target_date)
         values ($1, $2, $3, $4, $5)
         returning id, name, goal_type, target_amount::float8 as target_amount, target_date::text as target_date`,
        [userId, goalType, name, targetAmount, targetDate]
      );
      return result.rows[0];
    });
    return NextResponse.json({
      id: goal.id,
      name: goal.name,
      goalType: goal.goal_type,
      targetAmount: goal.target_amount,
      targetDate: goal.target_date,
      contributions: [],
    });
  } catch (err) {
    console.error("POST /api/goals failed", err);
    return NextResponse.json({ error: "Something went wrong creating that goal." }, { status: 500 });
  }
}
