// Design tokens per docs/03 UX/Design System.md — originally generated from
// the approved brand moodboard's vivid palette (neon lime/hot pink/electric
// blue/Bebas Neue). Repainted 2026-08-05 per founder direction ("make it a
// closer look to Origin... our UI and UX is ugly") toward Origin's calmer,
// editorial aesthetic: warm neutrals, muted sophisticated accent colors,
// and a serif/sans type pairing instead of a shouting all-caps poster font.
// Deliberately keeping every token *name* identical to before (sourLime,
// sourPunch, etc.) even though the hex values no longer read as those
// names literally describe — every screen references these by name, so
// repainting the values here repaints the whole app without touching each
// screen file. Dark mode stays primary (confirmed in UX/UI Blueprint §2).

import { Platform } from 'react-native';

export const palette = {
  sourLime: '#4F7A5B', // was neon lime #C6FF00 — now a muted forest green
  sourPunch: '#B0684B', // was hot pink #FF2D8E — now a muted terracotta/clay
  electricBlue: '#4C6B8A', // was electric blue #0066FF — now a soft slate blue
  citrus: '#C9A227', // was bright yellow #FFE600 — now a muted warm gold
  grape: '#6B5B95', // was vivid purple #8A2BE2 — now a dusty plum
  sourCloud: '#F5F1E6', // was cool white #F5F5F7 — now a warm ivory
  licorice: '#18160F', // was pure black #0D0D0F — now a warm near-black
} as const;

export interface ColorTokens {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  primary: string;
  secondary: string;
  accent: string;
  highlight: string;
  info: string;
  success: string;
  warning: string;
  border: string;
}

export const colorTokens: Record<'dark' | 'light', ColorTokens> = {
  dark: {
    background: palette.licorice,
    surface: '#221F17', // a touch lighter/warmer than background so cards read as raised, not just outlined
    textPrimary: palette.sourCloud,
    textSecondary: 'rgba(245, 241, 230, 0.62)',
    primary: palette.sourLime,
    secondary: palette.sourPunch,
    accent: palette.electricBlue,
    highlight: palette.citrus,
    info: palette.grape,
    success: palette.sourLime,
    warning: palette.citrus,
    border: 'rgba(245, 241, 230, 0.10)',
  },
  light: {
    background: '#FAF7F0',
    surface: '#FFFFFF',
    textPrimary: '#221F17',
    textSecondary: 'rgba(34, 31, 23, 0.62)',
    primary: palette.sourLime,
    secondary: palette.sourPunch,
    accent: palette.electricBlue,
    highlight: palette.citrus,
    info: palette.grape,
    success: palette.sourLime,
    warning: palette.citrus,
    border: 'rgba(34, 31, 23, 0.10)',
  },
} as const;

// Text-on-color enforcement table — Design System §2. Never choose a
// text color for one of these backgrounds outside this map.
export const textOnColor: Record<string, string> = {
  [palette.sourLime]: palette.sourCloud,
  [palette.sourPunch]: palette.sourCloud,
  [palette.electricBlue]: palette.sourCloud,
  [palette.citrus]: palette.licorice,
  [palette.grape]: palette.sourCloud,
};

export function getTextColorFor(background: string): string {
  return textOnColor[background] ?? palette.sourCloud;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

// Toned down from the original bubbly/pill-everywhere scale (large: 24) —
// Origin's cards read as grounded rectangles with gently rounded corners,
// not floating capsules. Buttons/badges still use `pill` for their shape.
export const radius = {
  small: 6,
  medium: 12,
  large: 18,
  pill: 999,
} as const;

// apps/mobile loads matching family names via @expo-google-fonts
// (useAppFonts.ts) — see that file for the native registration this web
// config assumes. apps/web loads the same typefaces via next/font/google
// and exposes them as CSS variables (see app/layout.tsx); RNW passes a
// `var(--...)` fontFamily value straight through to compiled CSS.
//
// Display family switched from Bebas Neue (a caps-only condensed poster
// font — its "lowercase" glyphs are visually indistinguishable from
// uppercase, which is why every headline in the old UI read as SHOUTING)
// to Fraunces, a soft editorial serif with real lowercase letterforms,
// much closer to Origin's calmer type voice. Inter stays for body copy.
const displayFamily = Platform.select({ web: 'var(--font-serif)', default: 'Fraunces_600SemiBold' });
const interRegular = Platform.select({ web: 'var(--font-inter)', default: 'Inter_400Regular' });
const interMedium = Platform.select({ web: 'var(--font-inter)', default: 'Inter_500Medium' });

export const typography = {
  display: { fontFamily: displayFamily, fontWeight: '600', fontSize: 40, lineHeight: 46 },
  h1: { fontFamily: displayFamily, fontWeight: '600', fontSize: 30, lineHeight: 36 },
  h2: { fontFamily: displayFamily, fontWeight: '600', fontSize: 23, lineHeight: 28 },
  h3: { fontFamily: displayFamily, fontWeight: '600', fontSize: 18, lineHeight: 24 },
  bodyLarge: { fontFamily: interMedium, fontWeight: '500', fontSize: 17, lineHeight: 24 },
  body: { fontFamily: interRegular, fontWeight: '400', fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: interRegular, fontWeight: '400', fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: interMedium, fontWeight: '500', fontSize: 11, lineHeight: 14 },
} as const;

export const motion = {
  micro: 130,
  standard: 250,
  celebratory: 750,
} as const;

export type ThemeMode = 'dark' | 'light';
