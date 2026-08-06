import { useState } from "react";
import { View, Pressable } from "react-native";
import { ChevronDown, ChevronRight, LogOut, Settings, Sparkles } from "lucide-react-native";
import { Card, Text, useTheme, spacing } from "@noivos/ui";
import { ScreenGrid, ScreenGridWide } from "../components/ScreenLayout";
import { IdentitySettings } from "../components/IdentitySettings";
import { PartnershipSettings } from "../components/PartnershipSettings";

// Honest "not built yet" copy per row, not a silent dead end — same posture
// as the rest of the app (e.g. Partnership invites plainly stating no
// email service exists). Added 2026-08-05 after an audit found these were
// plain <View>s with a chevron and no onPress at all, the same "dead
// button" issue already fixed on the topbar's Search/Notifications/
// Settings icons.
const sections: { title: string; icon: typeof Settings; items: { label: string; note: string }[] }[] = [
  {
    title: "Community",
    icon: Sparkles,
    items: [
      { label: "Challenges", note: "Not built yet — savings challenges with your partner are coming soon." },
      { label: "Milestones shared", note: "Not built yet — shared celebration moments are coming soon." },
    ],
  },
  {
    title: "Account",
    icon: Settings,
    items: [
      { label: "Notifications", note: "Not built yet — you'll be able to manage notification preferences here soon." },
      { label: "Subscription", note: "Not built yet — Noivos is free for now; billing will live here once Premium launches." },
      { label: "Support", note: "Not built yet — for now, reach out to the team directly." },
    ],
  },
];

export interface MoreScreenProps {
  onSignOut?: () => void;
  userName?: string;
}

export function MoreScreen({ onSignOut, userName }: MoreScreenProps = {}) {
  const { colors, mode, setMode } = useTheme();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Best-effort persistence — if there's no database/Clerk reachable, the
  // mode still changes locally via setMode below, it just won't survive a
  // reload. Same graceful-passthrough posture as everywhere else.
  function selectMode(m: "dark" | "light") {
    setMode(m);
    fetch("/api/profile/appearance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: m }),
    }).catch(() => {});
  }

  return (
    <ScreenGrid>
      <ScreenGridWide>
        <Text variant="h1">More</Text>
      </ScreenGridWide>

      <IdentitySettings defaultName={userName} />

      <PartnershipSettings />

      <Card>
        <Text variant="h3">Appearance</Text>
        <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
          Dark is Noivos&apos; default look — light mode is available too.
        </Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {(["dark", "light"] as const).map((m) => (
            <Text
              key={m}
              onPress={() => selectMode(m)}
              variant="bodySmall"
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 999,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: mode === m ? colors.primary : "transparent",
                color: mode === m ? colors.background : colors.textPrimary,
                fontWeight: "600",
              }}
            >
              {m === "dark" ? "Dark" : "Light"}
            </Text>
          ))}
        </View>
      </Card>

      {sections.map((section) => (
        <Card key={section.title}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
            <section.icon size={16} color={colors.textSecondary} />
            <Text variant="h3">{section.title}</Text>
          </View>
          {section.items.map((item) => {
            const expanded = expandedItem === item.label;
            return (
              <View key={item.label}>
                <Pressable
                  onPress={() => setExpandedItem(expanded ? null : item.label)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Text variant="body" secondary>
                    {item.label}
                  </Text>
                  {expanded ? (
                    <ChevronDown size={16} color={colors.textSecondary} />
                  ) : (
                    <ChevronRight size={16} color={colors.textSecondary} />
                  )}
                </Pressable>
                {expanded && (
                  <Text variant="bodySmall" secondary style={{ paddingBottom: 10 }}>
                    {item.note}
                  </Text>
                )}
              </View>
            );
          })}
        </Card>
      ))}

      {onSignOut && (
        <Card>
          <Pressable onPress={onSignOut} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <LogOut size={16} color={colors.textPrimary} />
            <Text variant="body" style={{ fontWeight: "600" }}>
              Sign Out
            </Text>
          </Pressable>
        </Card>
      )}
    </ScreenGrid>
  );
}
