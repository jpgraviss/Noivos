"use client";

import { useEffect, useState } from "react";
import { Card, Text, useTheme, spacing, radius, palette, getTextColorFor } from "@noivos/ui";

interface BillingStatus {
  billingLive: boolean;
  hasPartnership: boolean;
  status: "none" | "trialing" | "active" | "past_due" | "canceled";
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
}

function pillButtonStyle(bg: string, textColor: string, disabled: boolean) {
  return {
    padding: "10px 16px",
    borderRadius: radius.pill,
    border: "none",
    backgroundColor: bg,
    color: textColor,
    fontFamily: "var(--font-inter)",
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

// Replaces MoreScreen.tsx's old static "Subscription — Not built yet" row
// now that SE-204 makes it real. `billingLive: false` (no STRIPE_SECRET_KEY
// set yet — lib/stripe.ts/lib/entitlements.ts) means every Premium feature
// is still free for everyone, same as before this shipped — this card says
// so plainly rather than showing an Upgrade button that would 503.
export function BillingSettings() {
  const { colors } = useTheme();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/billing")
      .then(async (res) => {
        if (!res.ok) throw new Error("billing fetch failed");
        return res.json() as Promise<BillingStatus>;
      })
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        // No database/Clerk reachable — same graceful-passthrough posture
        // as every other Settings card in this file.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function startCheckoutOrPortal(path: "/api/billing/checkout" | "/api/billing/portal") {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't open billing.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't reach the server — try again.");
    } finally {
      setWorking(false);
    }
  }

  if (!loaded) {
    return (
      <Card>
        <Text variant="h3" style={{ marginBottom: 4 }}>
          Subscription
        </Text>
        <Text variant="bodySmall" secondary>
          Loading…
        </Text>
      </Card>
    );
  }

  if (!status || !status.billingLive) {
    return (
      <Card>
        <Text variant="h3" style={{ marginBottom: 4 }}>
          Subscription
        </Text>
        <Text variant="bodySmall" secondary>
          Noivos is free for everyone while Premium billing is still being set up — Plaid, the AI Coach, and the
          Purchase Advisor are all unrestricted for now. This will show real plan details once that&apos;s live.
        </Text>
      </Card>
    );
  }

  const isActive = status.status === "active" || status.status === "trialing";

  return (
    <Card>
      <Text variant="h3" style={{ marginBottom: 4 }}>
        Subscription
      </Text>
      {!status.hasPartnership ? (
        <Text variant="bodySmall" secondary>
          Noivos Premium covers both partners on one subscription — invite a partner above before subscribing.
        </Text>
      ) : (
        <>
          <Text variant="bodySmall" secondary style={{ marginBottom: spacing.sm }}>
            {status.status === "active" && "Noivos Premium is active for your Partnership."}
            {status.status === "trialing" && "Your Noivos Premium trial is active."}
            {status.status === "past_due" && "Your last payment didn&apos;t go through — update your payment method to keep Premium."}
            {status.status === "canceled" && "Your Noivos Premium subscription was canceled."}
            {status.status === "none" &&
              "You're on the free plan. Start a 14-day free trial to unlock Plaid, the AI Coach, and the Purchase Advisor — both of you need to have joined the Partnership first."}
          </Text>
          {error && (
            <Text variant="bodySmall" style={{ color: colors.danger, marginBottom: spacing.sm }}>
              {error}
            </Text>
          )}
          {isActive || status.status === "past_due" ? (
            <button
              onClick={() => startCheckoutOrPortal("/api/billing/portal")}
              disabled={working}
              style={pillButtonStyle(colors.border, colors.textPrimary, working)}
            >
              {working ? "Opening…" : "Manage billing"}
            </button>
          ) : (
            <button
              onClick={() => startCheckoutOrPortal("/api/billing/checkout")}
              disabled={working}
              style={pillButtonStyle(palette.sourLime, getTextColorFor(palette.sourLime), working)}
            >
              {working ? "Opening…" : "Start free trial"}
            </button>
          )}
        </>
      )}
    </Card>
  );
}
