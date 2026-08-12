import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { buildAgenda } from "@/lib/moneyMeeting";

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
        // ON CONFLICT DO NOTHING against money_meetings_partnership_week_unique
        // (migration 0008) — two concurrent GETs (both partners loading Home
        // at once, a rapid double-fetch) could otherwise both pass the
        // !meeting.rows[0] check above and both insert, creating two rows for
        // the same week. If this request loses that race, RETURNING comes
        // back empty rather than erroring, and the fallback select below picks
        // up whichever row actually won.
        meeting = await client.query(
          `insert into money_meetings (partnership_id, week_of, agenda)
           values ($1, $2::date, $3::jsonb)
           on conflict (partnership_id, week_of) do nothing
           returning id, agenda, status, completed_at::text as completed_at`,
          [membership.partnership_id, weekOf, JSON.stringify({ topics })]
        );
        if (!meeting.rows[0]) {
          meeting = await client.query(
            `select id, agenda, status, completed_at::text as completed_at
             from money_meetings where partnership_id = $1 and week_of = $2::date`,
            [membership.partnership_id, weekOf]
          );
        }
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
