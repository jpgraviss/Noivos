# @noivos/database

Schema and RLS policies for the Noivos Postgres database, hosted on **Neon** (see `PROJECT_MEMORY.md` §6.4 for the Supabase → Neon pivot and why this looks different from `docs/04 Database/Database Architecture.md`'s original Supabase-authored version).

## What's here

- `migrations/0001_init.sql` — full schema: identity/Partnership, financial accounts and transactions, budgets and goals, Wedding Mode, AI conversations, engagement (Money Meetings, activity feed, notifications, challenges), billing, attachments.
- `migrations/0002_rls.sql` — Row-Level Security policies, the actual privacy enforcement layer (Database Architecture §1/§10). Every policy reads a `current_user_id()` helper backed by a Postgres session variable, **not** Supabase's `auth.uid()`.
- `migrations/0003_add_birthdate.sql` — adds `users.birthdate`, not in the original Database Architecture doc; added for `apps/web`'s locked Name & Birthdate identity-verification setting.

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

**Connected as of 2026-08-03** — the founder created a Neon project and ran `0001_init.sql`/`0002_rls.sql` via Neon's web SQL Editor (this repo's sandbox can't make raw-TCP database connections at all, so migrations can't be applied from here — same class of restriction as the Clerk network block noted elsewhere). `0003_add_birthdate.sql` still needs to be run the same way before the Name & Birthdate setting's real persistence (`apps/web/src/app/api/profile/route.ts`) will work.

If a fresh database is ever needed:

```bash
psql "$DATABASE_URL" -f migrations/0001_init.sql
psql "$DATABASE_URL" -f migrations/0002_rls.sql
psql "$DATABASE_URL" -f migrations/0003_add_birthdate.sql
```

`apps/mobile` still runs entirely on mock data (`apps/mobile/src/data/mockData.ts`) — only `apps/web`'s identity settings are wired to real queries so far; everything else across both apps is still mock data, shaped to match this schema so swapping in real queries later is a plumbing change, not a redesign.

## Open items

- **Plaid access-token encryption** (`plaid_items.access_token_encrypted`): Supabase Vault is gone; no replacement chosen yet (`pgcrypto` + app-managed key vs. a dedicated secrets manager). See `PROJECT_MEMORY.md` §6.4/§8.
- Full audit logging is deferred to Security Architecture per the founder's confirmed V1 scope — this schema has `created_at`/`updated_at`/soft-delete only.
