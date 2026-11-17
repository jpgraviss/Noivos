import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/clerk";
import { withUserContext } from "@/lib/db";
import { aiConfigured, suggestBudgetAmounts } from "@/lib/ai";
import { computeCategorySpendHistory } from "@/lib/budget";
import { isPremium } from "@/lib/entitlements";

// AI-suggested budget amounts (PRD §12.6, SE-82's last open piece) — a
// one-shot structured analysis, not a persisted chat, so unlike
// /api/ai/coach and /api/ai/purchase-advisor this has no GET/history
// endpoint and writes nothing to ai_conversations/ai_messages: there's no
// conversation to resume, only a fresh suggestion computed from whatever
// the user's spending history looks like right now. "Applying" a
// suggestion is a separate, ordinary write to budget_categories.planned_amount
// via PATCH /api/budget's new categoryAmounts field — this route only ever
// reads and suggests, never writes.
export async function POST() {
  if (!clerkConfigured()) {
    return NextResponse.json({ error: "Clerk isn't configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!aiConfigured()) {
    return NextResponse.json({ error: "Budget suggestions aren't configured yet" }, { status: 503 });
  }
  // Premium-gated per lib/ai.ts's own comment on this feature — the gate
  // only actually enforces once Stripe is configured (lib/entitlements.ts),
  // so this costs nothing today.
  if (!(await isPremium(userId))) {
    return NextResponse.json({ error: "AI-suggested budget amounts is a Noivos Premium feature.", upgradeRequired: true }, { status: 402 });
  }

  try {
    const history = await withUserContext(userId, (client) => computeCategorySpendHistory(client));
    // Only categories with at least one real month of spending behind
    // them — nothing honest to suggest for a category with zero history,
    // same "don't fabricate a number from no data" posture as every other
    // insight/trend in this app.
    const withHistory = history.filter((c) => c.monthsWithData >= 1);
    if (withHistory.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const rawSuggestions = await suggestBudgetAmounts(withHistory);
    const historyById = new Map(withHistory.map((c) => [c.categoryId, c]));
    const suggestions = rawSuggestions
      .map((s) => {
        const fact = historyById.get(s.categoryId);
        if (!fact) return null; // Model echoed back a categoryId it wasn't given — drop it rather than trust an invented one.
        return {
          categoryId: s.categoryId,
          categoryName: fact.categoryName,
          suggestedAmount: s.suggestedAmount,
          rationale: s.rationale,
          currentPlannedAmount: fact.currentPlannedAmount,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    return NextResponse.json({ suggestions });
  } catch (err) {
    if (err instanceof Error && err.message === "AI_REFUSAL") {
      // Same 422 ("genuine decline, not an outage") convention as
      // /api/ai/coach and /api/ai/purchase-advisor.
      return NextResponse.json(
        { error: "Couldn't generate budget suggestions right now — try again in a moment." },
        { status: 422 }
      );
    }
    console.error("POST /api/ai/budget-suggestions failed", err);
    return NextResponse.json({ error: "Couldn't generate budget suggestions." }, { status: 500 });
  }
}
