"use client";

import { useMemo, useState } from "react";
import { Text, palette, useTheme } from "@noivos/ui";

export interface TrendPoint {
  label: string;
  value: number;
}

// A single-series area/line chart — line/area is the correct form for
// magnitude-over-time (dataviz skill, choosing-a-form). Single series needs
// no legend; it gets a hover crosshair + tooltip per that skill's
// interaction reference, since this is a standalone chart, not a bare stat
// tile. Mark specs: 2px line, ~10% opacity area fill, hairline recessive
// gridline, 8px end-marker with a surface-color ring, direct end-label.
export function TrendChart({ points, height = 160 }: { points: TrendPoint[]; height?: number }) {
  const { colors } = useTheme();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
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
    const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
    const areaPath = `${path} L ${coords[coords.length - 1].x.toFixed(1)} ${height - padding} L ${coords[0].x.toFixed(1)} ${height - padding} Z`;
    return { path, areaPath, coords, min, max };
  }, [points, height]);

  const active = hoverIndex ?? points.length - 1;
  const activePoint = points[active];
  const activeCoord = coords[active];

  return (
    <div style={{ position: "relative" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ display: "block", cursor: "crosshair" }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * width;
          const step = (width - padding * 2) / (points.length - 1);
          const idx = Math.round((relX - padding) / step);
          setHoverIndex(Math.min(Math.max(idx, 0), points.length - 1));
        }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* recessive baseline gridline */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={colors.border} strokeWidth={1} />
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.electricBlue} stopOpacity={0.18} />
            <stop offset="100%" stopColor={palette.electricBlue} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#trendFill)" stroke="none" />
        <path d={path} fill="none" stroke={palette.electricBlue} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {hoverIndex !== null && (
          <line x1={activeCoord.x} y1={padding} x2={activeCoord.x} y2={height - padding} stroke={colors.border} strokeWidth={1} />
        )}

        {/* end-marker: 8px dot with a 2px surface-color ring */}
        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={6} fill={colors.surface} />
        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={4} fill={palette.electricBlue} />

        {hoverIndex !== null && (
          <>
            <circle cx={activeCoord.x} cy={activeCoord.y} r={6} fill={colors.surface} />
            <circle cx={activeCoord.x} cy={activeCoord.y} r={4} fill={palette.electricBlue} />
          </>
        )}
      </svg>

      {/* direct end-label */}
      <div style={{ position: "absolute", top: coords[coords.length - 1].y - 28, right: 4 }}>
        <Text variant="bodySmall" style={{ fontWeight: "600" }}>
          ${max.toLocaleString()}
        </Text>
      </div>

      {hoverIndex !== null && (
        <div
          style={{
            position: "absolute",
            left: `${(activeCoord.x / width) * 100}%`,
            top: 0,
            transform: activeCoord.x > width * 0.7 ? "translateX(-100%)" : "translateX(8px)",
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            padding: "6px 10px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Text variant="caption" secondary>
            {activePoint.label}
          </Text>
          <Text variant="bodySmall" style={{ fontWeight: "600" }}>
            ${activePoint.value.toLocaleString()}
          </Text>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <Text variant="caption" secondary>
          {points[0].label}
        </Text>
        <Text variant="caption" secondary>
          {points[points.length - 1].label}
        </Text>
      </div>
    </div>
  );
}
