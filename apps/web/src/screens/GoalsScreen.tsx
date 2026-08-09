import { useEffect, useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { Circle, CircleCheck, Flag, Plus } from "lucide-react-native";
import { Card, OwnershipBadge, StackedProgressBar, Text, useTheme, spacing, radius, palette } from "@noivos/ui";
import { goals as mockGoals, weddingDetails } from "../data/mockData";
import { ScreenGrid, ScreenGridWide } from "../components/ScreenLayout";
import { daysUntil } from "../lib/date";

// Rotated per distinct contributor. Originally a hardcoded darker green
// (#638C00) stood in for palette.sourLime here specifically because the old
// neon Sour Lime (#C6FF00) failed the dataviz skill's OKLCH lightness-band
// check for a categorical chart mark (see PROJECT_MEMORY.md's dashboard-
// redesign entry) — the 2026-08-05 Origin-direction repaint made
// palette.sourLime itself a muted, much darker green, so that workaround is
// very likely unnecessary now. Using the token directly rather than keep a
// second hardcoded hex to independently maintain; worth re-running
// scripts/validate_palette.js to confirm before this is treated as
// re-validated.
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
  return { id: g.id, name: g.name, target: g.targetAmount, shared: false, contributors };
}

// Per docs/03 UX/UX-UI Blueprint.md §3.2: while Wedding Mode is active this
// tab relabels to "Wedding" and leads with the vendor tracker/countdown;
// standard goals live in a secondary segment within the same screen.
//
// Both segments are wired to real Neon data: "All Goals" via /api/goals
// (2026-08-03), Wedding via /api/wedding — countdown, vendors, checklist
// (2026-08-03), and Family Contributions (2026-08-05, wedding_family_
// contributions — a plain gift ledger, no real account access per PRD
// §12.8). Each segment falls back to its own mock data independently if its
// backend isn't reachable, same posture as IdentitySettings.
export function GoalsScreen() {
  const { colors } = useTheme();
  // Was `weddingDetails.active ? "wedding" : "goals"` — the mock's `.active`
  // is a hardcoded `true`, so this always opened on the Wedding segment
  // regardless of whether the real signed-in user's Partnership had
  // actually started Wedding Mode (found 2026-08-08, same class of bug as
  // AppShell.tsx's tab-label fix in the same commit). Can't know the real
  // answer synchronously on first render — the /api/wedding fetch below
  // hasn't run yet — so this defaults to the safe "goals" state and the
  // fetch effect flips it to "wedding" once it genuinely knows.
  const [segment, setSegment] = useState<"wedding" | "goals">("goals");

  const [loaded, setLoaded] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [apiGoals, setApiGoals] = useState<ApiGoal[]>([]);

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [addingGoal, setAddingGoal] = useState(false);
  const [addGoalError, setAddGoalError] = useState<string | null>(null);

  const [contributionDrafts, setContributionDrafts] = useState<Record<string, string>>({});
  const [contributingGoalId, setContributingGoalId] = useState<string | null>(null);
  const [contributionErrors, setContributionErrors] = useState<Record<string, string>>({});

  // Wedding segment real-data state — separate from the "All Goals" fetch
  // above since /api/wedding and /api/goals are independent resources.
  const [weddingLoaded, setWeddingLoaded] = useState(false);
  const [weddingBackendAvailable, setWeddingBackendAvailable] = useState(false);
  const [hasPartnership, setHasPartnership] = useState(false);
  const [apiWedding, setApiWedding] = useState<ApiWeddingDetails | null>(null);

  const [startDate, setStartDate] = useState("");
  const [startGuestCount, setStartGuestCount] = useState("");
  const [startingWedding, setStartingWedding] = useState(false);
  const [startWeddingError, setStartWeddingError] = useState<string | null>(null);

  const [showAddVendor, setShowAddVendor] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [vendorBalance, setVendorBalance] = useState("");
  const [vendorDueDate, setVendorDueDate] = useState("");
  const [addingVendor, setAddingVendor] = useState(false);
  const [addVendorError, setAddVendorError] = useState<string | null>(null);

  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [addingChecklistItem, setAddingChecklistItem] = useState(false);
  const [addChecklistError, setAddChecklistError] = useState<string | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

  const [showAddFamilyContribution, setShowAddFamilyContribution] = useState(false);
  const [familyContributorName, setFamilyContributorName] = useState("");
  const [familyContributionAmount, setFamilyContributionAmount] = useState("");
  const [addingFamilyContribution, setAddingFamilyContribution] = useState(false);
  const [addFamilyContributionError, setAddFamilyContributionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wedding")
      .then(async (res) => {
        if (!res.ok) throw new Error("wedding fetch failed");
        return res.json() as Promise<{ hasPartnership: boolean; weddingDetails: ApiWeddingDetails | null }>;
      })
      .then((data) => {
        if (cancelled) return;
        setWeddingBackendAvailable(true);
        setHasPartnership(data.hasPartnership);
        setApiWedding(data.weddingDetails);
        // Now that we genuinely know: default to the Wedding segment only
        // if this real Partnership actually has an active wedding_details
        // row — matches the UX Blueprint §3.2 intent ("while Wedding Mode
        // is active this tab leads with the vendor tracker") without
        // guessing before the fetch resolves.
        if (data.hasPartnership && data.weddingDetails) setSegment("wedding");
      })
      .catch(() => {
        // No database/Clerk/route available — fall back to the mock's own
        // "active" flag for the initial segment, same as every other
        // wedding-mode signal on this screen falls back to the mock when
        // there's no real signal reachable at all.
        if (!cancelled && weddingDetails.active) setSegment("wedding");
      })
      .finally(() => {
        if (!cancelled) setWeddingLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStartWedding() {
    setStartingWedding(true);
    setStartWeddingError(null);
    try {
      const res = await fetch("/api/wedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weddingDate: startDate.trim() || undefined,
          guestCountEstimate: startGuestCount.trim() || undefined,
        }),
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
      setAddVendorError("Vendor name is required.");
      return;
    }
    setAddingVendor(true);
    setAddVendorError(null);
    try {
      const res = await fetch("/api/wedding/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          balanceDue: vendorBalance.trim() || undefined,
          balanceDueDate: vendorDueDate.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddVendorError(data.error ?? "Couldn't add that vendor.");
        return;
      }
      setApiWedding((prev) => (prev ? { ...prev, vendors: [...prev.vendors, data] } : prev));
      setVendorName("");
      setVendorBalance("");
      setVendorDueDate("");
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
      const res = await fetch("/api/wedding/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddChecklistError(data.error ?? "Couldn't add that item.");
        return;
      }
      setApiWedding((prev) => (prev ? { ...prev, checklist: [...prev.checklist, data] } : prev));
      setNewChecklistTitle("");
    } catch {
      setAddChecklistError("Couldn't reach the server — try again.");
    } finally {
      setAddingChecklistItem(false);
    }
  }

  async function handleToggleChecklistItem(itemId: string, isComplete: boolean) {
    setTogglingItemId(itemId);
    try {
      const res = await fetch(`/api/wedding/checklist/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isComplete }),
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
      setAddFamilyContributionError("Enter who this gift is from.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setAddFamilyContributionError("Enter an amount greater than $0.");
      return;
    }
    setAddingFamilyContribution(true);
    setAddFamilyContributionError(null);
    try {
      const res = await fetch("/api/wedding/family-contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributorName, amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddFamilyContributionError(data.error ?? "Couldn't log that contribution.");
        return;
      }
      setApiWedding((prev) => (prev ? { ...prev, familyContributions: [...prev.familyContributions, data] } : prev));
      setFamilyContributorName("");
      setFamilyContributionAmount("");
      setShowAddFamilyContribution(false);
    } catch {
      setAddFamilyContributionError("Couldn't reach the server — try again.");
    } finally {
      setAddingFamilyContribution(false);
    }
  }

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
        // No database/Clerk/route available — fall back to mock goals.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAddGoal() {
    const name = newGoalName.trim();
    const target = Number(newGoalTarget);
    if (!name || !Number.isFinite(target) || target <= 0) {
      setAddGoalError("Enter a name and a target amount greater than $0.");
      return;
    }
    setAddingGoal(true);
    setAddGoalError(null);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, targetAmount: target, goalType: "custom" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddGoalError(data.error ?? "Couldn't create that goal.");
        return;
      }
      setApiGoals((prev) => [...prev, data]);
      setNewGoalName("");
      setNewGoalTarget("");
      setShowAddGoal(false);
    } catch {
      setAddGoalError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setAddingGoal(false);
    }
  }

  async function handleAddContribution(goalId: string) {
    const draft = contributionDrafts[goalId] ?? "";
    const amount = Number(draft);
    if (!Number.isFinite(amount) || amount <= 0) {
      setContributionErrors((prev) => ({ ...prev, [goalId]: "Enter an amount greater than $0." }));
      return;
    }
    setContributingGoalId(goalId);
    setContributionErrors((prev) => ({ ...prev, [goalId]: "" }));
    try {
      const res = await fetch(`/api/goals/${goalId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
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
                  { id: data.id, contributorId: data.contributorId, contributorName: "You", amount: data.amount, date: data.date, note: data.note },
                ],
              }
            : g
        )
      );
      setContributionDrafts((prev) => ({ ...prev, [goalId]: "" }));
    } catch {
      setContributionErrors((prev) => ({ ...prev, [goalId]: "Couldn't reach the server — try again." }));
    } finally {
      setContributingGoalId(null);
    }
  }

  const displayGoals: DisplayGoal[] = backendAvailable
    ? apiGoals.map(toDisplayGoal)
    : mockGoals.map((g) => ({ id: g.id, name: g.name, target: g.target, shared: g.shared, contributors: g.contributors }));

  // Real once /api/wedding resolves successfully — matches this screen's
  // own definition of "wedding mode is on" a few lines down (a real
  // Partnership with a real wedding_details row), not the mock's
  // hardcoded-true `.active` flag. Only falls back to that mock flag if
  // the fetch itself never came back at all (see the effect above).
  const weddingActive = weddingBackendAvailable ? Boolean(hasPartnership && apiWedding) : weddingDetails.active;

  return (
    <ScreenGrid>
      <ScreenGridWide>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.md }}>
          <Text variant="h1">{weddingActive ? "Wedding" : "Goals"}</Text>

          {weddingActive && (
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {(["wedding", "goals"] as const).map((s) => (
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
                  <Text variant="bodySmall" color={segment === s ? palette.licorice : colors.textPrimary} style={{ fontWeight: "600" }}>
                    {s === "wedding" ? "Wedding" : "All Goals"}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScreenGridWide>

      {segment === "wedding" && weddingActive ? (
        !weddingLoaded ? (
          <Card>
            <Text variant="bodySmall" secondary>
              Loading…
            </Text>
          </Card>
        ) : !weddingBackendAvailable ? (
          <>
            <Card glow={palette.sourPunch}>
              <Flag size={16} color={palette.sourPunch} style={{ marginBottom: spacing.xs }} aria-hidden={true} />
              <Text variant="display" color={palette.sourPunch}>
                {weddingDetails.daysLeft}
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
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text variant="body">{v.name}</Text>
                    <Text variant="bodySmall" secondary>
                      ${v.balanceDue} due {v.dueDate}
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
                <View key={item.title} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs }}>
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
              Wedding Mode needs a Partnership to attach to — go to More → Partnership and invite your partner (or
              start one solo) before setting up your wedding here.
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
                <Text variant="caption" style={{ color: palette.sourPunch }}>
                  {startWeddingError}
                </Text>
              )}
              <Pressable
                onPress={handleStartWedding}
                disabled={startingWedding}
                role="button"
                style={{ alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: palette.sourLime }}
              >
                <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: "600" }}>
                  {startingWedding ? "Starting…" : "Start Wedding Mode"}
                </Text>
              </Pressable>
            </View>
          </Card>
        ) : (
          <>
            <Card glow={palette.sourPunch}>
              <Flag size={16} color={palette.sourPunch} style={{ marginBottom: spacing.xs }} aria-hidden={true} />
              <Text variant="display" color={palette.sourPunch}>
                {daysUntil(apiWedding.weddingDate) ?? "—"}
              </Text>
              <Text variant="body" secondary>
                {apiWedding.weddingDate ? `days until ${apiWedding.weddingDate}` : "Set a wedding date to see your countdown"}
              </Text>
              {apiWedding.guestCountEstimate != null && (
                <Text variant="bodySmall" secondary style={{ marginTop: spacing.xs }}>
                  ~{apiWedding.guestCountEstimate} guests
                </Text>
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
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text variant="body">{v.name}</Text>
                    {v.balanceDue != null && (
                      <Text variant="bodySmall" secondary>
                        ${v.balanceDue}{v.balanceDueDate ? ` due ${v.balanceDueDate}` : ""}
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
                    <Text variant="caption" style={{ color: palette.sourPunch }}>
                      {addVendorError}
                    </Text>
                  )}
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <Pressable
                      onPress={handleAddVendor}
                      disabled={addingVendor}
                      role="button"
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: palette.sourLime }}
                    >
                      <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: "600" }}>
                        {addingVendor ? "Saving…" : "Add vendor"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowAddVendor(false)}
                      role="button"
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border }}
                    >
                      <Text variant="bodySmall">Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => setShowAddVendor(true)} role="button" style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs }}>
                  <Plus size={16} color={palette.sourLime} aria-hidden={true} />
                  <Text variant="bodySmall" style={{ fontWeight: "600" }}>
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
                  style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs }}
                >
                  {item.isComplete ? <CircleCheck size={18} color={palette.sourLime} aria-hidden={true} /> : <Circle size={18} color={colors.textSecondary} aria-hidden={true} />}
                  <Text variant="body" secondary={item.isComplete}>
                    {item.title}
                  </Text>
                </Pressable>
              ))}
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, alignItems: "center" }}>
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
                  <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: "600" }}>
                    {addingChecklistItem ? "Adding…" : "Add"}
                  </Text>
                </Pressable>
              </View>
              {addChecklistError && (
                <Text variant="caption" style={{ color: palette.sourPunch, marginTop: 4 }}>
                  {addChecklistError}
                </Text>
              )}
            </Card>

            {/* Full-width rather than another 340px grid cell — with exactly
                4 cards in this segment (Countdown/Vendors/Checklist/Family
                Contributions), a 3-column desktop grid leaves this one
                orphaned alone in a mostly-empty row (flagged in the
                2026-08-05 UI audit, not fixed until now). Reads as "3 summary
                cards, then a full-width detail list" — a standard dashboard
                pattern, not just a patch for the leftover space. */}
            <ScreenGridWide>
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
                <View key={f.id} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs }}>
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
                    <Text variant="caption" style={{ color: palette.sourPunch }}>
                      {addFamilyContributionError}
                    </Text>
                  )}
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <Pressable
                      onPress={handleAddFamilyContribution}
                      disabled={addingFamilyContribution}
                      role="button"
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: palette.sourLime }}
                    >
                      <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: "600" }}>
                        {addingFamilyContribution ? "Saving…" : "Log contribution"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowAddFamilyContribution(false)}
                      role="button"
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border }}
                    >
                      <Text variant="bodySmall">Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => setShowAddFamilyContribution(true)}
                  role="button"
                  style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs }}
                >
                  <Plus size={16} color={palette.sourLime} aria-hidden={true} />
                  <Text variant="bodySmall" style={{ fontWeight: "600" }}>
                    Log a family contribution
                  </Text>
                </Pressable>
              )}
            </Card>
            </ScreenGridWide>
          </>
        )
      ) : !loaded ? (
        <Card>
          <Text variant="bodySmall" secondary>
            Loading…
          </Text>
        </Card>
      ) : (
        <>
          {displayGoals.map((g) => {
            const total = g.contributors.reduce((s, c) => s + c.amount, 0);
            const pct = Math.round((total / g.target) * 100);
            return (
              <Card key={g.id}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text variant="h3">{g.name}</Text>
                  <OwnershipBadge shared={g.shared} />
                </View>
                <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
                  ${total.toLocaleString()} of ${g.target.toLocaleString()} · {pct}%
                </Text>
                <StackedProgressBar contributors={g.contributors} target={g.target} />
                <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.sm, flexWrap: "wrap" }}>
                  {g.contributors.map((c) => (
                    <View key={c.name} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color }} />
                      <Text variant="caption" secondary>
                        {c.name} · ${c.amount.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>

                {backendAvailable && (
                  <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, alignItems: "center" }}>
                    <TextInput
                      value={contributionDrafts[g.id] ?? ""}
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
                      <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: "600" }}>
                        {contributingGoalId === g.id ? "Adding…" : "Add"}
                      </Text>
                    </Pressable>
                  </View>
                )}
                {contributionErrors[g.id] && (
                  <Text variant="caption" style={{ color: palette.sourPunch, marginTop: 4 }}>
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
                  {addGoalError && (
                    <Text variant="caption" style={{ color: palette.sourPunch }}>
                      {addGoalError}
                    </Text>
                  )}
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <Pressable
                      onPress={handleAddGoal}
                      disabled={addingGoal}
                      role="button"
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: palette.sourLime }}
                    >
                      <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: "600" }}>
                        {addingGoal ? "Saving…" : "Create goal"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowAddGoal(false)}
                      role="button"
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border }}
                    >
                      <Text variant="bodySmall">Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => setShowAddGoal(true)} role="button" style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Plus size={18} color={palette.sourLime} aria-hidden={true} />
                  <Text variant="body" style={{ fontWeight: "600" }}>
                    Add a goal
                  </Text>
                </Pressable>
              )}
            </Card>
          )}
        </>
      )}
    </ScreenGrid>
  );
}
