import React from 'react';
import { useAuth } from '@clerk/expo';
import { SignInScreen } from '../screens/SignInScreen';

// Only ever rendered when Clerk is actually configured (see App.tsx) — useAuth()
// requires a ClerkProvider ancestor.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null; // brief splash gap — fine for now, revisit with a real splash screen later
  }

  if (!isSignedIn) {
    return <SignInScreen />;
  }

  return <>{children}</>;
}
