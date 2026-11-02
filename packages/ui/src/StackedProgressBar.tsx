import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from './ThemeProvider';
import { radius, spacing } from './tokens';
import { Text } from './Text';
import { computeSegmentWidths } from './stackedProgressBarMath';

export { computeSegmentWidths } from './stackedProgressBarMath';

export interface Contributor {
  name: string;
  amount: number;
  color: string;
}

export interface StackedProgressBarProps {
  contributors: Contributor[];
  target: number;
  height?: number;
}

// Per-partner-attributed progress, never a single anonymous percentage —
// docs/03 UX/UX-UI Blueprint.md §7 edge case (unequal contributions must
// never read as a value judgment).
//
// Per-segment hover/tap tooltip, added 2026-11-02 to match TrendChart.tsx's
// existing interaction (this component had none at all — every segment was
// a bare, non-interactive View). One shared file for both platforms, unlike
// TrendChart's two-file split: segments are already discrete Pressables, so
// there's no continuous-coordinate math to diverge on. Pressable's
// onHoverIn/onHoverOut (react-native-web's extension, real on web, inert on
// native) gives web continuous hover; onPress gives native a tap-to-toggle
// equivalent, same "simpler than a full drag gesture" posture the mobile
// TrendChart's own comment already establishes for this app.
export function StackedProgressBar({ contributors, target, height = 12 }: StackedProgressBarProps) {
  const { colors } = useTheme();
  const widths = computeSegmentWidths(contributors, target);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex !== null ? contributors[activeIndex] : null;

  // Tracks the hovered/tapped segment (cumulative width of every prior
  // segment, plus half this one's own) — same "track the active point"
  // spirit as TrendChart's activeCoord.x positioning, just computed from
  // segment widths instead of a continuous coordinate. No translateX
  // centering (unlike a CSS tooltip might use) — RN's transform only takes
  // numeric pixel offsets on native, not percentage strings, so this just
  // clamps the left percentage within a safe range instead, same posture as
  // the mobile TrendChart's own non-centered clamp.
  const activeOffsetPercent =
    activeIndex !== null
      ? Math.min(
          Math.max(widths.slice(0, activeIndex).reduce((sum, w) => sum + w, 0), 0),
          70
        )
      : 0;

  return (
    <View style={{ position: 'relative' }}>
      <View
        style={{
          height,
          borderRadius: radius.pill,
          overflow: 'hidden',
          flexDirection: 'row',
          backgroundColor: colors.border,
        }}
      >
        {contributors.map((c, i) => (
          <Pressable
            key={c.name}
            role="button"
            aria-label={`${c.name} contributed $${c.amount.toLocaleString()}`}
            aria-pressed={activeIndex === i}
            onHoverIn={() => setActiveIndex(i)}
            onHoverOut={() => setActiveIndex((prev) => (prev === i ? null : prev))}
            onPress={() => setActiveIndex((prev) => (prev === i ? null : i))}
            style={{
              width: `${widths[i]}%`,
              backgroundColor: c.color,
            }}
          />
        ))}
      </View>

      {active && (
        <View
          style={{
            position: 'absolute',
            // bottom, not top: anchors the tooltip's bottom edge just above
            // the bar regardless of the tooltip's own rendered height (which
            // varies with font metrics across platforms), so it floats over
            // empty space above the card's title instead of colliding with
            // whatever sits right below the bar (the contributor legend,
            // for every real caller of this component) — found while
            // actually hovering it in a browser: a `top`-anchored version
            // overlapped that legend text.
            bottom: height + spacing.xs,
            left: `${activeOffsetPercent}%`,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            paddingVertical: 6,
            paddingHorizontal: 10,
            zIndex: 1,
          }}
          pointerEvents="none"
        >
          <Text variant="caption" secondary numberOfLines={1}>
            {active.name}
          </Text>
          <Text variant="bodySmall" style={{ fontWeight: '600' }} numberOfLines={1}>
            ${active.amount.toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );
}
