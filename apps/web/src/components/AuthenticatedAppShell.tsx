"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { AppShell } from "./AppShell";

// Only ever rendered inside a real ClerkProvider (app/page.tsx only mounts
// this when Clerk is configured) — safe to call useClerk()/useUser() here.
// Mirrors apps/mobile's AuthenticatedRoot/RootNavigator split for the same
// reason. The real signed-in person's name comes from here rather than the
// mock data's hardcoded "Ava", so the app greets whoever is actually signed
// in, not the illustrative persona.
export function AuthenticatedAppShell() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const userName = user?.firstName || user?.fullName || undefined;
  return <AppShell onSignOut={() => signOut()} userName={userName} />;
}
