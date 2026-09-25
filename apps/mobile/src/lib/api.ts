import { useCallback } from 'react';
import { useApiToken } from '../auth/ClerkAuthProvider';

// Base URL of the Vercel API layer this app talks to for anything beyond
// local mock data (Backend Architecture: "Mobile App (Expo/RN) --> custom
// logic --> Vercel API Layer"). See apps/mobile/.env.example — added
// 2026-09-25 as the very first real (non-mock) network wiring in this app;
// until now every mobile screen rendered straight from src/data/mockData.ts.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// Graceful-degradation check, same shape as apps/web's clerkConfigured()/
// aiConfigured()/plaidConfigured() — an unset base URL is an honest "not
// wired up yet" state a screen can check before calling useApiFetch(), not
// a crash.
export function apiConfigured(): boolean {
  return Boolean(API_BASE_URL);
}

export interface ApiFetchInit extends Omit<RequestInit, 'body'> {
  // Plain object, JSON-serialized here — every call site would otherwise
  // repeat `JSON.stringify(...)` + the Content-Type header itself, the
  // same "centralize it once" reasoning as apps/web/src/lib/validate.ts's
  // shared helpers.
  body?: unknown;
}

/**
 * useApiFetch — an authenticated fetch bound to the Vercel API layer's
 * base URL (apps/web's own `/api/*` routes, unchanged). Unlike apps/web's
 * screens (same-origin, cookie-based Clerk session — see proxy.ts), this
 * app is always a separate origin from the API it calls, so the session
 * token is attached explicitly as `Authorization: Bearer <token>` instead.
 * Every apps/web route already authenticates via `@clerk/nextjs/server`'s
 * `auth()`, which accepts a Bearer header exactly like a session cookie —
 * no server-side change was needed to support this.
 *
 * Safe to call from any screen regardless of whether Clerk is configured:
 * useApiToken() returns null in that case (see ClerkAuthProvider.tsx), and
 * the request just goes out unauthenticated — the target route's own
 * `auth()` check 401s it cleanly, the same "not signed in" response a
 * signed-out apps/web user already gets, not a crash here.
 */
export function useApiFetch() {
  const getToken = useApiToken();

  return useCallback(
    async (path: string, init: ApiFetchInit = {}): Promise<Response> => {
      if (!API_BASE_URL) {
        // Callers should check apiConfigured() before reaching here — this
        // is a programming-error guard, not a user-facing state.
        throw new Error('API_NOT_CONFIGURED');
      }
      const { body, headers, ...rest } = init;
      const token = getToken ? await getToken() : null;
      return fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    },
    [getToken]
  );
}
