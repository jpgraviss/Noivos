import React from 'react';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Replaces Supabase Auth per PROJECT_MEMORY.md §6.4 (Supabase was unworkable
// in the founder's environment). No Clerk application exists yet — until
// EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is set, we skip auth entirely and render
// straight through, so the mock-data demo keeps working exactly as it did
// before this file existed. Remove this fallback once a real key is wired up.
export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  if (!publishableKey) {
    if (__DEV__) {
      console.warn(
        '[ClerkAuthProvider] EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set — running without auth. ' +
          'See apps/mobile/.env.example.'
      );
    }
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}

export const isClerkConfigured = Boolean(publishableKey);
