import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';
import { radius } from './tokens';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radiusSize?: number;
  style?: ViewStyle;
}

// Added 2026-08-13 to replace the plain "Loading…" text rows that used to
// gate BudgetScreen/GoalsScreen/HomeScreen's real-data fetches. That gate
// was removed the same session on the theory that it was pure friction
// ("we do not need that") — but the actual replacement (rendering each
// screen's mock/illustrative fallback data immediately, before the real
// fetch has even resolved) turned out to be worse: a real, signed-in user
// with a working backend now saw a brief but real flash of WRONG numbers
// (mock data) before the correct ones replaced them a moment later, on
// every load. Confirmed via runtime logs that the real fetches were
// succeeding (200s, no errors) — the flash was real, not a broken
// deployment. A neutral, content-free placeholder is the right middle
// ground: it satisfies the original complaint (no bare "Loading…" text
// sitting alone on the screen) without ever showing content that isn't
// true yet, the same standard this app already holds every other "is this
// real or fabricated" surface to (see HomeScreen's partnershipChecked,
// AppShell's Activity feed, etc.).
export function Skeleton({ width = '100%', height = 16, radiusSize = radius.small, style }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      // aria-hidden — this is a purely decorative placeholder standing in
      // for content that doesn't exist yet; nothing here is meant to be
      // announced to assistive tech.
      aria-hidden={true}
      style={[
        {
          width,
          height,
          borderRadius: radiusSize,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}
