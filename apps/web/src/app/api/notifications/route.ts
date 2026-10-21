import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { describeNotification } from "@/lib/notifications";

// GET — this user's own notifications (notifications_select's RLS already
// scopes to recipient_id = current_user_id(), same as every other route
// that trusts RLS rather than re-filtering by hand). Most recent 50, which
// is plenty for a dropdown — this isn't a full history screen.
export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const data = await withUserContext(userId, async (client) => {
      const result = await client.query(
        `select id, notification_type, payload, read_at::text as read_at, created_at::text as created_at
         from notifications
         order by created_at desc
         limit 50`
      );
      const notifications = result.rows.map((r) => ({
        id: r.id as string,
        notificationType: r.notification_type as string,
        description: describeNotification(r.notification_type as string, (r.payload as Record<string, unknown>) ?? {}),
        readAt: r.read_at as string | null,
        createdAt: r.created_at as string,
      }));
      return { notifications, unreadCount: notifications.filter((n) => !n.readAt).length };
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/notifications failed", err);
    return NextResponse.json({ error: "Couldn't load your notifications." }, { status: 500 });
  }
}
