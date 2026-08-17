# @noivos/web

Next.js 16 App Router app (per `docs/08 Frontend/Frontend Architecture.md` §2) — planned to eventually host both the authenticated web app and, per `docs/07 Backend/Backend Architecture.md`, the Vercel API layer (`/api/*` routes). Currently just a Clerk-enabled shell proving the auth wiring works — no real pages, API routes, or `packages/ui` integration yet.

## Auth

Clerk, replacing Supabase Auth (`PROJECT_MEMORY.md` §6.4). `src/proxy.ts` uses `clerkMiddleware()` — Next.js 16 renamed Middleware to Proxy, functionality unchanged. `src/app/layout.tsx` wraps everything in `ClerkProvider` and uses `<Show when="signed-in">` / `<Show when="signed-out">` (the current SDK's replacement for the deprecated `<SignedIn>`/`<SignedOut>`).

Requires `apps/web/.env.local` (gitignored, never commit):
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

## AI Coach

`POST`/`GET /api/ai/coach` (`lib/ai.ts`) needs `ANTHROPIC_API_KEY` set (Vercel env vars in production, `.env.local` locally) to call the real Claude API. Without it, `aiConfigured()` makes the route return an honest 503 rather than crash — same graceful-degradation posture as `clerkConfigured()`. See `lib/ai.ts`'s own top-of-file comment for the legal-review distinction this feature carries (built for an internal demo, not cleared for public launch).

## Known gap

This environment's network egress policy blocks this project's Clerk instance host, so full end-to-end sign-in can't be verified from inside this sandbox — see `PROJECT_MEMORY.md`'s Supabase→Neon pivot section for the exact error and next steps (add the host to egress settings, or test via a real Vercel deployment / locally).

## Run

```bash
npm run dev --workspace=@noivos/web
```
