import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { findWeddingDetails } from "@/lib/wedding";
import { logActivityEvent } from "@/lib/activity";
import { tooLong, tooLarge, MAX_NAME_LENGTH, MAX_NOTE_LENGTH, MAX_AMOUNT } from "@/lib/validate";

function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

// Deliberately a plain ledger line, not a structured contributor entity —
// per PROJECT_MEMORY.md's 2026-08-02 decision (PRD §12.8): family members
// who gift money toward the wedding never get real account access, just a
// name + amount recorded by whichever partner logged it. No new migration
// needed — wedding_family_contributions and its RLS were already part of
// 0001_init.sql/0002_rls.sql, just unused until now.
export async function POST(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { contributorName?: unknown; amount?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const contributorName = typeof body.contributorName === "string" ? body.contributorName.trim() : "";
  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  if (!contributorName) {
    return NextResponse.json({ error: "contributorName is required" }, { status: 400 });
  }
  if (tooLong(contributorName, MAX_NAME_LENGTH)) {
    return NextResponse.json({ error: `contributorName must be ${MAX_NAME_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }
  if (tooLarge(amount, MAX_AMOUNT)) {
    return NextResponse.json({ error: `amount must be $${MAX_AMOUNT.toLocaleString()} or less` }, { status: 400 });
  }
  if (note && tooLong(note, MAX_NOTE_LENGTH)) {
    return NextResponse.json({ error: `Note must be ${MAX_NOTE_LENGTH} characters or fewer` }, { status: 400 });
  }

  try {
    const result = await withUserContext(userId, async (client) => {
      const membership = await findActiveMembership(userId, client);
      if (!membership) return { noPartnership: true as const };
      const details = await findWeddingDetails(membership.partnership_id, client);
      if (!details) return { noWeddingDetails: true as const };

      const inserted = await client.query(
        `insert into wedding_family_contributions (wedding_details_id, contributor_name, amount, note, recorded_by)
         values ($1, $2, $3, $4, $5)
         returning id, contributor_name, amount, note, created_at::text as created_at`,
        [details.id, contributorName, amount, note, userId]
      );
      return { contribution: inserted.rows[0], partnershipId: membership.partnership_id };
    });

    if (result.noPartnership) {
      return NextResponse.json({ error: "Set up a Partnership first." }, { status: 400 });
    }
    if (result.noWeddingDetails) {
      return NextResponse.json({ error: "Start Wedding Mode before logging family contributions." }, { status: 400 });
    }
    const c = result.contribution;

    // Best-effort, fire-and-forget — see lib/activity.ts.
    void logActivityEvent(userId, result.partnershipId, "wedding_family_contribution", {
      contributorName: c.contributor_name,
      amount: Number(c.amount),
    });

    return NextResponse.json({
      id: c.id,
      contributorName: c.contributor_name,
      amount: Number(c.amount),
      note: c.note,
      createdAt: c.created_at,
    });
  } catch (err) {
    console.error("POST /api/wedding/family-contributions failed", err);
    return NextResponse.json({ error: "Couldn't log that family contribution." }, { status: 500 });
  }
}
