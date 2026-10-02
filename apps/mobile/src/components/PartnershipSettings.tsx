import { useEffect, useState } from 'react';
import { View, Pressable, TextInput, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ChevronRight, UserPlus } from 'lucide-react-native';
import { Card, Text, useTheme, spacing, radius, palette, getTextColorFor } from '@noivos/ui';
import { currentUser } from '../data/mockData';
import { useApiFetch, apiConfigured, getApiBaseUrl } from '../lib/api';

type PanelView = 'summary' | 'invite' | 'disconnect-confirm';

// Wired to the real /api/partnership* routes on 2026-10-04, brought to
// parity with apps/web's PartnershipSettings.tsx (real since 2026-08-03/
// 2026-08-05) — the summary line alone was wired into MoreScreen.tsx
// directly on 2026-10-02; this is the full invite-send + disconnect-
// confirm flow that was deliberately deferred then, pending a native
// clipboard dependency (expo-clipboard, added alongside this file).
//
// One real divergence from the web twin, not just an RN-ified copy: the
// invite link ("Copy" + a read-only text field on web) adds a native
// "Share" button here using RN's own Share API — selecting text to copy
// is an awkward mobile pattern, and handing the link straight to the
// OS share sheet (iMessage/WhatsApp/etc.) is the natural equivalent action
// on a phone, not scope creep — it needs no new dependency and does the
// same "get this link to your partner" job the Copy button does. Copy
// itself is kept too, for parity with web and because a copied link still
// has uses (pasting into an email a user is composing some other way).
//
// Falls back to local-component-state-only behavior if the backend isn't
// reachable (Clerk unconfigured, apiConfigured() false, signed out, etc.),
// same graceful-passthrough posture as every other real-data screen.
export function PartnershipSettings() {
  const { colors } = useTheme();
  const apiFetch = useApiFetch();

  const [loaded, setLoaded] = useState(!apiConfigured());
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [invited, setInvited] = useState(false);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const [view, setView] = useState<PanelView>('summary');
  const [inviteInput, setInviteInput] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiConfigured()) return;
    let cancelled = false;
    apiFetch('/api/partnership')
      .then(async (res) => {
        if (!res.ok) throw new Error('partnership fetch failed');
        return res.json() as Promise<{
          connected: boolean;
          invited: boolean;
          partnerName?: string;
          invitedEmail?: string;
          inviteToken?: string | null;
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        setBackendAvailable(true);
        setConnected(data.connected);
        setInvited(data.invited);
        setPartnerName(data.partnerName ?? null);
        setInvitedEmail(data.invitedEmail ?? null);
        setInviteToken(data.inviteToken ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        // No database/Clerk reachable — fall back to the illustrative mock,
        // same as apps/web's PartnershipSettings.tsx.
        setConnected(true);
        setPartnerName(currentUser.partnerName);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiFetch is stable (useCallback in src/lib/api.ts); only ever needs to run once per mount.
  }, []);

  const hasActivePartnership = connected || invited;

  async function handleSendInvite() {
    const email = inviteInput.trim();
    if (!email) return;

    if (!backendAvailable) {
      setInvitedEmail(email);
      setInvited(true);
      return;
    }

    setSendingInvite(true);
    setInviteError(null);
    try {
      const res = await apiFetch('/api/partnership/invite', {
        method: 'POST',
        body: { email },
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error ?? "Couldn't send that invite.");
        return;
      }
      setInvited(true);
      setInvitedEmail(data.invitedEmail);
      setInviteToken(data.inviteToken ?? null);
    } catch {
      setInviteError("Couldn't reach the server — try again.");
    } finally {
      setSendingInvite(false);
    }
  }

  async function handleDisconnect() {
    if (!backendAvailable) {
      setConnected(false);
      setInvited(false);
      setPartnerName(null);
      setInvitedEmail(null);
      setInviteToken(null);
      setView('summary');
      return;
    }

    setDisconnecting(true);
    setDisconnectError(null);
    try {
      const res = await apiFetch('/api/partnership/disconnect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setDisconnectError(data.error ?? "Couldn't disconnect.");
        return;
      }
      setConnected(false);
      setInvited(false);
      setPartnerName(null);
      setInvitedEmail(null);
      setInviteToken(null);
      setView('summary');
    } catch {
      setDisconnectError("Couldn't reach the server — try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  const apiBaseUrl = getApiBaseUrl();
  const inviteUrl = inviteToken && apiBaseUrl ? `${apiBaseUrl}/invite/${inviteToken}` : null;

  async function handleCopyLink() {
    if (!inviteUrl) return;
    try {
      await Clipboard.setStringAsync(inviteUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard access can fail on some platforms/permissions states —
      // the link is still shown as selectable text, so this is a soft
      // failure, not fatal. Same posture as the web twin's try/catch.
    }
  }

  async function handleShareLink() {
    if (!inviteUrl) return;
    try {
      await Share.share({ message: inviteUrl, url: inviteUrl });
    } catch {
      // User dismissed the share sheet, or sharing isn't available on this
      // platform — not an error worth surfacing; the Copy button is still
      // right there as a fallback.
    }
  }

  if (!loaded) {
    return (
      <Card>
        <Text variant="h3" style={{ marginBottom: spacing.sm }}>
          Partnership
        </Text>
        <Text variant="bodySmall" secondary>
          Loading…
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text variant="h3" style={{ marginBottom: spacing.sm }}>
        Partnership
      </Text>

      {view === 'summary' && (
        <>
          <Row
            label={connected ? `You & ${partnerName}` : invited ? 'Invite pending' : 'Not connected to a partner'}
            onPress={() => setView('invite')}
            colors={colors}
            showChevron={!connected}
          />
          <Row label="Invite settings" onPress={() => setView('invite')} colors={colors} />
          {hasActivePartnership && (
            <Row label="Disconnect Partnership" onPress={() => setView('disconnect-confirm')} colors={colors} />
          )}
        </>
      )}

      {view === 'invite' && (
        <View>
          <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
            {connected
              ? `Already connected to ${partnerName}. Send another invite if you'd like them to have their own login.`
              : "Invite your partner by email — they'll get their own account, connected to yours."}
          </Text>
          {invited && invitedEmail ? (
            <View style={{ marginBottom: spacing.sm }}>
              <Text variant="bodySmall" style={{ color: colors.success, marginBottom: spacing.sm }}>
                {backendAvailable && inviteUrl
                  ? `A Partnership was created and an invite is waiting for ${invitedEmail} to accept. There's no email service wired up yet, so share this link with them yourself:`
                  : backendAvailable
                    ? `A Partnership was created and an invite is waiting for ${invitedEmail} to accept — but no email was actually sent (there's no email service wired up yet), so you'll need another way to let them know for now.`
                    : `Would send an invite to ${invitedEmail} — no invite-email service is wired up yet, so nothing was actually sent.`}
              </Text>
              {inviteUrl && (
                <View style={{ gap: spacing.sm }}>
                  <Text
                    selectable
                    variant="caption"
                    secondary
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radius.medium,
                      padding: 10,
                    }}
                  >
                    {inviteUrl}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Pressable onPress={handleShareLink} role="button" style={{ ...pillStyle(palette.sourLime), backgroundColor: palette.sourLime }}>
                      <Text variant="bodySmall" color={getTextColorFor(palette.sourLime)} style={{ fontWeight: '600' }}>
                        Share
                      </Text>
                    </Pressable>
                    <Pressable onPress={handleCopyLink} role="button" style={pillStyle(colors.border)}>
                      <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                        {linkCopied ? 'Copied!' : 'Copy'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <TextInput
              value={inviteInput}
              onChangeText={setInviteInput}
              placeholder="partner@email.com"
              placeholderTextColor={colors.textSecondary}
              aria-label="Partner's email address"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.medium,
                padding: 10,
                color: colors.textPrimary,
                marginBottom: spacing.sm,
              }}
            />
          )}
          {inviteError && (
            <Text variant="bodySmall" style={{ color: colors.danger, marginBottom: spacing.sm }}>
              {inviteError}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {!(invited && invitedEmail) && (
              <Pressable
                onPress={handleSendInvite}
                disabled={!inviteInput.trim() || sendingInvite}
                role="button"
                style={{
                  ...pillStyle(palette.sourLime),
                  backgroundColor: inviteInput.trim() ? palette.sourLime : colors.border,
                }}
              >
                <Text variant="bodySmall" color={getTextColorFor(palette.sourLime)} style={{ fontWeight: '600' }}>
                  {sendingInvite ? 'Sending…' : 'Send invite'}
                </Text>
              </Pressable>
            )}
            <Pressable onPress={() => setView('summary')} role="button" style={pillStyle(colors.border)}>
              <Text variant="bodySmall">Back</Text>
            </Pressable>
          </View>
        </View>
      )}

      {view === 'disconnect-confirm' && (
        <View>
          <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
            {connected
              ? `You'll keep frozen, read-only access to your shared history with ${partnerName}. Nothing new will sync between you going forward. This can't be undone from here.`
              : 'This will cancel the pending invite and free you up to start a new Partnership.'}
          </Text>
          {disconnectError && (
            <Text variant="bodySmall" style={{ color: colors.danger, marginBottom: spacing.sm }}>
              {disconnectError}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable
              onPress={handleDisconnect}
              disabled={disconnecting}
              role="button"
              style={{ ...pillStyle(palette.sourPunch), backgroundColor: palette.sourPunch }}
            >
              <Text variant="bodySmall" color={getTextColorFor(palette.sourPunch)} style={{ fontWeight: '600' }}>
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </Text>
            </Pressable>
            {/* disabled={disconnecting}, same bug class fixed across every
                other Cancel button this project has — without it,
                dismissing this confirm while the POST to
                /api/partnership/disconnect is still in flight hides the
                view immediately but doesn't abort the request, which can
                then silently apply after the user believes they backed out. */}
            <Pressable
              onPress={() => setView('summary')}
              disabled={disconnecting}
              role="button"
              style={pillStyle(colors.border)}
            >
              <Text variant="bodySmall">Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!hasActivePartnership && view === 'summary' && (
        <View style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <UserPlus size={16} color={colors.success} aria-hidden={true} />
          <Text variant="bodySmall" style={{ color: colors.success }}>
            Invite a partner to reconnect
          </Text>
        </View>
      )}
    </Card>
  );
}

function pillStyle(borderColor: string) {
  return {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor,
  } as const;
}

function Row({
  label,
  onPress,
  colors,
  showChevron = true,
}: {
  label: string;
  onPress: () => void;
  colors: { border: string; textSecondary: string };
  showChevron?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      role="button"
      style={{
        flexDirection: 'row',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <Text variant="body" secondary>
        {label}
      </Text>
      {showChevron && <ChevronRight size={16} color={colors.textSecondary} aria-hidden={true} />}
    </Pressable>
  );
}
