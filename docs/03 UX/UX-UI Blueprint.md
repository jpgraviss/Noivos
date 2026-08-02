# Noivos — UX/UI Blueprint

**Status:** Draft v1.0 — awaiting founder sign-off
**Phase:** 3 of the Documentation Roadmap (see `docs/README.md`)
**Last updated:** 2026-08-02
**Source of truth precedence:** Downstream of `PROJECT_MEMORY.md` and the PRD (`docs/02 Product Requirements/PRD.md`) for product behavior, and the Brand Guidelines (`docs/03 UX/Brand Guidelines.md`) for visual language. This document describes *structure and flow* — screen inventory, navigation, interaction rules — not final visual specs (colors/spacing/component anatomy), which belong to the Design System (Phase 4).

> Four structural decisions were put to the founder directly before drafting this document, since they shape nearly everything downstream: default appearance mode, primary navigation structure, partner-invite timing, and paywall placement. All four were confirmed 2026-08-02 with the recommended option in each case — see §2, §3, §5.

---

## 1. Purpose & Scope

This document defines how the product is organized and how a user moves through it: information architecture, the onboarding/activation flow, the core screen inventory per feature area (from PRD §12), and the interaction rules that keep the experience consistent with the Brand Guidelines. It does not specify pixel-level layouts, component anatomy, or a full flow diagram for every edge case — those belong to the Design System (Phase 4) and to design production work (Figma, prototypes) outside the documentation set.

## 2. Appearance Mode

**Confirmed 2026-08-02: dark mode is primary.** The default experience uses the Licorice (`#0D0D0F`) background with the full neon palette at full saturation, matching the moodboard's native energy. Light mode (Sour Cloud `#F5F5F7` background) is available as a user toggle in Settings, not the default. This resolves the open item carried from Brand Guidelines §14.

Implication for Phase 4 (Design System): every screen must be designed dark-first, with light mode treated as the derived/secondary theme — the reverse of how most products are designed (light-first, dark as an afterthought). Contrast pairs from Brand Guidelines §5.1 already account for both directions.

## 3. Information Architecture

### 3.1 Primary Navigation

**Confirmed 2026-08-02:** five bottom tabs — **Home, Budget, Goals, AI Coach, More.** The moodboard's ten nav concepts (Home, Goals, Insights, Activity, AI Coach, Plan, Budget, Savings, Milestone, More) consolidate as follows:

| Moodboard concept | Where it lives |
|---|---|
| Home | Tab: Home |
| Insights | Section within Home (AI Insights carousel, PRD §12.11) |
| Activity | Section within Home (shared activity feed, PRD §12.3) |
| Budget | Tab: Budget |
| Plan | Folded into Budget (ongoing planning) or Wedding Mode (see §3.2) depending on context |
| Goals | Tab: Goals |
| Savings | A Goal type within the Goals tab (PRD §12.7), not a separate surface |
| Milestone | A moment/celebration triggered from Goals or Home, not a separate surface |
| AI Coach | Tab: AI Coach (unifies AI Purchase Advisor + AI Financial Coach, PRD §12.9–12.10) |
| More | Tab: More (settings, Partnership management, Community/Challenges, Weekly Money Meeting detail, subscription, support) |

### 3.2 Wedding Mode's Place in the Nav — design recommendation, not a founder decision yet

Wedding Mode (PRD §12.8) is the product's primary acquisition wedge and deserves first-class prominence, but the founder-confirmed nav has no 6th tab for it. Recommendation: **while Wedding Mode is active, the Goals tab relabels and re-themes as "Wedding"** — its icon/label swap to a wedding-specific treatment, and its content becomes the vendor tracker, payment schedule, family contributions, guest estimates, checklist, timeline, and countdown, with standard (non-wedding) goals accessible via a secondary segment within that same tab. On "Graduate," the tab reverts to standard "Goals" labeling and content, and Wedding Mode's data archives as a keepsake (PRD §12.8). This keeps Wedding Mode prominent without permanently costing a tab slot post-wedding. **Flagged for founder confirmation — this was a design judgment call, not one of the four questions already asked.**

### 3.3 Money Meeting Placement — design recommendation

Weekly Money Meetings (PRD §12.12) are a recurring ritual, not a place to browse — recommend a prominent **Home card** ("Your Money Meeting is ready") as the primary entry point, with the full agenda/detail screen reachable from there or from More, rather than consuming a tab slot. **Flagged for founder confirmation.**

## 4. Personal vs. Shared Visual Model

Every account, transaction, budget category, and goal is either Personal or Shared (PRD §11), and this must be legible at a glance, not just discoverable in settings:

- A small, consistent **ownership indicator** (single-avatar glyph for Personal, two-avatar/linked glyph for Shared) appears on every card, list row, and detail header — accounts, transactions, budget categories, goals.
- Screens that mix Personal and Shared items (Home, Budget, Goals) use a lightweight **filter/segment control** ("All · Personal · Shared") rather than hard-separating into different screens, so a user isn't forced to context-switch to see their whole picture.
- Any action that *changes* an item's sharing status (making a personal account visible, or removing shared visibility) requires an explicit confirmation step and produces an activity-feed entry (PRD §12.3 edge case) — never a silent toggle.

## 5. Onboarding & Activation Flow

**Confirmed 2026-08-02:** partner-invite prompting is early but non-blocking, and the paywall is contextual (surfaces at the first Plaid- or AI-requiring action). Flow:

1. **Sign up** (Email, Apple, or Google — PRD §12.1).
2. **Solo home setup** — add a first expense or connect nothing yet; the app is immediately useful without a partner (Unpartnered state, PRD §10.1).
3. **Partner invite prompt** — surfaced right after step 2, framed as an invitation, not a requirement ("Noivos is better together — invite [partner]?"). Skippable without penalty.
4. **If skipped:** the app re-prompts at natural moments (after creating a first goal, after a week of solo use) rather than nagging repeatedly on a timer — tone must stay encouraging per Brand Guidelines §12, never guilt-driven, given the two-sided-activation risk is real but the tone bar (PRD §14, Brand Guidelines §13) is non-negotiable.
5. **If accepted and partner joins:** Partnership becomes Active (PRD §10.3); both users land on a shared Home for the first time with a celebratory moment (ties to Motion, Brand Guidelines §10).
6. **Wedding Mode opt-in** — offered once a Partnership exists (not before, since it's a Partnership-level feature), framed as a question, not an assumption ("Planning a wedding?"), since not every Partnership is engaged/newlywed (Persona 4, PRD §5).
7. **Contextual Premium moment** — the first time either partner tries to link a bank account (Plaid) or open AI Purchase Advisor/Coach, present the 14-day trial offer (PRD §9), gated behind the Partnership already existing per the confirmed trial policy — i.e., a solo user attempting this before inviting a partner sees the invite prompt first, since the trial is explicitly partner-invite-gated.

## 6. Core Screen Inventory

Organized by nav destination. Each entry is a description of purpose and key states, not a pixel spec.

### 6.1 Home
Shared + personal dashboard. Sections: upcoming bills, budget snapshot (spent vs. planned this month), active goal progress cards, AI Insights carousel (PRD §12.11), shared activity feed (PRD §12.3), Money Meeting card when one is ready (§3.3), quick actions (add expense, scan receipt/price tag). Ownership indicators (§4) throughout.

### 6.2 Budget
Zero-based budgeting (PRD §12.6): category list with planned vs. actual, rollover indicator, monthly cycle navigation (prev/next month), AI-suggested categories/amounts entry point. Personal/Shared filter (§4). Irregular-income and unequal-contribution accommodations (PRD §12.6 edge case) surface here as an alternate budgeting mode, not a separate screen.

### 6.3 Goals (→ Wedding, contextually)
Goal list with progress visuals as the emotional center of the product (PRD §12.7) — celebratory design per Brand Guidelines Motion (§10). Each goal detail shows contribution history attributable per partner (stacked, non-judgmental — §7 edge cases below). When Wedding Mode is active, this tab's content and label shift per §3.2.

### 6.4 AI Coach
Chat-first interface unifying AI Purchase Advisor and AI Financial Coach (PRD §12.9–12.10). Persistent input bar supports typing, voice, camera/photo, and receipt/price-tag scan. Every AI response is designed to be shared to the Partnership's activity feed as a conversation-starter (PRD §12.9), with a one-tap "share with [partner]" action on each response. AI Insights (§12.11) can also deep-link into this tab for a "tell me more" follow-up.

### 6.5 More
Settings (profile, notification preferences, appearance mode toggle), Partnership management (invite, view Partnership details, disconnect — see §7), Community & Challenges (PRD §12.13), Weekly Money Meeting full history/detail, subscription/billing management, manual account entry, support/help.

## 7. Key Edge Cases Requiring UX Resolution

Carried forward from the PRD's edge-case notes, resolved here in UX terms:

- **Partnership disconnect (PRD §10):** a dedicated, multi-step flow in More → Partnership settings — not a single destructive tap. Step 1 explains what happens (shared workspace freezes read-only for the other partner, going-forward data separates, PRD §10 edge case) before any confirmation. Copy must stay calm and non-punitive regardless of how the disconnect is going (Brand Guidelines §13 emotional-safety bar applies here more than anywhere else in the product).
- **Unequal goal/budget contributions (PRD §12.6, §12.7):** shown as a stacked, per-partner-attributed progress bar or breakdown, labeled with names/avatars — never framed as a percentage "score" that could read as a value judgment.
- **Wedding Mode Graduate (PRD §12.8):** a full-screen celebratory moment (confetti/motion per Brand Guidelines §10), explicitly initiated by the couple, not a quiet settings toggle — and a separate, lower-key "pause/exit Wedding Mode" path exists for postponed/cancelled weddings that does not use celebratory framing.
- **Family contributions (PRD §12.8):** a simple ledger entry (name, amount, note) with no login or account implied — UI must not accidentally suggest the family member has any access to the app or its data.
- **Sharing granularity at the point of action:** when connecting a Plaid account or creating a budget/goal, an explicit "Share with [partner]?" choice appears inline at creation time, not only discoverable later in Settings — reduces the friction/anxiety for a privacy-conscious partner (Persona 3, PRD §5).
- **Notification visibility (PRD §12.14 edge case):** notification copy is generated per-recipient, respecting that recipient's actual visibility permissions — a shared-workspace event notification must never leak personal-account detail to a partner who wasn't permitted to see it.

## 8. Empty, Loading, and Error States

- **Empty states** are invitations, not dead ends: "Let's add your first goal — what are you working toward?" rather than "No goals yet." Ties to Brand Guidelines §13 (emotional goal: "I've got this").
- **Loading states** favor lightweight skeleton screens over blocking spinners wherever the shape of the content is predictable (lists, cards); a spinner is reserved for genuinely indeterminate waits (AI response generation, Plaid link handshake).
- **Error states** are calm and actionable, never technical: "Couldn't reach [Bank Name] — reconnect?" rather than a raw Plaid error code or stack trace. This includes the Plaid re-auth edge case from PRD §12.4.

## 9. Accessibility Standards

- Minimum 44×44pt tap targets throughout, regardless of how compact a card design gets.
- Full support for OS-level text-size scaling (Dynamic Type / Android font scale) — large-typography brand direction (Brand Guidelines §14) must not break at larger accessibility text sizes.
- All icon-only controls (especially the five-tab nav and the ownership indicators in §4) carry screen-reader labels (VoiceOver/TalkBack) — an icon is never the only signal.
- Motion (Brand Guidelines §10) respects OS-level reduce-motion settings: every celebratory animation has a static/reduced fallback that still communicates the success (e.g., a confetti burst reduces to a simple checkmark-and-color-flash), never simply disappearing outright and leaving the moment uncelebrated.
- Color is never the sole carrier of meaning (e.g., budget over/under status pairs an icon or label with color, not color alone) — necessary given how saturated the palette is (Brand Guidelines §5.1) and how easily a color-only signal could be missed by color-blind users.

## 10. Platform Considerations

- Single React Native + Expo codebase drives one shared UX across iOS and Android (`PROJECT_MEMORY.md` §6) — this blueprint assumes one IA and one set of flows, not platform-forked navigation.
- Platform-native conventions are still respected at the interaction-detail level (iOS swipe-back gesture, Android hardware/gesture back button) — exact handling is a Design System (Phase 4) / Frontend Architecture (Phase 11) concern, not re-litigated here.
- The web app (`app.yourdomain.com`, per the founder's original brief) is out of scope for this document's screen inventory — V1 is mobile-first. When Frontend Architecture (Phase 11) covers the web app, the same five-destination IA (§3.1) should carry over conceptually, adapted to a wider viewport (e.g., a persistent sidebar instead of a bottom tab bar), rather than inventing a different structure.

## 11. Open Items Carried to Later Phases

- **Wedding Mode's tab consolidation (§3.2)** and **Money Meeting placement (§3.3)** were design judgment calls made here to keep the confirmed 5-tab structure intact — not yet put to the founder as explicit questions. Flagging both for confirmation before Phase 4 locks navigation components.
- **Icon library choice** (Lucide vs. Phosphor, carried from Brand Guidelines §20) still needs a decision before Phase 4 component work.
- **Success/Warning color mapping** and **primary appearance mode** were resolved between this document and Brand Guidelines — appearance mode is now locked (§2); Success/Warning mapping is still a recommendation pending confirmation (Brand Guidelines §5).
- Exact component anatomy, spacing scale, and motion timing values are intentionally deferred to the Design System (Phase 4) — this document defines structure and flow, not final visual specification.

---

*Next step per the Documentation Roadmap: await founder review and approval of this UX/UI Blueprint, including the two flagged design judgment calls in §11. Once approved, record it in `PROJECT_MEMORY.md` §7 and proceed to Phase 4 — Design System, which turns this structure and the Brand Guidelines into an actual component library (spacing scale, component anatomy, motion timing, icon library selection).*
