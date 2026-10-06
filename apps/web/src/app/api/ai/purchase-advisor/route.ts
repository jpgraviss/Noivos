import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { aiConfigured, askPurchaseAdvisor, type ChatTurn, type PurchaseImage } from "@/lib/ai";
import { loadFinancialContext } from "@/lib/financialContext";
import { isUuid, tooLong, MAX_MESSAGE_LENGTH, MAX_IMAGE_BASE64_LENGTH } from "@/lib/validate";

// AI Purchase Advisor backend (PRD §12.9 / Linear SE-69) — added 2026-10-08.
// Distinct conversation_type from Financial Coach (ai_conversations'
// own check constraint already anticipated both), distinct route per AI
// Architecture's own description ("This document defines what happens
// inside /api/ai/coach and /api/ai/purchase-advisor"), distinct system
// prompt (lib/ai.ts's askPurchaseAdvisor — PRD's exact five-part
// structured output, not open Q&A). Shares loadFinancialContext() with
// the Coach route rather than re-deriving the same numbers twice.
//
// Unlike Financial Coach conversations (always partnership_id = null,
// genuinely never shareable — see api/ai/coach/route.ts's own comment),
// PRD §12.9 explicitly requires Purchase Advisor output be "shareable
// directly into the shared activity feed as a conversation-starter." This
// route still creates every conversation personal-by-default
// (partnership_id = null) — the opt-in share step itself is a separate
// PATCH (api/ai/conversations/[id]/share/route.ts), never automatic, so a
// purchase question asked before ever deciding to share it stays private
// until that explicit action.
//
// Image attachments (photo/receipt/price-tag scan) are analyzed via
// Claude's vision input but deliberately NOT persisted anywhere —
// ai_messages.attachment_id exists in the schema, but attachments.
// attachment_type's own check constraint only covers
// 'receipt'/'avatar'/'vendor_contract' (transaction receipts, profile
// photos, vendor contracts — all pre-existing, unrelated use cases), and
// there's no object-storage provider (S3/Blob/etc.) wired into this
// project yet to put the bytes somewhere durable. Building that is a
// real, separate infrastructure decision, not something to bolt on
// silently here — flagged as an open item rather than attempted. The
// practical effect: a photo can be analyzed in the moment and its result
// saved as text, but re-opening this conversation later won't show the
// original image again, only what was said about it.

// GET — load this user's most recent Purchase Advisor conversation (if
// any), same "empty conversation, not an error" posture as GET
// /api/ai/coach.
export async function GET() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!aiConfigured()) {
    return NextResponse.json({ error: "Purchase Advisor isn't configured yet" }, { status: 503 });
  }

  try {
    const data = await withUserContext(userId, async (client) => {
      const conversation = await client.query(
        `select id, is_shared_to_activity_feed from ai_conversations
         where initiated_by = $1 and conversation_type = 'purchase_advisor'
         order by created_at desc limit 1`,
        [userId]
      );
      const row = conversation.rows[0] as { id: string; is_shared_to_activity_feed: boolean } | undefined;
      if (!row) {
        return { conversationId: null, shared: false, messages: [] as { role: string; content: string; createdAt: string }[] };
      }
      // created_at included so AICoachScreen.tsx can merge this thread
      // with the Financial Coach one into a single chronological chat log.
      const messages = await client.query(
        `select role, content, created_at::text as created_at from ai_messages where conversation_id = $1 order by created_at asc`,
        [row.id]
      );
      return {
        conversationId: row.id,
        shared: row.is_shared_to_activity_feed,
        messages: messages.rows.map((r) => ({
          role: r.role as string,
          content: r.content as string,
          createdAt: r.created_at as string,
        })),
      };
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/ai/purchase-advisor failed", err);
    return NextResponse.json({ error: "Couldn't load your conversation with the Purchase Advisor." }, { status: 500 });
  }
}

const VALID_IMAGE_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

// POST — evaluate a purchase (typed description and/or a photo), get a
// structured answer grounded in this month's real budget/goal/bill data.
export async function POST(request: Request) {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!aiConfigured()) {
    return NextResponse.json({ error: "Purchase Advisor isn't configured yet" }, { status: 503 });
  }

  let body: { conversationId?: unknown; message?: unknown; imageBase64?: unknown; imageMediaType?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : null;
  const imageMediaType = typeof body.imageMediaType === "string" ? body.imageMediaType : null;

  // A message is required unless a photo stands in for it (PRD §12.9's own
  // input modes include "take a picture"/"scan a receipt" with no typed
  // text at all) — askPurchaseAdvisor's own "(see attached photo)"
  // fallback only kicks in when both the message AND an image exist; this
  // route still requires at least one of the two.
  if (!message && !imageBase64) {
    return NextResponse.json({ error: "Describe the purchase or attach a photo" }, { status: 400 });
  }
  if (message && tooLong(message, MAX_MESSAGE_LENGTH)) {
    return NextResponse.json({ error: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer` }, { status: 400 });
  }
  let image: PurchaseImage | undefined;
  if (imageBase64) {
    if (tooLong(imageBase64, MAX_IMAGE_BASE64_LENGTH)) {
      return NextResponse.json({ error: "That photo is too large" }, { status: 400 });
    }
    if (!imageMediaType || !(VALID_IMAGE_MEDIA_TYPES as readonly string[]).includes(imageMediaType)) {
      return NextResponse.json({ error: "Unsupported photo format" }, { status: 400 });
    }
    image = { base64: imageBase64, mediaType: imageMediaType as PurchaseImage["mediaType"] };
  }
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
  if (conversationId && !isUuid(conversationId)) {
    return NextResponse.json({ error: "Invalid conversationId" }, { status: 400 });
  }

  // input_mode matches ai_messages' own check constraint
  // ('text'|'voice'|'photo'|'receipt_scan'|'price_tag_scan') — this route
  // doesn't yet distinguish a receipt scan from a price-tag scan from a
  // plain photo at the UI layer (one "attach a photo" affordance; the
  // model itself can tell from the image what kind it's looking at), so
  // every photo is saved as the general 'photo' mode for now. 'voice'
  // isn't accepted at all — no transcription pipeline exists yet.
  const inputMode = image ? "photo" : "text";
  const savedMessageContent = message || "(photo attached, no caption)";

  try {
    const result = await withUserContext(userId, async (client) => {
      await client.query(`insert into users (id) values ($1) on conflict (id) do nothing`, [userId]);

      let resolvedConversationId = conversationId;
      if (resolvedConversationId) {
        const existing = await client.query(
          `select id from ai_conversations where id = $1 and initiated_by = $2 and conversation_type = 'purchase_advisor'`,
          [resolvedConversationId, userId]
        );
        if (!existing.rows[0]) {
          return { notFound: true as const };
        }
      } else {
        const created = await client.query(
          `insert into ai_conversations (initiated_by, partnership_id, conversation_type)
           values ($1, null, 'purchase_advisor')
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
        `insert into ai_messages (conversation_id, role, content, input_mode) values ($1, 'user', $2, $3)`,
        [resolvedConversationId, savedMessageContent, inputMode]
      );

      const financialContext = await loadFinancialContext(userId, client);

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
      reply = await askPurchaseAdvisor(result.financialContext, result.history, message, image);
    } catch (err) {
      if (err instanceof Error && err.message === "AI_REFUSAL") {
        return NextResponse.json(
          { error: "The Purchase Advisor couldn't evaluate that one — try rephrasing, or ask something else." },
          { status: 422 }
        );
      }
      throw err;
    }

    await withUserContext(userId, async (client) => {
      await client.query(
        `insert into ai_messages (conversation_id, role, content, input_mode) values ($1, 'assistant', $2, 'text')`,
        [result.conversationId, reply]
      );
    });

    return NextResponse.json({ conversationId: result.conversationId, reply });
  } catch (err) {
    console.error("POST /api/ai/purchase-advisor failed", err);
    return NextResponse.json({ error: "Something went wrong reaching the Purchase Advisor." }, { status: 500 });
  }
}
