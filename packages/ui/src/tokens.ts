// Design tokens per docs/03 UX/Design System.md — originally generated from
// the approved brand moodboard's vivid palette (neon lime/hot pink/electric
// blue/Bebas Neue). Repainted 2026-08-05 toward Origin's calmer, editorial
// aesthetic (muted accents, warm neutrals, Fraunces serif) per founder
// direction — then repainted again the same day ("Merge the brands
// together. Need the colors to be more fun") to bring real vibrancy back:
// this is the merge — Origin's disciplined layout/typography (Fraunces,
// grounded radius, restrained card borders, a near-black rather than
// stark-black background) carries the accent colors from the *original*
// moodboard (close derivatives, not muted-down versions), instead of
// either extreme. Token *names* stay identical (sourLime, sourPunch, etc.)
// regardless of which round's hex value they hold — every screen
// references these by name, so repainting the values here repaints the
// whole app without touching each screen file. Dark mode stays primary
// (confirmed in UX/UI Blueprint §2).
//
// Note: the dedicated categorical chart palette in apps/web's/apps/mobile's
// BudgetScreen.tsx (BUDGET_CATEGORY_COLORS) is intentionally NOT tied to
// these tokens — reusing vivid UI-accent colors directly as chart marks
// fails the dataviz skill's categorical validator (lightness band/chroma/
// CVD checks), same as it did for the muted round. That dedicated,
// validated set is unaffected by this change and stays as-is.

import { Platform } from 'react-native';

export const palette = {
  sourLime: '#B8F000', // vivid lime — close to the original moodboard's #C6FF00, very slightly tempered
  sourPunch: '#FF2D8E', // the original moodboard's hot pink, unchanged — it was never the "ugly" complaint
  electricBlue: '#1E7FFF', // close to the original #0066FF, a touch brighter/friendlier
  citrus: '#FFD500', // close to the original #FFE600, slightly warmer gold-yellow
  grape: '#9B4DFF', // brighter/more energetic than the original #8A2BE2
  sourCloud: '#F5F3F0', // soft warm white — kept from the Origin pass, wasn't the complaint either
  licorice: '#141316', // near-black with the faintest cool-neutral tone — dark enough for vivid accents to pop, warmer than the original's stark #0D0D0F
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
  warning: string;
  border: string;
  // Added 2026-08-13: every form-error message in the app used to hardcode
  // palette.sourPunch directly as its text color (not routed through
  // getTextColorFor — this is colored text sitting on the theme's own
  // neutral background/card, not the reverse). That passes WCAG AA in dark
  // mode (sourPunch on licorice background/#1E1D21 card: 5.305:1/4.803:1)
  // but fails in light mode (sourPunch on #FAFAF8 background/#FFFFFF card:
  // 3.339:1/3.490:1) — and light mode is a real, user-toggleable, first-
  // class mode (MoreScreen's own copy: "light mode is available too"), not
  // a fallback. A single static hex can't pass both modes at once — this
  // is a genuinely theme-aware token, unlike the sourLime/textOnColor
  // fixes, which just needed one corrected constant. `danger` in dark mode
  // stays sourPunch itself (already passes); light mode uses a darkened
  // variant of the same hue (0.8x RGB scale — #CC2471, chosen because it's
  // the least darkening needed to clear 4.5:1 against both the light
  // background and light card surface: 4.948:1/5.171:1) rather than a
  // different color entirely, so error text still reads as "the same red/
  // pink," just deeper in light mode the way most brand palettes need a
  // shifted foreground per theme to stay legible.
  danger: string;
  // Added 2026-08-14, same defect class as `danger` above: several screens
  // used `colors.primary`/`palette.sourLime` directly as a foreground text/
  // icon color (active nav tab, "invite sent" confirmation, an under-budget
  // stat delta, the AI Coach send button) rather than as a Button/pill
  // *background* routed through getTextColorFor. sourLime on licorice
  // (dark background/surface) measures ~13.7:1/~14.3:1 — comfortably
  // legible — but on light mode's #FAFAF8 background/#FFFFFF surface it's
  // ~1.30:1/~1.35:1, nowhere near the 4.5:1 minimum. `success` already
  // existed as a token (dark: sourLime, light: sourLime — unused anywhere
  // until this fix) but shared the exact same one-value-both-modes defect
  // as `danger` did before 2026-08-13. Same treatment: dark mode keeps
  // sourLime itself (already passes), light mode gets a darkened variant
  // of the same hue (0.52x RGB scale — #5F7C00, the least darkening needed
  // to clear 4.5:1 against both the light background and light surface:
  // 4.599:1/4.806:1) so "good/active" still reads as the same lime green,
  // just deep enough to stay legible in light mode.
  success: string;
}

export const colorTokens: Record<'dark' | 'light', ColorTokens> = {
  dark: {
    background: palette.licorice,
    surface: '#1E1D21', // a touch lighter than background so cards read as raised, not just outlined
    textPrimary: palette.sourCloud,
    textSecondary: 'rgba(245, 243, 240, 0.64)',
    primary: palette.sourLime,
    secondary: palette.sourPunch,
    accent: palette.electricBlue,
    highlight: palette.citrus,
    info: palette.grape,
    warning: palette.citrus,
    border: 'rgba(245, 243, 240, 0.12)',
    danger: palette.sourPunch,
    success: palette.sourLime,
  },
  light: {
    background: '#FAFAF8',
    surface: '#FFFFFF',
    textPrimary: '#18171A',
    textSecondary: 'rgba(24, 23, 26, 0.64)',
    primary: palette.sourLime,
    secondary: palette.sourPunch,
    accent: palette.electricBlue,
    highlight: palette.citrus,
    info: palette.grape,
    warning: palette.citrus,
    border: 'rgba(24, 23, 26, 0.10)',
    danger: '#CC2471',
    success: '#5F7C00',
  },
} as const;

// Text-on-color enforcement table — Design System §2. Never choose a
// text color for one of these backgrounds outside this map.
//
// sourLime -> licorice (found 2026-08-11, was sourCloud): sourLime's actual
// WCAG relative luminance (0.725) sits right next to sourCloud's (0.898) —
// a measured contrast ratio of ~1.22:1, nowhere close to the 4.5:1 (normal
// text) or 3:1 (large/bold text) minimum. Off-white text on a bright
// neon-lime background was effectively illegible on every default
// (variant="primary") Button in both apps — the marketing page's main
// "Get started" CTA, "Send invite", the identity Save button, and more,
// in both light and dark mode identically (colorTokens.primary resolves to
// sourLime in both). citrus, a similarly light/high-luminance accent, was
// already correctly paired with dark licorice text (~13:1) — sourLime now
// gets the same treatment, which also measures ~13.7:1.
// sourPunch/electricBlue/grape -> licorice (found 2026-08-13, were all
// sourCloud): computed WCAG contrast against sourCloud was 3.151:1,
// 3.426:1, and 3.870:1 respectively — all below the 4.5:1 normal-text
// minimum, hit at real, non-large/bold sizes across both apps (chat bubble
// text in AICoachScreen, HomeScreen's "Mark as done" button and activity-
// feed avatar initials, PartnershipSettings' Disconnect button, mobile
// SignInScreen's "Continue with Apple" button). licorice measures 5.305:1
// against sourPunch and 4.879:1 against electricBlue — both comfortably
// pass — but only 4.319:1 against grape, still short of 4.5:1: grape's own
// luminance (0.195) sits close enough to licorice's near-black (0.0067)
// that licorice alone isn't quite dark enough. Rather than adjust grape's
// actual brand hue to accommodate licorice, grape gets true black
// (0.0, ~4.899:1) as this table's one deliberate exception — narrower and
// safer than touching a core accent color to fit a text-contrast table.
export const textOnColor: Record<string, string> = {
  [palette.sourLime]: palette.licorice,
  [palette.sourPunch]: palette.licorice,
  [palette.electricBlue]: palette.licorice,
  [palette.citrus]: palette.licorice,
  [palette.grape]: "#000000",
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
