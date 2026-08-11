"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { AppShell } from "./AppShell";

// Only ever rendered inside a real ClerkProvider (app/page.tsx only mounts
// this when Clerk is configured) — safe to call useClerk()/useUser() here.
// Mirrors apps/mobile's AuthenticatedRoot/RootNavigator split for the same
// reason. The real signed-in person's name comes from here rather than the
// mock data's hardcoded "Ava", so the app greets whoever is actually signed
// in, not the illustrative persona.
//
// Must never resolve to undefined here: AppShell/HomeScreen's own fallback
// for a missing userName prop is the mock persona ("Ava") — the right
// behavior when this component isn't mounted at all (Clerk not configured,
// AppShell rendered standalone per app/page.tsx), but wrong the moment a
// real person is genuinely signed in. Clerk's hosted sign-up doesn't
// require a first/full name unless the dashboard is configured to, so a
// real user can reach this with neither set (found 2026-08-11) — without
// this email fallback, that real, signed-in person would be greeted as
// "Ava" everywhere (topbar, sidebar, AvatarStack), and worse, IdentitySettings
// would pre-fill their one-time, server-locked "Full name" field with it,
// risking "Ava" getting permanently saved as their real identity. Falls
// back to the email's local part before the fully neutral "You" — a real,
// if imperfect, name beats a fabricated one, same posture as every other
// mock-to-real fix this session.
export function AuthenticatedAppShell() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const userName =
    user?.firstName ||
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "You";
  return <AppShell onSignOut={() => signOut()} userName={userName} />;
}
