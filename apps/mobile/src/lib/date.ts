// Mirrors apps/web/src/lib/date.ts exactly — same reasoning for keeping
// this a plain, RN-import-free module (no View/Pressable/TextInput pulled
// in), even though mobile doesn't have a separate non-RN test runner to
// benefit from it the way web's vitest setup does; kept identical anyway
// so the two apps' wedding-countdown math can never silently drift apart.
//
// Used for the Wedding Mode countdown ("N days until [date]") — real date
// math with a real consequence (a couple sees the wrong countdown to their
// own wedding).
export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / 86400000) || 0;
}

// Same math as daysUntil(), but for a human-readable date string (e.g.
// "June 12, 2027") rather than an ISO yyyy-mm-dd one — needed for this
// screen's mock/fallback wedding countdown branch (shown only when the
// real wedding backend is unreachable), whose mock date is authored in
// that display-friendly format.
export function daysUntilHumanDate(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / 86400000) || 0;
}
