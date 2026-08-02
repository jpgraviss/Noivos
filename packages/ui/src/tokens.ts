// Design tokens per docs/03 UX/Design System.md — generated from the
// approved Brand Guidelines palette. Dark mode is primary (confirmed
// in docs/03 UX/UX-UI Blueprint.md §2).

export const palette = {
  sourLime: '#C6FF00',
  sourPunch: '#FF2D8E',
  electricBlue: '#0066FF',
  citrus: '#FFE600',
  grape: '#8A2BE2',
  sourCloud: '#F5F5F7',
  licorice: '#0D0D0F',
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
    surface: '#17171A',
    textPrimary: palette.sourCloud,
    textSecondary: 'rgba(245, 245, 247, 0.64)',
    primary: palette.sourLime,
    secondary: palette.sourPunch,
    accent: palette.electricBlue,
    highlight: palette.citrus,
    info: palette.grape,
    success: palette.sourLime,
    warning: palette.citrus,
    border: 'rgba(245, 245, 247, 0.12)',
  },
  light: {
    background: palette.sourCloud,
    surface: '#FFFFFF',
    textPrimary: palette.licorice,
    textSecondary: 'rgba(13, 13, 15, 0.64)',
    primary: palette.sourLime,
    secondary: palette.sourPunch,
    accent: palette.electricBlue,
    highlight: palette.citrus,
    info: palette.grape,
    success: palette.sourLime,
    warning: palette.citrus,
    border: 'rgba(13, 13, 15, 0.10)',
  },
} as const;

// Text-on-color enforcement table — Design System §2. Never choose a
// text color for one of these backgrounds outside this map.
export const textOnColor: Record<string, string> = {
  [palette.sourLime]: palette.licorice,
  [palette.sourPunch]: palette.licorice,
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

export const radius = {
  small: 8,
  medium: 16,
  large: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontFamily: 'BebasNeue_400Regular', fontSize: 40, lineHeight: 44 },
  h1: { fontFamily: 'BebasNeue_400Regular', fontSize: 32, lineHeight: 36 },
  h2: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, lineHeight: 28 },
  h3: { fontFamily: 'BebasNeue_400Regular', fontSize: 20, lineHeight: 24 },
  bodyLarge: { fontFamily: 'Inter_500Medium', fontSize: 17, lineHeight: 24 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 14 },
} as const;

export const motion = {
  micro: 130,
  standard: 250,
  celebratory: 750,
} as const;

export type ThemeMode = 'dark' | 'light';
