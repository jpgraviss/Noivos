"use client";

import { useClerk } from "@clerk/nextjs";
import { AppShell } from "./AppShell";

// Only ever rendered inside a real ClerkProvider (app/page.tsx only mounts
// this when Clerk is configured) — safe to call useClerk() here. Mirrors
// apps/mobile's AuthenticatedRoot/RootNavigator split for the same reason.
export function AuthenticatedAppShell() {
  const { signOut } = useClerk();
  return <AppShell onSignOut={() => signOut()} />;
}
