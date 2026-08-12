import { NextResponse } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';
import { clerkConfigured } from '@/lib/clerk';

// Next.js 16 renamed "Middleware" to "Proxy" (functionality unchanged) — this
// file replaces what would have been middleware.ts in earlier versions.
//
// Same fallback as app/layout.tsx: skip Clerk entirely when its env vars
// aren't configured yet, so a fresh Vercel project deploys cleanly before
// the founder adds real keys via the Vercel dashboard. Checks both keys, not
// just the publishable one (see lib/clerk.ts) — clerkMiddleware() throws
// unconditionally the moment it runs with a publishable key present but no
// secret key, and this proxy's matcher below covers virtually the whole
// app, so that used to crash every single request instead of degrading the
// same honest way the "no keys at all" case already does (found 2026-08-11).
export default clerkConfigured()
  ? clerkMiddleware()
  : () => NextResponse.next();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
