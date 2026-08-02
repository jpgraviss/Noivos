# Noivos — Frontend Architecture

**Status:** Draft v1.0 — awaiting founder sign-off
**Phase:** 11 of the (re-sequenced) Documentation Roadmap — the last of the 5 fast-track, engineering-blocking documents
**Last updated:** 2026-08-02
**Source of truth precedence:** Downstream of the Design System (`docs/03 UX/Design System.md`) for tokens/components, the UX/UI Blueprint for navigation/flow, and Backend Architecture for the API surface this consumes.

> Moving fast per the founder's direction. The one genuinely consequential call in this document — whether `apps/mobile` and `apps/web` share actual UI code or just business logic — is made explicitly (§2) rather than left ambiguous, since `PROJECT_MEMORY.md`'s "never duplicate UI" rule requires a real answer here, not a placeholder.

---

## 1. Scope

This document covers `apps/mobile` (the primary product, Expo/React Native, iOS + Android) and `apps/web` (the authenticated web app at `app.yourdomain.com`, which also hosts the Vercel API layer from Backend Architecture). The public marketing site (`yourdomain.com`) is Phase 12 (deferred) and likely becomes its own deployment reusing the same `packages/ui` — not designed here.

## 2. Cross-Platform UI Strategy — the consequential call

**Decision: `packages/ui` is built on React Native primitives + `react-native-web`, so the same component code renders on mobile and web.** `apps/web` becomes a comparatively thin Next.js shell around those shared components, rather than a separately-built, web-idiomatic UI layer. This directly serves the "never duplicate UI, everything reusable" rule (`PROJECT_MEMORY.md`) — building the Design System's components (Design System §8: buttons, cards, ownership indicators, the stacked progress bar, the relabeling tab bar, modals) once instead of twice. The tradeoff, flagged rather than hidden: React Native Web sometimes lags behind web-native patterns for certain interactions (complex hover states, some accessibility APIs) — acceptable for a mobile-first product where web is the secondary surface, worth revisiting only if the web app's ambitions grow beyond "the same app, on a bigger screen."

## 3. State Management

- **Server state:** TanStack Query (React Query) wrapping both the direct-Supabase calls and the custom Vercel endpoints (API Documentation §2–§3) — one consistent caching/loading/error model regardless of which of the two API surfaces a given piece of data comes from.
- **Realtime:** Supabase Realtime subscriptions for data that should update live across a Partnership without a manual refresh — most notably the shared activity feed (Database Architecture §7.4) and shared budget/goal updates, so one partner's change appears for the other without polling.
- **Local/UI state:** lightweight (React Context or Zustand — a small, unopinionated choice, not worth its own founder question) for things that are genuinely local (active tab, appearance-mode toggle before it's persisted, in-progress form state).

## 4. Navigation

- **Mobile:** React Navigation, implementing the 5-tab structure from UX/UI Blueprint §3.1 (Home, Budget, Goals, AI Coach, More), including the Goals↔Wedding relabeling tab variant confirmed in Design System §8.
- **Web:** Next.js App Router, with route structure mirroring the same five destinations conceptually (UX/UI Blueprint §10) rather than inventing a different information architecture for the browser.

## 5. Monorepo Package Responsibilities

| Package | Contents |
|---|---|
| `packages/ui` | Design System components (§2), built RN + `react-native-web` |
| `packages/api` | TanStack Query hooks wrapping both direct-Supabase calls and Vercel endpoint calls — the one place "how do I get a user's goals" is answered, consumed by both apps |
| `packages/database` | Supabase client setup, generated TypeScript types from the schema (Database Architecture) |
| `packages/ai` | Client-side helpers for streaming AI Coach responses, multi-modal input capture (camera/voice) shared between mobile and web |
| `packages/auth` | Supabase Auth wiring, session handling, shared between apps |
| `packages/notifications` | Push token registration (FCM/APNs) and in-app notification list components |
| `packages/shared` | Cross-cutting types/constants/utilities with no other natural home |

## 6. Offline & Optimistic UX

Manual expense/transaction entry (PRD §12.5) and quick actions (UX/UI Blueprint §6.1) use optimistic updates via TanStack Query — the UI reflects the change immediately, reconciling silently if the server disagrees, rather than blocking on a round-trip for something as frequent as "add an expense." Full offline-first behavior (queuing writes made with no connection) is not a V1 requirement per the PRD's scope — noted as a reasonable future enhancement, not built now.

## 7. Environment Configuration

Mirrors Backend Architecture §10's three environments (dev/staging/production, Supabase branches + Vercel deployments) — Expo's environment config (`app.config.ts` with environment-specific values) and Next.js environment variables both point at the matching Supabase branch/Vercel deployment, so there's one consistent mental model of "environment" across mobile, web, and backend rather than three independently-managed ones.

## 8. Flagged — Not Silently Decided

- **React Native Web unification (§2)** is the one call in this document made unilaterally rather than asked — it directly implements an existing standing rule (never duplicate UI), so treated as low-risk to decide outright, but flagged clearly since it does shape how `apps/web` gets built.
- Zustand vs. Context (§3) is a low-stakes implementation detail, not re-litigated with a founder question.
- Full accessibility implementation detail for the web target (keyboard navigation, focus-visible states) was flagged as open back in Design System §10 — still open, to be resolved as real web screens get built.

---

*This completes the 5 fast-track, engineering-blocking documents (Backend, API, AI, Security baseline, Frontend). Per the founder's direction, the next step is starting to build — the deferred documents (Marketing Website, Admin Dashboard, Analytics, Testing Strategy, Launch Strategy, Business Plan, Investor Documentation) run later or in parallel, not before.*
