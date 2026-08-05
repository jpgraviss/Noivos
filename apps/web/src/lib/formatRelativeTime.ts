// Shared by HomeScreen's Activity card and AppShell's Recent Activity
// dropdown (both consume /api/activity's ISO timestamps) — matches the old
// mock feed's "2h ago" / "3mo ago" style. Extracted here instead of
// duplicated so the two call sites can't silently drift apart.
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const hours = diffMs / 3_600_000;
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d ago`;
  const months = days / 30;
  return `${Math.round(months)}mo ago`;
}
