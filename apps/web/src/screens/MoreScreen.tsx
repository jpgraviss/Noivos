import { useState } from "react";
import { View, Pressable } from "react-native";
import { ChevronDown, ChevronRight, LogOut, Settings, Sparkles } from "lucide-react-native";
import { Card, Text, useTheme, spacing, getTextColorFor } from "@noivos/ui";
import { ScreenGrid, ScreenGridWide } from "../components/ScreenLayout";
import { IdentitySettings } from "../components/IdentitySettings";
import { PartnershipSettings } from "../components/PartnershipSettings";
import { LinkedAccounts } from "../components/LinkedAccounts";

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

export function MoreScreen({ onSignOut }: MoreScreenProps = {}) {
  const { colors, mode, setMode } = useTheme();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [appearanceError, setAppearanceError] = useState<string | null>(null);

  // Best-effort persistence — if there's no database/Clerk reachable (503
  // "Clerk isn't configured"), the mode still changes locally via setMode
  // below and stays changed, it just won't survive a reload. Deliberate,
  // silent dev/demo-mode passthrough, same posture as everywhere else in
  // this app — not treated as a failure.
  //
  // Distinct from a genuine save failure (found 2026-08-13): the backend
  // IS configured and reachable, but the save itself failed — a stale/
  // expired Clerk session (401) or a real DB error (500). The old version
  // here only had a `.catch()`, which catches network-level exceptions but
  // never inspects `res.ok`, so any non-2xx response was silently treated
  // as success — the toggle looked saved for the rest of the session, then
  // silently reverted on the next reload with zero explanation. Now
  // reverts immediately and says why, instead of quietly lying about a
  // preference that didn't actually stick. A genuine network failure
  // (fetch itself throwing) gets the same revert-and-explain treatment,
  // matching every other form's "Couldn't reach the server" convention
  // elsewhere in this app.
  async function selectMode(m: "dark" | "light") {
    const previous = mode;
    setMode(m);
    setAppearanceError(null);
    try {
      const res = await fetch("/api/profile/appearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: m }),
      });
      if (!res.ok && res.status !== 503) {
        setMode(previous);
        setAppearanceError("Couldn't save that — try again.");
      }
    } catch {
      setMode(previous);
      setAppearanceError("Couldn't save that — try again.");
    }
  }

  return (
    <ScreenGrid>
      <ScreenGridWide>
        <Text variant="h1">More</Text>
      </ScreenGridWide>

      <IdentitySettings />

      <PartnershipSettings />

      <LinkedAccounts />

      <Card>
        <Text variant="h3">Appearance</Text>
        <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
          Dark is Noivos&apos; default look — light mode is available too.
        </Text>
        {appearanceError && (
          // colors.danger, not palette.sourPunch (found 2026-08-13, same
          // audit pass right after this error state was added — see
          // tokens.ts): the raw hex fails WCAG AA in light mode.
          <Text variant="caption" style={{ color: colors.danger, marginBottom: spacing.sm }}>
            {appearanceError}
          </Text>
        )}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {/* A Pressable, not a Text with onPress — react-native-web's Text
              only attaches an onClick handler for onPress, with no role,
              tabIndex, or keyboard handling added, so this theme toggle was
              completely unreachable by keyboard/screen reader on web
              (found during the 2026-08-06 accessibility pass). role="button"
              is what RNW actually maps to Space-key activation (Enter works
              regardless of role; Space only fires for role="button"/a real
              <button>, confirmed against react-native-web's own
              PressResponder source) and to a real screen-reader "button"
              announcement — Pressable sets neither by default. aria-pressed
              is the correct pairing for a role="button" toggle (aria-selected
              is for role="tab"/"option"/"row", not "button"). */}
          {(["dark", "light"] as const).map((m) => (
            <Pressable key={m} onPress={() => selectMode(m)} role="button" aria-pressed={mode === m}>
              <Text
                variant="bodySmall"
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: mode === m ? colors.primary : "transparent",
                  // Was colors.background — the CURRENT theme's background,
                  // not necessarily one that's legible on colors.primary
                  // (sourLime). In dark mode that happens to be licorice
                  // (near-black, ~13:1 on sourLime — fine); in light mode
                  // it's #FAFAF8 (near-white, ~1.3:1 on sourLime — the same
                  // illegible pairing already fixed once this session via
                  // tokens.ts's textOnColor map, just reached through a
                  // different code path here instead of that map). Found
                  // 2026-08-13 while touching this file for the appearance-
                  // save fix above. getTextColorFor() is the actual
                  // enforcement table for "what text color goes on this
                  // background," independent of which theme mode is active.
                  color: mode === m ? getTextColorFor(colors.primary) : colors.textPrimary,
                  fontWeight: "600",
                }}
              >
                {m === "dark" ? "Dark" : "Light"}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {sections.map((section) => (
        <Card key={section.title}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
            <section.icon size={16} color={colors.textSecondary} aria-hidden={true} />
            <Text variant="h3">{section.title}</Text>
          </View>
          {section.items.map((item) => {
            const expanded = expandedItem === item.label;
            return (
              <View key={item.label}>
                <Pressable
                  onPress={() => setExpandedItem(expanded ? null : item.label)}
                  role="button"
                  aria-expanded={expanded}
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
                    <ChevronDown size={16} color={colors.textSecondary} aria-hidden={true} />
                  ) : (
                    <ChevronRight size={16} color={colors.textSecondary} aria-hidden={true} />
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
          <Pressable onPress={onSignOut} role="button" style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <LogOut size={16} color={colors.textPrimary} aria-hidden={true} />
            <Text variant="body" style={{ fontWeight: "600" }}>
              Sign Out
            </Text>
          </Pressable>
        </Card>
      )}
    </ScreenGrid>
  );
}
