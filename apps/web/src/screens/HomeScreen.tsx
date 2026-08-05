import { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { CreditCard, Lightbulb, Users } from "lucide-react-native";
import { Card, Text, useTheme, spacing, palette, getTextColorFor } from "@noivos/ui";
import { budgetSnapshot, goals as mockGoals, activityFeed, insights, upcomingBills, moneyMeeting, currentUser } from "../data/mockData";
import { AvatarStack } from "../components/AvatarStack";
import { StatTile } from "../components/StatTile";
import { TrendChart } from "../components/TrendChart";
import { ScreenGrid, ScreenGridWide } from "../components/ScreenLayout";
import { formatRelativeTime } from "../lib/formatRelativeTime";

interface ApiGoal {
  id: string;
  name: string;
  goalType: string;
  targetAmount: number;
  targetDate: string | null;
  contributions: { amount: number }[];
}

// Mock 8-week combined-savings trend, ending at the current total across all
// goals — there's no real time-series backend yet (no daily balance
// snapshots wired), so this is shaped to land on today's real total (mock
// or live) rather than an arbitrary number.
function useSavingsTrend(total: number) {
  const weeks = ["7wk ago", "6wk ago", "5wk ago", "4wk ago", "3wk ago", "2wk ago", "Last wk", "This wk"];
  const shape = [0.78, 0.8, 0.83, 0.85, 0.89, 0.93, 0.97, 1];
  return weeks.map((label, i) => ({ label, value: Math.round(total * shape[i]) }));
}

export interface HomeScreenProps {
  userName?: string;
}

// userName is the real signed-in person's name (see AppShell/
// AuthenticatedAppShell) — the greeting and avatar chip use it instead of
// the mock persona's name. Goals-derived numbers (Total saved, Wedding
// progress, the trend chart, the wedding card) pull from real /api/goals
// data as of 2026-08-03 — same posture as GoalsScreen itself, and for the
// same reason: those two screens showing different numbers for the same
// underlying goals would be a real, confusing bug once goals are real.
// The avatar chip's second name pulls the real connected partner's name
// from /api/partnership the same way, instead of the mock "Marcus". Upcoming
// Bills pulls from /api/bills (2026-08-05), which reads the same real
// wedding_vendors balances Wedding Mode already wired — not a separate mock
// "bills" concept. The Money Meeting card pulls from /api/money-meeting
// (2026-08-05) once a real Partnership exists — its agenda is derived from
// real Budget/Wedding data via plain rule-based checks (lib/moneyMeeting.ts),
// not an AI call, and "Mark as done" persists to the real money_meetings
// row. Activity pulls from /api/activity (2026-08-05), populated by
// lib/activity.ts's logActivityEvent() calls scattered across the other
// real-data routes — requires migration
// 0005_add_activity_feed_insert_policy.sql to actually persist events; see
// packages/database/README.md. Falls back to the mock goals/partner/bills/
// agenda/activity data independently if a given backend isn't reachable.
// Budget card/AI Insights stay mock — no shared-transactions feed or AI
// backend exists yet.
export function HomeScreen({ userName }: HomeScreenProps = {}) {
  const { colors } = useTheme();
  const displayName = userName || currentUser.name;
  const overBudget = budgetSnapshot.spent > budgetSnapshot.planned * 0.9;

  const [backendAvailable, setBackendAvailable] = useState(false);
  const [apiGoals, setApiGoals] = useState<ApiGoal[]>([]);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [apiBills, setApiBills] = useState<{ id: string; name: string; amount: number; due: string }[] | null>(null);
  const [apiMeeting, setApiMeeting] = useState<{
    id: string;
    weekOf: string;
    topics: string[];
    status: string;
  } | null>(null);
  const [completingMeeting, setCompletingMeeting] = useState(false);
  const [apiActivity, setApiActivity] = useState<{ id: string; text: string; time: string }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/goals")
      .then(async (res) => {
        if (!res.ok) throw new Error("goals fetch failed");
        return res.json() as Promise<{ goals: ApiGoal[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setBackendAvailable(true);
        setApiGoals(data.goals);
      })
      .catch(() => {
        // No database/Clerk reachable — fall back to the mock goals below.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The avatar chip showed the mock "Marcus" persona even once a real
  // Partnership was connected (PartnershipSettings already pulls the real
  // name from this same endpoint) — same class of stale-mock-data bug as
  // the goals numbers above, so it gets the same fetch-then-fallback fix.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/partnership")
      .then(async (res) => {
        if (!res.ok) throw new Error("partnership fetch failed");
        return res.json() as Promise<{ connected: boolean; partnerName?: string }>;
      })
      .then((data) => {
        if (cancelled) return;
        if (data.connected && data.partnerName) {
          setPartnerName(data.partnerName);
        }
      })
      .catch(() => {
        // No database/Clerk reachable — fall back to the mock partner name.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bills")
      .then(async (res) => {
        if (!res.ok) throw new Error("bills fetch failed");
        return res.json() as Promise<{ bills: { id: string; name: string; amount: number; due: string }[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setApiBills(data.bills);
      })
      .catch(() => {
        // No database/Clerk reachable — fall back to the mock bills below.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/money-meeting")
      .then(async (res) => {
        if (!res.ok) throw new Error("money-meeting fetch failed");
        return res.json() as Promise<
          { hasPartnership: false } | { hasPartnership: true; id: string; weekOf: string; topics: string[]; status: string }
        >;
      })
      .then((data) => {
        if (cancelled || !data.hasPartnership) return;
        setApiMeeting({ id: data.id, weekOf: data.weekOf, topics: data.topics, status: data.status });
      })
      .catch(() => {
        // No database/Clerk reachable (or no Partnership yet) — fall back to the mock below.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/activity")
      .then(async (res) => {
        if (!res.ok) throw new Error("activity fetch failed");
        return res.json() as Promise<{ hasPartnership: boolean; events: { id: string; text: string; time: string }[] }>;
      })
      .then((data) => {
        if (cancelled || !data.hasPartnership) return;
        setApiActivity(data.events);
      })
      .catch(() => {
        // No database/Clerk reachable (or no Partnership yet) — fall back to the mock below.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCompleteMeeting() {
    if (!apiMeeting) return;
    setCompletingMeeting(true);
    try {
      const res = await fetch("/api/money-meeting/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: apiMeeting.id }),
      });
      if (res.ok) {
        setApiMeeting((prev) => (prev ? { ...prev, status: "completed" } : prev));
      }
    } catch {
      // Best-effort — the button just won't visually update.
    } finally {
      setCompletingMeeting(false);
    }
  }

  const savingsTotal = backendAvailable
    ? apiGoals.reduce((sum, g) => sum + g.contributions.reduce((s, c) => s + c.amount, 0), 0)
    : mockGoals.reduce((sum, g) => sum + g.contributors.reduce((s, c) => s + c.amount, 0), 0);

  const weddingGoal = backendAvailable
    ? apiGoals.find((g) => g.goalType === "wedding")
    : mockGoals.find((g) => g.type === "wedding");
  const weddingTotal = backendAvailable
    ? (weddingGoal as ApiGoal | undefined)?.contributions.reduce((s, c) => s + c.amount, 0) ?? 0
    : (weddingGoal as (typeof mockGoals)[number] | undefined)?.contributors.reduce((s, c) => s + c.amount, 0) ?? 0;
  const weddingTarget = backendAvailable
    ? (weddingGoal as ApiGoal | undefined)?.targetAmount
    : (weddingGoal as (typeof mockGoals)[number] | undefined)?.target;
  const weddingPercent = weddingTarget ? Math.round((weddingTotal / weddingTarget) * 100) : null;

  const trend = useSavingsTrend(savingsTotal);

  return (
    <ScreenGrid>
      <ScreenGridWide>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: spacing.md,
          }}
        >
          <View>
            <Text variant="caption" secondary>
              Good afternoon
            </Text>
            <Text variant="display">Hey, {displayName}</Text>
          </View>
          <AvatarStack names={[displayName, partnerName || currentUser.partnerName]} />
        </View>
      </ScreenGridWide>

      <StatTile
        label="Total saved"
        value={`$${savingsTotal.toLocaleString()}`}
        deltaLabel="4.2% this month"
        deltaDirection="up"
        deltaIsGood
        sparkline={trend.map((t) => t.value)}
      />
      <StatTile
        label="Spent this month"
        value={`$${budgetSnapshot.spent.toLocaleString()}`}
        deltaLabel={`of $${budgetSnapshot.planned.toLocaleString()} planned`}
        deltaDirection={overBudget ? "up" : "down"}
        deltaIsGood={!overBudget}
      />
      {weddingGoal && weddingPercent !== null && (
        <StatTile
          label="Wedding progress"
          value={`${weddingPercent}%`}
          deltaLabel={`$${weddingTotal.toLocaleString()} of $${weddingTarget?.toLocaleString()}`}
        />
      )}

      {/* Money Meeting ritual card — a distinct treatment, UX Blueprint §3.3.
          Real as of 2026-08-05 once a Partnership exists: the agenda is
          derived from real Budget/Wedding data (see lib/moneyMeeting.ts),
          not an AI call. Falls back to the mock agenda otherwise. */}
      <ScreenGridWide>
        <Card glow={palette.grape}>
          <Text variant="caption" color={palette.grape}>
            WEEK OF {(apiMeeting?.weekOf ?? moneyMeeting.weekOf).toUpperCase()}
          </Text>
          <Text variant="h3" style={{ marginTop: spacing.xs }}>
            {apiMeeting?.status === "completed" ? "Money Meeting complete" : "Your Money Meeting is ready"}
          </Text>
          <View style={{ marginTop: spacing.sm, gap: 4 }}>
            {(apiMeeting?.topics ?? moneyMeeting.topics).map((t, i) => (
              <Text key={i} variant="bodySmall" secondary>
                • {t}
              </Text>
            ))}
          </View>
          {apiMeeting && apiMeeting.status !== "completed" && (
            <Pressable
              onPress={handleCompleteMeeting}
              disabled={completingMeeting}
              style={{
                alignSelf: "flex-start",
                marginTop: spacing.sm,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: palette.grape,
              }}
            >
              <Text variant="bodySmall" color={getTextColorFor(palette.grape)} style={{ fontWeight: "600" }}>
                {completingMeeting ? "Saving…" : "Mark as done"}
              </Text>
            </Pressable>
          )}
        </Card>
      </ScreenGridWide>

      <ScreenGridWide>
        <Card>
          <Text variant="h3" style={{ marginBottom: spacing.sm }}>
            Combined savings
          </Text>
          <TrendChart points={trend} />
        </Card>
      </ScreenGridWide>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text variant="h3">{budgetSnapshot.month} Budget</Text>
          <Text variant="bodySmall" secondary>
            ${budgetSnapshot.spent} of ${budgetSnapshot.planned}
          </Text>
        </View>
        <View style={{ height: 10, borderRadius: 999, backgroundColor: colors.border, marginTop: spacing.sm, overflow: "hidden" }}>
          <View
            style={{
              height: "100%",
              width: `${Math.min((budgetSnapshot.spent / budgetSnapshot.planned) * 100, 100)}%`,
              backgroundColor: palette.sourLime,
            }}
          />
        </View>
      </Card>

      {weddingGoal && weddingPercent !== null && (
        <Card glow={palette.sourLime}>
          <Text variant="h3">{weddingGoal.name}</Text>
          <Text variant="bodySmall" secondary style={{ marginTop: 2 }}>
            ${weddingTotal.toLocaleString()} of ${weddingTarget?.toLocaleString()} · {weddingPercent}%
          </Text>
        </Card>
      )}

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
          <Lightbulb size={16} color={palette.citrus} />
          <Text variant="h3">AI Insights</Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          {insights.map((i) => (
            <Text key={i.id} variant="body" secondary>
              {i.text}
            </Text>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
          <CreditCard size={16} color={colors.textSecondary} />
          <Text variant="h3">Upcoming Bills</Text>
        </View>
        {(apiBills ?? upcomingBills).length === 0 && (
          <Text variant="bodySmall" secondary>
            No upcoming bills.
          </Text>
        )}
        {(apiBills ?? upcomingBills).map((b) => (
          <View key={b.id} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text variant="body">{b.name}</Text>
            <Text variant="body" secondary>
              ${b.amount} · {b.due}
            </Text>
          </View>
        ))}
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
          <Users size={16} color={colors.textSecondary} />
          <Text variant="h3">Activity</Text>
        </View>
        {apiActivity && apiActivity.length === 0 && (
          <Text variant="bodySmall" secondary>
            No activity yet — updates will show up here as you and your partner use Noivos.
          </Text>
        )}
        {(apiActivity ?? activityFeed).map((a) => (
          <View key={a.id} style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xs, alignItems: "flex-start" }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                backgroundColor: palette.electricBlue,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              <Text variant="caption" style={{ color: getTextColorFor(palette.electricBlue), fontWeight: "700" }}>
                {a.text.slice(0, 1)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body">{a.text}</Text>
              <Text variant="caption" secondary>
                {apiActivity ? formatRelativeTime(a.time) : a.time}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </ScreenGrid>
  );
}
