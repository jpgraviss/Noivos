import { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Card, Skeleton, ScreenContainer, Text, useTheme, spacing, palette, getTextColorFor } from '@noivos/ui';
import { budgetSnapshot, goals as mockGoals, activityFeed, upcomingBills, moneyMeeting, currentUser } from '../data/mockData';
import { useApiFetch, apiConfigured } from '../lib/api';
import { useDisplayName } from '../auth/ClerkAuthProvider';
import { formatRelativeTime } from '../lib/formatRelativeTime';
import { buildInsights, type BudgetCategoryFact, type GoalProgressFact } from '../lib/insights';
import { AvatarStack } from '../components/AvatarStack';
import { StatTile } from '../components/StatTile';
import { TrendChart } from '../components/TrendChart';

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

// Mock 8-week combined-savings trend, ending at the current total across
// all goals — same shape as apps/web's HomeScreen.tsx useSavingsTrend():
// there's no real time-series backend yet (no daily balance snapshots
// wired), so this is shaped to land on today's real total (mock or live)
// rather than an arbitrary number.
function useSavingsTrend(total: number) {
  const weeks = ['7wk ago', '6wk ago', '5wk ago', '4wk ago', '3wk ago', '2wk ago', 'Last wk', 'This wk'];
  const shape = [0.78, 0.8, 0.83, 0.85, 0.89, 0.93, 0.97, 1];
  return weeks.map((label, i) => ({ label, value: Math.round(total * shape[i]) }));
}

// Placeholder standing in for a <StatTile> before its underlying fetch has
// resolved — same rough shape (label + hero number), never any actual
// digits, so nothing here can be mistaken for a real (or fake) number.
function StatTileSkeleton() {
  return (
    <Card style={{ gap: spacing.xs }}>
      <Skeleton width="50%" height={11} />
      <Skeleton width="70%" height={26} style={{ marginTop: spacing.xs }} />
    </Card>
  );
}

// Wired to real data on 2026-10-02, brought to parity with apps/web's
// HomeScreen.tsx. Upgraded to full visual parity on 2026-10-06: AvatarStack/
// StatTile/TrendChart (native ports via react-native-svg — see
// src/components/{AvatarStack,StatTile,TrendChart}.tsx, since the web
// originals are raw-DOM/mouse-hover and don't render or work on native at
// all) and the real signed-in display name (src/auth/ClerkAuthProvider.tsx's
// useDisplayName(), same TokenGetterContext-style bridge as useApiToken()
// — SE-184). This screen is now a genuine visual match for the web
// dashboard, not just a simpler stand-in.
//
// Each card below fetches and falls back independently, same posture as
// the web twin: Budget pulls /api/budget, goals-derived numbers (wedding
// progress) pull /api/goals, Upcoming Bills pulls /api/bills, the Money
// Meeting card pulls /api/money-meeting (and "Mark as done" persists via
// POST .../complete), Activity pulls /api/activity, the avatar chip's
// partner name pulls /api/partnership, and AI Insights is plain rule-based
// (lib/insights.ts) derived from the Budget+Goals facts above, not an AI
// call.
export function HomeScreen() {
  const { colors } = useTheme();
  const apiFetch = useApiFetch();
  const realDisplayName = useDisplayName();
  const displayName = realDisplayName || currentUser.name;

  const [backendAvailable, setBackendAvailable] = useState(false);
  const [apiGoals, setApiGoals] = useState<ApiGoal[]>([]);
  const [apiBudget, setApiBudget] = useState<ApiBudget | null>(null);
  const [goalsResolved, setGoalsResolved] = useState(!apiConfigured());
  const [budgetResolved, setBudgetResolved] = useState(!apiConfigured());
  const [billsResolved, setBillsResolved] = useState(!apiConfigured());
  const [meetingResolved, setMeetingResolved] = useState(!apiConfigured());
  const [activityResolved, setActivityResolved] = useState(!apiConfigured());

  // Partner-name fetch for the AvatarStack chip, same shape as apps/web's
  // HomeScreen.tsx (separate from PartnershipSettings.tsx's own fetch —
  // this one only needs the name, not the full invite/disconnect state).
  // partnershipChecked only flips true on a real "connected" answer, so a
  // genuinely solo user (PRD §10.3) never sees a fabricated "& Marcus"
  // chip; partnershipResolved flips true on failure too, purely to gate
  // the skeleton vs. real-or-mock render decision below.
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnershipChecked, setPartnershipChecked] = useState(false);
  const [partnershipResolved, setPartnershipResolved] = useState(!apiConfigured());

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
    apiFetch('/api/partnership')
      .then(async (res) => {
        if (!res.ok) throw new Error('partnership fetch failed');
        return res.json() as Promise<{ connected: boolean; partnerName?: string }>;
      })
      .then((data) => {
        if (cancelled) return;
        setPartnershipChecked(true);
        if (data.connected && data.partnerName) {
          setPartnerName(data.partnerName);
        }
      })
      .catch(() => {
        // No database/Clerk reachable — stays unchecked, falls back to the
        // mock partner name/avatar chip below.
      })
      .finally(() => {
        if (!cancelled) setPartnershipResolved(true);
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

  const savingsTotal = backendAvailable
    ? apiGoals.reduce((sum, g) => sum + g.contributions.reduce((s, c) => s + c.amount, 0), 0)
    : mockGoals.reduce((sum, g) => sum + g.contributors.reduce((s, c) => s + c.amount, 0), 0);

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
    <ScreenContainer>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md }}>
        <View>
          <Text variant="caption" secondary>
            Good afternoon
          </Text>
          <Text variant="display">Hey, {displayName}</Text>
        </View>
        {/* Skeleton until the fetch genuinely settles (partnershipResolved),
            same "no flash of a fabricated couple chip" posture as the web
            twin — hidden only if we're genuinely certain there's no
            partner; if the backend turned out to be unreachable, still
            shows the chip (mock name as a last resort) rather than
            flicker in and out. */}
        {!partnershipResolved ? (
          <Skeleton width={120} height={32} radiusSize={16} />
        ) : (
          (!partnershipChecked || partnerName) && <AvatarStack names={[displayName, partnerName || currentUser.partnerName]} />
        )}
      </View>

      {/* No deltaLabel here (unlike Spent this month) — there's no real
          historical savings data to compute one from yet (no daily balance
          snapshots wired). The sparkline rides on useSavingsTrend's
          synthetic shape (see that function's own comment) — a disclosed,
          purely decorative fabrication (no axis, no hover claim, no stated
          numeric fact) rather than a specific false fact. */}
      {!goalsResolved ? (
        <StatTileSkeleton />
      ) : (
        <StatTile label="Total saved" value={`$${savingsTotal.toLocaleString()}`} sparkline={trend.map((t) => t.value)} />
      )}
      {!budgetResolved ? (
        <StatTileSkeleton />
      ) : (
        <StatTile
          label="Spent this month"
          value={`$${budget.spent.toLocaleString()}`}
          deltaLabel={`of $${budget.planned.toLocaleString()} planned`}
          deltaDirection={overBudget ? 'up' : 'down'}
          deltaIsGood={!overBudget}
        />
      )}
      {!goalsResolved ? (
        <StatTileSkeleton />
      ) : (
        weddingGoal &&
        weddingPercent !== null && (
          <StatTile label="Wedding progress" value={`${weddingPercent}%`} deltaLabel={`$${weddingTotal.toLocaleString()} of $${weddingTarget?.toLocaleString()}`} />
        )
      )}

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

      <Card>
        <Text variant="h3" style={{ marginBottom: spacing.sm }}>
          Combined savings
        </Text>
        {!goalsResolved ? <Skeleton height={160} radiusSize={8} /> : <TrendChart points={trend} />}
      </Card>

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
