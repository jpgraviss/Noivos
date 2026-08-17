"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { Card, Text, Skeleton, useTheme, spacing, radius, palette, getTextColorFor } from "@noivos/ui";

interface PlaidItemSummary {
  id: string;
  institutionName: string;
  status: string;
  lastSyncedAt: string | null;
  accountCount: number;
}

function pillButtonStyle(borderColor: string, textColor: string) {
  return {
    padding: "10px 16px",
    borderRadius: radius.pill,
    border: `1px solid ${borderColor}`,
    backgroundColor: "transparent",
    color: textColor,
    fontFamily: "var(--font-inter)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer" as const,
  };
}

// Real bank-connection UI (PRD §12.4) — the founder's own explicit
// instruction was to build this now and personally run the actual
// connection through Plaid's Sandbox afterward using test credentials,
// not real bank data (same conversation as the AI Coach backend built
// earlier this session; see lib/ai.ts's top comment for the parallel
// "build now, founder runs it live later" pattern). Persisted via
// /api/plaid/* (Neon, behind Clerk auth + RLS, access token encrypted —
// see lib/plaid.ts). Falls back to local-component-state-only behavior if
// any backend isn't reachable (Clerk unconfigured, Plaid unconfigured, no
// encryption key set), same graceful-passthrough posture as
// IdentitySettings.tsx/PartnershipSettings.tsx.
export function LinkedAccounts() {
  const { colors } = useTheme();
  const [items, setItems] = useState<PlaidItemSummary[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [creatingLinkToken, setCreatingLinkToken] = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch-cancellation guard, same pattern as BudgetScreen.tsx's
  // loadRequestRef — without it, an unmount mid-fetch could still call
  // setItems/setLoadingItems on an unmounted component.
  const loadRequestRef = useRef(0);

  const loadItems = useCallback(() => {
    const requestId = ++loadRequestRef.current;
    fetch("/api/plaid/items")
      .then(async (res) => {
        if (!res.ok) throw new Error("items fetch failed");
        return res.json() as Promise<{ items: PlaidItemSummary[] }>;
      })
      .then((data) => {
        if (loadRequestRef.current !== requestId) return;
        setItems(data.items);
      })
      .catch(() => {
        // No database/Clerk reachable — same graceful-passthrough posture
        // as every other settings card; leave items empty rather than
        // fabricating a connected-account list.
      })
      .finally(() => {
        if (loadRequestRef.current === requestId) setLoadingItems(false);
      });
  }, []);

  useEffect(() => {
    loadItems();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [loadItems]);

  async function handleExchange(publicToken: string, metadata: PlaidLinkOnSuccessMetadata) {
    setExchanging(true);
    setError(null);
    try {
      const res = await fetch("/api/plaid/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken,
          institutionId: metadata.institution?.institution_id ?? null,
          institutionName: metadata.institution?.name ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Couldn't finish connecting that account.");
        return;
      }
      loadItems();
    } catch {
      setError("Couldn't reach the server — try again.");
    } finally {
      setExchanging(false);
      setLinkToken(null); // a used Link token can't be reused — clear it so the next "Connect" click fetches a fresh one
    }
  }

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken, metadata) => {
      // publicToken is typed nullable (react-plaid-link's own
      // PlaidLinkOnSuccess signature) but Plaid's own docs guarantee it's
      // always a real string on a genuine onSuccess callback — this guard
      // only exists to satisfy that broader type, not because null is a
      // real case worth its own user-facing error message.
      if (!publicToken) return;
      void handleExchange(publicToken, metadata);
    },
    onExit: () => {
      // User closed Link without finishing (or it errored) — clear the
      // token so a retry fetches a fresh one rather than reusing a Link
      // session that's already been torn down.
      setLinkToken(null);
    },
  });

  // usePlaidLink's `open()` is the only way to launch Link, and it only
  // works once the hook has finished initializing against the token we
  // just fetched (`ready`) — react-plaid-link's own documented pattern
  // for "launch from a custom button" is exactly this: set the token,
  // then open() once ready flips true, rather than trying to call open()
  // synchronously right after setLinkToken.
  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  async function startConnect() {
    // creatingLinkToken/exchanging guard (same double-tap-guard bug class
    // fixed repeatedly this session): without it, a fast double-click
    // could fire two overlapping POST /api/plaid/link-token calls.
    if (creatingLinkToken || exchanging) return;
    setError(null);
    setCreatingLinkToken(true);
    try {
      const res = await fetch("/api/plaid/link-token", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Couldn't start the bank connection.");
        return;
      }
      setLinkToken(data.linkToken);
    } catch {
      setError("Couldn't reach the server — try again.");
    } finally {
      setCreatingLinkToken(false);
    }
  }

  async function handleSync(itemId: string) {
    if (syncingId) return; // one sync in flight at a time — same double-tap guard shape
    setSyncingId(itemId);
    setError(null);
    try {
      const res = await fetch("/api/plaid/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaidItemId: itemId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Couldn't sync that account.");
        return;
      }
      loadItems();
    } catch {
      setError("Couldn't reach the server — try again.");
    } finally {
      setSyncingId(null);
    }
  }

  const connectBusy = creatingLinkToken || exchanging;

  return (
    <Card style={{ gap: spacing.sm }}>
      <Text variant="h3">Linked Accounts</Text>
      <Text variant="bodySmall" secondary>
        Connect a real bank account via Plaid so budgets and the AI Coach can see your actual spending — every entry is manual until you do.
      </Text>

      {error && (
        <Text variant="bodySmall" style={{ color: colors.danger }}>
          {error}
        </Text>
      )}

      {loadingItems ? (
        <Skeleton width="60%" height={18} />
      ) : items.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: spacing.sm,
                paddingTop: spacing.xs,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                borderTopStyle: "solid",
              }}
            >
              <div>
                <Text variant="bodySmall" style={{ fontWeight: "600" }}>
                  {item.institutionName}
                </Text>
                <Text variant="caption" secondary>
                  {item.accountCount} account{item.accountCount === 1 ? "" : "s"} ·{" "}
                  {item.status === "error"
                    ? "Needs reconnecting"
                    : item.lastSyncedAt
                      ? `Synced ${new Date(item.lastSyncedAt).toLocaleDateString()}`
                      : "Not synced yet"}
                </Text>
              </div>
              <button
                onClick={() => handleSync(item.id)}
                disabled={syncingId === item.id}
                style={pillButtonStyle(colors.border, colors.textPrimary)}
              >
                {syncingId === item.id ? "Syncing…" : "Sync now"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Text variant="bodySmall" secondary>
          No bank accounts connected yet.
        </Text>
      )}

      <button
        onClick={startConnect}
        disabled={connectBusy}
        style={{
          ...pillButtonStyle(palette.sourLime, getTextColorFor(palette.sourLime)),
          backgroundColor: palette.sourLime,
          border: "none",
          alignSelf: "flex-start",
          marginTop: spacing.xs,
        }}
      >
        {connectBusy ? "Connecting…" : "Connect a bank account"}
      </button>
    </Card>
  );
}
