import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { CategorySpendHistoryFact } from "./budget";

// Added 2026-08-14 — the AI Financial Coach backend PRD §12.10 always
// described but this project deliberately left unbuilt, gated on legal
// review ("Legal review is still required before public launch of this
// feature specifically — not yet scheduled," PRD §12.10 / AI Philosophy
// §14). The founder gave explicit, direct, in-chat instruction to build it
// now regardless: "I now need for you to do all of the work so we can
// later get legal approval once we actually have something to show them."
// That authorizes building and internally testing a real backend — it does
// NOT clear this feature for public launch. The legal-review requirement
// itself is untouched; this comment (and the PROJECT_MEMORY.md entry for
// this date) exists so that distinction survives past this session. Do not
// read "AI Coach has a real backend now" as "AI Coach is legally cleared."
//
// Same graceful-degradation posture as clerkConfigured() (lib/clerk.ts):
// no ANTHROPIC_API_KEY in the environment isn't a crash, it's an honest
// 503 from the route that calls this — same shape as every other
// "this backend isn't configured yet" path already in this app (Clerk
// unconfigured, no invite-email service wired up, etc.).
export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cachedClient: Anthropic | null = null;

// Lazily constructed, not module-top-level — instantiating Anthropic()
// with no ANTHROPIC_API_KEY set doesn't itself throw (the SDK just has
// nothing to authenticate with until a request is actually made), but
// building it eagerly at import time would run in every route that
// imports this file, including ones that never call the API. Callers
// must check aiConfigured() before calling this — see askFinancialCoach.
function getClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic();
  }
  return cachedClient;
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

// PRD §12.10 (AI Financial Coach) + §14 (AI Philosophy) + §12.9 (Purchase
// Advisor) verbatim, turned into a system prompt. Kept as the STABLE,
// request-independent half of the prompt — the per-request financial
// numbers go in the user turn instead (see buildContextBlock below) so
// this block stays byte-identical across requests and is eligible for
// prompt caching (shared/prompt-caching.md: stable content first, volatile
// content after the last cache_control breakpoint).
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
// can reason over. Deliberately placed in the user turn, not the system
// prompt (see COACH_SYSTEM_PROMPT's own comment) — this changes every
// request as real numbers change, so keeping it out of the cached prefix
// means a stale cache is never a risk, at the cost of this piece never
// being cached itself. That's the right tradeoff here: a chat coach's
// system prompt is reused far more often than any one month's numbers
// are, and correctness (never reasoning over stale figures) matters more
// than the caching win.
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
// matched replyTo() function. Model choice: claude-opus-5 per this
// project's own house default (no reason to reach for a cheaper tier —
// this is a low-volume, per-user-initiated chat, not a batch job).
// output_config.effort "medium": this is conversational Q&A grounded in a
// small, already-summarized data block, not multi-step agentic work — the
// hardest-tier "xhigh" effort this model supports is built for coding/
// agentic tasks, not a good fit here. Adaptive thinking stays on (the
// default) but display is left "omitted" (also the default) rather than
// "summarized" — the raw reasoning is never shown to the user either way,
// and PRD §12.10's regulatory guardrail is about the model's *answer*, not
// its scratch reasoning, so there's nothing to gain from surfacing it.
// fallbacks: "default" per this project's own house default for
// claude-opus-5 — if Claude's safety classifiers decline a request for any
// reason, the API retries server-side on a fallback model rather than
// this route surfacing a hard failure to two people mid-conversation
// about their own wedding budget.
//
// max_tokens 4096, not something tight around "a chat reply should be
// short": Claude Opus 5 runs adaptive thinking ON by default, and
// max_tokens caps thinking + visible response *combined* — a budget sized
// only for the visible answer risks the model spending most of it on
// reasoning about the guardrails above and getting cut off mid-response
// (a real, documented failure mode on this model, not a hypothetical).
// 4096 leaves real headroom for both while staying well under the ~16K
// threshold where the SDK requires streaming to avoid HTTP timeouts, so
// this can stay a plain non-streaming call.
export async function askFinancialCoach(
  ctx: FinancialContext,
  history: ChatTurn[],
  question: string
): Promise<string> {
  const client = getClient();
  const contextBlock = buildContextBlock(ctx);

  const response = await client.beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 4096,
    system: [{ type: "text", text: COACH_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [
      ...history.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: "user" as const, content: `${contextBlock}\n\nTheir question: ${question}` },
    ],
  });

  if (response.stop_reason === "refusal") {
    // Both the requested model and its fallback declined — see
    // shared/model-migration.md's refusal semantics. Surfaced to the
    // route as a thrown error so it can return an honest, non-alarming
    // message rather than silently returning an empty reply.
    throw new Error("AI_REFUSAL");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}

// AI-suggested budget amounts (PRD §12.6, SE-82's last open piece) —
// added 2026-11, same "build it now so there's something real the moment
// ANTHROPIC_API_KEY is set" posture the founder already authorized for
// AI Coach above, applied to a new feature rather than re-litigated.
// Gated behind isPremium() at the route, not here — this file has no
// entitlements concept of its own (see api/ai/budget-suggestions/route.ts).
// A judgment call worth flagging: PRD §13's Free/Premium matrix doesn't
// name this feature by row, but its own rationale sentence is unambiguous
// ("every cost-bearing feature... LLM inference... sits behind the
// paywall") — the matrix's omission reads as the table only having rows
// for the three AI features named elsewhere in the PRD, not a deliberate
// free-tier carve-out for this one.
const BUDGET_SUGGESTION_SYSTEM_PROMPT = `You are the Noivos Budget Assistant, helping a couple set realistic planned amounts for their budget categories.

Non-negotiable rules, from this product's own AI Philosophy:
- You are a teammate, never an authority. A suggested amount is a starting point for a conversation between the two partners, never a mandate — never say "you must plan $X," only describe what the real numbers show.
- Never shame. No rationale should be readable as "you're overspending" or "you're bad with money" — describe the pattern neutrally (e.g. "this matches your recent average" or "this runs a bit above your last few months" are fine; "you're spending too much here" is not).
- You only ever see the numbers explicitly given to you below. Never invent a spending history, category, or dollar figure you weren't told about.
- Every suggested amount must be a round, sensible whole-dollar figure (e.g. $150, not $148.73) — real people plan budgets in round numbers, not cents-precision averages.

For each category given below, suggest a planned amount for next month based on its trailing spending history, with a one-sentence, neutral rationale. If a category's current planned amount already closely matches its own history, it's fine to suggest keeping it the same — don't invent a change just to have one.`;

// Deliberately placed in the user turn, not the system prompt — same
// "volatile per-request numbers never sit in the cached prefix" reasoning
// as buildContextBlock above.
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

// model: claude-opus-5-5, not claude-opus-5 like askFinancialCoach/
// askPurchaseAdvisor above — this is the current default Opus-tier model
// as of this feature's build, not a deliberate choice to diverge from the
// other two; migrating them to match is a separate, not-yet-requested
// task. effort "low" (vs. those two's "medium"): this is a single bounded
// extraction over a small, already-summarized data table with one fixed
// output shape, not open conversational reasoning — closer to
// classification/extraction than chat, where lower effort holds quality
// at meaningfully less cost. Uses client.beta.messages.parse() + a Zod
// output schema (output_config.format) instead of a forced tool_choice —
// forced tool_choice {type: "tool"/"any"} returns a 400 on this model, and
// structured outputs is the current, recommended replacement for exactly
// this "I need guaranteed-parseable JSON back" case.
export async function suggestBudgetAmounts(categories: CategorySpendHistoryFact[]): Promise<BudgetSuggestion[]> {
  const client = getClient();
  const contextBlock = buildBudgetSuggestionContextBlock(categories);

  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 4096,
    system: [{ type: "text", text: BUDGET_SUGGESTION_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "low", format: betaZodOutputFormat(BudgetSuggestionOutputSchema) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [{ role: "user", content: contextBlock }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("AI_REFUSAL");
  }

  // parsed_output is null if parsing genuinely failed — same "honest
  // absence over a fabricated result" posture as every other no-data case
  // in this app, rather than throwing and surfacing a raw 500 for what's
  // ultimately an optional, non-critical suggestion feature.
  return response.parsed_output?.suggestions ?? [];
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
// duplicating that language with room to drift — kept here verbatim
// anyway (not composed from COACH_SYSTEM_PROMPT at runtime) since the two
// prompts are cached independently per Claude's prompt-caching model, and
// string-concatenating them at request time would mean neither ever hits
// a stable, reusable cache prefix.
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

// Same model/effort/fallback/max_tokens reasoning as askFinancialCoach
// above — this is still a single grounded analysis, not multi-step
// agentic work, and still needs headroom for adaptive thinking +
// visible response to share max_tokens without truncating. The one real
// difference: the user turn's content is an array (image block + text
// block) instead of a plain string whenever a photo was attached — Claude
// Opus 5's vision input is what makes receipt/price-tag/photo scanning
// possible directly, no separate OCR service (AI Architecture §/Linear
// SE-69's own framing).
export async function askPurchaseAdvisor(
  ctx: FinancialContext,
  history: ChatTurn[],
  message: string,
  image?: PurchaseImage
): Promise<string> {
  const client = getClient();
  const contextBlock = buildContextBlock(ctx);
  const textContent = `${contextBlock}\n\nThe purchase to evaluate: ${message || "(see attached photo)"}`;

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: PurchaseImage["mediaType"]; data: string } }
  > = [];
  if (image) {
    userContent.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } });
  }
  userContent.push({ type: "text", text: textContent });

  const response = await client.beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 4096,
    system: [{ type: "text", text: PURCHASE_ADVISOR_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [
      ...history.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: "user" as const, content: userContent },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("AI_REFUSAL");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}
