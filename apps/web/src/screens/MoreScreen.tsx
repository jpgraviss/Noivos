import { View, Pressable } from "react-native";
import { ChevronRight, LogOut, Settings, Sparkles } from "lucide-react-native";
import { Card, Text, useTheme, spacing } from "@noivos/ui";
import { ScreenGrid, ScreenGridWide } from "../components/ScreenLayout";
import { IdentitySettings } from "../components/IdentitySettings";
import { PartnershipSettings } from "../components/PartnershipSettings";

const sections: { title: string; icon: typeof Settings; items: string[] }[] = [
  { title: "Community", icon: Sparkles, items: ["Challenges", "Milestones shared"] },
  { title: "Account", icon: Settings, items: ["Notifications", "Subscription", "Support"] },
];

export interface MoreScreenProps {
  onSignOut?: () => void;
  userName?: string;
}

export function MoreScreen({ onSignOut, userName }: MoreScreenProps = {}) {
  const { colors, mode, setMode } = useTheme();

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
          {section.items.map((item) => (
            <View
              key={item}
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
                {item}
              </Text>
              <ChevronRight size={16} color={colors.textSecondary} />
            </View>
          ))}
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
