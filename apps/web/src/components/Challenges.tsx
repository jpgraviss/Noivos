"use client";

import { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { Card, Text, useTheme, spacing, radius, palette, getTextColorFor } from "@noivos/ui";

interface ChallengeCatalogItem {
  id: string;
  type: string;
  name: string;
  description: string | null;
}

interface ChallengeParticipation {
  id: string;
  challengeId: string;
  type: string;
  challengeName: string;
  shared: boolean;
  progressPercent: number;
  completedAt: string | null;
  joinedAt: string;
}

interface ChallengesData {
  catalog: ChallengeCatalogItem[];
  participations: ChallengeParticipation[];
}

function pillStyle(filled: boolean) {
  return {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: filled ? palette.sourLime : "transparent",
    borderWidth: 1,
    borderColor: filled ? palette.sourLime : undefined,
  } as const;
}

// Replaces MoreScreen.tsx's old static "Challenges — Not built yet" row
// (SE-76, PRD §12.13) for the 5 challenge types this app can honestly
// compute real progress for (see lib/challenges.ts's own comment for why
// "No-Spend Weekend"/"Date Night Savings" aren't here yet — a documented
// gap, not a silently dropped one). Deliberately never shows a raw dollar
// figure anywhere in this component — only progressPercent, which is all
// GET /api/challenges itself ever returns (PRD §12.13: no leaderboards, no
// income/balance/spending comparison between users, ever).
export function Challenges() {
  const { colors } = useTheme();
  const [data, setData] = useState<ChallengesData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hasPartnership, setHasPartnership] = useState(false);
  // `${challengeId}:${shared}` of whichever join button is mid-request, or
  // null — disables every join button while any one of them is in flight,
  // same guard-against-overlapping-writes posture as every other form in
  // this app.
  const [joiningKey, setJoiningKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/challenges")
      .then(async (res) => {
        if (!res.ok) throw new Error("challenges fetch failed");
        return res.json() as Promise<ChallengesData>;
      })
      .then((d) => setData(d))
      .catch(() => {
        // No database/Clerk reachable — same graceful-passthrough posture
        // as every other Settings card in this file's siblings.
      })
      .finally(() => setLoaded(true));
  }

  useEffect(() => {
    load();
    fetch("/api/partnership")
      .then(async (res) => {
        if (!res.ok) throw new Error("partnership fetch failed");
        return res.json() as Promise<{ connected: boolean }>;
      })
      .then((d) => setHasPartnership(Boolean(d.connected)))
      .catch(() => {
        // Stays false — the "Join with partner" option just doesn't show,
        // same as GoalsScreen's own hasPartnership-gated shared toggle.
      });
  }, []);

  async function handleJoin(challengeId: string, shared: boolean) {
    const key = `${challengeId}:${shared}`;
    setJoiningKey(key);
    setError(null);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shared }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? "Couldn't join that challenge.");
        return;
      }
      load();
    } catch {
      setError("Couldn't reach the server — try again.");
    } finally {
      setJoiningKey(null);
    }
  }

  if (!loaded) {
    return (
      <Card>
        <Text variant="h3" style={{ marginBottom: 4 }}>
          Challenges
        </Text>
        <Text variant="bodySmall" secondary>
          Loading…
        </Text>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <Text variant="h3" style={{ marginBottom: 4 }}>
          Challenges
        </Text>
        <Text variant="bodySmall" secondary>
          Couldn&apos;t load Challenges right now.
        </Text>
      </Card>
    );
  }

  const participationByType = new Map(data.participations.map((p) => [p.type, p]));

  return (
    <Card>
      <Text variant="h3" style={{ marginBottom: 4 }}>
        Challenges
      </Text>
      <Text variant="bodySmall" secondary style={{ marginBottom: spacing.md }}>
        Encouragement, not comparison — your progress here is never visible outside your own Partnership.
      </Text>
      {error && (
        <Text variant="bodySmall" style={{ color: colors.danger, marginBottom: spacing.sm }}>
          {error}
        </Text>
      )}
      <View style={{ gap: spacing.md }}>
        {data.catalog.map((c) => {
          const participation = participationByType.get(c.type);
          const isWeddingCountdown = c.type === "wedding_countdown";
          return (
            <View key={c.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
              <Text variant="body" style={{ fontWeight: "600" }}>
                {c.name}
              </Text>
              {c.description && (
                <Text variant="caption" secondary>
                  {c.description}
                </Text>
              )}

              {participation ? (
                <View style={{ marginTop: spacing.xs }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text variant="bodySmall" secondary>
                      {participation.shared ? "Shared with your partner" : "Personal"}
                    </Text>
                    <Text variant="bodySmall" style={{ fontWeight: "600" }}>
                      {participation.completedAt ? "Complete 🎉" : `${participation.progressPercent}%`}
                    </Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 999, backgroundColor: colors.border, marginTop: 4, overflow: "hidden" }}>
                    <View
                      style={{
                        height: "100%",
                        width: `${participation.progressPercent}%`,
                        backgroundColor: participation.completedAt ? palette.sourLime : palette.electricBlue,
                      }}
                    />
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs, alignItems: "center" }}>
                  {/* Wedding Countdown only makes sense joined together — see
                      POST /api/challenges/[id]/join's own rejection for a
                      personal join of this one type. */}
                  {!isWeddingCountdown && (
                    <Pressable
                      onPress={() => handleJoin(c.id, false)}
                      disabled={joiningKey !== null}
                      role="button"
                      style={pillStyle(false)}
                    >
                      <Text variant="bodySmall" style={{ fontWeight: "600" }}>
                        {joiningKey === `${c.id}:false` ? "Joining…" : "Join"}
                      </Text>
                    </Pressable>
                  )}
                  {hasPartnership ? (
                    <Pressable
                      onPress={() => handleJoin(c.id, true)}
                      disabled={joiningKey !== null}
                      role="button"
                      style={pillStyle(true)}
                    >
                      <Text variant="bodySmall" color={getTextColorFor(palette.sourLime)} style={{ fontWeight: "600" }}>
                        {joiningKey === `${c.id}:true` ? "Joining…" : "Join with partner"}
                      </Text>
                    </Pressable>
                  ) : (
                    isWeddingCountdown && (
                      <Text variant="caption" secondary>
                        Connect with a partner to start this challenge.
                      </Text>
                    )
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Card>
  );
}
