import React, { createContext, useContext } from 'react';
import { ClerkProvider, useAuth, useUser } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Replaces Supabase Auth per PROJECT_MEMORY.md §6.4 (Supabase was unworkable
// in the founder's environment). No Clerk application exists yet — until
// EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is set, we skip auth entirely and render
// straight through, so the mock-data demo keeps working exactly as it did
// before this file existed. Remove this fallback once a real key is wired up.

// getToken + display-name bridge, added 2026-09-25 (getToken) and extended
// 2026-10-06 (display name, SE-184) — apps/mobile's first real API calls
// (src/lib/api.ts) need a Clerk session token regardless of which screen
// they're made from, and HomeScreen's greeting needs the real signed-in
// person's name the same way, but RootNavigator.tsx mounts every screen
// identically whether or not Clerk is configured (see App.tsx:
// `isClerkConfigured ? <AuthGate>... : <RootNavigator />` — RootNavigator
// itself, and every tab inside it, is the same component tree either way).
// Calling @clerk/expo's own useAuth()/useUser() directly from a screen
// would crash the moment Clerk isn't configured — AuthGate.tsx/
// AuthenticatedRoot.tsx's own comments already document that those hooks
// are only safe because those two components are *exclusively* rendered
// inside the real <ClerkProvider> branch, unlike every screen. These two
// contexts are the fix: always provided (both branches below), so reading
// either is safe from anywhere.
type GetToken = ReturnType<typeof useAuth>['getToken'];
const TokenGetterContext = createContext<GetToken | null>(null);
const DisplayNameContext = createContext<string | null>(null);

// Only ever rendered inside the real <ClerkProvider> below — safe to call
// useAuth()/useUser() here, same invariant AuthGate.tsx/AuthenticatedRoot.tsx
// rely on.
function ClerkTokenBridge({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const { user } = useUser();
  // Same fallback chain as apps/web's AuthenticatedAppShell.tsx (its own
  // comment explains why each step exists — Clerk's hosted sign-up doesn't
  // require a first/full name unless the dashboard is configured to, so a
  // real user can reach this with neither set): firstName, then fullName,
  // then the email's local part, then a fully neutral "You" rather than
  // ever falling through to a fabricated mock name from here.
  const userName = user?.firstName || user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'You';
  return (
    <TokenGetterContext.Provider value={getToken}>
      <DisplayNameContext.Provider value={userName}>{children}</DisplayNameContext.Provider>
    </TokenGetterContext.Provider>
  );
}

export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  if (!publishableKey) {
    if (__DEV__) {
      console.warn(
        '[ClerkAuthProvider] EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set — running without auth. ' +
          'See apps/mobile/.env.example.'
      );
    }
    return (
      <TokenGetterContext.Provider value={null}>
        <DisplayNameContext.Provider value={null}>{children}</DisplayNameContext.Provider>
      </TokenGetterContext.Provider>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkTokenBridge>{children}</ClerkTokenBridge>
    </ClerkProvider>
  );
}

// Safe to call from any component, configured or not — TokenGetterContext
// always has a Provider ancestor (ClerkAuthProvider wraps the whole app in
// App.tsx), unlike @clerk/expo's own useAuth()/useUser()/useClerk().
export function useApiToken(): GetToken | null {
  return useContext(TokenGetterContext);
}

// Same safety property as useApiToken() above. Returns the real signed-in
// person's name once Clerk is configured and has resolved a session, or
// null otherwise (unconfigured, signed out, or still loading) — callers
// fall back to their own mock name on null, same "real data, mock
// fallback" posture as every other real-data screen in this app.
export function useDisplayName(): string | null {
  return useContext(DisplayNameContext);
}

export const isClerkConfigured = Boolean(publishableKey);
