import React, { createContext, useContext, useMemo, useState } from 'react';
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
