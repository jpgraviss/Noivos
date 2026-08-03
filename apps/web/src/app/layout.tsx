import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{body}</body>
    </html>
  );
}
