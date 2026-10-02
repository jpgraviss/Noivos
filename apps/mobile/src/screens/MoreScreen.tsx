import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { ChevronDown, ChevronRight, LogOut, Settings, Sparkles, Users } from 'lucide-react-native';
import { Card, Skeleton, ScreenContainer, Text, useTheme, spacing, getTextColorFor } from '@noivos/ui';
import { currentUser } from '../data/mockData';
import { useApiFetch, apiConfigured } from '../lib/api';

// Honest "not built yet" copy per row, not a silent dead end — mirrors
// apps/web's MoreScreen.tsx pattern (added there 2026-08-05), ported here
// 2026-08-06 after an audit found this screen never got the same fix: these
// were plain <Text> rows with no Pressable/onPress at all. "Appearance" is
// deliberately not repeated here — it's already its own real, working card
// above, so listing it again as an inert placeholder would be actively
// wrong, not just incomplete.
const sections: { title: string; icon: typeof Settings; items: { label: string; note: string }[] }[] = [
  {
    title: 'Partnership',
    icon: Users,
    items: [
      { label: 'Invite settings', note: 'Not built on mobile yet — available on the web app for now.' },
      { label: 'Disconnect Partnership', note: 'Not built on mobile yet — available on the web app for now.' },
    ],
  },
  {
    title: 'Community',
    icon: Sparkles,
    items: [
      { label: 'Challenges', note: 'Not built yet — savings challenges with your partner are coming soon.' },
      { label: 'Milestones shared', note: 'Not built yet — shared celebration moments are coming soon.' },
    ],
  },
  {
    title: 'Account',
    icon: Settings,
    items: [
      { label: 'Notifications', note: "Not built yet — you'll be able to manage notification preferences here soon." },
      { label: 'Subscription', note: 'Not built yet — Noivos is free for now; billing will live here once Premium launches.' },
      { label: 'Support', note: 'Not built yet — for now, reach out to the team directly.' },
    ],
  },
];

export interface MoreScreenProps {
  onSignOut?: () => void;
}

export function MoreScreen({ onSignOut }: MoreScreenProps = {}) {
  const { colors, mode, setMode } = useTheme();
  const apiFetch = useApiFetch();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Wired to the real GET /api/partnership on 2026-10-02 — just the
  // summary line, not the full invite/disconnect flow apps/web's
  // PartnershipSettings.tsx has (that one leans on web-only APIs —
  // navigator.clipboard, raw <input>/<button> DOM — porting it needs its
  // own pass with a native clipboard dependency, not attempted here).
  // "Invite settings"/"Disconnect Partnership" below stay the existing
  // honest "not built on mobile yet" stubs. Falls back to the mock
  // partnerName if apiConfigured() is false or the backend isn't
  // reachable, same graceful-degradation posture as every other real-data
  // screen in this app.
  const [partnerLoaded, setPartnerLoaded] = useState(!apiConfigured());
  const [connected, setConnected] = useState(false);
  const [invited, setInvited] = useState(false);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  useEffect(() => {
    if (!apiConfigured()) return;
    let cancelled = false;
    apiFetch('/api/partnership')
      .then(async (res) => {
        if (!res.ok) throw new Error('partnership fetch failed');
        return res.json() as Promise<{ connected: boolean; invited: boolean; partnerName?: string }>;
      })
      .then((data) => {
        if (cancelled) return;
        setConnected(data.connected);
        setInvited(data.invited);
        setPartnerName(data.partnerName ?? null);
      })
      .catch(() => {
        // No database/Clerk reachable — fall back to the illustrative mock,
        // same as apps/web's PartnershipSettings.tsx.
        if (!cancelled) {
          setConnected(true);
          setPartnerName(currentUser.partnerName);
        }
      })
      .finally(() => {
        if (!cancelled) setPartnerLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiFetch is stable (useCallback in src/lib/api.ts); only ever needs to run once per mount.
  }, []);

  const partnerSummary = connected ? `You & ${partnerName}` : invited ? 'Invite pending' : 'Not connected to a partner';

  return (
    <ScreenContainer>
      <Text variant="h1">More</Text>

      <Card>
        {/* "You & {partner}" — a plain status line, not a button, since
            it's not an action; matches web's PartnershipSettings-adjacent
            summary posture without needing a full native port of that
            component. */}
        <Text variant="h3" style={{ marginBottom: spacing.xs }}>
          Partnership
        </Text>
        {!partnerLoaded ? (
          <Skeleton width="45%" height={16} style={{ marginBottom: spacing.sm }} />
        ) : (
          <Text variant="body" secondary style={{ marginBottom: spacing.sm }}>
            {partnerSummary}
          </Text>
        )}
      </Card>

      <Card>
        <Text variant="h3">Appearance</Text>
        <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
          Dark is Noivos&apos; default look — light mode is available too.
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {/* A Pressable, not a Text with onPress — on the web export
              target (react-native-web), Text's onPress only attaches an
              onClick handler with no role/tabIndex/keyboard handling, so
              this was unreachable by keyboard/screen reader there (found
              during the 2026-08-06 accessibility pass, matching the same
              fix in apps/web's MoreScreen.tsx). */}
          {(['dark', 'light'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} role="button" aria-pressed={mode === m}>
              <Text
                variant="bodySmall"
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: mode === m ? colors.primary : 'transparent',
                  // Was colors.background (found 2026-08-13, same fix as
                  // apps/web's MoreScreen.tsx — see that file's comment):
                  // the current theme's background isn't necessarily
                  // legible on colors.primary (sourLime) — in light mode
                  // it's a near-white ~1.3:1 pairing, the same illegible
                  // combination already fixed once this session via
                  // tokens.ts's textOnColor map. getTextColorFor() is the
                  // actual enforcement table for this, independent of
                  // which theme mode happens to be active.
                  color: mode === m ? getTextColorFor(colors.primary) : colors.textPrimary,
                  fontWeight: '600',
                }}
              >
                {m === 'dark' ? 'Dark' : 'Light'}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {sections.map((section) => (
        <Card key={section.title}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
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
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
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
          <Pressable onPress={onSignOut} role="button" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <LogOut size={16} color={colors.textPrimary} aria-hidden={true} />
            <Text variant="body" style={{ fontWeight: '600' }}>
              Sign Out
            </Text>
          </Pressable>
        </Card>
      )}
    </ScreenContainer>
  );
}
