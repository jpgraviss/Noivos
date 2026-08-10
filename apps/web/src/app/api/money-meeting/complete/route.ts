import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";
import { isUuid } from "@/lib/validate";

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

// money_meetings_all's RLS (0002_rls.sql) lets any active member of the
// Partnership update this row, not just whoever created it — this is a
// genuinely shared, co-editable ritual, unlike Budget's owner-scoped model.
export async function POST(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  // Same class of gap already closed in goals/[id]/contributions and
  // budget/transactions: without this, a malformed id hits Postgres's own
  // uuid-cast error inside the catch block below and surfaces as this
  // route's generic 500 instead of a clean, specific 400 (found
  // 2026-08-10). Not a security gap — money_meetings_all's RLS already
  // scopes this correctly — just a validation/error-quality one.
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const result = await withUserContext(userId, async (client) => {
      const updated = await client.query(
        `update money_meetings set status = 'completed', completed_at = now()
         where id = $1
         returning id, status, completed_at::text as completed_at`,
        [id]
      );
      return updated.rows[0] ?? null;
    });

    if (!result) {
      return NextResponse.json({ error: "Money Meeting not found." }, { status: 404 });
    }
    return NextResponse.json({ id: result.id, status: result.status, completedAt: result.completed_at });
  } catch (err) {
    console.error("POST /api/money-meeting/complete failed", err);
    return NextResponse.json({ error: "Couldn't mark that Money Meeting complete." }, { status: 500 });
  }
}
