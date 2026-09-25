import React, { createContext, useContext } from 'react';
import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Replaces Supabase Auth per PROJECT_MEMORY.md §6.4 (Supabase was unworkable
// in the founder's environment). No Clerk application exists yet — until
// EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is set, we skip auth entirely and render
// straight through, so the mock-data demo keeps working exactly as it did
// before this file existed. Remove this fallback once a real key is wired up.

// getToken bridge, added 2026-09-25 wiring the first real API calls into
// apps/mobile (src/lib/api.ts) — those calls need a Clerk session token
// regardless of which screen they're made from, but RootNavigator.tsx
// mounts every screen (AICoachScreen included) identically whether or not
// Clerk is configured (see App.tsx: `isClerkConfigured ? <AuthGate>... :
// <RootNavigator />` — RootNavigator itself, and every tab inside it, is
// the same component tree either way). Calling @clerk/expo's own useAuth()
// directly from a screen would crash the moment Clerk isn't configured —
// AuthGate.tsx/AuthenticatedRoot.tsx's own comments already document that
// useAuth()/useClerk() are only safe because those two are *exclusively*
// rendered inside the real <ClerkProvider> branch, unlike every screen.
// This context is the fix: always provided (both branches below), so
// reading it is safe from anywhere — its value is the real getToken when
// Clerk is configured, or null otherwise, and src/lib/api.ts's
// useApiFetch() already treats a null getToken as "send the request
// unauthenticated," matching how every apps/web route degrades (a missing/
// invalid session is a clean 401 from that route's own `auth()` check, not
// a crash).
type GetToken = ReturnType<typeof useAuth>['getToken'];
const TokenGetterContext = createContext<GetToken | null>(null);

// Only ever rendered inside the real <ClerkProvider> below — safe to call
// useAuth() here, same invariant AuthGate.tsx/AuthenticatedRoot.tsx rely on.
function ClerkTokenBridge({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  return <TokenGetterContext.Provider value={getToken}>{children}</TokenGetterContext.Provider>;
}

export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  if (!publishableKey) {
    if (__DEV__) {
      console.warn(
        '[ClerkAuthProvider] EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set — running without auth. ' +
          'See apps/mobile/.env.example.'
      );
    }
    return <TokenGetterContext.Provider value={null}>{children}</TokenGetterContext.Provider>;
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

export const isClerkConfigured = Boolean(publishableKey);
