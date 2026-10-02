import { useEffect, useRef, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Circle, CircleCheck, Flag, Plus } from 'lucide-react-native';
import { Card, OwnershipBadge, StackedProgressBar, Skeleton, ScreenContainer, Text, useTheme, spacing, radius, palette } from '@noivos/ui';
import { goals as mockGoals, weddingDetails } from '../data/mockData';
import { daysUntil, daysUntilHumanDate } from '../lib/date';
import { useApiFetch, apiConfigured } from '../lib/api';

// Rotated per distinct contributor — same set as apps/web's GoalsScreen.tsx.
const CONTRIBUTOR_COLORS = [palette.sourLime, palette.sourPunch, palette.grape, palette.electricBlue];

interface ApiContribution {
  id: string;
  contributorId: string;
  contributorName: string;
  amount: number;
  date: string;
  note: string | null;
}

interface ApiGoal {
  id: string;
  name: string;
  goalType: string;
  targetAmount: number;
  targetDate: string | null;
  shared: boolean;
  contributions: ApiContribution[];
}

interface DisplayGoal {
  id: string;
  name: string;
  target: number;
  shared: boolean;
  contributors: { name: string; amount: number; color: string }[];
}

interface ApiVendor {
  id: string;
  name: string;
  balanceDue: number | null;
  balanceDueDate: string | null;
  status: string | null;
}

interface ApiChecklistItem {
  id: string;
  title: string;
  dueDate: string | null;
  isComplete: boolean;
}

interface ApiFamilyContribution {
  id: string;
  contributorName: string;
  amount: number;
  note: string | null;
  createdAt: string;
}

interface ApiWeddingDetails {
  id: string;
  weddingDate: string | null;
  guestCountEstimate: number | null;
  status: string;
  vendors: ApiVendor[];
  checklist: ApiChecklistItem[];
  familyContributions: ApiFamilyContribution[];
}

// Returns keyboard focus to `ref`'s element when `isOpen` transitions from
// true to false, same as apps/web's GoalsScreen.tsx — harmless on native
// (ref.current has no .focus(), the optional chain below just no-ops) and
// still useful on this app's react-native-web ("expo start --web") target.
function useReturnFocusOnClose(isOpen: boolean, ref: { current: View | null }) {
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !isOpen) {
      (ref.current as unknown as { focus?: () => void } | null)?.focus?.();
    }
    wasOpen.current = isOpen;
  }, [isOpen, ref]);
}

function toDisplayGoal(g: ApiGoal): DisplayGoal {
  const contributorIds = Array.from(new Set(g.contributions.map((c) => c.contributorId)));
  const contributors = contributorIds.map((id, idx) => {
    const rows = g.contributions.filter((c) => c.contributorId === id);
    return {
      name: rows[0].contributorName,
      amount: rows.reduce((s, c) => s + c.amount, 0),
      color: CONTRIBUTOR_COLORS[idx % CONTRIBUTOR_COLORS.length],
    };
  });
  return { id: g.id, name: g.name, target: g.targetAmount, shared: g.shared, contributors };
}

// Wired to the real /api/goals + /api/wedding* routes on 2026-10-02,
// brought to parity with apps/web's GoalsScreen.tsx (real since 2026-08-03/
// 2026-08-05). Per docs/03 UX/UX-UI Blueprint.md §3.2: while Wedding Mode
// is active this tab relabels to "Wedding" and leads with the vendor
// tracker/countdown; standard goals live in a secondary segment within the
// same screen. Each segment falls back to its own mock data independently
// if apiConfigured() is false or its backend isn't reachable, same
// graceful-degradation posture as every other real-data screen this app
// has.
export function GoalsScreen() {
  const { colors } = useTheme();
  const apiFetch = useApiFetch();
  const [segment, setSegment] = useState<'wedding' | 'goals'>('goals');

  const [loaded, setLoaded] = useState(!apiConfigured());
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [apiGoals, setApiGoals] = useState<ApiGoal[]>([]);

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalShared, setNewGoalShared] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);
  const [addGoalError, setAddGoalError] = useState<string | null>(null);
  const addGoalToggleRef = useRef<View>(null);
  useReturnFocusOnClose(showAddGoal, addGoalToggleRef);

  const [contributionDrafts, setContributionDrafts] = useState<Record<string, string>>({});
  const [contributingGoalId, setContributingGoalId] = useState<string | null>(null);
  const [contributionErrors, setContributionErrors] = useState<Record<string, string>>({});

  // Wedding segment real-data state — separate from the "All Goals" fetch
  // above since /api/wedding and /api/goals are independent resources.
  const [weddingLoaded, setWeddingLoaded] = useState(!apiConfigured());
  const [weddingBackendAvailable, setWeddingBackendAvailable] = useState(false);
  const [hasPartnership, setHasPartnership] = useState(false);
  const [apiWedding, setApiWedding] = useState<ApiWeddingDetails | null>(null);

  const [startDate, setStartDate] = useState('');
  const [startGuestCount, setStartGuestCount] = useState('');
  const [startingWedding, setStartingWedding] = useState(false);
  const [startWeddingError, setStartWeddingError] = useState<string | null>(null);

  const [showEditWedding, setShowEditWedding] = useState(false);
  const [editWeddingDate, setEditWeddingDate] = useState('');
  const [editGuestCount, setEditGuestCount] = useState('');
  const [savingWeddingEdit, setSavingWeddingEdit] = useState(false);
  const [editWeddingError, setEditWeddingError] = useState<string | null>(null);
  const editWeddingToggleRef = useRef<View>(null);
  useReturnFocusOnClose(showEditWedding, editWeddingToggleRef);

  function openEditWedding() {
    setEditWeddingDate(apiWedding?.weddingDate ?? '');
    setEditGuestCount(apiWedding?.guestCountEstimate != null ? String(apiWedding.guestCountEstimate) : '');
    setEditWeddingError(null);
    setShowEditWedding(true);
  }

  async function handleSaveWeddingEdit() {
    setSavingWeddingEdit(true);
    setEditWeddingError(null);
    try {
      const res = await apiFetch('/api/wedding', {
        method: 'PATCH',
        body: {
          weddingDate: editWeddingDate.trim() || null,
          guestCountEstimate: editGuestCount.trim() || null,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setEditWeddingError(data.error ?? "Couldn't save your changes.");
        return;
      }
      setApiWedding((prev) => (prev ? { ...prev, weddingDate: data.weddingDate, guestCountEstimate: data.guestCountEstimate } : prev));
      setShowEditWedding(false);
    } catch {
      setEditWeddingError("Couldn't reach the server — try again.");
    } finally {
      setSavingWeddingEdit(false);
    }
  }

  const [showAddVendor, setShowAddVendor] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorBalance, setVendorBalance] = useState('');
  const [vendorDueDate, setVendorDueDate] = useState('');
  const [addingVendor, setAddingVendor] = useState(false);
  const [addVendorError, setAddVendorError] = useState<string | null>(null);
  const addVendorToggleRef = useRef<View>(null);
  useReturnFocusOnClose(showAddVendor, addVendorToggleRef);

  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [addingChecklistItem, setAddingChecklistItem] = useState(false);
  const [addChecklistError, setAddChecklistError] = useState<string | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

  const [showAddFamilyContribution, setShowAddFamilyContribution] = useState(false);
  const [familyContributorName, setFamilyContributorName] = useState('');
  const [familyContributionAmount, setFamilyContributionAmount] = useState('');
  const [addingFamilyContribution, setAddingFamilyContribution] = useState(false);
  const [addFamilyContributionError, setAddFamilyContributionError] = useState<string | null>(null);
  const addFamilyContributionToggleRef = useRef<View>(null);
  useReturnFocusOnClose(showAddFamilyContribution, addFamilyContributionToggleRef);

  useEffect(() => {
    if (!apiConfigured()) {
      // No API base URL on this device — stays on the mock's own "active"
      // flag for the initial segment, same fallback apps/web's twin uses
      // when the fetch itself never comes back at all.
      if (weddingDetails.active) setSegment('wedding');
      return;
    }
    let cancelled = false;
    apiFetch('/api/wedding')
      .then(async (res) => {
        if (!res.ok) throw new Error('wedding fetch failed');
        return res.json() as Promise<{ hasPartnership: boolean; weddingDetails: ApiWeddingDetails | null }>;
      })
      .then((data) => {
        if (cancelled) return;
        setWeddingBackendAvailable(true);
        setHasPartnership(data.hasPartnership);
        setApiWedding(data.weddingDetails);
        if (data.hasPartnership && data.weddingDetails) setSegment('wedding');
      })
      .catch(() => {
        if (!cancelled && weddingDetails.active) setSegment('wedding');
      })
      .finally(() => {
        if (!cancelled) setWeddingLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiFetch is stable (useCallback in src/lib/api.ts); only ever needs to run once per mount.
  }, []);

  async function handleStartWedding() {
    setStartingWedding(true);
    setStartWeddingError(null);
    try {
      const res = await apiFetch('/api/wedding', {
        method: 'POST',
        body: {
          weddingDate: startDate.trim() || undefined,
          guestCountEstimate: startGuestCount.trim() || undefined,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setStartWeddingError(data.error ?? "Couldn't start Wedding Mode.");
        return;
      }
      setApiWedding(data);
    } catch {
      setStartWeddingError("Couldn't reach the server — try again.");
    } finally {
      setStartingWedding(false);
    }
  }

  async function handleAddVendor() {
    const name = vendorName.trim();
    if (!name) {
      setAddVendorError('Vendor name is required.');
      return;
    }
    setAddingVendor(true);
    setAddVendorError(null);
    try {
      const res = await apiFetch('/api/wedding/vendors', {
        method: 'POST',
        body: {
          name,
          balanceDue: vendorBalance.trim() || undefined,
          balanceDueDate: vendorDueDate.trim() || undefined,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setAddVendorError(data.error ?? "Couldn't add that vendor.");
        return;
      }
      setApiWedding((prev) => (prev ? { ...prev, vendors: [...prev.vendors, data] } : prev));
      setVendorName('');
      setVendorBalance('');
      setVendorDueDate('');
      setShowAddVendor(false);
    } catch {
      setAddVendorError("Couldn't reach the server — try again.");
    } finally {
      setAddingVendor(false);
    }
  }

  async function handleAddChecklistItem() {
    const title = newChecklistTitle.trim();
    if (!title) return;
    setAddingChecklistItem(true);
    setAddChecklistError(null);
    try {
      const res = await apiFetch('/api/wedding/checklist', {
        method: 'POST',
        body: { title },
      });
      const data = await res.json();
      if (!res.ok) {
        setAddChecklistError(data.error ?? "Couldn't add that item.");
        return;
      }
      setApiWedding((prev) => (prev ? { ...prev, checklist: [...prev.checklist, data] } : prev));
      setNewChecklistTitle('');
    } catch {
      setAddChecklistError("Couldn't reach the server — try again.");
    } finally {
      setAddingChecklistItem(false);
    }
  }

  async function handleToggleChecklistItem(itemId: string, isComplete: boolean) {
    setTogglingItemId(itemId);
    try {
      const res = await apiFetch(`/api/wedding/checklist/${itemId}`, {
        method: 'PATCH',
        body: { isComplete },
      });
      const data = await res.json();
      if (res.ok) {
        setApiWedding((prev) =>
          prev ? { ...prev, checklist: prev.checklist.map((c) => (c.id === itemId ? { ...c, isComplete: data.isComplete } : c)) } : prev
        );
      }
    } catch {
      // Best-effort — the checkbox just won't visually update.
    } finally {
      setTogglingItemId(null);
    }
  }

  async function handleAddFamilyContribution() {
    const contributorName = familyContributorName.trim();
    const amount = Number(familyContributionAmount);
    if (!contributorName) {
      setAddFamilyContributionError('Enter who this gift is from.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setAddFamilyContributionError('Enter an amount greater than $0.');
      return;
    }
    setAddingFamilyContribution(true);
    setAddFamilyContributionError(null);
    try {
      const res = await apiFetch('/api/wedding/family-contributions', {
        method: 'POST',
        body: { contributorName, amount },
      });
      const data = await res.json();
      if (!res.ok) {
        setAddFamilyContributionError(data.error ?? "Couldn't log that contribution.");
        return;
      }
      setApiWedding((prev) => (prev ? { ...prev, familyContributions: [...prev.familyContributions, data] } : prev));
      setFamilyContributorName('');
      setFamilyContributionAmount('');
      setShowAddFamilyContribution(false);
    } catch {
      setAddFamilyContributionError("Couldn't reach the server — try again.");
    } finally {
      setAddingFamilyContribution(false);
    }
  }

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
        // No database/Clerk/route available — fall back to mock goals.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiFetch is stable (useCallback in src/lib/api.ts); only ever needs to run once per mount.
  }, []);

  async function handleAddGoal() {
    const name = newGoalName.trim();
    const target = Number(newGoalTarget);
    if (!name || !Number.isFinite(target) || target <= 0) {
      setAddGoalError('Enter a name and a target amount greater than $0.');
      return;
    }
    setAddingGoal(true);
    setAddGoalError(null);
    try {
      const res = await apiFetch('/api/goals', {
        method: 'POST',
        body: { name, targetAmount: target, goalType: 'custom', shared: newGoalShared },
      });
      const data = await res.json();
      if (!res.ok) {
        setAddGoalError(data.error ?? "Couldn't create that goal.");
        return;
      }
      setApiGoals((prev) => [...prev, data]);
      setNewGoalName('');
      setNewGoalTarget('');
      setNewGoalShared(false);
      setShowAddGoal(false);
    } catch {
      setAddGoalError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setAddingGoal(false);
    }
  }

  async function handleAddContribution(goalId: string) {
    const draft = contributionDrafts[goalId] ?? '';
    const amount = Number(draft);
    if (!Number.isFinite(amount) || amount <= 0) {
      setContributionErrors((prev) => ({ ...prev, [goalId]: 'Enter an amount greater than $0.' }));
      return;
    }
    setContributingGoalId(goalId);
    setContributionErrors((prev) => ({ ...prev, [goalId]: '' }));
    try {
      const res = await apiFetch(`/api/goals/${goalId}/contributions`, {
        method: 'POST',
        body: { amount },
      });
      const data = await res.json();
      if (!res.ok) {
        setContributionErrors((prev) => ({ ...prev, [goalId]: data.error ?? "Couldn't add that contribution." }));
        return;
      }
      setApiGoals((prev) =>
        prev.map((g) =>
          g.id === goalId
            ? {
                ...g,
                contributions: [
                  ...g.contributions,
                  { id: data.id, contributorId: data.contributorId, contributorName: 'You', amount: data.amount, date: data.date, note: data.note },
                ],
              }
            : g
        )
      );
      setContributionDrafts((prev) => ({ ...prev, [goalId]: '' }));
    } catch {
      setContributionErrors((prev) => ({ ...prev, [goalId]: "Couldn't reach the server — try again." }));
    } finally {
      setContributingGoalId(null);
    }
  }

  const displayGoals: DisplayGoal[] = backendAvailable
    ? apiGoals.map(toDisplayGoal)
    : mockGoals.map((g) => ({ id: g.id, name: g.name, target: g.target, shared: g.shared, contributors: g.contributors }));

  const weddingActive = weddingBackendAvailable ? Boolean(hasPartnership && apiWedding) : weddingDetails.active;

  return (
    <ScreenContainer>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md }}>
        <Text variant="h1">{weddingActive ? 'Wedding' : 'Goals'}</Text>

        {weddingActive && (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {(['wedding', 'goals'] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setSegment(s)}
                role="button"
                aria-pressed={segment === s}
                style={{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.pill,
                  backgroundColor: segment === s ? palette.sourLime : colors.surface,
                  borderWidth: 1,
                  borderColor: segment === s ? palette.sourLime : colors.border,
                }}
              >
                <Text variant="bodySmall" color={segment === s ? palette.licorice : colors.textPrimary} style={{ fontWeight: '600' }}>
                  {s === 'wedding' ? 'Wedding' : 'All Goals'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {segment === 'wedding' && weddingActive ? (
        !weddingLoaded ? (
          <>
            <Card glow={palette.sourPunch}>
              <Skeleton width={60} height={40} />
              <Skeleton width="50%" height={13} style={{ marginTop: spacing.sm }} />
            </Card>
            <Card>
              <Skeleton width="30%" height={18} />
              <Skeleton width="70%" height={14} style={{ marginTop: spacing.md }} />
              <Skeleton width="55%" height={14} style={{ marginTop: spacing.sm }} />
            </Card>
          </>
        ) : !weddingBackendAvailable ? (
          <>
            <Card glow={palette.sourPunch}>
              <Flag size={16} color={palette.sourPunch} style={{ marginBottom: spacing.xs }} aria-hidden={true} />
              <Text variant="display" color={palette.sourPunch}>
                {daysUntilHumanDate(weddingDetails.date)}
              </Text>
              <Text variant="body" secondary>
                days until {weddingDetails.date}
              </Text>
              <Text variant="bodySmall" secondary style={{ marginTop: spacing.xs }}>
                ~{weddingDetails.guestEstimate} guests
              </Text>
            </Card>

            <Card>
              <Text variant="h3" style={{ marginBottom: spacing.sm }}>
                Vendors
              </Text>
              {weddingDetails.vendors.map((v) => (
                <View key={v.name} style={{ marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="body">{v.name}</Text>
                    <Text variant="bodySmall" secondary>
                      ${v.balanceDue.toLocaleString()} due {v.dueDate}
                    </Text>
                  </View>
                  <Text variant="caption" color={palette.sourLime}>
                    {v.status}
                  </Text>
                </View>
              ))}
            </Card>

            <Card>
              <Text variant="h3" style={{ marginBottom: spacing.sm }}>
                Checklist
              </Text>
              {weddingDetails.checklist.map((item) => (
                <View key={item.title} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                  {item.done ? <CircleCheck size={18} color={palette.sourLime} /> : <Circle size={18} color={colors.textSecondary} />}
                  <Text variant="body" secondary={item.done}>
                    {item.title}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : !hasPartnership ? (
          <Card>
            <Text variant="h3" style={{ marginBottom: spacing.sm }}>
              Set up your Partnership first
            </Text>
            <Text variant="bodySmall" secondary>
              Wedding Mode needs a Partnership to attach to — go to More and invite your partner (or start one solo)
              before setting up your wedding here.
            </Text>
          </Card>
        ) : !apiWedding ? (
          <Card>
            <Text variant="h3" style={{ marginBottom: spacing.sm }}>
              Start planning your wedding
            </Text>
            <Text variant="bodySmall" secondary style={{ marginBottom: spacing.md }}>
              Add your date and estimated guest count to get started — both are optional, you can fill them in later.
            </Text>
            <View style={{ gap: spacing.sm }}>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="Wedding date (YYYY-MM-DD)"
                placeholderTextColor={colors.textSecondary}
                aria-label="Wedding date"
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 10, color: colors.textPrimary }}
              />
              <TextInput
                value={startGuestCount}
                onChangeText={setStartGuestCount}
                placeholder="Estimated guest count"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                aria-label="Estimated guest count"
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 10, color: colors.textPrimary }}
              />
              {startWeddingError && (
                <Text variant="caption" style={{ color: colors.danger }}>
                  {startWeddingError}
                </Text>
              )}
              <Pressable
                onPress={handleStartWedding}
                disabled={startingWedding}
                role="button"
                style={{ alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: palette.sourLime }}
              >
                <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: '600' }}>
                  {startingWedding ? 'Starting…' : 'Start Wedding Mode'}
                </Text>
              </Pressable>
            </View>
          </Card>
        ) : (
          <>
            <Card glow={palette.sourPunch}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Flag size={16} color={palette.sourPunch} style={{ marginBottom: spacing.xs }} aria-hidden={true} />
                {!showEditWedding && (
                  <Pressable ref={editWeddingToggleRef} onPress={openEditWedding} role="button">
                    <Text variant="caption" secondary style={{ fontWeight: '600' }}>
                      Edit
                    </Text>
                  </Pressable>
                )}
              </View>
              {showEditWedding ? (
                <View style={{ gap: spacing.sm }}>
                  <TextInput
                    value={editWeddingDate}
                    onChangeText={setEditWeddingDate}
                    placeholder="Wedding date (YYYY-MM-DD)"
                    placeholderTextColor={colors.textSecondary}
                    aria-label="Wedding date"
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 10, color: colors.textPrimary }}
                  />
                  <TextInput
                    value={editGuestCount}
                    onChangeText={setEditGuestCount}
                    placeholder="Estimated guest count"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    aria-label="Estimated guest count"
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 10, color: colors.textPrimary }}
                  />
                  {editWeddingError && (
                    <Text variant="caption" style={{ color: colors.danger }}>
                      {editWeddingError}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Pressable
                      onPress={handleSaveWeddingEdit}
                      disabled={savingWeddingEdit}
                      role="button"
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: palette.sourLime }}
                    >
                      <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: '600' }}>
                        {savingWeddingEdit ? 'Saving…' : 'Save'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowEditWedding(false)}
                      disabled={savingWeddingEdit}
                      role="button"
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border }}
                    >
                      <Text variant="bodySmall">Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  {(() => {
                    const days = daysUntil(apiWedding.weddingDate);
                    if (days === null) {
                      return (
                        <>
                          <Text variant="display" color={palette.sourPunch}>
                            —
                          </Text>
                          <Text variant="body" secondary>
                            Set a wedding date to see your countdown
                          </Text>
                        </>
                      );
                    }
                    if (days <= 0) {
                      return (
                        <>
                          <Text variant="display" color={palette.sourPunch}>
                            Married!
                          </Text>
                          <Text variant="body" secondary>
                            {days === 0 ? `Today's the day — ${apiWedding.weddingDate}` : `Your wedding was ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`}
                          </Text>
                        </>
                      );
                    }
                    return (
                      <>
                        <Text variant="display" color={palette.sourPunch}>
                          {days}
                        </Text>
                        <Text variant="body" secondary>
                          days until {apiWedding.weddingDate}
                        </Text>
                      </>
                    );
                  })()}
                  {apiWedding.guestCountEstimate != null && (
                    <Text variant="bodySmall" secondary style={{ marginTop: spacing.xs }}>
                      ~{apiWedding.guestCountEstimate} guests
                    </Text>
                  )}
                </>
              )}
            </Card>

            <Card>
              <Text variant="h3" style={{ marginBottom: spacing.sm }}>
                Vendors
              </Text>
              {apiWedding.vendors.length === 0 && (
                <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
                  No vendors added yet.
                </Text>
              )}
              {apiWedding.vendors.map((v) => (
                <View key={v.id} style={{ marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="body">{v.name}</Text>
                    {v.balanceDue != null && (
                      <Text variant="bodySmall" secondary>
                        ${v.balanceDue.toLocaleString()}{v.balanceDueDate ? ` due ${v.balanceDueDate}` : ''}
                      </Text>
                    )}
                  </View>
                  {v.status && (
                    <Text variant="caption" color={palette.sourLime}>
                      {v.status}
                    </Text>
                  )}
                </View>
              ))}

              {showAddVendor ? (
                <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                  <TextInput
                    value={vendorName}
                    onChangeText={setVendorName}
                    placeholder="Vendor name"
                    placeholderTextColor={colors.textSecondary}
                    aria-label="Vendor name"
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 10, color: colors.textPrimary }}
                  />
                  <TextInput
                    value={vendorBalance}
                    onChangeText={setVendorBalance}
                    placeholder="Balance due"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    aria-label="Balance due"
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 10, color: colors.textPrimary }}
                  />
                  <TextInput
                    value={vendorDueDate}
                    onChangeText={setVendorDueDate}
                    placeholder="Due date (YYYY-MM-DD)"
                    placeholderTextColor={colors.textSecondary}
                    aria-label="Balance due date"
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 10, color: colors.textPrimary }}
                  />
                  {addVendorError && (
                    <Text variant="caption" style={{ color: colors.danger }}>
                      {addVendorError}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Pressable
                      onPress={handleAddVendor}
                      disabled={addingVendor}
                      role="button"
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: palette.sourLime }}
                    >
                      <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: '600' }}>
                        {addingVendor ? 'Saving…' : 'Add vendor'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowAddVendor(false)}
                      disabled={addingVendor}
                      role="button"
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border }}
                    >
                      <Text variant="bodySmall">Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable ref={addVendorToggleRef} onPress={() => setShowAddVendor(true)} role="button" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
                  <Plus size={16} color={palette.sourLime} aria-hidden={true} />
                  <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                    Add a vendor
                  </Text>
                </Pressable>
              )}
            </Card>

            <Card>
              <Text variant="h3" style={{ marginBottom: spacing.sm }}>
                Checklist
              </Text>
              {apiWedding.checklist.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleToggleChecklistItem(item.id, !item.isComplete)}
                  disabled={togglingItemId === item.id}
                  role="checkbox"
                  aria-checked={item.isComplete}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}
                >
                  {item.isComplete ? <CircleCheck size={18} color={palette.sourLime} aria-hidden={true} /> : <Circle size={18} color={colors.textSecondary} aria-hidden={true} />}
                  <Text variant="body" secondary={item.isComplete}>
                    {item.title}
                  </Text>
                </Pressable>
              ))}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'center' }}>
                <TextInput
                  value={newChecklistTitle}
                  onChangeText={setNewChecklistTitle}
                  placeholder="Add a checklist item"
                  placeholderTextColor={colors.textSecondary}
                  aria-label="New checklist item"
                  style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 8, color: colors.textPrimary, fontSize: 13 }}
                />
                <Pressable
                  onPress={handleAddChecklistItem}
                  disabled={addingChecklistItem}
                  role="button"
                  style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: palette.sourLime }}
                >
                  <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: '600' }}>
                    {addingChecklistItem ? 'Adding…' : 'Add'}
                  </Text>
                </Pressable>
              </View>
              {addChecklistError && (
                <Text variant="caption" style={{ color: colors.danger, marginTop: 4 }}>
                  {addChecklistError}
                </Text>
              )}
            </Card>

            <Card>
              <Text variant="h3" style={{ marginBottom: spacing.sm }}>
                Family Contributions
              </Text>
              <Text variant="caption" secondary style={{ marginBottom: spacing.sm }}>
                A plain gift ledger — family members never get real account access, just a name and amount.
              </Text>
              {apiWedding.familyContributions.length === 0 && (
                <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
                  No family contributions logged yet.
                </Text>
              )}
              {apiWedding.familyContributions.map((f) => (
                <View key={f.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                  <Text variant="body">{f.contributorName}</Text>
                  <Text variant="bodySmall" secondary>
                    ${f.amount.toLocaleString()}
                  </Text>
                </View>
              ))}

              {showAddFamilyContribution ? (
                <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                  <TextInput
                    value={familyContributorName}
                    onChangeText={setFamilyContributorName}
                    placeholder="Who's it from? (e.g. Mom & Dad)"
                    placeholderTextColor={colors.textSecondary}
                    aria-label="Who this gift is from"
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 10, color: colors.textPrimary }}
                  />
                  <TextInput
                    value={familyContributionAmount}
                    onChangeText={setFamilyContributionAmount}
                    placeholder="Amount"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    aria-label="Gift amount"
                    style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, padding: 10, color: colors.textPrimary }}
                  />
                  {addFamilyContributionError && (
                    <Text variant="caption" style={{ color: colors.danger }}>
                      {addFamilyContributionError}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Pressable
                      onPress={handleAddFamilyContribution}
                      disabled={addingFamilyContribution}
                      role="button"
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: palette.sourLime }}
                    >
                      <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: '600' }}>
                        {addingFamilyContribution ? 'Saving…' : 'Log contribution'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowAddFamilyContribution(false)}
                      disabled={addingFamilyContribution}
                      role="button"
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border }}
                    >
                      <Text variant="bodySmall">Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  ref={addFamilyContributionToggleRef}
                  onPress={() => setShowAddFamilyContribution(true)}
                  role="button"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}
                >
                  <Plus size={16} color={palette.sourLime} aria-hidden={true} />
                  <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                    Log a family contribution
                  </Text>
                </Pressable>
              )}
            </Card>
          </>
        )
      ) : !loaded ? (
        <>
          {[0, 1].map((i) => (
            <Card key={i}>
              <Skeleton width="40%" height={18} />
              <Skeleton width="60%" height={13} style={{ marginTop: spacing.sm }} />
              <Skeleton height={8} radiusSize={999} style={{ marginTop: spacing.md }} />
            </Card>
          ))}
        </>
      ) : (
        <>
          {displayGoals.map((g) => {
            const total = g.contributors.reduce((s, c) => s + c.amount, 0);
            const pct = Math.round((total / g.target) * 100);
            return (
              <Card key={g.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="h3">{g.name}</Text>
                  {/* No partnerName — matches apps/web's GoalsScreen.tsx:
                      this component renders both the mock fallback and
                      real /api/goals data, and there's no real-partner-name
                      fetch here to plug in. Falls back to a plain "Shared"
                      label rather than showing a name that might be wrong. */}
                  <OwnershipBadge shared={g.shared} />
                </View>
                <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
                  ${total.toLocaleString()} of ${g.target.toLocaleString()} · {pct}%
                </Text>
                <StackedProgressBar contributors={g.contributors} target={g.target} />
                <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' }}>
                  {g.contributors.map((c) => (
                    <View key={c.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color }} />
                      <Text variant="caption" secondary>
                        {c.name} · ${c.amount.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>

                {backendAvailable && (
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' }}>
                    <TextInput
                      value={contributionDrafts[g.id] ?? ''}
                      onChangeText={(v) => setContributionDrafts((prev) => ({ ...prev, [g.id]: v }))}
                      placeholder="Add $ amount"
                      placeholderTextColor={colors.textSecondary}
                      aria-label={`Contribution amount for ${g.name}`}
                      keyboardType="numeric"
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
                      onPress={() => handleAddContribution(g.id)}
                      disabled={contributingGoalId === g.id}
                      role="button"
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: radius.pill,
                        backgroundColor: palette.sourLime,
                      }}
                    >
                      <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: '600' }}>
                        {contributingGoalId === g.id ? 'Adding…' : 'Add'}
                      </Text>
                    </Pressable>
                  </View>
                )}
                {contributionErrors[g.id] && (
                  <Text variant="caption" style={{ color: colors.danger, marginTop: 4 }}>
                    {contributionErrors[g.id]}
                  </Text>
                )}
              </Card>
            );
          })}

          {backendAvailable && (
            <Card>
              {showAddGoal ? (
                <View style={{ gap: spacing.sm }}>
                  <Text variant="h3">New goal</Text>
                  <TextInput
                    value={newGoalName}
                    onChangeText={setNewGoalName}
                    placeholder="Goal name"
                    placeholderTextColor={colors.textSecondary}
                    aria-label="New goal name"
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radius.medium,
                      padding: 10,
                      color: colors.textPrimary,
                    }}
                  />
                  <TextInput
                    value={newGoalTarget}
                    onChangeText={setNewGoalTarget}
                    placeholder="Target amount"
                    placeholderTextColor={colors.textSecondary}
                    aria-label="New goal target amount"
                    keyboardType="numeric"
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radius.medium,
                      padding: 10,
                      color: colors.textPrimary,
                    }}
                  />
                  {hasPartnership && (
                    <View>
                      <Text variant="caption" secondary style={{ marginBottom: 4 }}>
                        Who&apos;s this for?
                      </Text>
                      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        {(['personal', 'shared'] as const).map((opt) => {
                          const optIsShared = opt === 'shared';
                          const selected = newGoalShared === optIsShared;
                          return (
                            <Pressable
                              key={opt}
                              onPress={() => setNewGoalShared(optIsShared)}
                              role="button"
                              aria-pressed={selected}
                              style={{
                                paddingVertical: 8,
                                paddingHorizontal: 14,
                                borderRadius: radius.pill,
                                backgroundColor: selected ? palette.sourLime : colors.surface,
                                borderWidth: 1,
                                borderColor: selected ? palette.sourLime : colors.border,
                              }}
                            >
                              <Text
                                variant="bodySmall"
                                color={selected ? palette.licorice : colors.textPrimary}
                                style={{ fontWeight: '600' }}
                              >
                                {optIsShared ? 'Shared' : 'Personal'}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}
                  {addGoalError && (
                    <Text variant="caption" style={{ color: colors.danger }}>
                      {addGoalError}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Pressable
                      onPress={handleAddGoal}
                      disabled={addingGoal}
                      role="button"
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: palette.sourLime }}
                    >
                      <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: '600' }}>
                        {addingGoal ? 'Saving…' : 'Create goal'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowAddGoal(false)}
                      disabled={addingGoal}
                      role="button"
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border }}
                    >
                      <Text variant="bodySmall">Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable ref={addGoalToggleRef} onPress={() => setShowAddGoal(true)} role="button" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Plus size={18} color={palette.sourLime} aria-hidden={true} />
                  <Text variant="body" style={{ fontWeight: '600' }}>
                    Add a goal
                  </Text>
                </Pressable>
              )}
            </Card>
          )}
        </>
      )}
    </ScreenContainer>
  );
}
