import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { isUuid } from "@/lib/validate";

// Stops tracking a recurring expense. Unlinks its transactions first
// (transactions.recurring_expense_id has no ON DELETE action, so deleting
// a still-referenced row would hit a plain FK violation) — those
// transactions themselves aren't touched otherwise, only the link to this
// now-gone recurring expense.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const result = await withUserContext(userId, async (client) => {
      await client.query(`update transactions set recurring_expense_id = null where recurring_expense_id = $1`, [id]);
      const deleted = await client.query(`delete from recurring_expenses where id = $1 returning id`, [id]);
      return { deleted: Boolean(deleted.rows[0]) };
    });
    if (!result.deleted) {
      return NextResponse.json({ error: "That recurring expense wasn't found." }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/recurring-expenses/[id] failed", err);
    return NextResponse.json({ error: "Couldn't remove that recurring expense." }, { status: 500 });
  }
}
