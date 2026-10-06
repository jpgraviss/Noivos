import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Card, Text, palette, spacing, useTheme } from '@noivos/ui';

export interface StatTileProps {
  label: string;
  value: string;
  deltaLabel?: string;
  deltaDirection?: 'up' | 'down';
  deltaIsGood?: boolean;
  sparkline?: number[];
}

// Native port of apps/web's StatTile.tsx (raw <div>/<span>/<svg> — DOM-only,
// doesn't render on native) using RN View/Text + react-native-svg, added
// 2026-10-06 bringing apps/mobile's dashboard up to visual parity with web.
// Same stat-tile contract (label/value/delta/trend) per the dataviz
// skill's marks-and-anatomy reference, and the same colors.success/
// colors.danger routing (never palette.sourLime/sourPunch directly) —
// raw foreground text on Card's own surface background fails WCAG AA in
// light mode at this size, same defect class fixed across this app in
// August 2026.
export function StatTile({ label, value, deltaLabel, deltaDirection, deltaIsGood, sparkline }: StatTileProps) {
  const { colors } = useTheme();
  const deltaColor = deltaDirection === undefined ? colors.textSecondary : deltaIsGood ? colors.success : colors.danger;

  return (
    <Card style={{ gap: spacing.xs }}>
      <Text variant="caption" secondary style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text style={{ fontWeight: '700', fontSize: 28, color: colors.textPrimary }}>{value}</Text>
        {sparkline && sparkline.length > 1 && <Sparkline points={sparkline} />}
      </View>
      {deltaLabel && (
        <Text variant="bodySmall" style={{ color: deltaColor, fontWeight: '600' }}>
          {deltaDirection === 'down' ? '▼' : '▲'} {deltaLabel}
        </Text>
      )}
    </Card>
  );
}

// Decorative 12-point sparkline — no axis, no hover (rides inside a
// compact stat tile, not a standalone chart); the accent line is the only
// series so it needs no legend. Same shape as the web original's own
// Sparkline, just drawn with react-native-svg's Path instead of raw <svg>.
function Sparkline({ points }: { points: number[] }) {
  const width = 72;
  const height = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(height - ((p - min) / range) * height).toFixed(1)}`)
    .join(' ');

  return (
    <Svg width={width} height={height} aria-hidden={true}>
      <Path d={path} fill="none" stroke={palette.electricBlue} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
