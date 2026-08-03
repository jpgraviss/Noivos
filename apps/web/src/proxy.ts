import { clerkMiddleware } from '@clerk/nextjs/server';

// Next.js 16 renamed "Middleware" to "Proxy" (functionality unchanged) — this
// file replaces what would have been middleware.ts in earlier versions.
export default clerkMiddleware();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
