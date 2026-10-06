import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text, useTheme } from '@noivos/ui';

// Native port of apps/web's ProgressRing.tsx (raw <svg>/<div>, DOM-only —
// doesn't render on native at all) using react-native-svg, added 2026-10-06
// as part of bringing apps/mobile's dashboard up to visual parity with
// web. Same meter-form reasoning as the web original: fill carries
// severity, the unfilled track is the fill color at low opacity rather
// than a neutral gray, so state reads across the whole ring, not just the
// filled arc.
export function ProgressRing({
  percent,
  color,
  size = 128,
  label,
  sublabel,
}: {
  percent: number;
  color: string;
  size?: number;
  label: string;
  sublabel?: string;
}) {
  const { colors } = useTheme();
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percent, 0), 100);
  const offset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeOpacity={0.16} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
        />
      </Svg>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text style={{ fontWeight: '700', fontSize: 24, color: colors.textPrimary }}>{Math.round(clamped)}%</Text>
        <Text variant="caption" secondary style={{ textAlign: 'center' }}>
          {label}
        </Text>
        {sublabel && (
          <Text variant="caption" secondary>
            {sublabel}
          </Text>
        )}
      </View>
    </View>
  );
}
