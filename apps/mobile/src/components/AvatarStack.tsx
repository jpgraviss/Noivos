import { View } from 'react-native';
import { Text, getTextColorFor, palette, useTheme } from '@noivos/ui';

function initials(name: string) {
  return name.slice(0, 1).toUpperCase();
}

// Native port of apps/web's AvatarStack.tsx (raw <div> — DOM-only, doesn't
// render on native) using RN View, added 2026-10-06 bringing apps/mobile's
// dashboard up to visual parity with web. Same named-couple identity chip
// (Monarch's "Dylan / Jessie" pattern) — reinforces the Partnership as the
// core entity rather than a solo user.
export function AvatarStack({ names, colors }: { names: [string, string]; colors?: [string, string] }) {
  const { colors: theme } = useTheme();
  const [nameA, nameB] = names;
  const [colorA, colorB] = colors ?? [palette.sourLime, palette.sourPunch];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flexDirection: 'row' }}>
        <Avatar name={nameA} color={colorA} ringColor={theme.background} style={{ zIndex: 2 }} />
        <Avatar name={nameB} color={colorB} ringColor={theme.background} style={{ marginLeft: -12 }} />
      </View>
      <Text variant="bodySmall" secondary>
        {nameA} &amp; {nameB}
      </Text>
    </View>
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
  style?: object;
}) {
  return (
    <View
      style={[
        {
          width: 32,
          height: 32,
          borderRadius: 999,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: ringColor,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: getTextColorFor(color) }}>{initials(name)}</Text>
    </View>
  );
}
