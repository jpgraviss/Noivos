import { Show } from "@clerk/nextjs";
import { AppShell } from "@/components/AppShell";
import { AuthenticatedAppShell } from "@/components/AuthenticatedAppShell";
import { LandingPage } from "@/components/marketing/LandingPage";

// Same fallback pattern as layout.tsx/proxy.ts: without Clerk env vars there's
// no ClerkProvider ancestor, so <Show> would throw — render the app straight
// through instead.
const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function Home() {
  if (!clerkConfigured) {
    return <AppShell />;
  }

  return (
    <>
      <Show when="signed-in">
        <AuthenticatedAppShell />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}
