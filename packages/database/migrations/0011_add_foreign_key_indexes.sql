-- Adds plain btree indexes on foreign-key columns that RLS policies and/or
-- application queries actually filter or join on (2026-08-07). Unlike every
-- other database this session has touched, Postgres does NOT automatically
-- index foreign-key columns the way it does primary keys — only the six
-- earlier migrations' hand-added unique indexes (0001, 0008) exist today,
-- and those were added to enforce uniqueness, not to serve lookups. Every
-- other FK column in the schema — including the one queried on nearly
-- every single request, was_partnership_member()'s own lookup — has had
-- zero index support since 0001_init.sql. At today's near-zero data volume
-- this is invisible; it stops being invisible the moment either partner has
-- a real transaction history, and by then it's a production incident
-- instead of a migration. Same posture as 0007's RLS-coverage audit and
-- 0009/0010's RLS-correctness fixes: the actual enforcement/performance
-- layer, closed now rather than discovered under load.
--
-- Plain `create index`, not `create index concurrently` — this app has no
-- production traffic yet (founder-only, tables are empty or near-empty), so
-- a brief write-lock while these build is a non-issue, and CONCURRENTLY
-- can't run inside the single-transaction SQL Editor paste every other
-- migration this session has used.
--
-- Scope: only tables the app actually queries today (confirmed via a grep
-- of apps/web/src/app and lib for each table name — see PROJECT_MEMORY.md's
-- 2026-08-07 entry for the full accounting). Deliberately deferred, with
-- zero current query traffic to justify indexing yet: recurring_expenses,
-- ai_conversations, ai_messages, ai_insights, notifications, challenges,
-- challenge_participations, subscriptions, attachments, plaid_items,
-- account_balance_snapshots — same tables 0007 already flagged as
-- unwired-to-any-route. Also deliberately scoped out: transactions.account_id
-- specifically — every other FK on `transactions` is indexed below, but
-- nothing in the app (RLS or application code) currently queries by
-- account_id alone; add it when a per-account transaction view ships.

-- was_partnership_member(p_partnership_id) — packages/database/migrations/
-- 0002_rls.sql's single most-called helper function, referenced by nearly
-- every RLS policy in the schema — runs `where partnership_id = $1 and
-- user_id = current_user_id()` against this exact table on every
-- row-level check for accounts, transactions, categories, budgets, goals,
-- wedding_*, money_meetings, activity_feed_events, and more. The existing
-- `one_active_partnership_per_user` index (0001_init.sql) is keyed by
-- user_id for a different lookup ("find my own active membership") and
-- doesn't help this one at all.
create index partnership_members_partnership_user_idx
  on partnership_members (partnership_id, user_id);

-- GET /api/partnership's pending-invite lookup: `where partnership_id = $1
-- and status = 'pending' order by created_at desc limit 1`.
create index partnership_invites_partnership_idx
  on partnership_invites (partnership_id);

-- accounts_select/accounts_write RLS (owner_id = current_user_id() / (is_shared
-- and was_partnership_member(partnership_id))); findOrCreateManualAccount's
-- owner_id lookup is already partially covered by accounts_one_manual_per_user,
-- but that index is scoped to account_type = 'manual' only.
create index accounts_owner_idx on accounts (owner_id);
create index accounts_partnership_idx on accounts (partnership_id);

-- categories_select/categories_write RLS, and GET /api/budget's category
-- bootstrap/listing queries.
create index categories_owner_idx on categories (owner_id);
create index categories_partnership_idx on categories (partnership_id);

-- transactions_select/transactions_write RLS; owner_id/partnership_id are
-- the RLS-relevant columns (transactions carries its own, not derived via
-- an accounts join). category_id backs GET /api/budget's and
-- lib/moneyMeeting.ts's per-category monthly-spend subquery — run once per
-- budget category on every Budget/Money-Meeting load, the hottest query
-- path this migration touches.
create index transactions_owner_idx on transactions (owner_id);
create index transactions_partnership_idx on transactions (partnership_id);
create index transactions_category_idx on transactions (category_id);

-- budgets_select/budgets_write RLS. The 0008 unique indexes on
-- (partnership_id, month)/(owner_id, month) are partial (scoped to
-- is_shared/partnership_id-null predicates that don't always match RLS's
-- own condition shape), so they can't be relied on to cover a general
-- owner_id/partnership_id lookup — these are plain and unconditional.
create index budgets_owner_idx on budgets (owner_id);
create index budgets_partnership_idx on budgets (partnership_id);

-- goals_select/goals_write RLS, and GET /api/goals's listing query.
create index goals_owner_idx on goals (owner_id);
create index goals_partnership_idx on goals (partnership_id);

-- goal_contributions_select's exists() subquery and GET /api/goals's
-- `where gc.goal_id = any($1::uuid[])` batch fetch; contributor_id backs
-- goal_contributions_write's RLS check.
create index goal_contributions_goal_idx on goal_contributions (goal_id);
create index goal_contributions_contributor_idx on goal_contributions (contributor_id);

-- wedding_vendors_all / wedding_family_contributions_all /
-- wedding_checklist_items_all RLS (each keyed off wedding_details_id, not
-- partnership_id directly — see 0010's fix to these same policies'
-- WITH CHECK clauses), and every GET /api/wedding* route's listing queries.
-- wedding_details.partnership_id itself is already indexed via its own
-- `unique` column constraint (0001_init.sql) — no new index needed there.
create index wedding_vendors_wedding_details_idx on wedding_vendors (wedding_details_id);
create index wedding_family_contributions_wedding_details_idx on wedding_family_contributions (wedding_details_id);
create index wedding_checklist_items_wedding_details_idx on wedding_checklist_items (wedding_details_id);

-- GET /api/activity's exact query shape: `where partnership_id = $1 order
-- by created_at desc limit 15` — composite, not just partnership_id alone,
-- since the sort is part of the same hot path on every Home/AppShell load.
-- money_meetings needs no new index: money_meetings_partnership_week_unique
-- (0008) is a full, non-partial index with partnership_id as its leftmost
-- column, already usable for a plain partnership_id lookup.
create index activity_feed_events_partnership_created_idx
  on activity_feed_events (partnership_id, created_at desc);
