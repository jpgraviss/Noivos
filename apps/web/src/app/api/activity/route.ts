import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

// Turns a raw (event_type, payload) row into the human-readable sentence
// HomeScreen's Activity card expects — kept here rather than in the client
// so a new event_type only ever needs a change in one place.
function describeEvent(actorName: string, eventType: string, payload: Record<string, unknown>): string {
  switch (eventType) {
    case "goal_contribution":
      return `${actorName} added $${Number(payload.amount).toLocaleString()} to ${payload.goalName}`;
    case "budget_expense":
      return payload.merchantName
        ? `${actorName} logged $${Number(payload.amount).toLocaleString()} at ${payload.merchantName} (${payload.categoryName})`
        : `${actorName} logged $${Number(payload.amount).toLocaleString()} for ${payload.categoryName}`;
    case "wedding_vendor_added":
      return `${actorName} added ${payload.vendorName} to Vendors`;
    case "wedding_checklist_completed":
      return `${actorName} completed "${payload.title}"`;
    case "wedding_family_contribution":
      return `${actorName} logged a $${Number(payload.amount).toLocaleString()} gift from ${payload.contributorName}`;
    default:
      return `${actorName} made an update`;
  }
}

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
        text: describeEvent(r.actor_name as string, r.event_type as string, r.payload as Record<string, unknown>),
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
