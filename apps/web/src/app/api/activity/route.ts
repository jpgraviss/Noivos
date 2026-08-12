import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { describeActivityEvent } from "@/lib/activity";

// activity_feed_events_select's RLS (0002_rls.sql) already scopes this to
// events in a Partnership this user is/was a member of — no manual
// filtering needed beyond that.
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
      const membership = await findActiveMembership(userId, client);
      if (!membership) return { hasPartnership: false as const, events: [] };

      const result = await client.query(
        `select e.id, e.event_type, e.payload, e.created_at::text as created_at,
                coalesce(u.display_name, 'Your partner') as actor_name
         from activity_feed_events e
         join users u on u.id = e.actor_id
         where e.partnership_id = $1
         order by e.created_at desc
         limit 15`,
        [membership.partnership_id]
      );

      const events = result.rows.map((r) => ({
        id: r.id as string,
        text: describeActivityEvent(r.actor_name as string, r.event_type as string, r.payload as Record<string, unknown>),
        time: r.created_at as string,
      }));
      return { hasPartnership: true as const, events };
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/activity failed", err);
    return NextResponse.json({ error: "Couldn't load your Activity feed." }, { status: 500 });
  }
}
