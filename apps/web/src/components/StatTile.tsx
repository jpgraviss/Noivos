"use client";

import { Card, Text, palette, spacing, useTheme } from "@noivos/ui";

export interface StatTileProps {
  label: string;
  value: string;
  deltaLabel?: string;
  deltaDirection?: "up" | "down";
  deltaIsGood?: boolean;
  sparkline?: number[];
}

// Stat tile contract (label/value/delta/trend) per the dataviz skill's
// marks-and-anatomy reference. The value is proportional Inter, not the
// brand's Bebas Neue display face — a hero number reads better in a sans
// than a condensed display face, per that guidance.
export function StatTile({ label, value, deltaLabel, deltaDirection, deltaIsGood, sparkline }: StatTileProps) {
  const { colors } = useTheme();
  const deltaColor =
    deltaDirection === undefined
      ? colors.textSecondary
      : deltaIsGood
        ? palette.sourLime
        : palette.sourPunch;

  return (
    <Card style={{ gap: spacing.xs }}>
      <Text
        variant="caption"
        secondary
        style={{ letterSpacing: 1, textTransform: "uppercase" }}
      >
        {label}
      </Text>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.sm }}>
        <span style={{ fontFamily: "var(--font-inter)", fontWeight: 700, fontSize: 28, color: colors.textPrimary }}>
          {value}
        </span>
        {sparkline && sparkline.length > 1 && <Sparkline points={sparkline} />}
      </div>
      {deltaLabel && (
        <Text variant="bodySmall" style={{ color: deltaColor, fontWeight: "600" }}>
          {deltaDirection === "down" ? "▼" : "▲"} {deltaLabel}
        </Text>
      )}
    </Card>
  );
}

// Decorative 12-point sparkline — no axis, no hover (it rides inside a
// compact stat tile, not a standalone chart); the accent line is the only
// series so it needs no legend.
function Sparkline({ points }: { points: number[] }) {
  const width = 72;
  const height = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(height - ((p - min) / range) * height).toFixed(1)}`)
    .join(" ");

  return (
    <svg width={width} height={height} style={{ flexShrink: 0 }} aria-hidden="true">
      <path d={path} fill="none" stroke={palette.electricBlue} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
