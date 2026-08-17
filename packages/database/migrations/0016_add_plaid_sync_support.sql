-- Added 2026-08-14 as part of building the real Plaid integration (PRD
-- §12.4) — until now plaid_items/accounts.plaid_item_id/
-- transactions.plaid_transaction_id existed in the schema but nothing
-- wrote to them (every account has been a manual "Manual Entries" row,
-- lib/budget.ts's own comment on findOrCreateManualAccount says so
-- explicitly). This is purely additive/structural — no RLS policy
-- changes, no data changes — so there's nothing here that can narrow or
-- widen who can see what, only what the schema can now represent and
-- what upserts can now be idempotent against.

-- 1. plaid_items needs a place to persist Plaid's transactions/sync
-- cursor so a later "sync now" call can fetch only what changed since the
-- last sync, instead of re-pulling a Plaid Item's entire transaction
-- history every time. NULL means "never synced yet" — Plaid's own
-- /transactions/sync semantics treat an omitted cursor as "start from the
-- beginning," so NULL here maps directly to that, no separate sentinel
-- needed.
alter table plaid_items add column sync_cursor text;

-- 2. plaid_items had zero indexes beyond its own unique plaid_item_id
-- (0007_close_rls_audit_gaps.sql enabled RLS on this table but the FK-index
-- pass in 0011 deliberately deferred plaid_items itself, since nothing
-- queried it yet — same "unwired-to-any-route" reasoning that pass used
-- for every other zero-traffic table). plaid_items_select/_write's RLS
-- (`user_id = current_user_id()`) is about to be queried on every Plaid
-- route this migration's application code adds.
create index plaid_items_user_idx on plaid_items (user_id);

-- 3. accounts.plaid_item_id is about to be queried too — POST /api/plaid/
-- exchange needs to find this Item's already-linked accounts on every
-- sync, not just at initial link time.
create index accounts_plaid_item_idx on accounts (plaid_item_id) where plaid_item_id is not null;

-- 4. Idempotent account upserts: the same Plaid Item's /accounts/get or
-- /transactions/sync response is fetched again on every "sync now" call,
-- and returns the same accounts every time. Without a real uniqueness
-- constraint to `ON CONFLICT` against, every sync would either duplicate
-- every account row or require a separate existence-check SELECT per
-- account before each insert (the exact N+1 shape already found and fixed
-- once this session in GET /api/budget — not repeating it here).
-- (plaid_item_id, plaid_account_id) together identify one real external
-- account exactly once; a manual account has both null and is correctly
-- excluded from this constraint (`accounts_one_manual_per_user`, added in
-- 0008, already covers manual accounts' own one-per-user uniqueness).
create unique index accounts_plaid_account_unique on accounts (plaid_item_id, plaid_account_id)
  where plaid_item_id is not null and plaid_account_id is not null;

-- 5. Idempotent transaction upserts, same reasoning as #4 — Plaid's own
-- /transactions/sync response can include the same transaction_id again
-- across syncs (e.g. a `modified` entry, or simply re-fetching after a
-- failed partial sync). plaid_transaction_id is globally unique per Plaid
-- transaction; manual entries have it null and are correctly excluded.
create unique index transactions_plaid_transaction_unique on transactions (plaid_transaction_id)
  where plaid_transaction_id is not null;

-- 6. accounts.account_type's check constraint only allowed the five
-- values this app invented before Plaid existed as a real integration
-- ('checking', 'savings', 'credit_card', 'loan', 'manual'). Plaid's own
-- AccountType enum includes 'investment' and 'brokerage' accounts a real
-- user's institution can return (test data in Plaid's own Sandbox
-- includes them) — without a home for those, syncing one would either
-- violate this constraint outright (a hard failure, not a graceful
-- skip) or force mislabeling an investment account as a loan/checking
-- account, which is worse than adding two honest new values. Purely
-- additive — every existing row's value is still valid, and nothing in
-- the app branches on the specific enum value except
-- findOrCreateManualAccount's 'manual' check (lib/budget.ts), which is
-- unaffected.
--
-- Constraint name assumed to be Postgres's default for a single unnamed
-- column-level CHECK declared inline in CREATE TABLE
-- (`<table>_<column>_check`) — accounts.account_type has exactly one
-- CHECK and no explicit name was given in 0001_init.sql, so this is
-- standard Postgres behavior, not a guess about this project's own code.
-- If this errors in the SQL Editor with "constraint does not exist," the
-- real name is visible via `\d accounts` and this line can be corrected
-- before re-running.
alter table accounts drop constraint accounts_account_type_check;
alter table accounts add constraint accounts_account_type_check
  check (account_type in ('checking', 'savings', 'credit_card', 'loan', 'investment', 'other', 'manual'));
