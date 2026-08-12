import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { logActivityEvent } from "@/lib/activity";
import { isUuid } from "@/lib/validate";

// No manual ownership check needed here beyond RLS itself —
// wedding_checklist_items_all's WITH CHECK (0002_rls.sql) already requires
// the item's wedding_details to belong to an active Partnership this user
// is a member of. If the id doesn't qualify, the UPDATE simply affects zero
// rows under RLS rather than erroring, which is treated as a 404 below.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;
  // Not reachable via the real UI — GoalsScreen.tsx only ever calls this
  // with an id it already fetched from GET /api/wedding — but same posture
  // as the identical fix in goals/[id]/contributions (found 2026-08-08):
  // without this, a malformed id hits Postgres's own uuid-cast error inside
  // the catch block below and surfaces as this route's generic 500 instead
  // of a clean, specific 400. The two sibling [id]-segment routes in this
  // app now match (found 2026-08-11 — this one had been left out during
  // the earlier pass since its 500 message was already honestly generic
  // rather than confidently wrong, but a clean 400 is still the better
  // response for a format error either way).
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid checklist item id" }, { status: 400 });
  }

  let body: { isComplete?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (typeof body.isComplete !== "boolean") {
    return NextResponse.json({ error: "isComplete must be a boolean" }, { status: 400 });
  }

  try {
    const result = await withUserContext(userId, async (client) => {
      const updated = await client.query(
        `update wedding_checklist_items set is_complete = $2
         where id = $1
         returning id, title, due_date::text as due_date, is_complete, wedding_details_id`,
        [id, body.isComplete]
      );
      const item = updated.rows[0] ?? null;
      if (!item) return { item: null, partnershipId: null };

      const details = await client.query(`select partnership_id from wedding_details where id = $1`, [item.wedding_details_id]);
      return { item, partnershipId: (details.rows[0]?.partnership_id as string | undefined) ?? null };
    });

    if (!result.item) {
      return NextResponse.json({ error: "Checklist item not found." }, { status: 404 });
    }
    const item = result.item;

    // Best-effort, fire-and-forget — see lib/activity.ts. Only logged when
    // an item is being marked complete, not when it's unchecked.
    if (item.is_complete && result.partnershipId) {
      void logActivityEvent(userId, result.partnershipId, "wedding_checklist_completed", { title: item.title });
    }

    return NextResponse.json({ id: item.id, title: item.title, dueDate: item.due_date, isComplete: item.is_complete });
  } catch (err) {
    console.error(`PATCH /api/wedding/checklist/${id} failed`, err);
    return NextResponse.json({ error: "Couldn't update that checklist item." }, { status: 500 });
  }
}
