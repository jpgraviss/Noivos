import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { findActiveMembership } from "@/lib/partnership";
import { logActivityEvent } from "@/lib/activity";
import { isUuid } from "@/lib/validate";

// POST — the real "Share this conversation to Activity" action (PRD
// §12.9 / Linear SE-69): AICoachScreen.tsx's share button used to be an
// honest disabled "coming soon" stub (no share event type existed) ever
// since the AI Coach backend shipped 2026-08-14. Deliberately scoped to
// Purchase Advisor conversations only — PRD §12.9 is the one place this
// app's own spec calls for AI output to be "shareable directly into the
// shared activity feed as a conversation-starter"; Financial Coach
// conversations have no such requirement and stay private by design (see
// api/ai/coach/route.ts's own comment on why those keep partnership_id
// null permanently). Rejecting a non-purchase_advisor conversation here
// isn't just a UI nicety — it's the actual enforcement point against
// accidentally exposing a Coach conversation some other way.
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
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

  try {
    const result = await withUserContext(userId, async (client) => {
      const conversation = await client.query(
        `select id, conversation_type, is_shared_to_activity_feed
         from ai_conversations
         where id = $1 and initiated_by = $2`,
        [id, userId]
      );
      const row = conversation.rows[0] as
        | { id: string; conversation_type: string; is_shared_to_activity_feed: boolean }
        | undefined;
      if (!row) {
        return { notFound: true as const, alreadyShared: false, wrongType: false, needsPartnership: false };
      }
      if (row.conversation_type !== "purchase_advisor") {
        return { notFound: false as const, alreadyShared: false, wrongType: true, needsPartnership: false };
      }
      if (row.is_shared_to_activity_feed) {
        // Idempotent — tapping an already-shared conversation's share
        // action again (a slow double-tap, or a stale UI state after a
        // reload) just confirms it's shared rather than erroring or
        // double-posting to the feed.
        return { notFound: false as const, alreadyShared: true, wrongType: false, needsPartnership: false };
      }

      const membership = await findActiveMembership(userId, client);
      if (!membership) {
        return { notFound: false as const, alreadyShared: false, wrongType: false, needsPartnership: true };
      }

      const firstMessage = await client.query(
        `select content from ai_messages where conversation_id = $1 and role = 'user' order by created_at asc limit 1`,
        [id]
      );
      const rawSummary = (firstMessage.rows[0]?.content as string | undefined) ?? "a purchase";
      const summary = rawSummary.length > 80 ? `${rawSummary.slice(0, 77)}...` : rawSummary;

      await client.query(
        `update ai_conversations set partnership_id = $2, is_shared_to_activity_feed = true where id = $1`,
        [id, membership.partnership_id]
      );

      return {
        notFound: false as const,
        alreadyShared: false,
        wrongType: false,
        needsPartnership: false,
        partnershipId: membership.partnership_id as string,
        summary,
      };
    });

    if (result.notFound) {
      return NextResponse.json({ error: "That conversation wasn't found." }, { status: 404 });
    }
    if (result.wrongType) {
      return NextResponse.json({ error: "Only Purchase Advisor conversations can be shared." }, { status: 400 });
    }
    if (result.needsPartnership) {
      return NextResponse.json(
        { error: "You need a Partnership to share this — invite a partner first." },
        { status: 400 }
      );
    }
    if (result.alreadyShared) {
      return NextResponse.json({ shared: true });
    }

    // Best-effort, fire-and-forget, after the primary write already
    // committed — same posture as every other logActivityEvent call site
    // in this app (goal contributions, budget expenses, wedding vendors).
    void logActivityEvent(userId, result.partnershipId!, "purchase_advisor_shared", { summary: result.summary });

    return NextResponse.json({ shared: true });
  } catch (err) {
    console.error("POST /api/ai/conversations/[id]/share failed", err);
    return NextResponse.json({ error: "Couldn't share that conversation." }, { status: 500 });
  }
}
