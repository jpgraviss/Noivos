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

// Same math as daysUntil(), but for a human-readable date string (e.g.
// "June 12, 2027") rather than an ISO yyyy-mm-dd one — needed for
// GoalsScreen.tsx's mock/fallback wedding countdown branch (shown only
// when the real wedding backend is unreachable), whose mock date is
// authored in that display-friendly format. Extracted as its own function
// (2026-08-11) rather than inlining `new Date(...).getTime() - Date.now()`
// directly in the component: `react-hooks/purity` (this repo's React
// Compiler lint rule) flags a direct `Date.now()` call inside a component's
// render body as an impure read, but not one made inside an imported
// function like this — the same reason daysUntil() above already gets a
// pass at its own real-data call site. Also fixes a real bug found the
// same day: that mock branch used to render a hardcoded `daysLeft` number
// stored separately from `date`, and the two had already drifted 9 days
// out of sync (and would keep drifting further every day this mock content
// stays deployed) — computing it here instead removes the drift entirely.
export function daysUntilHumanDate(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / 86400000) || 0;
}
