# Noivos — AI Architecture

**Status:** Draft v1.0 — awaiting founder sign-off
**Phase:** 8 of the (re-sequenced) Documentation Roadmap
**Last updated:** 2026-08-02
**Source of truth precedence:** Downstream of the PRD's AI Philosophy (§14) and AI Purchase Advisor/Coach specs (§12.9–12.10), Brand Guidelines' AI Personality (§11), and Backend Architecture's AI service boundary (§5) — the rule that context assembly must go through the same RLS-respecting path as everything else. This document defines what happens inside `/api/ai/coach` and `/api/ai/purchase-advisor`.

> Moving fast per the founder's direction — model/provider choices below are reasonable defaults, not asked one-by-one. Flagged in §8 where a call is genuinely consequential enough to want a founder look before it ships.

---

## 1. Model & Provider

OpenAI Responses API (already locked in `PROJECT_MEMORY.md` §6), using a current flagship reasoning-and-vision model for both AI Coach and Purchase Advisor. **The exact model string is deliberately not pinned in this document** — model names/versions age fast, and hardcoding one here would make this doc stale within months; whoever implements should pin the current best-fit model in configuration, and revisit periodically (a lightweight recurring task, not a redesign). Two use cases, one provider:

- **AI Financial Coach:** text conversation, streamed response.
- **AI Purchase Advisor:** multi-modal input (text, voice transcript, photo, receipt/price-tag scan) via the same model's vision + text capabilities — no separate OCR service needed, simplifying the pipeline.

**Speech-to-text** for voice input uses OpenAI's audio transcription (Whisper-class) ahead of the same text pipeline — voice is a capture mode, not a separate feature (PRD §12.9).

## 2. Context Assembly — the non-negotiable rule

Restating and making concrete the rule from Backend Architecture §5: every piece of context fed to the model (budgets, goals, cash flow, debt, upcoming bills, spending trends) is fetched via **tool/function calls that run through the same user-scoped, RLS-respecting Supabase client as the rest of the app** — never a bulk, service-role "give the AI everything" query. Concretely, the model is given function-calling tools rather than a pre-stuffed context blob:

- `get_budget_summary(scope)`
- `get_goal_progress(scope)`
- `get_upcoming_bills(scope)`
- `get_cash_flow_projection(scope)`
- `get_recent_transactions(scope, category?)`

`scope` is always resolved server-side from the authenticated caller's identity and active Partnership — the model cannot request "the other partner's personal data" because no tool exists that would return it; the RLS policies underneath these tools would reject it even if one did. This is a stronger guarantee than a system-prompt instruction telling the model not to overstep — it's structurally incapable of it, matching the "privacy is structural, not a policy" principle carried through every prior phase.

## 3. System Prompt — Encoding Approved Brand/Product Rules

The system prompt is where the AI Philosophy (PRD §14), AI Personality (Brand Guidelines §11), and the confirmed regulatory posture (`PROJECT_MEMORY.md` §4) become concrete instructions, not just documentation. Non-negotiable constraints baked in:

1. **Never prescriptive.** Present financial impact, goal impact, and alternatives; never a verdict ("you shouldn't," "you must"). Every Purchase Advisor response ends in a discussion prompt for the couple, not a conclusion.
2. **Never shame.** No response may be phrased in a way that implies the user is bad with money.
3. **Educational only — the confirmed regulatory guardrail.** No specific lender/product/investment recommendations, no fiduciary-style directives ("you should refinance"). Scenario/impact framing only ("refinancing at X% could free up $Y/month toward your vacation goal").
4. **Tone:** friendly, confident, conversational, encouraging — never corporate, cold, or jargon-heavy (Brand Guidelines §12).
5. **Shareability:** every response is written assuming it might be shown to the other partner (PRD §12.9) — never assume a solo, private audience even in a 1:1 conversation.

## 4. Conversation Management

- Persisted in `ai_conversations` / `ai_messages` (Database Architecture §7.1).
- **Context window management:** once a conversation's history grows past a practical token budget, older turns are summarized (a short, factual summary — not dropped silently) rather than truncated outright, so long-running coaching relationships don't lose earlier context abruptly.
- A conversation's `partnership_id` determines its scope (§2) — a personal-context question ("can *I* afford this gift for my partner") must not pull the partner's data even inside a Partnership, since PRD §11's granular sharing model means Partnership existence doesn't imply blanket visibility.

## 5. Multi-Modal Input Handling

- **Receipt/price-tag scan:** image sent directly to the model's vision input; low-confidence extractions (blurry photo, ambiguous total) trigger a clarifying question back to the user rather than silently guessing an amount — matches the PRD §12.9 edge case.
- **Voice:** transcribed (§1), then treated identically to typed text from that point on — no separate voice-specific logic downstream.

## 6. Guardrails Beyond the System Prompt

A system prompt alone is not a security boundary — it's a strong steer, not a guarantee, so:

- **Untrusted content handling:** text extracted from a scanned receipt/price-tag or transcribed from voice is treated as *data*, never as *instructions* — the prompt construction must clearly delimit "here is what the user showed/said" from "here is your instruction set," so a receipt that happened to contain adversarial text couldn't redirect the model's behavior (a lightweight but real prompt-injection defense).
- **Tool-call scoping (§2)** is the actual privacy guarantee; the system prompt's privacy instructions are a second layer, not the only one.
- **Rate limiting and cost controls** per Backend Architecture §9 — per-user limits on AI endpoint calls, given real per-token cost; a cheaper/faster model tier is a reasonable option for the higher-volume, lower-complexity AI Insights generation job (Backend Architecture §6) versus the conversational Coach/Advisor, though this is an optimization to tune post-launch, not a day-one requirement.

## 7. AI Insights Generation (batch, not conversational)

The `insights.generate` Inngest job (Backend Architecture §6) uses the same model and the same RLS-respecting tool-scoped queries, but runs unprompted/on a schedule rather than in response to a user message — producing `ai_insights` rows (PRD §12.11: spending increases, subscription detection, savings streaks, budget drift, opportunities). Tone constraints from §3 apply identically; an automated insight must read exactly as encouraging and non-alarming as a live conversational response would.

## 8. Flagged — Not Silently Decided

- **Exact model selection and version-pinning process** (§1) is left open by design — a config/ops detail, not an architectural one, but worth the founder's awareness that "which OpenAI model" is a live, ongoing choice rather than a one-time decision.
- **Legal review of the AI advice posture** (§3, item 3) remains unscheduled per `PROJECT_MEMORY.md` §9 — this document assumes the confirmed guardrails are sufficient to build against, but public launch of AI Coach/Advisor still depends on that review actually happening.
- **Prompt-injection defense (§6)** is described at the design-intent level here; a fuller adversarial-testing pass belongs in Security Architecture (Phase 9) before public launch, given how much financial data the model has tool access to.
- **Content moderation** on user input/output isn't specified in depth here — a baseline (OpenAI's moderation endpoint or equivalent) is a reasonable default for a consumer app with user-generated text/images, flagged for Security Architecture to confirm rather than assumed complete here.

---

*Next: Phase 9 — Security Architecture (baseline pass), which gives rate limiting, webhook verification, prompt-injection testing, and the still-unscheduled AI legal review a fuller look.*
