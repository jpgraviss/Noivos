// Extracted from GoalsScreen.tsx (2026-08-06) so it's unit-testable without
// pulling in react-native's module graph — that file imports View/Pressable/
// TextInput from 'react-native' at the top, whose own source uses Flow
// syntax Vite/Rolldown can't parse (same reason packages/ui's
// stackedProgressBarMath.ts is split out from StackedProgressBar.tsx).
//
// Used for the Wedding Mode countdown ("N days until [date]") — real date
// math with a real consequence (a couple sees the wrong countdown to their
// own wedding), so worth its own coverage rather than trusting it by eye.
export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  // `|| 0` normalizes the one falsy edge case (-0, from Math.ceil of a
  // small negative fraction later on the target date itself) to +0 — a
  // cosmetic-only difference in practice (String(-0) === "0" and
  // -0 === 0), but this function is typed as returning `number`, not
  // `number | -0`, and it's a one-line guard against a `-0` surprising
  // some future caller doing an Object.is/strict-identity check.
  return Math.ceil((target.getTime() - now.getTime()) / 86400000) || 0;
}
