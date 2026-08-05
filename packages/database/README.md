# @noivos/database

Schema and RLS policies for the Noivos Postgres database, hosted on **Neon** (see `PROJECT_MEMORY.md` §6.4 for the Supabase → Neon pivot and why this looks different from `docs/04 Database/Database Architecture.md`'s original Supabase-authored version).

## What's here

- `migrations/0001_init.sql` — full schema: identity/Partnership, financial accounts and transactions, budgets and goals, Wedding Mode, AI conversations, engagement (Money Meetings, activity feed, notifications, challenges), billing, attachments.
- `migrations/0002_rls.sql` — Row-Level Security policies, the actual privacy enforcement layer (Database Architecture §1/§10). Every policy reads a `current_user_id()` helper backed by a Postgres session variable, **not** Supabase's `auth.uid()`.
- `migrations/0003_add_birthdate.sql` — adds `users.birthdate`, not in the original Database Architecture doc; added for `apps/web`'s locked Name & Birthdate identity-verification setting.
- `migrations/0004_tighten_goal_contributions_rls.sql` — closes a real gap in `goal_contributions_write`: it only checked the inserting user named themselves as contributor, never that the goal itself was theirs to write to.
- `migrations/0005_add_activity_feed_insert_policy.sql` — adds the INSERT policy `activity_feed_events` never had; without it, no per-user connection can write an activity event at all (see `PROJECT_MEMORY.md` §6.0's no-service-role-for-live-requests rule).
- `migrations/0006_add_partnership_invite_accept_flow.sql` — adds the two `partnership_invites` RLS policies a real accept-invite flow needs: any pending invite is selectable (the invite_token itself is the secret), and any signed-in user can transition a pending invite to accepted/declined. Without these, only the inviter could ever read or update an invite row — there was no way for the actual invitee to join.

## The auth handoff (read before touching this)

Supabase gave RLS policies a free, built-in `auth.uid()`. Clerk (the new auth provider, per §6.4) is external to Postgres, so there's no equivalent for free. Instead:

1. Clerk authenticates the request and gives the API layer a `clerk_user_id`.
2. Before running **any** query on behalf of that user, the API layer's DB client must run, inside the same transaction:
   ```sql
   select set_config('app.current_user_id', $1, true); -- true = transaction-scoped
   ```
3. Every RLS policy in `0002_rls.sql` reads that value back via `current_user_id()`. If a query runs without setting it first, RLS correctly denies everything — that's a safety property, not a bug to work around.

**Never** connect with a superuser/bypass-RLS role for a live user request — reserved only for async/system-initiated writes (Plaid webhooks, scheduled jobs) per the hard rule in `PROJECT_MEMORY.md` §6.0 and Backend Architecture §2, and even those must replicate the ownership/sharing checks in code since RLS won't be doing it for them.

## Status

**Connected as of 2026-08-03.** This repo's sandbox can't make raw-TCP database connections at all (same class of restriction as the Clerk network block noted elsewhere), so migrations can't be applied from here — the founder runs each one via Neon's web SQL Editor, which is unaffected by that restriction.

### Migration checklist — keep this updated, it's the one source of truth for what's actually live in the database

| Migration | Applied? |
|---|---|
| `0001_init.sql` | ✅ Applied 2026-08-03 |
| `0002_rls.sql` | ✅ Applied 2026-08-03 |
| `0003_add_birthdate.sql` | ✅ Applied 2026-08-03 |
| `0004_tighten_goal_contributions_rls.sql` | ✅ Applied 2026-08-05 |
| `0005_add_activity_feed_insert_policy.sql` | ✅ Applied 2026-08-05 |
| `0006_add_partnership_invite_accept_flow.sql` | ✅ Applied 2026-08-05 |

When a new migration file is added here, add its row to this table as **Not yet applied** in the same commit — don't let a migration exist in the repo without a tracked status. When the founder confirms one has been run, flip it to Applied (with the date) in the same turn, not deferred to the next PROJECT_MEMORY pass.

If a fresh database is ever needed, run them in order:

```bash
psql "$DATABASE_URL" -f migrations/0001_init.sql
psql "$DATABASE_URL" -f migrations/0002_rls.sql
psql "$DATABASE_URL" -f migrations/0003_add_birthdate.sql
psql "$DATABASE_URL" -f migrations/0004_tighten_goal_contributions_rls.sql
psql "$DATABASE_URL" -f migrations/0005_add_activity_feed_insert_policy.sql
psql "$DATABASE_URL" -f migrations/0006_add_partnership_invite_accept_flow.sql
```

`apps/mobile` still runs entirely on mock data (`apps/mobile/src/data/mockData.ts`) — only `apps/web` is wired to real queries so far (identity settings, All Goals, Partnership, Wedding Mode, Budget); everything else across both apps is still mock data, shaped to match this schema so swapping in real queries later is a plumbing change, not a redesign.

**Budget (2026-08-05) needed no new migration.** `accounts`, `transactions`, `categories`, `budgets`, and `budget_categories` — plus their RLS policies — were already part of `0001_init.sql`/`0002_rls.sql`; they were just unused until `apps/web/src/app/api/budget/route.ts` and `.../transactions/route.ts` started querying them. One new-for-this-slice behavior worth knowing about since it isn't a schema change: a Partnership's shared Budget is a single `budgets` row (`partnership_id` set, `is_shared = true`) created by whichever partner loads Budget first in a given month — `budget_categories_write`'s existing RLS still only lets that row's `owner_id` edit it, so the other partner gets a correct read-only view, not a co-editable one. Flagged as a fast-tracked judgment call in `PROJECT_MEMORY.md`, same posture as the Partnership `status='active'` fix.

**Wedding Family Contributions (2026-08-05) also needed no new migration.** `wedding_family_contributions` and its RLS were already part of `0001_init.sql`/`0002_rls.sql`; wired via `apps/web/src/app/api/wedding/family-contributions/route.ts` (POST) and an extended `GET /api/wedding`. Kept as a plain free-text ledger (`contributor_name`, no `user_id`) exactly as the schema intended — per PROJECT_MEMORY.md's 2026-08-02 decision (PRD §12.8), family members who gift money never get real account access.

**Upcoming Bills (2026-08-05) reuses `wedding_vendors` — no new table, no new migration.** `apps/web/src/app/api/bills/route.ts` reads the same `balance_due`/`balance_due_date` columns Wedding Mode already wired; the old mock bills were always just vendor balances under a different label.

**Money Meeting (2026-08-05) also needed no new migration.** `money_meetings` and its RLS were already part of `0001_init.sql`/`0002_rls.sql` — and unlike Budget's `budget_categories_write`, `money_meetings_all`'s policy lets **any** active member of the Partnership update the row, not just its creator, so this one is genuinely co-editable. Wired via `apps/web/src/app/api/money-meeting/route.ts` (GET, auto-creates the current week's row) and `.../complete/route.ts` (POST). The agenda is derived from real Budget/Wedding data with plain rule-based checks (`apps/web/src/lib/moneyMeeting.ts`) — explicitly not an AI call, since AI is out of scope until the provider decision is made.

**Activity Feed (2026-08-05) is the one slice this round that *did* need a new migration.** `activity_feed_events` shipped with a SELECT-only RLS policy (0002_rls.sql's comment assumed it would only ever be written by "trusted server-side code" — i.e. a service-role/bypass-RLS connection, which this project's hard rule forbids for live user requests). `0005_add_activity_feed_insert_policy.sql` adds the missing INSERT policy — applied 2026-08-05. `apps/web/src/lib/activity.ts`'s `logActivityEvent()` is called, best-effort and fire-and-forget, from every other real-data write route (goal contributions, budget expenses, wedding vendors/checklist/family contributions) — it runs in its own separate transaction *after* the primary write already committed, specifically so a logging failure can never roll back the real action that triggered it.

**Partnership accept-invite (2026-08-05) — the real second-person-joins flow, and a second migration this round.** Since 2026-08-03, inviting created a real solo Partnership + a pending invite row, but nothing let a second person actually join — `partnership_invites`' original RLS (0002_rls.sql) only let the *inviter* select/update their own invite. `0006_add_partnership_invite_accept_flow.sql` adds the two policies an invitee needs: read a pending invite (by its unguessable `invite_token`, the actual secret), and transition it to accepted/declined. New routes: `GET /api/partnership/invite/[token]` (a deliberately public preview, no auth required — shows "X invited you" before sign-in) and `POST /api/partnership/accept` (joins `partnership_members`, marks the invite accepted). New page: `apps/web/src/app/invite/[token]/page.tsx`, a standalone landing page with sign-in/sign-up (redirecting back to itself) or an Accept button. `PartnershipSettings.tsx` now shows the actual shareable link with a copy button instead of just "no email service" text. **Known simplification, not silently assumed secure**: accepting does not verify the signed-in user's email matches the invite's `invitee_contact` — anyone with the link can accept, since there's still no real email-delivery channel to check against. **Verification note**: this page renders through Clerk, and this sandbox's network egress block on Clerk's host (`top-skink-67.clerk.accounts.dev`, the same restriction documented since 2026-08-03) means the actual preview/accept UI has never been visually confirmed from here — only the Clerk-unconfigured fallback message was confirmed not to crash. Migration 0006 is now applied (2026-08-05); the real signed-in preview/accept round trip still needs a pass on the live Vercel deployment.

## Open items

- **Plaid access-token encryption** (`plaid_items.access_token_encrypted`): Supabase Vault is gone; no replacement chosen yet (`pgcrypto` + app-managed key vs. a dedicated secrets manager). See `PROJECT_MEMORY.md` §6.4/§8.
- Full audit logging is deferred to Security Architecture per the founder's confirmed V1 scope — this schema has `created_at`/`updated_at`/soft-delete only.
