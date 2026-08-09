"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { Bell, Target, House, LogOut, Search, Settings, Sparkles, PieChart, Ellipsis } from "lucide-react-native";
import { Card, ThemeProvider, useTheme, palette, getTextColorFor, spacing } from "@noivos/ui";
import { HomeScreen } from "../screens/HomeScreen";
import { BudgetScreen } from "../screens/BudgetScreen";
import { GoalsScreen } from "../screens/GoalsScreen";
import { AICoachScreen } from "../screens/AICoachScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { weddingDetails, currentUser, activityFeed as mockActivityFeed } from "../data/mockData";
import { formatRelativeTime } from "../lib/formatRelativeTime";

interface ActivityEvent {
  id: string;
  text: string;
  time: string; // ISO timestamp for real events; already a display string ("2h ago") for the mock fallback
}

const TABS = ["Home", "Budget", "Goals", "AI Coach", "More"] as const;
type Tab = (typeof TABS)[number];

// Matches the founder's original brand moodboard's iconography (Home/Goals/
// Budget/AI Coach/More), per the 2026-08-02 decision that primary nav stays
// bespoke to the moodboard rather than generic Lucide defaults — never
// actually applied until now (2026-08-05).
const ICONS: Record<Tab, ComponentType<{ size?: number; color?: string }>> = {
  Home: House,
  Budget: PieChart,
  Goals: Target,
  "AI Coach": Sparkles,
  More: Ellipsis,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SCREENS: Record<Tab, ComponentType<any>> = {
  Home: HomeScreen,
  Budget: BudgetScreen,
  Goals: GoalsScreen,
  "AI Coach": AICoachScreen,
  More: MoreScreen,
};

function Shell({ onSignOut, userName }: { onSignOut?: () => void; userName?: string }) {
  const [tab, setTab] = useState<Tab>("Home");
  const { colors, setMode } = useTheme();

  // Notifications bell: a real recent-activity dropdown (reuses the same
  // /api/activity endpoint HomeScreen's Activity card already wired
  // 2026-08-05), not a fake unread-count badge — there's no read/unread
  // tracking anywhere yet, so this deliberately doesn't claim one.
  const [showActivity, setShowActivity] = useState(false);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[] | null>(null);
  const [activityIsReal, setActivityIsReal] = useState(false);
  const activityFetched = useRef(false);

  function toggleActivity() {
    setShowActivity((prev) => !prev);
    if (!activityFetched.current) {
      activityFetched.current = true;
      fetch("/api/activity")
        .then(async (res) => {
          if (!res.ok) throw new Error("activity fetch failed");
          return res.json() as Promise<{ hasPartnership: boolean; events: ActivityEvent[] }>;
        })
        .then((data) => {
          if (data.hasPartnership) {
            setActivityIsReal(true);
            setActivityEvents(data.events);
          } else {
            setActivityEvents(mockActivityFeed);
          }
        })
        .catch(() => {
          setActivityEvents(mockActivityFeed);
        });
    }
  }

  // Sync the theme to whatever's actually saved in the database (if
  // reachable) once on mount — ThemeProvider always starts at its 'dark'
  // default, so this is what makes a saved 'light' preference survive a
  // reload instead of silently reverting every time.
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { appearanceMode?: string } | null) => {
        if (data?.appearanceMode === "dark" || data?.appearanceMode === "light") {
          setMode(data.appearanceMode);
        }
      })
      .catch(() => {
        // No database/Clerk reachable — stay on ThemeProvider's default.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same relabel rule as apps/mobile's RootNavigator (UX/UI Blueprint §3.2)
  // — but was permanently wrong for every real user before this fix
  // (2026-08-08): `weddingDetails.active` is a static mock flag hardcoded
  // `true`, so this tab said "Wedding" regardless of whether the signed-in
  // user's real Partnership had actually started Wedding Mode. Fetches the
  // same /api/wedding GoalsScreen.tsx already calls — matches this app's
  // established "each component fetches its own data independently, falls
  // back to mock independently" convention (same posture as the /api/profile
  // fetch just above) rather than lifting state or prop-drilling from
  // GoalsScreen. Defaults to the safe "Goals" label while loading, not the
  // mock's `true` — a brief flash of "Goals" for a real Wedding-Mode user
  // costs far less than permanently mislabeling the tab for everyone who's
  // never started it, which is the bug this fixes. Falls back to the mock's
  // own `.active` flag only on genuine fetch failure, so the tab label and
  // the screen it leads to (GoalsScreen.tsx's own identical fallback,
  // fixed in the same commit) can't contradict each other in dev/preview
  // mode with no backend reachable at all.
  const [weddingActive, setWeddingActive] = useState(false);
  useEffect(() => {
    fetch("/api/wedding")
      .then((res) => {
        if (!res.ok) throw new Error("wedding fetch failed");
        return res.json() as Promise<{ hasPartnership: boolean; weddingDetails: unknown }>;
      })
      .then((data) => {
        setWeddingActive(Boolean(data.hasPartnership && data.weddingDetails));
      })
      .catch(() => {
        setWeddingActive(weddingDetails.active);
      });
  }, []);

  // Real signed-in name when Clerk is configured (see AuthenticatedAppShell);
  // falls back to the mock persona otherwise, same as everywhere else in
  // this dev-mode app.
  const displayName = userName || currentUser.name;
  const goalsLabel = weddingActive ? "Wedding" : "Goals";
  const ActiveScreen = SCREENS[tab];
  const pageTitle = tab === "Goals" ? goalsLabel : tab;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: colors.background }}>
      <aside
        className="noivos-sidebar"
        style={{
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: colors.surface,
          borderRight: `1px solid ${colors.border}`,
          padding: "24px 16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px", marginBottom: 28 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: `linear-gradient(135deg, ${palette.sourLime}, ${palette.electricBlue})`,
              }}
            />
            <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 20, color: colors.textPrimary, letterSpacing: 0.2 }}>
              Noivos
            </span>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {TABS.map((t) => {
              const label = t === "Goals" ? goalsLabel : t;
              const active = tab === t;
              const IconCmp = ICONS[t];
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="noivos-sidebar-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "none",
                    // A soft tint instead of a solid filled pill — Origin's
                    // selected nav state reads as "highlighted," not "badge."
                    background: active ? `${colors.primary}2E` : "transparent",
                    color: active ? colors.primary : colors.textSecondary,
                    cursor: "pointer",
                    font: "inherit",
                    textAlign: "left",
                  }}
                >
                  <IconCmp size={18} color={active ? colors.primary : colors.textSecondary} aria-hidden={true} />
                  <span style={{ fontFamily: "var(--font-inter)", fontSize: 14, fontWeight: 600 }}>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                backgroundColor: palette.sourLime,
                color: getTextColorFor(palette.sourLime),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-inter)",
                fontWeight: 700,
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {displayName.slice(0, 1)}
            </span>
            <span
              style={{
                fontFamily: "var(--font-inter)",
                fontSize: 13,
                color: colors.textPrimary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </span>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="noivos-icon-btn"
              style={{ width: 30, height: 30, border: "none" }}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} color={colors.textSecondary} aria-hidden={true} />
            </button>
          )}
        </div>
      </aside>

      <div className="noivos-content">
        <header
          className="noivos-topbar"
          style={{
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 40px",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 24, color: colors.textPrimary }}>{pageTitle}</span>
          <div style={{ display: "flex", gap: 8, position: "relative" }}>
            {/* Not yet wired to anything — there's no cross-screen search
                index to query yet. Left visible rather than removed so the
                affordance isn't silently missing, but it's a known,
                deliberately-deferred gap, not a hidden dead end. */}
            <button className="noivos-icon-btn" aria-label="Search" title="Search — coming soon">
              <Search size={16} color={colors.textSecondary} aria-hidden={true} />
            </button>
            <button
              className="noivos-icon-btn"
              aria-label="Recent activity"
              aria-expanded={showActivity}
              title="Recent activity"
              onClick={toggleActivity}
            >
              <Bell size={16} color={colors.textSecondary} aria-hidden={true} />
            </button>
            <button className="noivos-icon-btn" aria-label="Settings" title="Settings" onClick={() => setTab("More")}>
              <Settings size={16} color={colors.textSecondary} aria-hidden={true} />
            </button>

            {showActivity && (
              <div style={{ position: "absolute", top: 44, right: 0, width: 320, zIndex: 20 }}>
                <Card style={{ padding: spacing.md }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>
                      Recent activity
                    </span>
                    <button
                      onClick={() => setShowActivity(false)}
                      aria-label="Close"
                      style={{ background: "none", border: "none", color: colors.textSecondary, cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                    >
                      &times;
                    </button>
                  </div>
                  {activityEvents === null && (
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 13, color: colors.textSecondary }}>Loading…</span>
                  )}
                  {activityEvents?.length === 0 && (
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 13, color: colors.textSecondary }}>
                      No activity yet.
                    </span>
                  )}
                  {activityEvents?.slice(0, 5).map((a) => (
                    <div key={a.id} style={{ marginBottom: spacing.sm }}>
                      <div style={{ fontFamily: "var(--font-inter)", fontSize: 13, color: colors.textPrimary }}>{a.text}</div>
                      <div style={{ fontFamily: "var(--font-inter)", fontSize: 11, color: colors.textSecondary }}>
                        {activityIsReal ? formatRelativeTime(a.time) : a.time}
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </div>
        </header>

        <div className="noivos-page-inner">
          <ActiveScreen userName={displayName} {...(tab === "More" ? { onSignOut } : {})} />
        </div>
      </div>

      <nav
        className="noivos-bottomnav"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          justifyContent: "space-around",
          backgroundColor: colors.surface,
          borderTop: `1px solid ${colors.border}`,
          padding: "10px 0",
        }}
      >
        {TABS.map((t) => {
          const label = t === "Goals" ? goalsLabel : t;
          const active = tab === t;
          const IconCmp = ICONS[t];
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: "none",
                border: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                color: active ? palette.sourLime : colors.textSecondary,
                cursor: "pointer",
                font: "inherit",
              }}
            >
              <IconCmp size={18} color={active ? palette.sourLime : colors.textSecondary} aria-hidden={true} />
              <span style={{ fontSize: 11 }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// Dark mode is primary (UX/UI Blueprint §2) — ThemeProvider defaults to it.
// onSignOut/userName are injected by the caller rather than read via
// useClerk()/useUser() here, so this component never assumes a ClerkProvider
// ancestor exists (it's also rendered directly when Clerk isn't configured
// — see app/page.tsx).
export function AppShell({ onSignOut, userName }: { onSignOut?: () => void; userName?: string } = {}) {
  return (
    <ThemeProvider>
      <Shell onSignOut={onSignOut} userName={userName} />
    </ThemeProvider>
  );
}
