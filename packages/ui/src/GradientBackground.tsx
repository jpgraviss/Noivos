import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { darkGradientStops } from './tokens';

// Fills its parent with the dark-mode vignette (see tokens.ts's
// darkGradientStops) — built with react-native-svg, the same library
// TrendChart.tsx already uses for its own area-fill gradient, rather than
// adding expo-linear-gradient as a new dependency for one background.
// objectBoundingBox (the default for x1/y1/x2/y2 here) scales the gradient
// to the <Rect>'s actual rendered size, so this works at any screen height
// without knowing it up front. pointerEvents="none" so it never intercepts
// touches meant for the content stacked on top of it.
export function GradientBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id="appBackgroundGradient" x1="0" y1="0" x2="0" y2="1">
          {darkGradientStops.map((stop) => (
            <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#appBackgroundGradient)" />
    </Svg>
  );
}
