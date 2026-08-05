import { useEffect, useState } from "react";
import { View } from "react-native";
import { CreditCard, Lightbulb, Users } from "lucide-react-native";
import { Card, Text, useTheme, spacing, palette, getTextColorFor } from "@noivos/ui";
import { budgetSnapshot, goals as mockGoals, activityFeed, insights, upcomingBills, moneyMeeting, currentUser } from "../data/mockData";
import { AvatarStack } from "../components/AvatarStack";
import { StatTile } from "../components/StatTile";
import { TrendChart } from "../components/TrendChart";
import { ScreenGrid, ScreenGridWide } from "../components/ScreenLayout";

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
// from /api/partnership the same way, instead of the mock "Marcus".
// Falls back to the mock goals/partner name if the backend isn't reachable.
// Budget/AI Insights/Upcoming Bills/Activity stay mock — no transactions
// system or AI backend exists yet.
export function HomeScreen({ userName }: HomeScreenProps = {}) {
  const { colors } = useTheme();
  const displayName = userName || currentUser.name;
  const overBudget = budgetSnapshot.spent > budgetSnapshot.planned * 0.9;

  const [backendAvailable, setBackendAvailable] = useState(false);
  const [apiGoals, setApiGoals] = useState<ApiGoal[]>([]);
  const [partnerName, setPartnerName] = useState<string | null>(null);

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

      {/* Money Meeting ritual card — a distinct treatment, UX Blueprint §3.3 */}
      <ScreenGridWide>
        <Card glow={palette.grape}>
          <Text variant="caption" color={palette.grape}>
            WEEK OF {moneyMeeting.weekOf.toUpperCase()}
          </Text>
          <Text variant="h3" style={{ marginTop: spacing.xs }}>
            Your Money Meeting is ready
          </Text>
          <View style={{ marginTop: spacing.sm, gap: 4 }}>
            {moneyMeeting.topics.map((t, i) => (
              <Text key={i} variant="bodySmall" secondary>
                • {t}
              </Text>
            ))}
          </View>
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
        {upcomingBills.map((b) => (
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
        {activityFeed.map((a) => (
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
                {a.time}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </ScreenGrid>
  );
}
