import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { buildAgenda } from "@/lib/moneyMeeting";

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

// money_meetings.partnership_id is NOT NULL — this ritual only exists for a
// real Partnership, never solo. No new migration needed: the table and its
// (co-editable, not owner-scoped) RLS were already part of
// 0001_init.sql/0002_rls.sql, just unused until now.
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
      if (!membership) {
        return { hasPartnership: false as const };
      }

      const weekResult = await client.query(
        `select to_char(date_trunc('week', current_date), 'YYYY-MM-DD') as week_of,
                trim(to_char(date_trunc('week', current_date), 'Mon DD')) as label`
      );
      const weekOf = weekResult.rows[0].week_of as string;
      const label = weekResult.rows[0].label as string;

      let meeting = await client.query(
        `select id, agenda, status, completed_at::text as completed_at
         from money_meetings where partnership_id = $1 and week_of = $2::date`,
        [membership.partnership_id, weekOf]
      );
      if (!meeting.rows[0]) {
        const topics = await buildAgenda(membership.partnership_id, client);
        meeting = await client.query(
          `insert into money_meetings (partnership_id, week_of, agenda)
           values ($1, $2::date, $3::jsonb)
           returning id, agenda, status, completed_at::text as completed_at`,
          [membership.partnership_id, weekOf, JSON.stringify({ topics })]
        );
      }

      const row = meeting.rows[0];
      return {
        hasPartnership: true as const,
        id: row.id as string,
        weekOf: label,
        topics: (row.agenda?.topics ?? []) as string[],
        status: row.status as string,
        completedAt: row.completed_at as string | null,
      };
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/money-meeting failed", err);
    return NextResponse.json({ error: "Couldn't load your Money Meeting." }, { status: 500 });
  }
}
