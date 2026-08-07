-- Closes five check-then-insert race conditions found via a static schema
-- read (2026-08-07): each of these code paths does a "select, and if
-- nothing's found, insert" with no unique constraint or ON CONFLICT clause
-- backing it — so two concurrent requests (both partners loading Budget at
-- the same moment, a rapid double-fetch, React StrictMode's dev-mode
-- double-invoke) can both see "nothing exists yet" and both insert,
-- creating duplicate rows. `wedding_details` already got this right back in
-- 0001_init.sql (a real `unique` column + `POST /api/wedding`'s existing
-- `on conflict (partnership_id) do nothing`) — these five never got the
-- same treatment. Postgres note throughout: a plain multi-column `unique`
-- constraint does NOT prevent duplicates when one of the columns is NULL
-- (NULL is never considered equal to NULL for uniqueness purposes), which
-- is exactly the personal-vs-shared split every one of these tables has —
-- hence partial indexes with an explicit `where`, not plain `unique(...)`.

-- 1. money_meetings — one meeting per Partnership per week. No nullable
-- split needed; partnership_id is NOT NULL on this table.
create unique index money_meetings_partnership_week_unique
  on money_meetings (partnership_id, week_of);

-- 2. budgets — one shared budget per Partnership per month, OR one personal
-- budget per user per month. Never both for the same person+month: the
-- existing POST logic in apps/web/src/app/api/budget/route.ts always sets
-- is_shared = true whenever a Partnership exists, so a personal (is_shared
-- = false, partnership_id null) row and a shared row are mutually exclusive
-- states for the same request, not two things that need reconciling here.
create unique index budgets_shared_month_unique
  on budgets (partnership_id, month)
  where is_shared and partnership_id is not null;
create unique index budgets_personal_month_unique
  on budgets (owner_id, month)
  where partnership_id is null;

-- 3. categories — one category per name per owner (personal) or per
-- Partnership (shared). The only current writer is the default-category
-- bootstrap in GET /api/budget; nothing lets a user create an
-- intentionally-duplicate-named category today, so this isn't foreclosing
-- a real product need.
create unique index categories_personal_name_unique
  on categories (owner_id, name)
  where partnership_id is null;
create unique index categories_shared_name_unique
  on categories (partnership_id, name)
  where owner_id is null;

-- 4. budget_categories — one row per (budget, category) pair. No nullable
-- split needed; both columns are NOT NULL on this table.
create unique index budget_categories_unique
  on budget_categories (budget_id, category_id);

-- 5. accounts — one manual "catch-all" account per user
-- (findOrCreateManualAccount in apps/web/src/lib/budget.ts). Scoped to
-- account_type = 'manual' specifically, not all accounts — a user can and
-- will have multiple real Plaid-linked accounts once that exists.
create unique index accounts_one_manual_per_user
  on accounts (owner_id)
  where account_type = 'manual';
