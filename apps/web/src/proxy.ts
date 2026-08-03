import { NextResponse } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';

// Next.js 16 renamed "Middleware" to "Proxy" (functionality unchanged) — this
// file replaces what would have been middleware.ts in earlier versions.
//
// Same fallback as app/layout.tsx: skip Clerk entirely when its env vars
// aren't configured yet, so a fresh Vercel project deploys cleanly before
// the founder adds real keys via the Vercel dashboard.
export default process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? clerkMiddleware()
  : () => NextResponse.next();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
