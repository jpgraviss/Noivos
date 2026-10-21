import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";

// Marks every one of this user's unread notifications read in one call —
// the obvious "clear all" action a notification dropdown needs, rather
// than forcing one tap per row.
export async function POST() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    await withUserContext(userId, async (client) => {
      await client.query(`update notifications set read_at = now() where read_at is null`);
    });
    return NextResponse.json({ read: true });
  } catch (err) {
    console.error("POST /api/notifications/read-all failed", err);
    return NextResponse.json({ error: "Couldn't update your notifications." }, { status: 500 });
  }
}
