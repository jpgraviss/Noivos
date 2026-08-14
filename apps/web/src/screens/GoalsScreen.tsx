import { useEffect, useRef, useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { Circle, CircleCheck, Flag, Plus } from "lucide-react-native";
import { Card, OwnershipBadge, StackedProgressBar, Skeleton, Text, useTheme, spacing, radius, palette } from "@noivos/ui";
import { goals as mockGoals, weddingDetails } from "../data/mockData";
import { ScreenGrid, ScreenGridWide } from "../components/ScreenLayout";
import { daysUntil, daysUntilHumanDate } from "../lib/date";

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
// true to false — this screen's three expandable add-forms (vendor,
// family contribution, goal) each unmount their whole form subtree on
// Cancel or a successful submit and mount a *different* Pressable (the
// "Add a ___" toggle link) in the same slot. Since react-native-web renders
// Pressable as a real focusable DOM node, a keyboard user who Tabs into
// the form and activates Cancel had their focused element removed from
// the DOM with no explicit focus management (found 2026-08-13) — the
// browser silently drops focus to <body>, losing their tab position and
// forcing them to restart tabbing from the top of the page instead of
// landing back on the control that logically replaced the one they had
// focused. Guarded against firing on initial mount (`isOpen` starts
// false) — only a genuine true -> false transition triggers it.
// `ref` is typed as RN's own `View` (the type Pressable's own `ref` prop
// expects) rather than something with a `.focus()` method — RN's typings
// target native platforms too, where View has no DOM-style `.focus()`, so
// the cast to `unknown` at the actual call site below is deliberate: on
// this web-only screen, react-native-web's Pressable forwards to a real
// DOM node with a genuine `.focus()` at runtime, but nothing further up
// the type chain can express that without fighting RN's own typings.
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
  // Was hardcoded `false` — every real goal, shared or personal, showed the
  // "Personal" OwnershipBadge regardless of its actual sharing status,
  // since GET /api/goals never selected/returned is_shared at all (found
  // and fixed 2026-08-08). Every real goal happens to genuinely be
  // personal today anyway (POST /api/goals can't create a shared one yet —
  // see that route's own comment), so this had zero visible effect until
  // that's fixed too, but the field itself was simply wrong.
  return { id: g.id, name: g.name, target: g.targetAmount, shared: g.shared, contributors };
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

  // Loading state history, 2026-08-11 to 2026-08-13: this per-segment gate
  // was removed on the theory that it was pure friction, since displayGoals/
  // weddingActive below already fall back to real, synchronous mock data —
  // but that traded a bare "Loading…" line for something worse: a real,
  // signed-in user with a working backend saw an actual flash of WRONG
  // numbers (the mock ones) before the correct ones replaced them a moment
  // later, on every load (confirmed via production runtime logs — the real
  // fetches genuinely succeed, they just aren't instant). Restored, but
  // showing a neutral <Skeleton> shaped like the real layout instead of
  // either a bare loading line or fabricated numbers.
  const [loaded, setLoaded] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [apiGoals, setApiGoals] = useState<ApiGoal[]>([]);

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  // Defaults to Personal, not Shared — the safest, least-surprising choice
  // (matches every goal this route has ever created until now; see
  // POST /api/goals's own comment for why this couldn't default to
  // shared-when-partnered the way Budget does). Only offered as a choice
  // at all when `hasPartnership` is true — a solo user has nothing to
  // share with yet.
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
  const [weddingLoaded, setWeddingLoaded] = useState(false);
  const [weddingBackendAvailable, setWeddingBackendAvailable] = useState(false);
  const [hasPartnership, setHasPartnership] = useState(false);
  const [apiWedding, setApiWedding] = useState<ApiWeddingDetails | null>(null);

  const [startDate, setStartDate] = useState("");
  const [startGuestCount, setStartGuestCount] = useState("");
  const [startingWedding, setStartingWedding] = useState(false);
  const [startWeddingError, setStartWeddingError] = useState<string | null>(null);

  // Wired 2026-08-13: PATCH /api/wedding has existed since 2026-08-11 but
  // had no UI calling it — the wedding date/guest count could only ever be
  // set once, at Start Wedding Mode time. Mirrors the Start Wedding form's
  // own fields/validation posture exactly (no client-side date-format
  // check, relies on the server's real isValidDateString/non-negative
  // checks and surfaces its error message directly).
  const [showEditWedding, setShowEditWedding] = useState(false);
  const [editWeddingDate, setEditWeddingDate] = useState("");
  const [editGuestCount, setEditGuestCount] = useState("");
  const [savingWeddingEdit, setSavingWeddingEdit] = useState(false);
  const [editWeddingError, setEditWeddingError] = useState<string | null>(null);
  const editWeddingToggleRef = useRef<View>(null);
  useReturnFocusOnClose(showEditWedding, editWeddingToggleRef);

  function openEditWedding() {
    setEditWeddingDate(apiWedding?.weddingDate ?? "");
    setEditGuestCount(apiWedding?.guestCountEstimate != null ? String(apiWedding.guestCountEstimate) : "");
    setEditWeddingError(null);
    setShowEditWedding(true);
  }

  async function handleSaveWeddingEdit() {
    setSavingWeddingEdit(true);
    setEditWeddingError(null);
    try {
      const res = await fetch("/api/wedding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Both fields always included (even when cleared to an empty
        // string) so PATCH's own *Provided distinction ("weddingDate" in
        // body) treats this save as touching both — matches this form
        // always showing both fields together, unlike a route that could
        // legitimately update just one.
        body: JSON.stringify({
          weddingDate: editWeddingDate.trim() || null,
          guestCountEstimate: editGuestCount.trim() || null,
        }),
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
  const [vendorName, setVendorName] = useState("");
  const [vendorBalance, setVendorBalance] = useState("");
  const [vendorDueDate, setVendorDueDate] = useState("");
  const [addingVendor, setAddingVendor] = useState(false);
  const [addVendorError, setAddVendorError] = useState<string | null>(null);
  const addVendorToggleRef = useRef<View>(null);
  useReturnFocusOnClose(showAddVendor, addVendorToggleRef);

  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [addingChecklistItem, setAddingChecklistItem] = useState(false);
  const [addChecklistError, setAddChecklistError] = useState<string | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

  const [showAddFamilyContribution, setShowAddFamilyContribution] = useState(false);
  const [familyContributorName, setFamilyContributorName] = useState("");
  const [familyContributionAmount, setFamilyContributionAmount] = useState("");
  const [addingFamilyContribution, setAddingFamilyContribution] = useState(false);
  const [addFamilyContributionError, setAddFamilyContributionError] = useState<string | null>(null);
  const addFamilyContributionToggleRef = useRef<View>(null);
  useReturnFocusOnClose(showAddFamilyContribution, addFamilyContributionToggleRef);

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
        body: JSON.stringify({ name, targetAmount: target, goalType: "custom", shared: newGoalShared }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddGoalError(data.error ?? "Couldn't create that goal.");
        return;
      }
      setApiGoals((prev) => [...prev, data]);
      setNewGoalName("");
      setNewGoalTarget("");
      setNewGoalShared(false);
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
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
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
                <Text variant="caption" style={{ color: colors.danger }}>
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
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Flag size={16} color={palette.sourPunch} style={{ marginBottom: spacing.xs }} aria-hidden={true} />
                {!showEditWedding && (
                  <Pressable ref={editWeddingToggleRef} onPress={openEditWedding} role="button">
                    <Text variant="caption" secondary style={{ fontWeight: "600" }}>
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
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <Pressable
                      onPress={handleSaveWeddingEdit}
                      disabled={savingWeddingEdit}
                      role="button"
                      style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: palette.sourLime }}
                    >
                      <Text variant="bodySmall" color={palette.licorice} style={{ fontWeight: "600" }}>
                        {savingWeddingEdit ? "Saving…" : "Save"}
                      </Text>
                    </Pressable>
                    {/* disabled={savingWeddingEdit}, not just Save (found
                        2026-08-13, right after this form shipped): Cancel had
                        no guard against an in-flight save at all — tapping it
                        while a PATCH was still resolving hid the form
                        immediately (the user reasonably believes they
                        discarded the edit), but nothing aborted the request,
                        so handleSaveWeddingEdit's own .then still ran a
                        moment later and silently applied (or failed to
                        apply, into an error state no longer rendered once
                        the form was gone) the "cancelled" edit anyway. Same
                        gap existed on every other Cancel button in this file
                        and in BudgetScreen.tsx's expense form — fixed
                        identically everywhere rather than just here. */}
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
                  {/* daysUntil() returns a negative number once the date has
                      passed (correct — it's real date math, not itself a bug),
                      but nothing here branched on that: a couple whose wedding
                      date has already come and gone (an ordinary state — this
                      screen doesn't clear or archive anything once the date
                      passes) saw a bare negative integer glued to forward-
                      looking "days until" copy, e.g. "-5 / days until
                      2026-06-12" (found 2026-08-11). */}
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
                            {days === 0 ? `Today's the day — ${apiWedding.weddingDate}` : `Your wedding was ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`}
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
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text variant="body">{v.name}</Text>
                    {v.balanceDue != null && (
                      <Text variant="bodySmall" secondary>
                        ${v.balanceDue.toLocaleString()}{v.balanceDueDate ? ` due ${v.balanceDueDate}` : ""}
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
                    {/* disabled={addingVendor} (found 2026-08-13 — see the
                        Edit-Wedding Cancel button's own comment for the full
                        explanation): without it, cancelling mid-save doesn't
                        abort the in-flight POST, which can then silently
                        apply after the form's already gone. */}
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
                <Pressable ref={addVendorToggleRef} onPress={() => setShowAddVendor(true)} role="button" style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs }}>
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
                <Text variant="caption" style={{ color: colors.danger, marginTop: 4 }}>
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
                    <Text variant="caption" style={{ color: colors.danger }}>
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
                    {/* disabled={addingFamilyContribution} (found 2026-08-13
                        — see the Edit-Wedding Cancel button's own comment
                        for the full explanation): without it, cancelling
                        mid-save doesn't abort the in-flight POST, which can
                        then silently apply after the form's already gone. */}
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
                  {/* Only offered when a real Partnership exists — a solo
                      user has nothing to share with yet, and POST
                      /api/goals rejects `shared: true` without one anyway
                      (see that route's own validation). Same Pressable +
                      role="button" + aria-pressed pill pattern as the
                      Wedding/All Goals segment toggle above, not a segment
                      switch itself — this sets state consumed only by
                      handleAddGoal's POST body, added 2026-08-08 once
                      GET/POST /api/goals actually round-tripped a real
                      `shared` field (previously hardcoded false either way). */}
                  {hasPartnership && (
                    <View>
                      <Text variant="caption" secondary style={{ marginBottom: 4 }}>
                        Who&apos;s this for?
                      </Text>
                      <View style={{ flexDirection: "row", gap: spacing.sm }}>
                        {(["personal", "shared"] as const).map((opt) => {
                          const optIsShared = opt === "shared";
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
                                style={{ fontWeight: "600" }}
                              >
                                {optIsShared ? "Shared" : "Personal"}
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
                    {/* disabled={addingGoal} (found 2026-08-13 — see the
                        Edit-Wedding Cancel button's own comment for the
                        full explanation): without it, cancelling mid-save
                        doesn't abort the in-flight POST, which can then
                        silently apply after the form's already gone. */}
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
                <Pressable ref={addGoalToggleRef} onPress={() => setShowAddGoal(true)} role="button" style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
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
