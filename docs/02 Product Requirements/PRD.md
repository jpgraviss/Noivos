# Noivos — Product Requirements Document (PRD)

**Status:** Draft v1.0 — awaiting founder approval
**Owner:** Product/CTO function
**Last updated:** 2026-08-02
**Source of truth precedence:** This PRD is downstream of `PROJECT_MEMORY.md`. If anything here conflicts with that file, `PROJECT_MEMORY.md` wins until the founder reconciles them.

> This document assumes a professional engineering team will build directly from it. Where a decision could not be made without founder input, it is marked **[ASSUMPTION]** or **[OPEN QUESTION]** rather than silently resolved — see §21 and §22.

---

## 1. Executive Summary

Noivos is an AI-powered financial companion for couples, built first for engaged couples planning a wedding and designed to grow with them into marriage, home ownership, and family life. Unlike budgeting apps (YNAB, EveryDollar) or couples-finance trackers (Honeydue, Zeta), Noivos is not primarily a ledger — it is a relationship product that uses shared financial visibility, structured conversation (Weekly Money Meetings), and a non-judgmental AI teammate to help two people make financial decisions together, confidently and without shame.

The wedge into the market is **Wedding Mode**: every engaged couple already has an acute, time-boxed, high-stakes shared financial project (the wedding) that forces exactly the conversations Noivos is built to support — budget, vendors, family contributions, shared goals. When the wedding ends, the couple "Graduates" out of Wedding Mode into ongoing married financial life, and Noivos becomes their long-term shared financial home instead of a single-purpose planning tool that gets deleted after the big day.

Monetization is a straightforward freemium model: free tier covers manual expense tracking, budgeting, and goals (cheap to run, no third-party data costs); Premium ($100/year, billed per Partnership) unlocks Plaid bank connections, the AI Purchase Advisor, AI Financial Coach, and OCR/receipt scanning.

## 2. Vision

To become the financial operating system that couples grow up with — from their first shared budget as an engaged couple, through buying a home, raising a family, and building long-term wealth together — known for making money conversations easier, not harder.

## 3. Mission

Help couples make smarter financial decisions together by replacing financial confusion, stress, and secrecy with clarity, conversation, and confidence, without judgment.

## 4. Product Principles

1. **Relationship first, finance second.** Every feature is evaluated by whether it improves a real conversation between two people, not just a number on a dashboard.
2. **Clarity over completeness.** A couple that understands 80% of their finances and talks about it beats a couple with a 100%-accurate ledger neither of them opens.
3. **Informative, never prescriptive.** The AI presents impact and tradeoffs; it does not issue verdicts. It never says "don't buy this." It says "here's what this means for your goals — what do you two think?"
4. **No shame, ever.** No red numbers designed to scare, no guilt-based nudges, no leaderboard that makes someone feel behind. Encouragement, not judgment.
5. **Privacy is structural, not a policy.** No user should be able to see their partner's personal, unshared financial data by product design — not just by promise. No two users can ever compare balances, income, or net worth, even opt-in.
6. **Two-sided by design.** Every core flow assumes both partners are present in spirit even if only one is active in the app at a given moment. Solo usage should still deliver value, but the product's soul is joint usage.
7. **Built for a real, messy life.** Relationships end. People reconnect with someone new. Wedding plans change. The data model and UX must gracefully absorb real life rather than assuming a straight line from "single" to "married forever."
8. **Documentation before implementation.** Per `PROJECT_MEMORY.md` Rule 1 — no major feature ships without an approved spec.

## 5. Customer Personas

### Persona 1 — "The Planners" (Primary)
**Ava, 27, and Marcus, 29.** Engaged 4 months, wedding in 14 months. Both work full-time, combined income upper-middle-class, each has their own bank accounts and credit cards, no joint account yet. Planning a $35K wedding with some help from both sets of parents. They've never had a real conversation about combining finances after the wedding — it's the elephant in the room. Ava manages the wedding spreadsheet; Marcus doesn't open it. They fight, occasionally, about wedding costs creeping up.

**Needs:** A shared, low-friction view of wedding spending both people actually look at. A natural on-ramp to talking about "what happens with money after we're married" without it being a Big Scary Conversation.

**Success looks like:** Both partners open the app weekly. Wedding budget stays visible to both. They "Graduate" on schedule and keep using the app afterward.

### Persona 2 — "The Newlyweds" (Primary, post-wedding)
**Priya, 30, and Sam, 31.** Married 6 months. Combined finances partially — joint checking for shared bills, kept individual savings and credit cards separate. Starting to think about buying a home in 2-3 years. Want to know "are we actually on track" without spending hours in a spreadsheet.

**Needs:** Ongoing shared goals (house down payment), recurring shared budget, an AI they can ask "can we afford X" without judgment, structured but lightweight money conversations (Weekly Money Meeting) that don't turn into arguments.

**Success looks like:** A running house down-payment goal both check. AI Purchase Advisor used before big discretionary purchases (a truck, a vacation). Weekly Money Meeting completed at least 2x/month.

### Persona 3 — "The Independent Partner" (Secondary, adoption risk)
**One partner in either persona above who is financially private, avoidant, or skeptical of a finance app.** Doesn't want their spending "watched." May resist linking accounts. This persona is not a separate target customer so much as **the person Noivos must convert inside every couple** — the product will fail if it only ever gets one partner's real buy-in.

**Needs:** Full control over what's shared vs. personal. Never feel surveilled. See value before being asked to link a bank account.

### Persona 4 — "Building a Life" (Secondary)
Couples 1-5 years into marriage, saving for a home, starting a family, or paying down debt together, no longer wedding-focused. They are Noivos users who graduated from Wedding Mode, or who never used it — they signed up later, directly into the core product.

### Persona 5 — "Solo Pre-Partner" (Secondary, future growth lever)
Individuals not yet partnered who want good financial habits before combining finances with someone. Not a V1 focus, but the product should not actively break for a single user (see §7 Relationship Lifecycle — a Noivos account is valid with zero, one, or a former Partnership).

## 6. User Problems

- Couples avoid money conversations because they're emotionally loaded, not because they lack spreadsheets.
- Budgeting apps optimize for individual discipline (categorize, track, don't overspend) — they were not designed for two people with different money habits, different account structures, and an actual relationship at stake.
- Wedding planning tools are single-purpose and get abandoned the day after the wedding, taking all the couple's financial-conversation momentum with them.
- Existing "couples finance" apps (Honeydue, Zeta) are largely bill-splitting and account-visibility tools — useful, but shallow. They don't help a couple decide anything; they just show a number.
- Big discretionary purchases (a truck, a vacation, a ring for someone else's wedding) get decided emotionally or unilaterally, with no easy way to see real impact on shared goals in the moment of the decision — usually standing in a dealership or scrolling a listing, not later at a laptop.
- Couples don't have a habit of regularly checking in on shared finances; when they do, it's reactive (a bounced payment, a fight) rather than a normal, healthy rhythm.

## 7. Market Opportunity

- ~2 million weddings occur in the US annually; the average U.S. wedding cost is well into five figures, and nearly all involve two people (and often their families) coordinating spending under time pressure — a naturally acute, high-engagement financial moment.
- Personal finance app category is large and growing (Mint's shutdown displaced millions of users; Monarch, Copilot, Rocket Money, YNAB are all growing individual/household budgeting products), but none are built couples-first from the ground up — they retrofit "shared" as a feature of an individually-designed product.
- Direct couples-finance competitors (Honeydue, Zeta) validate demand for shared visibility but are narrower in scope (largely bill tracking / account aggregation) and have not evolved into an AI-native, conversation-centered product.
- The engaged-couple wedge is a **defensible, differentiated acquisition channel**: wedding vendors, registries, and planning tools (Zola, The Knot, registries) are natural partnership/co-marketing channels no general budgeting app can credibly enter.
- **[ASSUMPTION]** Initial addressable market is US-only, English-only, USD-only — see Open Question §22.1.

## 8. Product Positioning

**Noivos is not a budgeting app. It's the financial relationship app.**

| | Noivos | YNAB / EveryDollar | Honeydue / Zeta | Monarch / Copilot |
|---|---|---|---|---|
| Built for | Couples, relationship-first | Individuals | Couples, visibility-first | Households, ledger-first |
| Core loop | Shared goals + guided conversation | Zero-based budget discipline | Bill/account visibility | Net worth + budget tracking |
| AI role | Conversational teammate, purchase impact | None / limited | None | Insights/categorization |
| Wedding support | Native, first-class (Wedding Mode) | None | None | None |
| Tone | Playful, encouraging, human | Utilitarian, disciplined | Neutral/utility | Data-forward |

Positioning statement: *For engaged and newly married couples who want to build their financial life together without giving up independence or having the same fight twice, Noivos is the AI-powered financial companion that turns shared money data into better conversations — unlike budgeting apps built for individuals or bill-splitting apps that just show a number, Noivos helps you decide.*

## 9. Business Model

- **Free tier:** manual expense tracking, budgets, goals, basic insights, full relationship workspace, Wedding Mode core features. Deliberately excludes Plaid and AI so the free tier carries near-zero marginal cost per user (no per-connection Plaid fees, no LLM inference cost) while still delivering the core "shared workspace" value proposition that drives both-partners activation.
- **Premium tier:** $100/year, or a monthly-equivalent price ~15% higher than the annualized monthly rate (i.e., monthly price × 12 ≈ $118, consistent with the requested ~15% annual discount). **[OPEN QUESTION §22.2]** Billed per Partnership (one subscription unlocks Premium for both partners' personal and shared spaces) — this is the working assumption because the product's value is explicitly two-sided, and charging both partners separately for one shared experience undercuts the "we're in this together" positioning.
- Premium unlocks: Plaid bank connections (checking/savings/credit/loans, automatic sync), AI Purchase Advisor, AI Financial Coach, advanced AI Insights, OCR/receipt/camera scanning, unlimited smart features.
- **Trial strategy [OPEN — not specified by founder]:** recommend a time-boxed free trial of Premium (e.g., 14 days) gated behind partner-invite acceptance, so the couple experiences Plaid + AI together before paying. To be confirmed with the founder before Pricing/Paywall UX is finalized.
- **Billing mechanics risk:** see §18 Risks — Stripe-only billing likely conflicts with Apple/Google in-app purchase requirements for a native mobile subscription. This PRD assumes the eventual architecture uses Apple IAP + Google Play Billing for mobile purchases and Stripe for web/marketing-site checkout, reconciled via a shared entitlement record in Postgres — to be finalized in Backend Architecture (Phase 6) and confirmed with the founder first.

## 10. Relationship Lifecycle (Product Model)

Every Noivos user has exactly one personal account. A personal account can be in one of these states with respect to partnership:

1. **Unpartnered** — full personal-account functionality (expense tracking, personal budgets, personal goals). No shared workspace exists. This is a valid, supported, permanent state — not just a pre-onboarding limbo.
2. **Invited** — a partner has sent an invite (via email, phone number, or in-app share link) that has not yet been accepted.
3. **Partnered (Active)** — two accounts are joined by a Partnership entity. A shared workspace exists: shared goals, shared budgets, shared expenses, shared insights, shared activity feed, Weekly Money Meetings, Wedding Mode (if applicable). Each user still fully retains their personal space, and controls what crosses from personal to shared (see §11).
4. **Disconnected** — either partner may end the Partnership at any time (unilateral action, does not require the other partner's approval — see edge cases below). On disconnect:
   - The shared workspace is **archived**, not deleted, for the account that owns it, so a user does not lose their financial history.
   - Neither party retains *live* access to the other's personal data (they never had it).
   - Shared-workspace data is **not visible to any future new Partnership** either partner forms. It is scoped permanently to the ended Partnership.
   - Both users are notified that the Partnership ended (with a tone-appropriate, non-alarming notification — see §16).
5. **Re-Partnered** — a user may form a new Partnership with a different person at any time. Their personal account, personal history, and personal goals carry forward. Prior shared-workspace data from a previous Partnership is never exposed to the new partner, directly or through aggregate insights (e.g., "your spending trend" must not silently include data from a prior Partnership's shared budget in a way the new partner could see).

**Edge cases (must be resolved in Database Architecture, flagged here so they aren't lost):**
- Unilateral disconnect: what does the *other* partner see immediately after? (Recommendation: they retain read-only access to the archived shared workspace as it stood at disconnect, but it stops updating — this avoids one partner unilaterally erasing shared history the other partner also has a stake in, while still fully separating going-forward data.) **Needs founder confirmation.**
- Shared debts/goals mid-disconnect (e.g., a joint "House Down Payment" goal with contributions from both) — contribution history should remain individually attributable and visible to each contributor in their own archived view.
- What happens to an active Premium subscription on disconnect? Whoever is the subscription's payer keeps Premium on their personal account going forward (no refund for the unused period, standard SaaS practice) — **[ASSUMPTION, confirm with founder]**.
- A user blocks or is blocked by a former partner from re-inviting them.

## 11. Personal vs. Shared Finances (Data Model, Product-Level)

- **Personal expense / account:** visible only to its owner unless explicitly marked shared.
- **Shared expense / account:** visible to both partners in the Partnership.
- A user can share an *account* (e.g., "our joint checking is visible to both of us") without sharing every *transaction category* detail, and vice versa — sharing controls should be granular, not all-or-nothing, so a private/individual partner (Persona 3) never feels forced into full transparency to get value from the shared workspace.
- Shared budgets and shared goals are jointly editable by default; the product should make it obvious (via an activity feed, not silent mutation) when one partner changes a shared budget or goal so it never feels like a change happened "behind their back."

## 12. Functional Requirements

Each feature area below includes purpose, key requirements, and edge cases. Full data/API impact is deferred to the Database and API Architecture documents (Phases 5 and 7); UI/interaction detail is deferred to the UX Blueprint (Phase 3) and Design System (Phase 4).

### 12.1 Authentication
- Sign up / sign in via Email (magic link or password + verification), Apple Sign-In, Google Sign-In.
- Account recovery flow for lost access (email-based at minimum).
- **Edge cases:** user signs in with Apple, later tries Google with the same email — must be handled as account linking or a clear "this email already exists" flow, not silent duplicate accounts. Partner invite sent to an email that later signs up via a different auth method than expected.

### 12.2 Relationship / Partnership Management
- Create a Partnership; invite a partner via email, SMS, or shareable link.
- Accept/decline an invite. Only one active Partnership per user at a time.
- Disconnect a Partnership (see §10 for lifecycle and edge cases).
- View Partnership history (past Partnerships, archived, non-identifying to any new partner).
- **Edge cases:** invite sent to someone who already has an active Partnership with a third person; invite expiration; revoking a pending invite.

### 12.3 Personal + Shared Finances
- Toggle any account, budget category, or goal between personal and shared.
- Shared activity feed showing (in plain language) what changed in the shared workspace and by whom — e.g., "Marcus added a $200 transaction to Shared Groceries."
- **Edge cases:** partner removes an account from shared visibility after the other partner has already built a budget around it — the other partner should be clearly notified, not silently lose data they were relying on.

### 12.4 Plaid Integration (Premium)
- Connect multiple financial institutions; support checking, savings, credit cards, loans.
- Manual account entry as a fallback for institutions Plaid doesn't support, or for privacy-conscious users unwilling to link an account.
- Automatic daily transaction sync; manual refresh option.
- Account-level sharing control (§11) applies at connection time and after.
- **Edge cases:** Plaid connection failure / re-auth required (bank changed login, MFA expired) — must degrade gracefully with a clear "reconnect" prompt, not silent data staleness. Institution not supported by Plaid — direct to manual entry. A shared account is only visible to the partner who did *not* connect it once the connecting partner explicitly marks it shared — never automatically.

### 12.5 Expense Tracking
- Categories (customizable, with sensible defaults), notes, photo attachments, manual transaction entry, recurring expense detection/management.
- Every expense is either personal or shared (§11).
- **Edge cases:** recurring expense whose amount changes (subscription price increase) should surface as an insight (§12.9), not just silently update.

### 12.6 Budgets
- Zero-based budgeting model (EveryDollar-inspired): every dollar of planned income assigned a job.
- Both personal and shared budgets, monthly planning cycle, rollover of unspent/overspent amounts (configurable), AI-suggested budget categories/amounts based on historical spending.
- **Edge cases:** shared budget where each partner contributes a different, unequal amount of income — the product must not assume 50/50 splits (see also Goals below); a couple with irregular income (freelance, commission) needs a budgeting mode more forgiving than strict zero-based month-to-month.

### 12.7 Goals
- Types: Wedding, House, Vacation, Emergency Fund, Vehicle, Baby, Debt Payoff, Retirement, Custom.
- Shared or personal; progress tracking; contribution history attributable to each contributor even within a shared goal (needed for the disconnect edge case in §10).
- Goals are the emotional center of the product — progress visuals, milestones, and celebratory moments (see Brand moodboard "Celebrate Wins" illustration direction in `PROJECT_MEMORY.md` §5) should be first-class, not an afterthought bolted onto a progress bar.
- **Edge cases:** unequal contribution goals (one partner contributes 70%, the other 30%) must be trackable and visible without implying judgment about the split; a goal whose target changes (wedding budget increases) needs a clear, non-alarming re-baseline flow.

### 12.8 Wedding Mode
- Activated at Partnership creation or opted into later; contains: wedding budget, vendor tracker (contracts, deposits, balances due, payment due dates), payment schedule, family contribution tracking (which family member is contributing how much, toward what), guest count estimates (which drive per-head cost lines), checklist, timeline, countdown.
- **"Graduate" action:** an explicit, celebratory user action (not an automatic date-based trigger) that archives Wedding Mode as a permanent keepsake (a couple should be able to look back at "our wedding budget" later) and transitions the Partnership into standard shared financial planning — Wedding-specific UI surfaces (countdown, vendor tracker) disappear from the primary navigation but remain accessible as an archived record.
- **Edge cases:** postponed or cancelled weddings — Graduate must not be the only way out of Wedding Mode; a couple needs a non-celebratory path to pause/exit Wedding Mode gracefully. Family contribution tracking touches a third party's money (a parent's contribution) without that parent having an account — must remain a simple ledger note, not imply the family member has any product access or data rights.

### 12.9 AI Purchase Advisor (Premium)
- Input modes: type, speak, take a picture, scan a receipt, scan a price tag, upload an image.
- Analyzes: cash flow, current budgets, goals, debt, upcoming bills, savings, spending trends, opportunity cost.
- Output: financial impact, goal impact, a recommendation framed as informational context (never a directive), discussion prompts for the couple, alternative suggestions.
- **Guardrail (see AI Philosophy §14):** never states what the couple "must" do; always frames output to prompt a conversation between partners, and is shareable directly into the shared activity feed as a conversation-starter.
- **Edge cases:** purchase scanned by only one partner — the output must be built to be shared/shown to the other partner, not simply consumed solo and dropped; ambiguous receipt/price-tag OCR results need a clear low-confidence fallback (ask the user to confirm amount/merchant) rather than silently guessing.

### 12.10 AI Financial Coach (Premium)
- Conversational Q&A: "Can we afford this?", "What happens if we buy a truck?", "How much should we save?", "Can we go on vacation?", "When will we finish paying off debt?", "Should we refinance?", "How much house can we afford?"
- **Regulatory guardrail [OPEN QUESTION §22.5]:** answers must stay educational/scenario-based (impact on cash flow, goals, and timelines) and avoid specific product recommendations (naming a lender, a specific investment) or fiduciary-style directives. Legal review recommended before public launch of this feature specifically.

### 12.11 AI Insights
- Automatic, periodic observations: rising dining spend, new subscription detected, emergency fund ahead of schedule, savings streak, budget category drift, large/unusual purchase, potential financial risk, opportunity (e.g., "you could hit your goal 2 months early at your current pace").
- **Tone requirement:** insights are framed as observations and options, never alarms. No red/warning color language implying failure (ties to Brand Guidelines, Phase 2).
- **Edge cases:** an insight that would only make sense to reveal to one partner (e.g., a personal account's spending) must never leak into the shared insight feed.

### 12.12 Weekly Money Meetings
- Auto-generated agenda: upcoming bills, goal progress, recent notable purchases, suggested discussion topics, action items from the prior meeting, and a summary once "completed."
- Meeting is a lightweight, structured ritual, not a formal scheduled video call requirement — the couple can "have" the meeting together in person and just use the app as the agenda/notes tool, or review it async.
- **Edge cases:** a meeting agenda item touching a sensitive topic (e.g., large unexplained spending) should be phrased as a neutral discussion prompt, not an accusation.

### 12.13 Community
- Explicitly prohibited: any income, balance, net worth, spending, investment, or debt comparison between users, ever, opt-in or not.
- Optionally shareable: goals, progress percentages, milestones, achievements, encouragement, challenges.
- Challenges: First Emergency Fund, Wedding Countdown, House Down Payment, Debt Free, Vacation Savings, No-Spend Weekend, Date Night Savings.
- **Edge cases:** a shared "progress %" could still leak sensitive magnitude information in some cases (e.g., "100% of $500,000 house goal" reveals more than "100%" alone) — sharing UI should default to hiding underlying dollar amounts and show only relative progress, with the dollar amount never shown to other community members regardless of settings.

### 12.14 Notifications
- Partner joined, goal reached, bill due, purchase advisor update, savings milestone, weekly meeting reminder, challenge completed.
- **Tone requirement:** every notification copy should read as encouraging or neutral-informative, never as a warning or a nag (ties to Brand voice, Phase 2).
- **Edge case:** notification content must never itself leak personal-account information to a partner via a shared-workspace-triggered push (e.g., a "goal reached" notification for a *personal* goal must not push to the partner's device).

## 13. Free vs. Premium Feature Matrix

| Feature | Free | Premium |
|---|---|---|
| Personal + shared expense tracking (manual) | ✅ | ✅ |
| Budgets (personal + shared) | ✅ | ✅ |
| Goals (personal + shared) | ✅ | ✅ |
| Relationship workspace | ✅ | ✅ |
| Wedding Mode | ✅ | ✅ |
| Basic AI insights (rule-based observations) | ✅ | ✅ |
| Weekly Money Meetings | ✅ | ✅ |
| Community + Challenges | ✅ | ✅ |
| Plaid bank connections / auto-sync | ❌ | ✅ |
| AI Purchase Advisor | ❌ | ✅ |
| AI Financial Coach | ❌ | ✅ |
| Advanced AI Insights (predictive, trend-based) | ❌ | ✅ |
| OCR / receipt / price-tag / camera scanning | ❌ | ✅ |

**Rationale:** the free tier is generous enough to prove the core "shared workspace" value proposition (which is what drives both-partner activation and word of mouth), while every cost-bearing feature (Plaid connection fees, LLM inference) sits behind the paywall.

## 14. AI Philosophy

- The AI is a **teammate**, never an authority. It never says "you shouldn't," "you must," or issues verdicts. It presents financial impact, goal impact, and alternatives, and prompts a conversation between the two partners.
- The AI's outputs are designed to be **shared and discussed**, not just consumed solo — every AI response should feel natural to show or read to a partner.
- The AI never shames. No response should be able to be read as "you're bad with money."
- The AI must not overstep into regulated financial, legal, tax, or lending advice. It reasons about the user's own stated goals, budgets, and cash flow, and describes tradeoffs and scenarios — it does not recommend specific financial products, lenders, or investment vehicles, and does not issue fiduciary-style directives. **[OPEN QUESTION §22.5 — needs legal review before public launch.]**
- The AI must respect the personal/shared data boundary absolutely: it can never use one partner's private data to answer a question posed in a shared context, and can never reveal in a shared answer information the asking partner didn't have permission to see.
- Multi-modal input (text, voice, photo, receipt/price-tag scan) all funnel into the same underlying reasoning — the input mode is a convenience, not a different feature.

## 15. Privacy Philosophy

- Financial privacy is structural: personal data is never visible to a partner unless the owning user explicitly shares it, and this is enforced at the data-access layer, not just hidden in the UI (a real architectural requirement for Database/API design, not just a promise).
- No user, anywhere in the product (including Community), can ever see another user's income, account balances, net worth, individual transactions, investments, or debt levels unless that specific user explicitly, granularly shared that specific item with that specific person (i.e., their partner).
- Community sharing is opt-in, per-item, and restricted to non-magnitude signals (goal existence, relative progress, milestones) by default — see §12.13 edge case on progress-percentage leakage.
- On Partnership disconnect, data separates cleanly (§10) — a former partner never retains live access to the other's ongoing financial life.
- All financial data (Plaid-derived especially) is treated as sensitive-by-default: encrypted at rest and in transit, least-privilege internal access, and handled with bank-grade operational discipline even though Noivos is not itself a bank or a money transmitter. Formal compliance posture (SOC 2 timeline, GLBA-equivalent practices, data processing agreements with Plaid/OpenAI/Stripe) is deferred to the Security Architecture document (Phase 9) but is a hard prerequisite for public launch with real bank connections.

## 16. Community Philosophy

Community exists to create **accountability, not competition.** No leaderboards ranking users against each other by any financial magnitude. Challenges are collaborative or personal-best framed (e.g., "No-Spend Weekend" is a personal/couple challenge, not a ranked competition against other users). Encouragement mechanics (cheering on another user/couple's milestone) are supported; comparison mechanics are not, and should be treated as a hard product constraint any future feature must respect.

## 17. Notifications (Summary)

See §12.14 for full requirements. Categories: relationship (partner joined/invited), goals (milestone/goal reached), bills (due soon/overdue), AI (purchase advisor update, insight surfaced), savings (streak, milestone), ritual (weekly meeting reminder), community (challenge completed). All copy must pass the "would this feel like a nag or a threat" test before shipping — deferred to Brand/Voice guidelines (Phase 2) for exact copy standards.

## 18. Success Metrics

**Activation**
- % of new sign-ups who create or accept a Partnership within 7 days.
- % of Partnerships where *both* partners complete onboarding (link at least one account or add expenses) within 14 days — the key "two-sided activation" metric flagged as a top risk in `PROJECT_MEMORY.md` §9.

**Engagement**
- Weekly active Partnerships (both partners active in a rolling 7-day window) as the primary north-star metric — chosen over generic MAU/WAU because it directly measures the core "relationship-first" premise.
- Weekly Money Meeting completion rate.
- AI Purchase Advisor / Financial Coach sessions per active Premium Partnership per month.

**Retention**
- D30 / D90 / D180 Partnership retention (both partners still active).
- Wedding Mode → Graduate conversion rate, and post-Graduate 90-day retention (the key test of whether Noivos survives past the wedding wedge).

**Monetization**
- Free-to-Premium conversion rate, overall and specifically at the point of Wedding Mode Graduate (a natural upsell moment: "now that the wedding's over, let's connect your accounts").
- Annual vs. monthly billing mix; net revenue retention.

**Product Health / Safety**
- Rate of Partnership disconnects (directional signal, not purely negative — but a spike warrants investigation).
- Support tickets related to privacy/visibility confusion (a leading indicator of a structural privacy bug, given §15's zero-tolerance bar).

## 19. Future Roadmap (Directional, Not Committed)

Near-term (post-V1, still couples-only):
- Deeper debt payoff planning (avalanche/snowball guided plans).
- Home-buying guided journey (beyond "how much house can we afford" Q&A) — mortgage readiness tracking.
- Family contribution accounts for Wedding Mode evolving into a lightweight way for parents/family to contribute to a goal without a full Noivos account.

Mid-term:
- Expansion beyond English/USD if market validates.
- Marketplace/referral integrations (see Future Ideas in `PROJECT_MEMORY.md` §11) — explicitly not committed, flagged as intentionally postponed.

Long-term/aspirational:
- Multi-generational or family-plan accounts.
- Becoming the system of record couples return to for every major shared financial decision across a lifetime (home, kids, retirement).

## 20. Risks

See `PROJECT_MEMORY.md` §9 (Known Risks) for the canonical, living list. Summarized here for PRD context:
1. Mobile app store billing compliance (Stripe vs. Apple IAP/Google Play Billing).
2. Regulatory exposure from AI financial/lending guidance.
3. Security/compliance bar required to safely hold Plaid-derived banking data.
4. Relationship-data handling on breakup (privacy, retention, deletion).
5. Two-sided activation — the product fails if only one partner ever engages.
6. Emotional-safety risk — a poorly designed insight or notification could cause real relationship harm, a materially higher bar than typical fintech UX risk.

## 21. Assumptions

The following working assumptions were made to keep this PRD complete and internally consistent. None are locked — see §22 for the corresponding open questions requiring founder sign-off.

- Read-only financial aggregation only; no custody or money movement in V1.
- Premium billed per Partnership, not per individual.
- US-only, USD-only, English-only at launch.
- Shared workspace entity referred to internally as "Partnership."
- AI Financial Coach stays educational/scenario-based, never issuing specific product recommendations or directive advice.
- On disconnect, the non-owning partner retains read-only (frozen) access to the shared workspace as it stood at disconnect; going-forward data fully separates.
- Premium subscription, on disconnect, stays with whichever partner was the payer; no proration/refund.

## 22. Open Questions

Mirrors `PROJECT_MEMORY.md` §8 — resolve there as the canonical list; repeated here for PRD-reader convenience.

1. Confirm money-movement scope is truly read-only aggregation for V1 (no custody, no transfers, no Noivos-branded account/card).
2. Confirm Premium is billed per Partnership, not per individual.
3. Decide mobile billing architecture (Apple IAP / Google Play Billing vs. Stripe-only) before Backend Architecture is written — current plan (Stripe-only) is very likely non-compliant with app store policy for a native app.
4. Confirm launch geography/currency/language scope.
5. Confirm AI Financial Coach's regulatory posture and whether legal review is required before that feature ships publicly.
6. Confirm "Partnership" as the internal entity name before Database Architecture is written.
7. Confirm company/legal entity status and trademark/domain screening timeline for "Noivos" (not PRD-blocking, but blocking before Marketing Website phase and public launch).
8. Confirm whether the supplied brand moodboard originates from an existing Canva project the team should continue building in Canva for Phase 2.
9. Confirm free-trial strategy for Premium (recommended: 14-day trial gated behind partner-invite acceptance) — not specified in the founder brief.
10. Confirm the disconnect data-visibility model in §10 (frozen read-only access for the non-owning partner) — this is a meaningful product/legal decision, not just an engineering detail.

---

*Next step per the Documentation Roadmap: await founder review and approval of this PRD. Once approved, record the approval and any amendments in `PROJECT_MEMORY.md` §4/§12, then proceed to Phase 2 — Brand Guidelines, which should formally reconcile the supplied moodboard (`docs/assets/brand/brand-moodboard-v1.png`) into a locked brand system.*
