"use client";

import { Text, useTheme } from "@noivos/ui";

// Meter form: fill carries severity, unfilled track is the fill color at
// low opacity ("blue-on-blue") rather than a neutral gray, so state reads
// across the whole ring, not just the filled arc.
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
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeOpacity={0.16} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <span style={{ fontFamily: "var(--font-inter)", fontWeight: 700, fontSize: 24, color: colors.textPrimary }}>
          {Math.round(clamped)}%
        </span>
        <Text variant="caption" secondary style={{ textAlign: "center" }}>
          {label}
        </Text>
        {sublabel && (
          <Text variant="caption" secondary>
            {sublabel}
          </Text>
        )}
      </div>
    </div>
  );
}
