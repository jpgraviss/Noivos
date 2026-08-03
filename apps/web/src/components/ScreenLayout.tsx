// Layout wrappers for apps/web screens. Scrolling and padding now live in
// AppShell's .noivos-page-inner (so the sidebar/topbar don't get re-padded
// per screen) — these replace packages/ui's ScreenContainer, which owns its
// own ScrollView/padding and would double up with the shell.
//
// ScreenGrid: single column on mobile, responsive multi-column grid on
// desktop (.noivos-grid) — used by every screen except AI Coach, whose
// message order must stay a single vertical column.
// ScreenStack: plain single-column flex, for screens where a grid reflow
// would break reading order.

export function ScreenGrid({ children }: { children: React.ReactNode }) {
  return <div className="noivos-grid">{children}</div>;
}

export function ScreenGridWide({ children }: { children: React.ReactNode }) {
  return <div className="noivos-grid--wide">{children}</div>;
}

export function ScreenStack({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>;
}
