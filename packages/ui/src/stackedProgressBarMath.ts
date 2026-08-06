// Pure segment-width math for StackedProgressBar, kept in its own
// zero-dependency file (no react/react-native imports) so it's unit-
// testable without pulling in react-native's module graph — StackedProgressBar.tsx
// itself can't be imported from a plain Node/Vitest environment, since
// react-native's own source uses Flow syntax Vite/Rolldown can't parse.
export interface SegmentAmount {
  amount: number;
}

// Every current caller (Budget's category chart, Goals' per-contributor
// progress) already guards against target <= 0 before rendering at all,
// but this is a shared, reusable primitive, so it guards defensively on
// its own too: a target of 0 or less would otherwise divide-by-zero into a
// `NaN%`/`Infinity%` CSS width, silently rendering nothing rather than
// crashing. Negative amounts clamp to 0% rather than a negative width.
// Contributions exceeding the target are NOT clamped to 100% in total —
// each segment is computed independently, and the container's
// `overflow: hidden` visually clips the excess, which is the existing,
// intentional behavior.
export function computeSegmentWidths<T extends SegmentAmount>(contributors: T[], target: number): number[] {
  if (!(target > 0)) return contributors.map(() => 0);
  return contributors.map((c) => Math.max((c.amount / target) * 100, 0));
}
