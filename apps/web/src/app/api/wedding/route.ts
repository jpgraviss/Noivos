import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { findWeddingDetails } from "@/lib/wedding";
import { isValidDateString } from "@/lib/validate";

// wedding_details.partnership_id is NOT NULL (0001_init.sql) — Wedding data
// can only exist once a real Partnership does (see /api/partnership). GET
// distinguishes "no Partnership yet" from "Partnership exists but hasn't
// started Wedding Mode" from "Wedding Mode is set up", so the client can
// show the right prompt at each stage.
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
        return { hasPartnership: false as const, weddingDetails: null };
      }

      const details = await findWeddingDetails(membership.partnership_id, client);
      if (!details) {
        return { hasPartnership: true as const, weddingDetails: null };
      }

      const vendorsResult = await client.query(
        `select id, name, category, contract_amount::float8 as contract_amount,
                deposit_amount::float8 as deposit_amount, balance_due::float8 as balance_due,
                balance_due_date::text as balance_due_date, status
         from wedding_vendors where wedding_details_id = $1 order by created_at asc`,
        [details.id]
      );
      const checklistResult = await client.query(
        `select id, title, due_date::text as due_date, is_complete
         from wedding_checklist_items where wedding_details_id = $1
         order by due_date asc nulls last, title asc`,
        [details.id]
      );
      const familyContributionsResult = await client.query(
        `select id, contributor_name, amount::float8 as amount, note, created_at::text as created_at
         from wedding_family_contributions where wedding_details_id = $1
         order by created_at asc`,
        [details.id]
      );

      return {
        hasPartnership: true as const,
        weddingDetails: {
          id: details.id,
          weddingDate: details.wedding_date,
          guestCountEstimate: details.guest_count_estimate,
          status: details.status,
          vendors: vendorsResult.rows.map((v) => ({
            id: v.id,
            name: v.name,
            category: v.category,
            contractAmount: v.contract_amount,
            depositAmount: v.deposit_amount,
            balanceDue: v.balance_due,
            balanceDueDate: v.balance_due_date,
            status: v.status,
          })),
          checklist: checklistResult.rows.map((c) => ({
            id: c.id,
            title: c.title,
            dueDate: c.due_date,
            isComplete: c.is_complete,
          })),
          familyContributions: familyContributionsResult.rows.map((f) => ({
            id: f.id,
            contributorName: f.contributor_name,
            amount: f.amount,
            note: f.note,
            createdAt: f.created_at,
          })),
        },
      };
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/wedding failed", err);
    return NextResponse.json({ error: "Something went wrong loading your Wedding details." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { weddingDate?: unknown; guestCountEstimate?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const weddingDate = typeof body.weddingDate === "string" && body.weddingDate ? body.weddingDate : null;
  const guestCountEstimate =
    body.guestCountEstimate === undefined || body.guestCountEstimate === null || body.guestCountEstimate === ""
      ? null
      : Number(body.guestCountEstimate);
  if (weddingDate && !isValidDateString(weddingDate)) {
    return NextResponse.json({ error: "weddingDate must be a real date in YYYY-MM-DD format" }, { status: 400 });
  }
  if (guestCountEstimate !== null && (!Number.isFinite(guestCountEstimate) || guestCountEstimate < 0)) {
    return NextResponse.json({ error: "guestCountEstimate must be a non-negative number" }, { status: 400 });
  }

  try {
    const result = await withUserContext(userId, async (client) => {
      const membership = await findActiveMembership(userId, client);
      if (!membership) {
        return { noPartnership: true as const };
      }
      const insertResult = await client.query(
        `insert into wedding_details (partnership_id, wedding_date, guest_count_estimate)
         values ($1, $2, $3)
         on conflict (partnership_id) do nothing
         returning id, wedding_date::text as wedding_date, guest_count_estimate, status`,
        [membership.partnership_id, weddingDate, guestCountEstimate]
      );
      if (!insertResult.rows[0]) {
        return { alreadyExists: true as const };
      }
      return { created: true as const, details: insertResult.rows[0] };
    });

    if (result.noPartnership) {
      return NextResponse.json({ error: "Set up a Partnership before starting Wedding Mode." }, { status: 400 });
    }
    if (result.alreadyExists) {
      return NextResponse.json({ error: "Wedding details already exist for your Partnership." }, { status: 409 });
    }
    return NextResponse.json({
      id: result.details.id,
      weddingDate: result.details.wedding_date,
      guestCountEstimate: result.details.guest_count_estimate,
      status: result.details.status,
      vendors: [],
      checklist: [],
      familyContributions: [],
    });
  } catch (err) {
    console.error("POST /api/wedding failed", err);
    return NextResponse.json({ error: "Something went wrong starting Wedding Mode." }, { status: 500 });
  }
}

// Added 2026-08-11: until now, wedding_date/guest_count_estimate could only
// ever be set once, at POST time — there was no route to change them
// afterward, even though GoalsScreen.tsx's own copy ("Set a wedding date to
// see your countdown") implies the user can go do that, and an ordinary
// real-world event (a venue reschedule, a firmer headcount) has no way to
// be reflected. wedding_details_write's RLS (0002_rls.sql) already
// correctly requires both active-partnership and membership on its own
// USING/WITH CHECK — no gap there, this was purely a missing route.
//
// Deliberately scoped to just these two fields, not `status`/`graduated_at`
// — that's a real 3-state lifecycle in the schema (active/graduated/
// paused_or_cancelled) but nothing in the UI has a "graduate" or "pause
// Wedding Mode" action yet to drive it, so wiring that transition now would
// be guessing at a flow the founder hasn't designed. Flagged in
// PROJECT_MEMORY.md as a separate, deliberately-deferred gap.
//
// A field only updates if the request body actually includes that key —
// `weddingDate: null` (explicit) clears it, but an omitted key leaves the
// existing value alone. Plain COALESCE can't tell "explicitly null" apart
// from "not provided" (both arrive as SQL NULL), so this passes an
// explicit *Provided boolean per field instead and lets Postgres's own
// CASE WHEN pick the right side — avoids a PATCH with `{}` silently wiping
// both columns to null, and avoids any dynamic/string-built SQL.
export async function PATCH(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { weddingDate?: unknown; guestCountEstimate?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const weddingDateProvided = "weddingDate" in body;
  const guestCountProvided = "guestCountEstimate" in body;
  if (!weddingDateProvided && !guestCountProvided) {
    return NextResponse.json({ error: "Nothing to update — include weddingDate and/or guestCountEstimate." }, { status: 400 });
  }
  const weddingDate = typeof body.weddingDate === "string" && body.weddingDate ? body.weddingDate : null;
  const guestCountEstimate =
    body.guestCountEstimate === undefined || body.guestCountEstimate === null || body.guestCountEstimate === ""
      ? null
      : Number(body.guestCountEstimate);
  if (weddingDate && !isValidDateString(weddingDate)) {
    return NextResponse.json({ error: "weddingDate must be a real date in YYYY-MM-DD format" }, { status: 400 });
  }
  if (guestCountEstimate !== null && (!Number.isFinite(guestCountEstimate) || guestCountEstimate < 0)) {
    return NextResponse.json({ error: "guestCountEstimate must be a non-negative number" }, { status: 400 });
  }

  try {
    const result = await withUserContext(userId, async (client) => {
      const membership = await findActiveMembership(userId, client);
      if (!membership) {
        return { noPartnership: true as const };
      }
      const updated = await client.query(
        `update wedding_details
         set wedding_date = case when $4 then $2::date else wedding_date end,
             guest_count_estimate = case when $5 then $3::int else guest_count_estimate end
         where partnership_id = $1
         returning id, wedding_date::text as wedding_date, guest_count_estimate, status`,
        [membership.partnership_id, weddingDate, guestCountEstimate, weddingDateProvided, guestCountProvided]
      );
      if (!updated.rows[0]) {
        return { notFound: true as const };
      }
      return { updated: true as const, details: updated.rows[0] };
    });

    if (result.noPartnership) {
      return NextResponse.json({ error: "Set up a Partnership before editing Wedding details." }, { status: 400 });
    }
    if (result.notFound) {
      return NextResponse.json({ error: "Start Wedding Mode before editing its details." }, { status: 404 });
    }
    return NextResponse.json({
      id: result.details.id,
      weddingDate: result.details.wedding_date,
      guestCountEstimate: result.details.guest_count_estimate,
      status: result.details.status,
    });
  } catch (err) {
    console.error("PATCH /api/wedding failed", err);
    return NextResponse.json({ error: "Couldn't update your Wedding details." }, { status: 500 });
  }
}
