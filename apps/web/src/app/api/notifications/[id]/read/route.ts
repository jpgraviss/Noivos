import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { isUuid } from "@/lib/validate";

// Marks a single notification read — notifications_update's RLS
// (recipient_id = current_user_id()) already guarantees this only ever
// touches the signed-in user's own notification, same "trust RLS,
// zero-rows-updated = 404" idiom as every other single-row PATCH in this
// app.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const updated = await withUserContext(userId, async (client) => {
      const result = await client.query(
        `update notifications set read_at = coalesce(read_at, now()) where id = $1 returning id`,
        [id]
      );
      return Boolean(result.rows[0]);
    });
    if (!updated) {
      return NextResponse.json({ error: "That notification wasn't found." }, { status: 404 });
    }
    return NextResponse.json({ read: true });
  } catch (err) {
    console.error("POST /api/notifications/[id]/read failed", err);
    return NextResponse.json({ error: "Couldn't update that notification." }, { status: 500 });
  }
}
