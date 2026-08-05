"use client";

import type { CSSProperties } from "react";
import { Text, getTextColorFor, palette, useTheme } from "@noivos/ui";

function initials(name: string) {
  return name.slice(0, 1).toUpperCase();
}

// A named-couple identity chip (Monarch's "Dylan / Jessie" pattern) —
// reinforces the Partnership as the core entity rather than a solo user.
export function AvatarStack({ names, colors }: { names: [string, string]; colors?: [string, string] }) {
  const { colors: theme } = useTheme();
  const [nameA, nameB] = names;
  const [colorA, colorB] = colors ?? [palette.sourLime, palette.sourPunch];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex" }}>
        <Avatar name={nameA} color={colorA} ringColor={theme.background} style={{ zIndex: 2 }} />
        <Avatar name={nameB} color={colorB} ringColor={theme.background} style={{ marginLeft: -12 }} />
      </div>
      <Text variant="bodySmall" secondary>
        {nameA} &amp; {nameB}
      </Text>
    </div>
  );
}

function Avatar({
  name,
  color,
  ringColor,
  style,
}: {
  name: string;
  color: string;
  ringColor: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 999,
        backgroundColor: color,
        border: `2px solid ${ringColor}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-inter)",
        fontSize: 13,
        fontWeight: 700,
        color: getTextColorFor(color),
        ...style,
      }}
    >
      {initials(name)}
    </div>
  );
}
