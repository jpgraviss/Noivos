// Whether Clerk is genuinely usable for this deployment. Every route/
// component in this app used to check only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
// (duplicated as an identical private `clerkConfigured()` in 19 separate
// route files, plus inline in `proxy.ts`/`layout.tsx`/`page.tsx`) — that
// misses `CLERK_SECRET_KEY`, the server-only key Clerk needs internally for
// everything from `clerkMiddleware()` down to `auth()`.
//
// Found 2026-08-11: with the publishable key present but the secret key
// missing or wrong (an easy, real deploy mistake — e.g. a Preview
// environment that never got `CLERK_SECRET_KEY` set, only Production did),
// `clerkMiddleware()` unconditionally throws "Missing secretKey" the
// moment it runs (traced into `@clerk/nextjs`'s own `clerkMiddleware.js` —
// its "keyless dev" fallback only triggers when the *publishable* key is
// missing, not the secret one). `proxy.ts`'s route matcher covers virtually
// the whole app, so that crashed every single request with an unhandled
// 500 — not the app's own honest "Clerk isn't configured" 503 every route
// handler was clearly built to return for the "no keys at all" case. Worse,
// each route's own `auth()` call happens *outside* its try/catch block
// (right after its own `clerkConfigured()` gate), so even a route that
// somehow got reached without going through `proxy.ts` would let that same
// missing-secret-key error escape uncaught rather than hit the graceful
// 503 path.
//
// Extracted here once every one of those 19+ call sites needed the
// identical additional check, rather than duplicate it in each — same
// posture as `lib/validate.ts`'s helpers.
export function clerkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && Boolean(process.env.CLERK_SECRET_KEY);
}
