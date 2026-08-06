import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { colorTokens, ColorTokens, ThemeMode } from './tokens';

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ColorTokens;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Dark mode is primary per docs/03 UX/UX-UI Blueprint.md §2.
export function ThemeProvider({ children, initialMode = 'dark' as ThemeMode }: { children: React.ReactNode; initialMode?: ThemeMode }) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  // Web-only, guarded (there's no `document` on native — this file is
  // shared by apps/mobile too). Found during an accessibility pass
  // (2026-08-06): globals.css hardcodes `html { color-scheme: dark }`,
  // which never updated when a user actually switched to light mode via
  // MoreScreen's toggle. `color-scheme` drives how the *browser* paints
  // native controls this app doesn't otherwise style — an `<input
  // type="date">`'s calendar popup (used in IdentitySettings/GoalsScreen),
  // scrollbars, etc. — so a user in light mode was still getting a
  // dark-themed date picker over a now-light page. Setting it inline here
  // wins over the CSS rule (inline style beats a stylesheet rule
  // regardless of specificity), while the CSS rule stays as the
  // pre-hydration fallback, matching the app's dark-by-default posture.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.colorScheme = mode;
    }
  }, [mode]);

  const value = useMemo(
    () => ({ mode, colors: colorTokens[mode], setMode }),
    [mode]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
