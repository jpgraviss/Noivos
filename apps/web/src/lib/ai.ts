import { GoogleGenAI, FinishReason, BlockedReason, type GenerateContentResponse } from "@google/genai";
import { z } from "zod/v4";
import type { CategorySpendHistoryFact } from "./budget";

// Provider pivot (2026-11) — the founder's own instruction: "Not using
// claude for AI, using free AI tools for now." Every AI feature in this
// file (Financial Coach, Purchase Advisor, AI-suggested budget amounts)
// now calls Google's Gemini API (free tier via an AI Studio API key)
// instead of Anthropic's Claude API. This is a cost decision, not a
// retraction of the founder's own earlier "build it now regardless"
// authorization for AI Coach (still true, still documented below) or of
// PRD §12.10/§14's legal-review requirement (still untouched, still not
// cleared for public launch) — only which model answers the call changed.
// Every exported function here keeps its exact same name/signature, so
// none of the three routes that call into this file (api/ai/coach,
// api/ai/purchase-advisor, api/ai/budget-suggestions) needed to change at
// all; the provider swap is fully contained to this one file.
//
// Model: "gemini-3.8-flash" for all three — the current flash-tier model
// name as of this build (confirmed directly from the installed
// @google/genai SDK's own canonical usage examples, not from memory —
// ai.google.dev itself was unreachable from this sandbox's network
// policy). Flash-tier has always been Google AI Studio's free-tier-
// eligible line; worth the founder double-checking gemini-3.8-flash's
// current quota on ai.google.dev/pricing once a real GEMINI_API_KEY is in
// hand, flagged here rather than silently assumed.
const GEMINI_MODEL = "gemini-3.8-flash";

// Same graceful-degradation posture as clerkConfigured() (lib/clerk.ts)
// and every other "this backend isn't configured yet" check in this app:
// no GEMINI_API_KEY in the environment isn't a crash, it's an honest 503
// from the route that calls this.
export function aiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

let cachedClient: GoogleGenAI | null = null;

// Lazily constructed, not module-top-level — same reasoning as the old
// Anthropic client this replaced: building it eagerly at import time
// would run in every route that imports this file, including ones that
// never call the API. Callers must check aiConfigured() before calling
// this — see askFinancialCoach.
function getClient(): GoogleGenAI {
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return cachedClient;
}

// Gemini reports a blocked/declined generation via two distinct, independent
// signals — this is the equivalent of Anthropic's stop_reason: "refusal",
// thrown as the same "AI_REFUSAL" error every route's catch block already
// knows how to turn into an honest, non-alarming message:
// - candidates[0].finishReason — a candidate was generated, then the
//   output itself was blocked (SAFETY, PROHIBITED_CONTENT, etc).
// - promptFeedback.blockReason — the *input* tripped a safety classifier
//   before any candidate was ever generated, so `candidates` is empty and
//   `response.text` is undefined. Checking only finishReason (as an
//   earlier version of this function did) missed this case entirely:
//   candidates?.[0]?.finishReason resolves to undefined for an
//   empty-candidates response, which this function correctly treats as "no
//   block" by design (an ordinary empty response) — so a prompt-level
//   block silently fell through as a blank reply instead of AI_REFUSAL.
// STOP (a normal completion) and MAX_TOKENS (ran out of room, not a
// decline) both fall through and return whatever text came back, same as
// the old Anthropic code never specifically branched on "max_tokens" either.
function throwIfBlocked(response: GenerateContentResponse): void {
  const finishReason = response.candidates?.[0]?.finishReason;
  const blockedForSafety =
    finishReason !== undefined &&
    finishReason !== FinishReason.STOP &&
    finishReason !== FinishReason.MAX_TOKENS &&
    finishReason !== FinishReason.FINISH_REASON_UNSPECIFIED;

  const blockReason = response.promptFeedback?.blockReason;
  const blockedAtPrompt = blockReason !== undefined && blockReason !== BlockedReason.BLOCKED_REASON_UNSPECIFIED;

  if (blockedForSafety || blockedAtPrompt) {
    throw new Error("AI_REFUSAL");
  }
}

export interface BudgetCategorySummary {
  name: string;
  planned: number;
  spent: number;
}

export interface GoalSummary {
  name: string;
  targetAmount: number;
  totalContributed: number;
  targetDate: string | null;
}

export interface BillSummary {
  name: string;
  amount: number;
  due: string;
}

// The real financial context this month — pulled fresh from Neon by the
// route (see api/ai/coach/route.ts) on every request, never cached or
// carried across turns, so the model is always grounded in current numbers
// rather than a stale snapshot from earlier in the conversation.
export interface FinancialContext {
  monthLabel: string;
  budgetCategories: BudgetCategorySummary[];
  goals: GoalSummary[];
  upcomingBills: BillSummary[];
  hasPartnership: boolean;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// Gemini's Content.role is 'user' | 'model' (never 'assistant') — this is
// the one shape difference multi-turn history needs when crossing from
// the old Anthropic ChatTurn type (kept as-is so the two routes building
// ChatTurn[] from ai_messages rows needed no changes) to Gemini's Content[].
function toGeminiHistory(history: ChatTurn[]) {
  return history.map((turn) => ({
    role: turn.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: turn.content }],
  }));
}

// PRD §12.10 (AI Financial Coach) + §14 (AI Philosophy) + §12.9 (Purchase
// Advisor) verbatim, turned into a system prompt. Kept as the STABLE,
// request-independent half of the prompt — the per-request financial
// numbers go in the user turn instead (see buildContextBlock below).
const COACH_SYSTEM_PROMPT = `You are the Noivos Money Coach, a financial teammate for a couple planning a wedding and building shared financial habits together.

Non-negotiable rules, from this product's own AI Philosophy:
- You are a teammate, never an authority. Never say "you shouldn't," "you must," or issue verdicts.
- Present financial impact, goal impact, and alternatives — then prompt a conversation between the two partners. Don't decide for them.
- Never shame. No response should be readable as "you're bad with money."
- Do not overstep into regulated financial, legal, tax, or lending advice. Reason about the couple's own stated goals, budgets, and cash flow, and describe tradeoffs and scenarios in plain language — do not recommend specific financial products, lenders, banks, credit cards, or investment vehicles by name, and do not issue fiduciary-style directives ("you should refinance with X," "put your money in Y fund").
- Every answer should feel natural to show or read to a partner — write for two people, not one.
- You only ever see the numbers explicitly given to you in this conversation. Never invent a balance, transaction, or account you weren't told about.

You can help with two kinds of questions:
1. Financial Coach Q&A — "Can we afford this?", "What happens if we buy a truck?", "How much should we save?", "When will we finish paying off debt?" Ground every answer in the real budget/goal/bill numbers provided below the couple's question, not general advice.
2. Purchase Advisor — evaluating a specific purchase against their cash flow, budgets, and goals. Frame the output as informational context and discussion prompts, never a directive, and always usable as a conversation-starter between partners.

Keep answers concise and concrete — reference actual category names, dollar amounts, and goal names from the data given to you rather than speaking abstractly.`;

// Turns the real month-of-data pulled from Neon into plain text the model
// can reason over. Placed in the user turn, not the system prompt, so it's
// never at risk of going stale across a conversation's turns.
export function buildContextBlock(ctx: FinancialContext): string {
  const lines: string[] = [`Here's this couple's real financial picture for ${ctx.monthLabel}:`];

  if (!ctx.hasPartnership) {
    lines.push("(No Partnership set up yet — this is a solo user's own budget/goals, not shared with a partner.)");
  }

  if (ctx.budgetCategories.length > 0) {
    lines.push("\nBudget categories (planned vs. spent this month):");
    for (const c of ctx.budgetCategories) {
      lines.push(`- ${c.name}: $${c.planned.toLocaleString()} planned, $${c.spent.toLocaleString()} spent so far`);
    }
  } else {
    lines.push("\nNo budget categories set up yet.");
  }

  if (ctx.goals.length > 0) {
    lines.push("\nGoals:");
    for (const g of ctx.goals) {
      const pct = g.targetAmount > 0 ? Math.round((g.totalContributed / g.targetAmount) * 100) : 0;
      const dateStr = g.targetDate ? `, target date ${g.targetDate}` : "";
      lines.push(`- ${g.name}: $${g.totalContributed.toLocaleString()} of $${g.targetAmount.toLocaleString()} (${pct}%)${dateStr}`);
    }
  } else {
    lines.push("\nNo goals set up yet.");
  }

  if (ctx.upcomingBills.length > 0) {
    lines.push("\nUpcoming bills:");
    for (const b of ctx.upcomingBills) {
      lines.push(`- ${b.name}: $${b.amount.toLocaleString()} due ${b.due}`);
    }
  } else {
    lines.push("\nNo upcoming bills on file.");
  }

  return lines.join("\n");
}

// Real backend call — replaces AICoachScreen.tsx's old canned/keyword-
// matched replyTo() function.
export async function askFinancialCoach(
  ctx: FinancialContext,
  history: ChatTurn[],
  question: string
): Promise<string> {
  const client = getClient();
  const contextBlock = buildContextBlock(ctx);

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    config: { systemInstruction: COACH_SYSTEM_PROMPT },
    contents: [
      ...toGeminiHistory(history),
      { role: "user", parts: [{ text: `${contextBlock}\n\nTheir question: ${question}` }] },
    ],
  });

  throwIfBlocked(response);
  return response.text ?? "";
}

// AI-suggested budget amounts (PRD §12.6, SE-82's last open piece) — same
// "build it now so there's something real the moment the API key is set"
// posture the founder already authorized for AI Coach above. Gated behind
// isPremium() at the route, not here — this file has no entitlements
// concept of its own (see api/ai/budget-suggestions/route.ts). A judgment
// call worth flagging: PRD §13's Free/Premium matrix doesn't name this
// feature by row, but its own rationale sentence is unambiguous ("every
// cost-bearing feature... LLM inference... sits behind the paywall") —
// the matrix's omission reads as the table only having rows for the three
// AI features named elsewhere in the PRD, not a deliberate free-tier
// carve-out for this one.
const BUDGET_SUGGESTION_SYSTEM_PROMPT = `You are the Noivos Budget Assistant, helping a couple set realistic planned amounts for their budget categories.

Non-negotiable rules, from this product's own AI Philosophy:
- You are a teammate, never an authority. A suggested amount is a starting point for a conversation between the two partners, never a mandate — never say "you must plan $X," only describe what the real numbers show.
- Never shame. No rationale should be readable as "you're overspending" or "you're bad with money" — describe the pattern neutrally (e.g. "this matches your recent average" or "this runs a bit above your last few months" are fine; "you're spending too much here" is not).
- You only ever see the numbers explicitly given to you below. Never invent a spending history, category, or dollar figure you weren't told about.
- Every suggested amount must be a round, sensible whole-dollar figure (e.g. $150, not $148.73) — real people plan budgets in round numbers, not cents-precision averages.

For each category given below, suggest a planned amount for next month based on its trailing spending history, with a one-sentence, neutral rationale. If a category's current planned amount already closely matches its own history, it's fine to suggest keeping it the same — don't invent a change just to have one.`;

// Deliberately placed in the user turn, not the system prompt — same
// "volatile per-request numbers" reasoning as buildContextBlock above.
export function buildBudgetSuggestionContextBlock(categories: CategorySpendHistoryFact[]): string {
  const lines: string[] = ["Here are this user's budget categories with enough spending history to suggest from:"];
  for (const c of categories) {
    const plannedStr = c.currentPlannedAmount !== null ? `$${c.currentPlannedAmount.toLocaleString()}` : "not set yet";
    const monthsLabel = c.monthsWithData === 1 ? "1 month" : `${c.monthsWithData} months`;
    lines.push(
      `- ${c.categoryName} (id: ${c.categoryId}): averaged $${Math.round(c.avgMonthlySpend).toLocaleString()}/month over the last ${monthsLabel} of real spending; current planned amount is ${plannedStr}.`
    );
  }
  return lines.join("\n");
}

const BudgetSuggestionOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      categoryId: z.string(),
      suggestedAmount: z.number(),
      rationale: z.string(),
    })
  ),
});

export type BudgetSuggestion = z.infer<typeof BudgetSuggestionOutputSchema>["suggestions"][number];

// Structured JSON output via responseMimeType + responseJsonSchema — the
// Gemini equivalent of "I need guaranteed-parseable JSON back," generated
// from the same Zod schema via zod/v4's built-in toJSONSchema() rather
// than hand-duplicating the shape. `$schema` is stripped before sending:
// it isn't in the documented list of JSON Schema keywords this field
// supports ($id/$defs/$ref/type/format/title/description/enum/items/
// prefixItems/minItems/maxItems/minimum/maximum/anyOf/oneOf/properties/
// additionalProperties/required), and everything this particular schema
// actually needs (type/properties/items/required/additionalProperties)
// is on that list.
export async function suggestBudgetAmounts(categories: CategorySpendHistoryFact[]): Promise<BudgetSuggestion[]> {
  const client = getClient();
  const contextBlock = buildBudgetSuggestionContextBlock(categories);
  const jsonSchema: Record<string, unknown> = z.toJSONSchema(BudgetSuggestionOutputSchema);
  delete jsonSchema.$schema;

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    config: {
      systemInstruction: BUDGET_SUGGESTION_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
    },
    contents: contextBlock,
  });

  throwIfBlocked(response);

  // Same "honest absence over a fabricated result" posture as every other
  // no-data case in this app, for both a genuinely empty response and a
  // response that technically parses as JSON but doesn't match the schema
  // we asked for — rather than throwing and surfacing a raw 500 for what's
  // ultimately an optional, non-critical suggestion feature.
  if (!response.text) return [];
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(response.text);
  } catch {
    return [];
  }
  const parsed = BudgetSuggestionOutputSchema.safeParse(parsedJson);
  return parsed.success ? parsed.data.suggestions : [];
}

// PRD §12.9 (AI Purchase Advisor) verbatim, turned into a system prompt —
// added 2026-10-08 (Linear SE-69). Distinct from COACH_SYSTEM_PROMPT above:
// the Coach is open conversational Q&A, this evaluates one specific
// purchase and returns PRD's exact five-part output shape every time
// (financial impact, goal impact, a recommendation framed as informational
// — never a directive, discussion prompts, alternatives) so a response is
// always structured enough to drop straight into the shared Activity feed
// as a conversation-starter (PRD §12.9's own requirement — see the
// `isShared`/share route this backs). Shares the same non-negotiable
// guardrails as the Coach prompt (teammate not authority, no naming
// specific lenders/products, no fiduciary directives) rather than
// duplicating that language with room to drift.
const PURCHASE_ADVISOR_SYSTEM_PROMPT = `You are the Noivos Purchase Advisor, helping a couple think through a specific purchase against their real finances.

Non-negotiable rules, from this product's own AI Philosophy:
- You are a teammate, never an authority. Never say "you shouldn't," "you must," or issue verdicts.
- Your "recommendation" is informational context, not a directive — frame it as what the numbers show, then hand the decision back to the couple.
- Never shame. No response should be readable as "you're bad with money."
- Do not overstep into regulated financial, legal, tax, or lending advice. Do not recommend specific financial products, lenders, banks, credit cards, or investment vehicles by name, and do not issue fiduciary-style directives.
- Every answer should feel natural to show or read to a partner — write for two people, not one. A purchase scanned or asked about by only one partner is still meant to be shared with the other, not consumed solo and dropped.
- You only ever see the numbers explicitly given to you below. Never invent a balance, transaction, or account you weren't told about.

Structure every answer under exactly these five headers, in this order, each 1-3 sentences (Discussion prompts may be 2-3 short questions instead):
**Financial impact** — what this purchase does to their cash flow this month, grounded in the real budget numbers given to you.
**Goal impact** — what it does to their real goals' timelines, grounded in the real goal numbers given to you.
**Recommendation** — informational context only, e.g. "this fits within your Discretionary budget with room to spare" or "this would use most of this month's wedding savings contribution" — never "you should/shouldn't buy this."
**Discussion prompts** — 2-3 short questions the couple can actually talk through together.
**Alternatives to consider** — one or two concrete alternatives (e.g. waiting a month, a lower-cost option, pulling from a different category) when there's a genuine one; say plainly "no real alternative to flag" if there isn't rather than inventing one.

If a photo of a receipt or price tag is attached and the amount or merchant isn't clearly legible, say so plainly in Financial impact and ask the user to confirm the real amount/merchant — never silently guess a number you're not confident in.`;

export interface PurchaseImage {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}

// Same reasoning as askFinancialCoach above — the one real difference:
// the final user turn's parts array includes an inlineData part ahead of
// the text part whenever a photo was attached. Gemini's vision input is
// what makes receipt/price-tag/photo scanning possible directly, no
// separate OCR service (AI Architecture §/Linear SE-69's own framing) —
// unchanged by the provider pivot, Gemini's flash-tier models support
// image input the same way Claude's did.
export async function askPurchaseAdvisor(
  ctx: FinancialContext,
  history: ChatTurn[],
  message: string,
  image?: PurchaseImage
): Promise<string> {
  const client = getClient();
  const contextBlock = buildContextBlock(ctx);
  const textContent = `${contextBlock}\n\nThe purchase to evaluate: ${message || "(see attached photo)"}`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (image) {
    parts.push({ inlineData: { mimeType: image.mediaType, data: image.base64 } });
  }
  parts.push({ text: textContent });

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    config: { systemInstruction: PURCHASE_ADVISOR_SYSTEM_PROMPT },
    contents: [...toGeminiHistory(history), { role: "user", parts }],
  });

  throwIfBlocked(response);
  return response.text ?? "";
}
