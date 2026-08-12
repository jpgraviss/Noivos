import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { SITE_URL } from "@/lib/site";
import { clerkConfigured } from "@/lib/clerk";
import "./globals.css";

// Brand typography, repainted 2026-08-05 (founder: "make it a closer look
// to Origin"): Fraunces (a soft editorial serif with real lowercase
// letterforms) replaces Bebas Neue for headings — the old all-caps
// condensed poster font read as loud/shouting rather than premium. Inter
// stays for body copy. packages/ui's typography tokens reference these as
// `var(--font-serif)` / `var(--font-inter)` on web (see
// packages/ui/src/tokens.ts). apps/mobile's native registration
// (useAppFonts.ts) has NOT been updated to match yet — flagged as a known
// gap, this pass was scoped to apps/web per the founder's ask.
const fraunces = Fraunces({
  weight: ["500", "600"],
  variable: "--font-serif",
  subsets: ["latin"],
});

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  subsets: ["latin"],
});

const TAGLINE = "The shared money app for couples — budget, goals, and wedding planning, built for two.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Noivos — Better money. Together.", template: "%s · Noivos" },
  description: TAGLINE,
  openGraph: {
    title: "Noivos — Better money. Together.",
    description: TAGLINE,
    url: SITE_URL,
    siteName: "Noivos",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Noivos — Better money. Together.",
    description: TAGLINE,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Same fallback pattern as apps/mobile/src/auth/ClerkAuthProvider.tsx: if
  // the Vercel project doesn't have Clerk env vars configured yet (there's
  // no remote tool to set them; they're added via the Vercel dashboard
  // after the project exists), render straight through instead of crashing
  // the deploy. Checks both keys, not just the publishable one — see
  // lib/clerk.ts.
  //
  // No generic sign-in/out header here (there was one through 2026-08-05) —
  // it floated above every page including the dashboard (which already has
  // its own sidebar + sign-out in AppShell.tsx) and the invite page (which
  // already has its own sign-in/up buttons), so it was pure duplication
  // everywhere it appeared. The signed-out marketing page now owns its own
  // nav with its own Sign In / Get Started buttons instead.
  const body = clerkConfigured() ? <ClerkProvider>{children}</ClerkProvider> : children;

  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{body}</body>
    </html>
  );
}
