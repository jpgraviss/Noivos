import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
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

export const metadata: Metadata = {
  title: "Noivos",
  description: "Better money. Together.",
};

// Same fallback pattern as apps/mobile/src/auth/ClerkAuthProvider.tsx: if the
// Vercel project doesn't have Clerk env vars configured yet (there's no
// remote tool to set them; they're added via the Vercel dashboard after the
// project exists), render straight through instead of crashing the deploy.
const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const body = clerkConfigured ? (
    <ClerkProvider>
      <header style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: 16 }}>
        <Show when="signed-out">
          <SignInButton />
          <SignUpButton />
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </header>
      {children}
    </ClerkProvider>
  ) : (
    children
  );

  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{body}</body>
    </html>
  );
}
