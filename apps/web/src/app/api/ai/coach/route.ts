import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { aiConfigured, askFinancialCoach, type ChatTurn, type FinancialContext } from "@/lib/ai";
import { isUuid, tooLong, MAX_MESSAGE_LENGTH } from "@/lib/validate";

// AI Financial Coach backend (PRD §12.10) — real for the first time as of
// 2026-08-14. See lib/ai.ts's own top-of-file comment for why this exists
// now despite PRD §12.10/§14's "legal review required before public
// launch, not yet scheduled" language: founder directive, building-to-
// demo-for-legal, not a launch-readiness decision. Do not remove that
// comment or this one when touching this file later.
//
// Conversations are deliberately kept personal (partnership_id left null
// on insert below), not partnership-shared, even when the user has an
// active Partnership — AICoachScreen.tsx's own "Share this conversation to
// Activity" button is still an honest disabled stub (no share event type
// exists yet), so there's no user-facing action that actually shares one
// of these conversations today. ai_conversations_select's RLS (0002_rls.sql)
// would make a partnership_id-tagged conversation visible to the other
// partner immediately, before any explicit share step — leaving
// partnership_id null keeps every conversation private until that real
// sharing flow is built, matching PRD §14/§15's data-boundary posture
// ("never use one partner's private data... without explicit permission")
// rather than assuming shared-by-default.

// GET — load this user's most recent Financial Coach conversation (if any)
// so reloading the screen doesn't lose history. Returns an empty
// conversation, not an error, when none exists yet — same "not started
// yet" posture as GET /api/wedding's hasPartnership:true/weddingDetails:null
// case.
export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!aiConfigured()) {
    return NextResponse.json({ error: "AI Coach isn't configured yet" }, { status: 503 });
  }

  try {
    const data = await withUserContext(userId, async (client) => {
      const conversation = await client.query(
        `select id from ai_conversations
         where initiated_by = $1 and conversation_type = 'financial_coach'
         order by created_at desc limit 1`,
        [userId]
      );
      const conversationId = conversation.rows[0]?.id as string | undefined;
      if (!conversationId) {
        return { conversationId: null, messages: [] as { role: string; content: string }[] };
      }
      const messages = await client.query(
        `select role, content from ai_messages where conversation_id = $1 order by created_at asc`,
        [conversationId]
      );
      return {
        conversationId,
        messages: messages.rows.map((r) => ({ role: r.role as string, content: r.content as string })),
      };
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/ai/coach failed", err);
    return NextResponse.json({ error: "Couldn't load your conversation with the Coach." }, { status: 500 });
  }
}

// POST — send a message, get a real answer grounded in this month's real
// budget/goal/bill data. Same "read the current state fresh every call"
// posture as lib/moneyMeeting.ts's buildAgenda(): never trust a client-
// supplied snapshot of financial numbers, always requery.
export async function POST(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!aiConfigured()) {
    return NextResponse.json({ error: "AI Coach isn't configured yet" }, { status: 503 });
  }

  let body: { conversationId?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  if (tooLong(message, MAX_MESSAGE_LENGTH)) {
    return NextResponse.json({ error: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer` }, { status: 400 });
  }
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
  if (conversationId && !isUuid(conversationId)) {
    return NextResponse.json({ error: "Invalid conversationId" }, { status: 400 });
  }

  try {
    const result = await withUserContext(userId, async (client) => {
      await client.query(`insert into users (id) values ($1) on conflict (id) do nothing`, [userId]);

      // Resolve (or create) the conversation this message belongs to.
      // "where initiated_by = $2" beyond just "where id = $1" isn't
      // redundant with RLS here — ai_conversations_select would also let a
      // partner see a partnership-tagged conversation (see this file's own
      // top comment on why these stay personal), so this belt-and-suspenders
      // check keeps a client-supplied conversationId from another user's
      // conversation of the same shape from being silently reused, even
      // though nothing in this route ever creates one that would qualify.
      let resolvedConversationId = conversationId;
      if (resolvedConversationId) {
        const existing = await client.query(
          `select id from ai_conversations where id = $1 and initiated_by = $2`,
          [resolvedConversationId, userId]
        );
        if (!existing.rows[0]) {
          return { notFound: true as const };
        }
      } else {
        const created = await client.query(
          `insert into ai_conversations (initiated_by, partnership_id, conversation_type)
           values ($1, null, 'financial_coach')
           returning id`,
          [userId]
        );
        resolvedConversationId = created.rows[0].id as string;
      }

      const historyResult = await client.query(
        `select role, content from ai_messages where conversation_id = $1 order by created_at asc`,
        [resolvedConversationId]
      );
      const history: ChatTurn[] = historyResult.rows.map((r) => ({
        role: r.role as "user" | "assistant",
        content: r.content as string,
      }));

      await client.query(
        `insert into ai_messages (conversation_id, role, content, input_mode) values ($1, 'user', $2, 'text')`,
        [resolvedConversationId, message]
      );

      const monthResult = await client.query(
        `select trim(to_char(current_date, 'Month YYYY')) as label`
      );
      const monthLabel = monthResult.rows[0].label as string;

      const categoriesResult = await client.query(
        `select c.name, bc.planned_amount,
                coalesce((
                  select sum(t.amount) from transactions t
                  where t.category_id = c.id
                    and t.transaction_date >= date_trunc('month', current_date)
                    and t.transaction_date < date_trunc('month', current_date) + interval '1 month'
                ), 0) as spent
         from budget_categories bc
         join categories c on c.id = bc.category_id
         join budgets b on b.id = bc.budget_id
         where b.month = date_trunc('month', current_date)::date
         order by c.name asc`
      );
      const goalsResult = await client.query(
        `select g.name, g.target_amount::float8 as target_amount, g.target_date::text as target_date,
                coalesce((select sum(gc.amount) from goal_contributions gc where gc.goal_id = g.id), 0) as total_contributed
         from goals g
         order by g.created_at asc
         limit 10`
      );
      const billsResult = await client.query(
        `select v.name, v.balance_due::float8 as amount,
                trim(to_char(v.balance_due_date, 'Mon DD')) as due
         from wedding_vendors v
         where v.balance_due is not null and v.balance_due > 0 and v.balance_due_date is not null
         order by v.balance_due_date asc
         limit 5`
      );

      const financialContext: FinancialContext = {
        monthLabel,
        hasPartnership: await (async () => {
          const membership = await client.query(
            `select 1 from partnership_members where user_id = $1 and left_at is null limit 1`,
            [userId]
          );
          return membership.rows.length > 0;
        })(),
        budgetCategories: categoriesResult.rows.map((r) => ({
          name: r.name as string,
          planned: Number(r.planned_amount),
          spent: Number(r.spent),
        })),
        goals: goalsResult.rows.map((r) => ({
          name: r.name as string,
          targetAmount: Number(r.target_amount),
          totalContributed: Number(r.total_contributed),
          targetDate: r.target_date as string | null,
        })),
        upcomingBills: billsResult.rows.map((r) => ({
          name: r.name as string,
          amount: Number(r.amount),
          due: r.due as string,
        })),
      };

      return {
        notFound: false as const,
        conversationId: resolvedConversationId,
        history,
        financialContext,
      };
    });

    if (result.notFound) {
      return NextResponse.json({ error: "That conversation wasn't found." }, { status: 404 });
    }

    let reply: string;
    try {
      reply = await askFinancialCoach(result.financialContext, result.history, message);
    } catch (err) {
      if (err instanceof Error && err.message === "AI_REFUSAL") {
        // A genuine content-policy decline, not an outage — surfaced as a
        // clean, non-alarming message rather than a generic 500. Not
        // persisted as an assistant message (nothing to save).
        return NextResponse.json(
          { error: "The Coach couldn't answer that one — try rephrasing, or ask something else." },
          { status: 422 }
        );
      }
      throw err;
    }

    // Persist the assistant's reply in its own withUserContext call, same
    // "separate from the primary write" posture as lib/activity.ts's
    // logActivityEvent — the user's own message above is already
    // committed regardless of whether the AI call or this save succeeds,
    // so a failure here doesn't silently lose what they typed.
    await withUserContext(userId, async (client) => {
      await client.query(
        `insert into ai_messages (conversation_id, role, content, input_mode) values ($1, 'assistant', $2, 'text')`,
        [result.conversationId, reply]
      );
    });

    return NextResponse.json({ conversationId: result.conversationId, reply });
  } catch (err) {
    console.error("POST /api/ai/coach failed", err);
    return NextResponse.json({ error: "Something went wrong reaching the Coach." }, { status: 500 });
  }
}
