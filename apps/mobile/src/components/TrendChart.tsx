import { useMemo, useState } from 'react';
import { View, Pressable, type LayoutChangeEvent, type GestureResponderEvent } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Text, palette, useTheme } from '@noivos/ui';

export interface TrendPoint {
  label: string;
  value: number;
}

// Native port of apps/web's TrendChart.tsx (raw <svg> with mouse
// onMouseMove/onMouseLeave hover — DOM-only, doesn't render on native and
// has no touch equivalent) using react-native-svg, added 2026-10-06
// bringing apps/mobile's dashboard up to visual parity with web. Same
// single-series area/line form and mark specs (2px line, ~18% opacity
// area fill, hairline recessive baseline, 6/4px end-marker with a
// surface-color ring, direct end-label) per the dataviz skill. Touch has
// no hover state, so the web original's continuous-drag crosshair becomes
// a simpler tap-to-inspect here: tapping the chart selects the nearest
// point's tooltip, tapping the same point again (or anywhere outside while
// already selected) clears it — deliberately simpler than a full drag
// gesture, matching this app's established "mobile keeps interactions
// simpler" posture elsewhere (e.g. AICoachScreen's native Share button
// replacing web's hover-driven copy affordance).
export function TrendChart({ points, height = 160 }: { points: TrendPoint[]; height?: number }) {
  const { colors } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const width = 640;
  const padding = 12;

  const { path, areaPath, coords, max } = useMemo(() => {
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = (width - padding * 2) / (points.length - 1);
    const coords = values.map((v, i) => ({
      x: padding + i * step,
      y: padding + (height - padding * 2) * (1 - (v - min) / range),
    }));
    const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const areaPath = `${path} L ${coords[coords.length - 1].x.toFixed(1)} ${height - padding} L ${coords[0].x.toFixed(1)} ${height - padding} Z`;
    return { path, areaPath, coords, min, max };
  }, [points, height]);

  const active = selectedIndex ?? points.length - 1;
  const activePoint = points[active];
  const activeCoord = coords[active];

  function handleLayout(e: LayoutChangeEvent) {
    setContainerWidth(e.nativeEvent.layout.width);
  }

  function handlePress(e: GestureResponderEvent) {
    if (!containerWidth) return;
    const relX = (e.nativeEvent.locationX / containerWidth) * width;
    const step = (width - padding * 2) / (points.length - 1);
    const idx = Math.min(Math.max(Math.round((relX - padding) / step), 0), points.length - 1);
    setSelectedIndex((prev) => (prev === idx ? null : idx));
  }

  return (
    <View onLayout={handleLayout}>
      <Pressable onPress={handlePress}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {/* recessive baseline gridline */}
          <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={colors.border} strokeWidth={1} />
          <Defs>
            <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={palette.electricBlue} stopOpacity={0.18} />
              <Stop offset="100%" stopColor={palette.electricBlue} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill="url(#trendFill)" stroke="none" />
          <Path d={path} fill="none" stroke={palette.electricBlue} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {selectedIndex !== null && (
            <Line x1={activeCoord.x} y1={padding} x2={activeCoord.x} y2={height - padding} stroke={colors.border} strokeWidth={1} />
          )}

          {/* end-marker: 6/4px dot with a surface-color ring */}
          <Circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={6} fill={colors.surface} />
          <Circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={4} fill={palette.electricBlue} />

          {selectedIndex !== null && (
            <>
              <Circle cx={activeCoord.x} cy={activeCoord.y} r={6} fill={colors.surface} />
              <Circle cx={activeCoord.x} cy={activeCoord.y} r={4} fill={palette.electricBlue} />
            </>
          )}
        </Svg>
      </Pressable>

      {/* direct end-label */}
      <View style={{ position: 'absolute', top: coords[coords.length - 1].y - 28, right: 4 }}>
        <Text variant="bodySmall" style={{ fontWeight: '600' }}>
          ${max.toLocaleString()}
        </Text>
      </View>

      {selectedIndex !== null && (
        <View
          style={{
            position: 'absolute',
            left: `${Math.min((activeCoord.x / width) * 100, 70)}%`,
            top: 0,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            paddingVertical: 6,
            paddingHorizontal: 10,
          }}
          pointerEvents="none"
        >
          <Text variant="caption" secondary>
            {activePoint.label}
          </Text>
          <Text variant="bodySmall" style={{ fontWeight: '600' }}>
            ${activePoint.value.toLocaleString()}
          </Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text variant="caption" secondary>
          {points[0].label}
        </Text>
        <Text variant="caption" secondary>
          {points[points.length - 1].label}
        </Text>
      </View>
    </View>
  );
}
