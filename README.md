# Noivos

Better money. Together. — a shared money app for couples: budget, goals, and wedding planning in one place, built for two people rather than a solo user with a second login bolted on.

## Structure

This is an npm workspaces monorepo:

- `apps/web` — the Next.js (App Router) web app, including the signed-out marketing site and the signed-in dashboard.
- `apps/mobile` — the Expo/React Native app.
- `packages/ui` — shared design tokens, theming, and cross-platform (web + native) UI components used by both apps.
- `packages/database` — Postgres (Neon) schema and Row-Level Security migrations. See `packages/database/README.md` for the auth handoff model and the migration checklist.
- `docs/` — product/architecture documentation, written phase-by-phase (PRD, Brand Guidelines, Database/Backend/Frontend Architecture, etc.).
- `PROJECT_MEMORY.md` — the running decision log. Read this first if you're picking up this project — it's the one place that explains *why* things are the way they are, not just what they are.

## Getting started

```bash
npm install
```

### Web app

```bash
npm run dev --workspace=@noivos/web
```

Needs `apps/web/.env.local` (see `apps/web/.env.example` if present, or `packages/database/README.md` for the required vars) — without `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`DATABASE_URL` set, the app still runs, falling back to mock data and skipping auth entirely rather than crashing. That fallback is intentional, not a bug — it's what lets this run in environments without those secrets configured.

### Mobile app

```bash
npm run mobile
```

Same fallback posture as web: without `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` set (see `apps/mobile/.env.example`), it renders the mock-data demo without auth.

### Tests

```bash
npm test --workspace=@noivos/web
```

Covers the pure/mockable business logic in `apps/web/src/lib` (relative-time formatting, activity-feed sentence formatting, Money Meeting agenda rules) — the parts that don't need a live Neon connection or a Clerk session to verify. Route handlers, RLS policies, and UI aren't covered here; those are verified via `tsc`/production builds and manual/headless-browser passes as documented in `PROJECT_MEMORY.md`.
