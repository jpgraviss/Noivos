"use client";

import { useState, type ComponentType } from "react";
import { ThemeProvider, useTheme, palette } from "@noivos/ui";
import { HomeScreen } from "../screens/HomeScreen";
import { BudgetScreen } from "../screens/BudgetScreen";
import { GoalsScreen } from "../screens/GoalsScreen";
import { AICoachScreen } from "../screens/AICoachScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { weddingDetails } from "../data/mockData";

const TABS = ["Home", "Budget", "Goals", "AI Coach", "More"] as const;
type Tab = (typeof TABS)[number];

const ICONS: Record<Tab, string> = {
  Home: "🏠",
  Budget: "📊",
  Goals: "🎯",
  "AI Coach": "✨",
  More: "⋯",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SCREENS: Record<Tab, ComponentType<any>> = {
  Home: HomeScreen,
  Budget: BudgetScreen,
  Goals: GoalsScreen,
  "AI Coach": AICoachScreen,
  More: MoreScreen,
};

function Shell({ onSignOut }: { onSignOut?: () => void }) {
  const [tab, setTab] = useState<Tab>("Home");
  const { colors } = useTheme();
  // Same relabel rule as apps/mobile's RootNavigator (UX/UI Blueprint §3.2).
  const goalsLabel = weddingDetails.active ? "Wedding" : "Goals";
  const ActiveScreen = SCREENS[tab];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: colors.background,
      }}
    >
      <div style={{ flex: 1, paddingBottom: 76 }}>
        <ActiveScreen {...(tab === "More" ? { onSignOut } : {})} />
      </div>
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-around",
          backgroundColor: colors.surface,
          borderTop: `1px solid ${colors.border}`,
          padding: "10px 0",
        }}
      >
        {TABS.map((t) => {
          const label = t === "Goals" ? goalsLabel : t;
          const active = tab === t;
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
              <span style={{ fontSize: 18 }}>{ICONS[t]}</span>
              <span style={{ fontSize: 11 }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// Dark mode is primary (UX/UI Blueprint §2) — ThemeProvider defaults to it.
// onSignOut is injected by the caller rather than read via useClerk() here,
// so this component never assumes a ClerkProvider ancestor exists (it's also
// rendered directly when Clerk isn't configured — see app/page.tsx).
export function AppShell({ onSignOut }: { onSignOut?: () => void } = {}) {
  return (
    <ThemeProvider>
      <Shell onSignOut={onSignOut} />
    </ThemeProvider>
  );
}
