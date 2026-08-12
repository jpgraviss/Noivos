import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { logActivityEvent } from "@/lib/activity";

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
