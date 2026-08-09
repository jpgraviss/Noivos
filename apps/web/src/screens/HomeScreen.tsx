import { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { Activity as ActivityIcon, BarChart3, CreditCard } from "lucide-react-native";
import { Card, Text, useTheme, spacing, palette, getTextColorFor } from "@noivos/ui";
import { budgetSnapshot, goals as mockGoals, activityFeed, upcomingBills, moneyMeeting, currentUser } from "../data/mockData";
import { AvatarStack } from "../components/AvatarStack";
import { StatTile } from "../components/StatTile";
import { TrendChart } from "../components/TrendChart";
import { ScreenGrid, ScreenGridWide } from "../components/ScreenLayout";
import { formatRelativeTime } from "../lib/formatRelativeTime";
import { buildInsights, type BudgetCategoryFact, type GoalProgressFact } from "../lib/insights";

interface ApiGoal {
  id: string;
  name: string;
  goalType: string;
  targetAmount: number;
  targetDate: string | null;
  contributions: { amount: number }[];
}

interface ApiBudget {
  month: string;
  planned: number;
  spent: number;
  categories: { id: string; name: string; shared: boolean; planned: number; spent: number }[];
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
// The Budget card pulls from /api/budget (2026-08-08) — the same real
// budget-categories data BudgetScreen.tsx already wired 2026-08-05, just
// consumed here too, so the two screens can't show conflicting numbers for
// the same month the way the pre-fix Goals numbers used to. AI Insights
// (2026-08-08) is real "basic insights" per PRD §13's free tier — plain
// rule-based checks derived from that same Budget data plus real goal
// totals (lib/insights.ts), same posture as Money Meeting's agenda: not an
// AI call, so it doesn't need the AI Coach provider decision. Falls back to
// the mock budget/goals data independently if a given backend isn't
// reachable, same as every other card on this screen.
export function HomeScreen({ userName }: HomeScreenProps = {}) {
  const { colors } = useTheme();
  const displayName = userName || currentUser.name;

  const [backendAvailable, setBackendAvailable] = useState(false);
  const [apiGoals, setApiGoals] = useState<ApiGoal[]>([]);
  const [apiBudget, setApiBudget] = useState<ApiBudget | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/budget")
      .then(async (res) => {
        if (!res.ok) throw new Error("budget fetch failed");
        return res.json() as Promise<ApiBudget>;
      })
      .then((data) => {
        if (cancelled) return;
        setApiBudget(data);
      })
      .catch(() => {
        // No database/Clerk reachable — fall back to the mock budget below.
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

  // Independent fallback (apiBudget ?? budgetSnapshot), not gated on the
  // shared `backendAvailable` flag — same convention as apiBills/apiMeeting/
  // apiActivity below, each degrading to its own mock on its own fetch
  // failure rather than all-or-nothing with the Goals fetch specifically.
  const budget = apiBudget ?? budgetSnapshot;
  const overBudget = budget.spent > budget.planned * 0.9;

  const goalFacts: GoalProgressFact[] = backendAvailable
    ? apiGoals.map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        totalContributed: g.contributions.reduce((s, c) => s + c.amount, 0),
      }))
    : mockGoals.map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: g.target,
        totalContributed: g.contributors.reduce((s, c) => s + c.amount, 0),
      }));
  const categoryFacts: BudgetCategoryFact[] = apiBudget
    ? apiBudget.categories.map((c) => ({ id: c.id, name: c.name, planned: c.planned, spent: c.spent }))
    : budgetSnapshot.categories.map((c) => ({ id: c.name, name: c.name, planned: c.planned, spent: c.spent }));
  const computedInsights = buildInsights(categoryFacts, goalFacts);

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
        value={`$${budget.spent.toLocaleString()}`}
        deltaLabel={`of $${budget.planned.toLocaleString()} planned`}
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
              role="button"
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
          <Text variant="h3">{budget.month} Budget</Text>
          <Text variant="bodySmall" secondary>
            ${budget.spent} of ${budget.planned}
          </Text>
        </View>
        <View style={{ height: 10, borderRadius: 999, backgroundColor: colors.border, marginTop: spacing.sm, overflow: "hidden" }}>
          <View
            style={{
              height: "100%",
              // Guards the same divide-by-zero StackedProgressBarMath.ts's
              // computeSegmentWidths() already guards against (2026-08-06) —
              // planned is always positive today (DEFAULT_CATEGORIES' own
              // test asserts it), but nothing stops a future all-zero-
              // planned budget from reaching this line, and Infinity%/NaN%
              // is an invalid width value either way.
              width: `${budget.planned > 0 ? Math.min((budget.spent / budget.planned) * 100, 100) : 0}%`,
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
          <BarChart3 size={16} color={palette.citrus} aria-hidden={true} />
          <Text variant="h3">AI Insights</Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          {computedInsights.map((i) => (
            <Text key={i.id} variant="body" secondary>
              {i.text}
            </Text>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
          <CreditCard size={16} color={colors.textSecondary} aria-hidden={true} />
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
          <ActivityIcon size={16} color={colors.textSecondary} aria-hidden={true} />
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
