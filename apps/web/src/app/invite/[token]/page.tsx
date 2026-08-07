"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { Card, Text, ThemeProvider, useTheme, spacing, radius, palette, getTextColorFor } from "@noivos/ui";

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

interface InvitePreview {
  inviterName: string;
  invitedEmail: string;
}

// A standalone route (no sidebar/topbar — this is reached by a link, not
// app navigation), the accept-half of the invite flow started 2026-08-03.
// Signed-out visitors get a preview ("Ava invited you...") plus sign-in/
// sign-up, both redirecting right back here afterward so they can accept
// without losing the link. Signed-in visitors get a real Accept button
// wired to /api/partnership/accept. Requires migration
// 0006_add_partnership_invite_accept_flow.sql to actually let a non-inviter
// read/respond to the invite — see packages/database/README.md.
function InvitePageInner() {
  const { colors } = useTheme();
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const { isSignedIn } = useAuth();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<{ partnerName: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/partnership/invite/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setPreviewError(data.error ?? "This invite isn't valid.");
          return;
        }
        setPreview(data);
      })
      .catch(() => setPreviewError("Couldn't reach the server — try again."))
      .finally(() => setPreviewLoaded(true));
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch("/api/partnership/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken: token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAcceptError(data.error ?? "Couldn't accept that invite.");
        return;
      }
      setAccepted(data);
    } catch {
      setAcceptError("Couldn't reach the server — try again.");
    } finally {
      setAccepting(false);
    }
  }

  const redirectBackHere = typeof window !== "undefined" ? window.location.pathname : `/invite/${token}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
        padding: spacing.lg,
      }}
    >
      <div style={{ maxWidth: 420, width: "100%" }}>
        <Card>
          <Text variant="h2" style={{ marginBottom: spacing.sm }}>
            {accepted ? "You're connected" : "Partnership invite"}
          </Text>

          {accepted ? (
            <Text variant="body" secondary>
              You&apos;re now connected to {accepted.partnerName} on Noivos. Head back to the app to see your shared
              goals, budget, and wedding plans together.
            </Text>
          ) : !previewLoaded ? (
            <Text variant="body" secondary>
              Loading…
            </Text>
          ) : previewError ? (
            <Text variant="body" secondary>
              {previewError}
            </Text>
          ) : preview ? (
            <>
              <Text variant="body" secondary style={{ marginBottom: spacing.lg }}>
                {preview.inviterName} invited you to join their Partnership on Noivos — you&apos;ll share goals, a
                budget, and (if they&apos;ve started one) wedding planning together.
              </Text>

              {!isSignedIn ? (
                <div style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap" }}>
                  <SignUpButton mode="redirect" forceRedirectUrl={redirectBackHere}>
                    <button
                      style={{
                        padding: "10px 18px",
                        borderRadius: radius.pill,
                        border: "none",
                        backgroundColor: palette.sourLime,
                        color: getTextColorFor(palette.sourLime),
                        fontFamily: "var(--font-inter)",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      Sign up to accept
                    </button>
                  </SignUpButton>
                  <SignInButton mode="redirect" forceRedirectUrl={redirectBackHere}>
                    <button
                      style={{
                        padding: "10px 18px",
                        borderRadius: radius.pill,
                        border: `1px solid ${colors.border}`,
                        backgroundColor: "transparent",
                        color: colors.textPrimary,
                        fontFamily: "var(--font-inter)",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      Already have an account? Sign in
                    </button>
                  </SignInButton>
                </div>
              ) : (
                <>
                  {acceptError && (
                    <Text variant="bodySmall" style={{ color: palette.sourPunch, marginBottom: spacing.sm }}>
                      {acceptError}
                    </Text>
                  )}
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    style={{
                      padding: "10px 18px",
                      borderRadius: radius.pill,
                      border: "none",
                      backgroundColor: palette.sourLime,
                      color: getTextColorFor(palette.sourLime),
                      fontFamily: "var(--font-inter)",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: accepting ? "default" : "pointer",
                      opacity: accepting ? 0.7 : 1,
                    }}
                  >
                    {accepting ? "Accepting…" : "Accept invite"}
                  </button>
                </>
              )}
            </>
          ) : null}

          {accepted && (
            <Link
              href="/"
              style={{
                display: "inline-block",
                marginTop: spacing.lg,
                fontFamily: "var(--font-inter)",
                fontWeight: 600,
                fontSize: 14,
                color: palette.sourLime,
              }}
            >
              Go to Noivos →
            </Link>
          )}
        </Card>
      </div>
    </main>
  );
}

export default function InvitePage() {
  if (!clerkConfigured) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <p style={{ fontFamily: "var(--font-inter)" }}>Clerk isn&apos;t configured, so invites can&apos;t be accepted here yet.</p>
      </main>
    );
  }
  return (
    <ThemeProvider>
      <InvitePageInner />
    </ThemeProvider>
  );
}
