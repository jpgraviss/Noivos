"use client";

import { useState, type ComponentType } from "react";
import { Bell, Heart, House, LogOut, Search, Settings, Sparkles, Wallet, Ellipsis } from "lucide-react-native";
import { ThemeProvider, useTheme, palette, getTextColorFor } from "@noivos/ui";
import { HomeScreen } from "../screens/HomeScreen";
import { BudgetScreen } from "../screens/BudgetScreen";
import { GoalsScreen } from "../screens/GoalsScreen";
import { AICoachScreen } from "../screens/AICoachScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { weddingDetails, currentUser } from "../data/mockData";

const TABS = ["Home", "Budget", "Goals", "AI Coach", "More"] as const;
type Tab = (typeof TABS)[number];

const ICONS: Record<Tab, ComponentType<{ size?: number; color?: string }>> = {
  Home: House,
  Budget: Wallet,
  Goals: Heart,
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
  const { colors } = useTheme();
  // Real signed-in name when Clerk is configured (see AuthenticatedAppShell);
  // falls back to the mock persona otherwise, same as everywhere else in
  // this dev-mode app.
  const displayName = userName || currentUser.name;
  // Same relabel rule as apps/mobile's RootNavigator (UX/UI Blueprint §3.2).
  const goalsLabel = weddingDetails.active ? "Wedding" : "Goals";
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
            <span style={{ fontFamily: "var(--font-bebas)", fontSize: 22, color: colors.textPrimary, letterSpacing: 0.5 }}>
              NOIVOS
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
                    borderRadius: 999,
                    border: "none",
                    background: active ? colors.primary : "transparent",
                    color: active ? getTextColorFor(colors.primary) : colors.textSecondary,
                    cursor: "pointer",
                    font: "inherit",
                    textAlign: "left",
                  }}
                >
                  <IconCmp size={18} color={active ? getTextColorFor(colors.primary) : colors.textSecondary} />
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
              <LogOut size={16} color={colors.textSecondary} />
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
          <span style={{ fontFamily: "var(--font-bebas)", fontSize: 28, color: colors.textPrimary }}>{pageTitle}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="noivos-icon-btn" aria-label="Search" title="Search">
              <Search size={16} color={colors.textSecondary} />
            </button>
            <button className="noivos-icon-btn" aria-label="Notifications" title="Notifications">
              <Bell size={16} color={colors.textSecondary} />
            </button>
            <button className="noivos-icon-btn" aria-label="Settings" title="Settings">
              <Settings size={16} color={colors.textSecondary} />
            </button>
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
              <IconCmp size={18} color={active ? palette.sourLime : colors.textSecondary} />
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
