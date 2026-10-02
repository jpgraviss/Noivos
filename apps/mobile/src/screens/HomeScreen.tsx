import { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Card, Skeleton, ScreenContainer, Text, useTheme, spacing, palette, getTextColorFor } from '@noivos/ui';
import { budgetSnapshot, goals as mockGoals, activityFeed, upcomingBills, moneyMeeting, currentUser } from '../data/mockData';
import { useApiFetch, apiConfigured } from '../lib/api';
import { formatRelativeTime } from '../lib/formatRelativeTime';
import { buildInsights, type BudgetCategoryFact, type GoalProgressFact } from '../lib/insights';

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

// Wired to real data on 2026-10-02, brought to parity with apps/web's
// HomeScreen.tsx (real since 2026-08-03 through 2026-08-08, in several
// passes — see that file's own top comment for the full per-card history).
// Deliberately NOT ported: AvatarStack/StatTile/TrendChart — this screen's
// mock version never had those web-only dashboard components either, so
// this keeps the same simpler card layout it always had and just wires
// real data underneath it, rather than introducing new shared dataviz
// components as part of this pass. The greeting's name stays
// currentUser.name (mock) for the same reason — threading a real signed-in
// display name through needs its own Clerk useUser()-safety pass (same
// shape as src/lib/api.ts's TokenGetterContext bridge), not attempted here.
//
// Each card below fetches and falls back independently, same posture as
// the web twin: Budget pulls /api/budget, goals-derived numbers (wedding
// progress) pull /api/goals, Upcoming Bills pulls /api/bills, the Money
// Meeting card pulls /api/money-meeting (and "Mark as done" persists via
// POST .../complete), Activity pulls /api/activity, and AI Insights is
// plain rule-based (lib/insights.ts) derived from the Budget+Goals facts
// above, not an AI call.
export function HomeScreen() {
  const { colors } = useTheme();
  const apiFetch = useApiFetch();

  const [backendAvailable, setBackendAvailable] = useState(false);
  const [apiGoals, setApiGoals] = useState<ApiGoal[]>([]);
  const [apiBudget, setApiBudget] = useState<ApiBudget | null>(null);
  const [goalsResolved, setGoalsResolved] = useState(!apiConfigured());
  const [budgetResolved, setBudgetResolved] = useState(!apiConfigured());
  const [billsResolved, setBillsResolved] = useState(!apiConfigured());
  const [meetingResolved, setMeetingResolved] = useState(!apiConfigured());
  const [activityResolved, setActivityResolved] = useState(!apiConfigured());

  const [apiBills, setApiBills] = useState<{ id: string; name: string; amount: number; due: string }[] | null>(null);
  const [apiMeeting, setApiMeeting] = useState<{
    id: string;
    weekOf: string;
    topics: string[];
    status: string;
  } | null>(null);
  // null = still loading or backend unreachable (falls back to the mock
  // card below); only `false` — a real, confirmed "this user has no
  // Partnership" answer — hides the card entirely, same as the web twin.
  const [meetingHasPartnership, setMeetingHasPartnership] = useState<boolean | null>(null);
  const [completingMeeting, setCompletingMeeting] = useState(false);
  const [apiActivity, setApiActivity] = useState<{ id: string; text: string; time: string }[] | null>(null);

  useEffect(() => {
    if (!apiConfigured()) return;
    let cancelled = false;
    apiFetch('/api/goals')
      .then(async (res) => {
        if (!res.ok) throw new Error('goals fetch failed');
        return res.json() as Promise<{ goals: ApiGoal[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setBackendAvailable(true);
        setApiGoals(data.goals);
      })
      .catch(() => {
        // No database/Clerk reachable — fall back to the mock goals below.
      })
      .finally(() => {
        if (!cancelled) setGoalsResolved(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiFetch is stable (useCallback in src/lib/api.ts); only ever needs to run once per mount.
  }, []);

  useEffect(() => {
    if (!apiConfigured()) return;
    let cancelled = false;
    apiFetch('/api/budget')
      .then(async (res) => {
        if (!res.ok) throw new Error('budget fetch failed');
        return res.json() as Promise<ApiBudget>;
      })
      .then((data) => {
        if (cancelled) return;
        setApiBudget(data);
      })
      .catch(() => {
        // No database/Clerk reachable — fall back to the mock budget below.
      })
      .finally(() => {
        if (!cancelled) setBudgetResolved(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiFetch is stable (useCallback in src/lib/api.ts); only ever needs to run once per mount.
  }, []);

  useEffect(() => {
    if (!apiConfigured()) return;
    let cancelled = false;
    apiFetch('/api/bills')
      .then(async (res) => {
        if (!res.ok) throw new Error('bills fetch failed');
        return res.json() as Promise<{ bills: { id: string; name: string; amount: number; due: string }[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setApiBills(data.bills);
      })
      .catch(() => {
        // No database/Clerk reachable — fall back to the mock bills below.
      })
      .finally(() => {
        if (!cancelled) setBillsResolved(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiFetch is stable (useCallback in src/lib/api.ts); only ever needs to run once per mount.
  }, []);

  useEffect(() => {
    if (!apiConfigured()) return;
    let cancelled = false;
    apiFetch('/api/money-meeting')
      .then(async (res) => {
        if (!res.ok) throw new Error('money-meeting fetch failed');
        return res.json() as Promise<
          { hasPartnership: false } | { hasPartnership: true; id: string; weekOf: string; topics: string[]; status: string }
        >;
      })
      .then((data) => {
        if (cancelled) return;
        setMeetingHasPartnership(data.hasPartnership);
        if (data.hasPartnership) {
          setApiMeeting({ id: data.id, weekOf: data.weekOf, topics: data.topics, status: data.status });
        }
      })
      .catch(() => {
        // No database/Clerk reachable — stays null, falls back to the mock below.
      })
      .finally(() => {
        if (!cancelled) setMeetingResolved(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiFetch is stable (useCallback in src/lib/api.ts); only ever needs to run once per mount.
  }, []);

  useEffect(() => {
    if (!apiConfigured()) return;
    let cancelled = false;
    apiFetch('/api/activity')
      .then(async (res) => {
        if (!res.ok) throw new Error('activity fetch failed');
        return res.json() as Promise<{ hasPartnership: boolean; events: { id: string; text: string; time: string }[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        // hasPartnership: false is a real, confirmed answer (PRD §10.3's
        // "Unpartnered... a valid, supported, permanent state"), not a
        // sign the backend is unreachable — same distinction the web twin
        // makes, reaching the real "No activity yet" empty state with `[]`
        // instead of falling through to the mock feed.
        setApiActivity(data.hasPartnership ? data.events : []);
      })
      .catch(() => {
        // No database/Clerk reachable — fall back to the mock below.
      })
      .finally(() => {
        if (!cancelled) setActivityResolved(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiFetch is stable (useCallback in src/lib/api.ts); only ever needs to run once per mount.
  }, []);

  async function handleCompleteMeeting() {
    if (!apiMeeting) return;
    setCompletingMeeting(true);
    try {
      const res = await apiFetch('/api/money-meeting/complete', {
        method: 'POST',
        body: { id: apiMeeting.id },
      });
      if (res.ok) {
        setApiMeeting((prev) => (prev ? { ...prev, status: 'completed' } : prev));
      }
    } catch {
      // Best-effort — the button just won't visually update.
    } finally {
      setCompletingMeeting(false);
    }
  }

  const weddingGoal = backendAvailable
    ? apiGoals.find((g) => g.goalType === 'wedding')
    : mockGoals.find((g) => g.type === 'wedding');
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

  return (
    <ScreenContainer>
      <View>
        <Text variant="caption" secondary>
          Good afternoon
        </Text>
        <Text variant="display">Hey, {currentUser.name}</Text>
      </View>

      {/* Money Meeting ritual card — a distinct treatment, UX Blueprint §3.3 */}
      {!meetingResolved ? (
        <Card glow={palette.grape}>
          <Skeleton width={140} height={11} />
          <Skeleton width="55%" height={20} style={{ marginTop: spacing.sm }} />
          <View style={{ marginTop: spacing.sm, gap: 6 }}>
            <Skeleton width="90%" height={13} />
            <Skeleton width="75%" height={13} />
          </View>
        </Card>
      ) : (
        meetingHasPartnership !== false && (
          <Card glow={palette.grape}>
            <Text variant="caption" secondary>
              WEEK OF {(apiMeeting?.weekOf ?? moneyMeeting.weekOf).toUpperCase()}
            </Text>
            <Text variant="h3" style={{ marginTop: spacing.xs }}>
              {apiMeeting?.status === 'completed' ? 'Money Meeting complete' : 'Your Money Meeting is ready'}
            </Text>
            <View style={{ marginTop: spacing.sm, gap: 4 }}>
              {(apiMeeting?.topics ?? moneyMeeting.topics).map((t, i) => (
                <Text key={i} variant="bodySmall" secondary>
                  • {t}
                </Text>
              ))}
            </View>
            {apiMeeting && apiMeeting.status !== 'completed' && (
              <Pressable
                onPress={handleCompleteMeeting}
                disabled={completingMeeting}
                role="button"
                style={{
                  alignSelf: 'flex-start',
                  marginTop: spacing.sm,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  backgroundColor: palette.grape,
                }}
              >
                <Text variant="bodySmall" color={getTextColorFor(palette.grape)} style={{ fontWeight: '600' }}>
                  {completingMeeting ? 'Saving…' : 'Mark as done'}
                </Text>
              </Pressable>
            )}
          </Card>
        )
      )}

      {!budgetResolved ? (
        <Card>
          <Skeleton width="40%" height={18} />
          <Skeleton height={10} radiusSize={999} style={{ marginTop: spacing.sm }} />
        </Card>
      ) : (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text variant="h3">{budget.month} Budget</Text>
            <Text variant="bodySmall" secondary>
              ${budget.spent.toLocaleString()} of ${budget.planned.toLocaleString()}
            </Text>
          </View>
          <View style={{ height: 10, borderRadius: 999, backgroundColor: colors.border, marginTop: spacing.sm, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                width: `${budget.planned > 0 ? Math.min((budget.spent / budget.planned) * 100, 100) : 0}%`,
                backgroundColor: palette.sourLime,
              }}
            />
          </View>
        </Card>
      )}

      {!goalsResolved ? (
        <Card glow={palette.sourLime}>
          <Skeleton width="45%" height={18} />
          <Skeleton width="65%" height={13} style={{ marginTop: 6 }} />
        </Card>
      ) : (
        weddingGoal &&
        weddingPercent !== null && (
          <Card glow={palette.sourLime}>
            <Text variant="h3">{weddingGoal.name}</Text>
            <Text variant="bodySmall" secondary style={{ marginTop: 2 }}>
              ${weddingTotal.toLocaleString()} of ${weddingTarget?.toLocaleString()} · {weddingPercent}%
            </Text>
          </Card>
        )
      )}

      <Card>
        <Text variant="h3" style={{ marginBottom: spacing.sm }}>
          AI Insights
        </Text>
        {!budgetResolved || !goalsResolved ? (
          <View style={{ gap: spacing.sm }}>
            <Skeleton width="95%" height={14} />
            <Skeleton width="80%" height={14} />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {computedInsights.map((i) => (
              <Text key={i.id} variant="body" secondary>
                💡 {i.text}
              </Text>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <Text variant="h3" style={{ marginBottom: spacing.sm }}>
          Upcoming Bills
        </Text>
        {!billsResolved ? (
          <View style={{ gap: spacing.xs }}>
            <Skeleton width="100%" height={16} />
            <Skeleton width="85%" height={16} />
          </View>
        ) : (
          <>
            {(apiBills ?? upcomingBills).length === 0 && (
              <Text variant="bodySmall" secondary>
                No upcoming bills.
              </Text>
            )}
            {(apiBills ?? upcomingBills).map((b) => (
              <View key={b.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text variant="body">{b.name}</Text>
                <Text variant="body" secondary>
                  ${b.amount.toLocaleString()} · {b.due}
                </Text>
              </View>
            ))}
          </>
        )}
      </Card>

      <Card>
        <Text variant="h3" style={{ marginBottom: spacing.sm }}>
          Activity
        </Text>
        {!activityResolved ? (
          <View style={{ gap: spacing.sm }}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="55%" height={14} />
          </View>
        ) : (
          <>
            {apiActivity && apiActivity.length === 0 && (
              <Text variant="bodySmall" secondary>
                No activity yet — updates will show up here as you and your partner use Noivos.
              </Text>
            )}
            {(apiActivity ?? activityFeed).map((a) => (
              <View key={a.id} style={{ marginBottom: spacing.xs }}>
                <Text variant="body">{a.text}</Text>
                <Text variant="caption" secondary>
                  {apiActivity ? formatRelativeTime(a.time) : a.time}
                </Text>
              </View>
            ))}
          </>
        )}
      </Card>
    </ScreenContainer>
  );
}
