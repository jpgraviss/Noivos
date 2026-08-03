import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import "./globals.css";

// Brand typography (Design System §3): Bebas Neue Bold headings, Inter body.
// packages/ui's typography tokens reference these as `var(--font-bebas)` /
// `var(--font-inter)` on web (see packages/ui/src/tokens.ts) — the weights
// loaded here (400/500/600/700) match what apps/mobile loads via
// @expo-google-fonts so both platforms render the same type scale.
const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
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
    <html lang="en" className={`${bebasNeue.variable} ${inter.variable}`}>
      <body>{body}</body>
    </html>
  );
}
