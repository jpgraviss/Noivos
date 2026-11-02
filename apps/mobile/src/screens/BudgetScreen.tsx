import { useEffect, useRef, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Card, OwnershipBadge, StackedProgressBar, Skeleton, ScreenContainer, Text, useTheme, spacing, radius, palette } from '@noivos/ui';
import { budgetSnapshot } from '../data/mockData';
import { useApiFetch, apiConfigured } from '../lib/api';
import { ProgressRing } from '../components/ProgressRing';

// Same dedicated, validated categorical set as apps/web's BudgetScreen.tsx
// (2026-08-05) — do not swap in packages/ui's UI-accent palette tokens here;
// they fail the dataviz skill's categorical-chart validator (too
// desaturated/narrow a lightness range for a chart mark). Derived and
// validated via scripts/validate_palette.js against this app's actual card
// surfaces; order is fixed and load-bearing.
const BUDGET_CATEGORY_COLORS = ['#C36E42', '#3D71AC', '#2F8F6C', '#B08A28', '#8A5FB0'];

interface ApiCategory {
  id: string;
  name: string;
  shared: boolean;
  planned: number;
  rolloverAmount: number;
  spent: number;
  isIncomeBuffer: boolean;
}

interface ApiBudget {
  month: string;
  planned: number;
  spent: number;
  categories: ApiCategory[];
  irregularIncomeEnabled: boolean;
  actualIncome: number | null;
}

// Wired to the real GET /api/budget + POST /api/budget/transactions on
// 2026-10-02, brought to parity with apps/web's BudgetScreen.tsx (real
// since 2026-08-05) — see that file's own top comment for the fetch-then-
// fallback posture and the Skeleton loading-state history this mirrors.
// Falls back to the mock budgetSnapshot if apiConfigured() is false or the
// backend isn't reachable, same graceful-degradation posture as
// AICoachScreen.tsx's real wiring.
//
// Header upgraded 2026-10-06 to match apps/web's layout exactly — a
// ProgressRing (src/components/ProgressRing.tsx, a react-native-svg port
// of the web original, which is raw-DOM and doesn't render on native)
// beside the title instead of plain text only.
export function BudgetScreen() {
  const { colors } = useTheme();
  const apiFetch = useApiFetch();

  const [resolved, setResolved] = useState(!apiConfigured());
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [apiBudget, setApiBudget] = useState<ApiBudget | null>(null);

  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [merchantDrafts, setMerchantDrafts] = useState<Record<string, string>>({});
  const [submittingFor, setSubmittingFor] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Irregular-income mode (SE-82) — same two independent controls as the
  // web twin, kept separate from the per-category expense-logging state above.
  const [togglingIrregular, setTogglingIrregular] = useState(false);
  const [incomeDraft, setIncomeDraft] = useState('');
  const [savingIncome, setSavingIncome] = useState(false);
  const [incomeError, setIncomeError] = useState<string | null>(null);

  // Fetch-cancellation guard, same pattern/reasoning as apps/web's
  // BudgetScreen.tsx loadRequestRef — loadBudget() is called from both the
  // mount effect and handleAddExpense's post-save refetch, so a simple
  // boolean flag isn't enough to guard against out-of-order responses.
  const loadRequestRef = useRef(0);

  function loadBudget() {
    if (!apiConfigured()) return;
    const requestId = ++loadRequestRef.current;
    apiFetch('/api/budget')
      .then(async (res) => {
        if (!res.ok) throw new Error('budget fetch failed');
        return res.json() as Promise<ApiBudget>;
      })
      .then((data) => {
        if (loadRequestRef.current !== requestId) return;
        setBackendAvailable(true);
        setApiBudget(data);
      })
      .catch(() => {
        // No database/Clerk reachable — fall back to the mock snapshot below.
      })
      .finally(() => {
        if (loadRequestRef.current === requestId) setResolved(true);
      });
  }

  useEffect(() => {
    loadBudget();
    return () => {
      loadRequestRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiFetch is stable (useCallback in src/lib/api.ts); only ever needs to run once per mount, same as the web twin's identical effect.
  }, []);

  async function handleAddExpense(categoryId: string) {
    const amount = Number(amountDrafts[categoryId] ?? '');
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrors((prev) => ({ ...prev, [categoryId]: 'Enter an amount greater than $0.' }));
      return;
    }
    setSubmittingFor(categoryId);
    setErrors((prev) => ({ ...prev, [categoryId]: '' }));
    try {
      const res = await apiFetch('/api/budget/transactions', {
        method: 'POST',
        body: { categoryId, amount, merchantName: merchantDrafts[categoryId] || undefined },
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [categoryId]: data.error ?? "Couldn't record that expense." }));
        return;
      }
      setAmountDrafts((prev) => ({ ...prev, [categoryId]: '' }));
      setMerchantDrafts((prev) => ({ ...prev, [categoryId]: '' }));
      setAddingFor(null);
      loadBudget(); // Refetch so "spent" reflects the real new total.
    } catch {
      setErrors((prev) => ({ ...prev, [categoryId]: "Couldn't reach the server — try again." }));
    } finally {
      setSubmittingFor(null);
    }
  }

  async function handleToggleIrregularIncome(nextEnabled: boolean) {
    setTogglingIrregular(true);
    try {
      const res = await apiFetch('/api/budget', { method: 'PATCH', body: { irregularIncomeEnabled: nextEnabled } });
      if (res.ok) loadBudget(); // Refetch so the buffer category/settings reflect the new mode.
    } catch {
      // Best-effort — the toggle just won't visually flip; the user can retry.
    } finally {
      setTogglingIrregular(false);
    }
  }

  async function handleSaveIncome() {
    const amount = Number(incomeDraft);
    if (!Number.isFinite(amount) || amount < 0) {
      setIncomeError('Enter an amount of $0 or more.');
      return;
    }
    setSavingIncome(true);
    setIncomeError(null);
    try {
      const res = await apiFetch('/api/budget', { method: 'PATCH', body: { actualIncome: amount } });
      const data = await res.json();
      if (!res.ok) {
        setIncomeError(data.error ?? "Couldn't save that.");
        return;
      }
      setIncomeDraft('');
      loadBudget(); // Refetch — next month's smoothing average depends on this.
    } catch {
      setIncomeError("Couldn't reach the server — try again.");
    } finally {
      setSavingIncome(false);
    }
  }

  const budget: ApiBudget =
    backendAvailable && apiBudget
      ? apiBudget
      : {
          month: budgetSnapshot.month,
          planned: budgetSnapshot.planned,
          spent: budgetSnapshot.spent,
          categories: budgetSnapshot.categories.map((c) => ({ id: c.name, rolloverAmount: 0, isIncomeBuffer: false, ...c })),
          irregularIncomeEnabled: false,
          actualIncome: null,
        };

  // Excludes the Income Buffer category — same reasoning as the web twin's
  // GET /api/budget comment: it never has real spending against it, so
  // including it here would just add a permanent $0 legend entry.
  const categoryBreakdown = budget.categories
    .filter((c) => !c.isIncomeBuffer)
    .map((c, i) => ({
      name: c.name,
      amount: c.spent,
      color: BUDGET_CATEGORY_COLORS[i % BUDGET_CATEGORY_COLORS.length],
    }));
  // Denominator is the sum of category spends, not budget.spent — same
  // reasoning as the web twin: keeps the stacked bar correct regardless of
  // whether it's rendering the mock snapshot or real /api/budget data.
  const totalCategorySpend = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);

  const overallPercent = budget.planned > 0 ? (budget.spent / budget.planned) * 100 : 0;
  const overallOver = overallPercent > 100;

  if (!resolved) {
    return (
      <ScreenContainer>
        <Skeleton width="30%" height={30} />
        <Skeleton width="45%" height={14} style={{ marginTop: spacing.sm }} />
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <Skeleton width="50%" height={18} />
            <Skeleton height={8} radiusSize={999} style={{ marginTop: spacing.md }} />
          </Card>
        ))}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.lg }}>
        <View>
          <Text variant="h1">Budget</Text>
          <Text variant="body" secondary>
            {budget.month} · {budget.irregularIncomeEnabled ? 'smoothed over a 3-month average' : 'zero-based'}
          </Text>
        </View>
        <ProgressRing
          percent={overallPercent}
          color={overallOver ? palette.citrus : palette.sourLime}
          label="of budget used"
          sublabel={`$${budget.spent.toLocaleString()} of $${budget.planned.toLocaleString()}`}
        />
      </View>

      {backendAvailable && (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="h3">Irregular income mode</Text>
              <Text variant="bodySmall" secondary style={{ marginTop: 2 }}>
                For freelance/commission income — smooths your budget against a trailing 3-month average instead of
                this month&apos;s actual, and banks or draws the difference in a dedicated Income Buffer category
                rather than forcing your categories to balance exactly every month.
              </Text>
            </View>
            <Pressable
              onPress={() => handleToggleIrregularIncome(!budget.irregularIncomeEnabled)}
              disabled={togglingIrregular}
              role="button"
              aria-pressed={budget.irregularIncomeEnabled}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: budget.irregularIncomeEnabled ? palette.electricBlue : 'transparent',
              }}
            >
              <Text
                variant="bodySmall"
                style={{ fontWeight: '600', color: budget.irregularIncomeEnabled ? palette.licorice : colors.textPrimary }}
              >
                {budget.irregularIncomeEnabled ? 'On' : 'Off'}
              </Text>
            </Pressable>
          </View>

          {budget.irregularIncomeEnabled && (
            <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
              <Text variant="bodySmall" secondary>
                {budget.actualIncome !== null
                  ? `$${budget.actualIncome.toLocaleString()} recorded as this month's actual income.`
                  : 'No income recorded for this month yet — add it so next month’s average includes it.'}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TextInput
                  value={incomeDraft}
                  onChangeText={setIncomeDraft}
                  placeholder="This month's actual income"
                  placeholderTextColor={colors.textSecondary}
                  aria-label="This month's actual income"
                  keyboardType="numeric"
                  editable={!savingIncome}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.medium,
                    padding: 8,
                    color: colors.textPrimary,
                    fontSize: 13,
                  }}
                />
                <Pressable
                  onPress={handleSaveIncome}
                  disabled={savingIncome}
                  role="button"
                  style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: palette.sourLime }}
                >
                  <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: '600' }}>
                    {savingIncome ? 'Saving…' : 'Save'}
                  </Text>
                </Pressable>
              </View>
              {incomeError && (
                <Text variant="caption" color={palette.citrus}>
                  {incomeError}
                </Text>
              )}
            </View>
          )}
        </Card>
      )}

      {totalCategorySpend > 0 && (
        <Card>
          <Text variant="h3" style={{ marginBottom: spacing.md }}>
            Spending by category
          </Text>
          <StackedProgressBar contributors={categoryBreakdown} target={totalCategorySpend} height={14} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md }}>
            {categoryBreakdown.map((c) => (
              <View key={c.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: c.color }} />
                <Text variant="bodySmall" secondary>
                  {c.name} · ${c.amount.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {budget.categories.map((c) => {
        // Income Buffer (irregular-income mode) isn't a spending category —
        // same special-case as the web twin: no spent/left framing, no
        // progress bar, no "Log an expense" (there's nothing to log against
        // it). c.planned is always 0 + rolloverAmount (see GET /api/budget),
        // so rolloverAmount alone is what to show.
        if (c.isIncomeBuffer) {
          const balance = c.rolloverAmount;
          return (
            <Card key={c.id} glow={palette.electricBlue}>
              <Text variant="h3">Income smoothing</Text>
              <Text variant="bodySmall" secondary style={{ marginTop: 2 }}>
                {balance === 0
                  ? 'Nothing banked or owed yet — this fills in once a few months of actual income are recorded.'
                  : balance > 0
                    ? `$${balance.toLocaleString()} banked from months that ran ahead of your average.`
                    : `$${Math.abs(balance).toLocaleString()} drawn to cover a month that ran behind your average.`}
              </Text>
            </Card>
          );
        }

        const over = c.spent > c.planned;
        const pct = c.planned > 0 ? Math.min((c.spent / c.planned) * 100, 100) : 0;
        const isAdding = addingFor === c.id;
        return (
          <Card key={c.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="h3">{c.name}</Text>
              {/* No partnerName — matches apps/web's BudgetScreen.tsx: this
                  component renders both the mock fallback and real
                  /api/budget data, and there's no real-partner-name fetch
                  here to plug in. Falls back to a plain "Shared" label
                  rather than showing a name that might be wrong. */}
              <OwnershipBadge shared={c.shared} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
              <Text variant="bodySmall" secondary>
                ${c.spent.toLocaleString()} spent
              </Text>
              <Text variant="bodySmall" color={over ? palette.citrus : colors.textSecondary}>
                {over ? `$${(c.spent - c.planned).toLocaleString()} over` : `$${(c.planned - c.spent).toLocaleString()} left`}
              </Text>
            </View>
            <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.border, marginTop: spacing.sm, overflow: 'hidden' }}>
              <View
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  backgroundColor: over ? palette.citrus : palette.sourLime,
                }}
              />
            </View>

            {backendAvailable && (
              <>
                {!isAdding ? (
                  <Pressable
                    onPress={() => setAddingFor(c.id)}
                    role="button"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm }}
                  >
                    <Plus size={14} color={palette.sourLime} aria-hidden={true} />
                    <Text variant="bodySmall" color={palette.sourLime}>
                      Log an expense
                    </Text>
                  </Pressable>
                ) : (
                  <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <TextInput
                        value={amountDrafts[c.id] ?? ''}
                        onChangeText={(v) => setAmountDrafts((prev) => ({ ...prev, [c.id]: v }))}
                        placeholder="Amount"
                        placeholderTextColor={colors.textSecondary}
                        aria-label={`Expense amount for ${c.name}`}
                        keyboardType="numeric"
                        editable={submittingFor !== c.id}
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: radius.medium,
                          padding: 8,
                          color: colors.textPrimary,
                          fontSize: 13,
                        }}
                      />
                      <TextInput
                        value={merchantDrafts[c.id] ?? ''}
                        onChangeText={(v) => setMerchantDrafts((prev) => ({ ...prev, [c.id]: v }))}
                        placeholder="Merchant (optional)"
                        placeholderTextColor={colors.textSecondary}
                        aria-label={`Merchant name for this ${c.name} expense (optional)`}
                        editable={submittingFor !== c.id}
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: radius.medium,
                          padding: 8,
                          color: colors.textPrimary,
                          fontSize: 13,
                        }}
                      />
                    </View>
                    {errors[c.id] ? (
                      <Text variant="caption" color={palette.citrus}>
                        {errors[c.id]}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <Pressable
                        onPress={() => handleAddExpense(c.id)}
                        disabled={submittingFor === c.id}
                        role="button"
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 14,
                          borderRadius: radius.pill,
                          backgroundColor: palette.sourLime,
                        }}
                      >
                        <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: '600' }}>
                          {submittingFor === c.id ? 'Saving…' : 'Save'}
                        </Text>
                      </Pressable>
                      {/* disabled={submittingFor === c.id} — without it,
                          cancelling mid-save doesn't abort the in-flight
                          POST, which can then silently apply after the
                          form's already gone. Same guard as the web twin. */}
                      <Pressable
                        onPress={() => setAddingFor(null)}
                        disabled={submittingFor === c.id}
                        role="button"
                        style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border }}
                      >
                        <Text variant="bodySmall">Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </>
            )}
          </Card>
        );
      })}
    </ScreenContainer>
  );
}
