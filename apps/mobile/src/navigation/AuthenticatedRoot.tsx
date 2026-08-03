import React from 'react';
import { useClerk } from '@clerk/expo';
import { RootNavigator } from './RootNavigator';

// Only ever mounted inside AuthGate, which is only ever mounted inside a real
// ClerkProvider (see App.tsx) — safe to call useClerk() here.
export function AuthenticatedRoot() {
  const { signOut } = useClerk();
  return <RootNavigator onSignOut={() => signOut()} />;
}
