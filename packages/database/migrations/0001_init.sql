-- Noivos initial schema — translates docs/04 Database/Database Architecture.md
-- into runnable DDL for Neon (plain Postgres — see PROJECT_MEMORY.md §6.4 for
-- the Supabase → Neon/Clerk/Vercel Blob pivot and why this looks slightly
-- different from the original Supabase-authored doc).
--
-- AUTH NOTE: Supabase supplied `auth.uid()` for free inside RLS policies.
-- Clerk is an external auth provider, so there's no Postgres-native session
-- user. Instead, every authenticated request must run its queries inside a
-- transaction that first does:
--   SELECT set_config('app.current_user_id', '<clerk_user_id>', true);
-- RLS policies below read that via current_user_id() instead of auth.uid().
-- This must happen in the Vercel API layer's DB client wrapper — if a query
-- runs without setting it first, RLS will (correctly) deny everything.

create extension if not exists "pgcrypto";

create or replace function current_user_id() returns text as $$
  select nullif(current_setting('app.current_user_id', true), '')
$$ language sql stable;

-- 1. Identity & Partnership -----------------------------------------------

create table users (
  id text primary key,               -- Clerk user id, e.g. 'user_2abc...'
  display_name text,
  avatar_url text,
  appearance_mode_preference text not null default 'dark'
    check (appearance_mode_preference in ('dark', 'light', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz               -- Database Architecture §12: request-driven deletion
);

create table partnerships (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'invited'
    check (status in ('invited', 'active', 'disconnected')),
  wedding_mode_active boolean not null default false,
  wedding_mode_graduated_at timestamptz,
  disconnected_at timestamptz,
  disconnected_by text references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table partnership_members (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships(id),
  user_id text not null references users(id),
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

-- Database Architecture §3.3: exactly one active Partnership per user,
-- enforced by the database, not just application logic.
create unique index one_active_partnership_per_user
  on partnership_members (user_id)
  where left_at is null;

create table partnership_invites (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid references partnerships(id),
  inviter_id text not null references users(id),
  invitee_contact text not null,
  invite_token text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  responded_at timestamptz
);

-- 2. Financial Accounts & Transactions --------------------------------------

create table plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id),
  plaid_item_id text not null unique,
  access_token_encrypted bytea not null, -- see PROJECT_MEMORY.md §6.4/§8: encryption
                                          -- approach not yet decided post-Supabase-Vault
  institution_id text,
  institution_name text,
  status text not null default 'active'
    check (status in ('active', 'error', 'reauth_required')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null references users(id),
  partnership_id uuid references partnerships(id),
  is_shared boolean not null default false,
  plaid_item_id uuid references plaid_items(id),
  plaid_account_id text,
  account_type text not null
    check (account_type in ('checking', 'savings', 'credit_card', 'loan', 'manual')),
  institution_name text,
  display_name text not null,
  current_balance numeric(14, 2) not null default 0,
  is_manual boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Database Architecture §4.3: daily snapshots from V1, confirmed by founder —
-- feeds AI Insights trend detection that Plaid can't backfill retroactively.
create table account_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  balance numeric(14, 2) not null,
  snapshot_date date not null,
  created_at timestamptz not null default now(),
  unique (account_id, snapshot_date)
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  owner_id text references users(id),
  partnership_id uuid references partnerships(id),
  name text not null,
  icon text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  check (owner_id is not null or partnership_id is not null)
);

create table recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id text references users(id),
  partnership_id uuid references partnerships(id),
  is_shared boolean not null default false,
  category_id uuid references categories(id),
  amount numeric(14, 2) not null,
  frequency text not null,
  next_due_date date,
  last_amount_seen numeric(14, 2),
  created_at timestamptz not null default now(),
  check (owner_id is not null or partnership_id is not null)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  owner_id text not null references users(id),
  partnership_id uuid references partnerships(id),
  is_shared boolean not null default false,
  plaid_transaction_id text,
  amount numeric(14, 2) not null,
  merchant_name text,
  category_id uuid references categories(id),
  note text,
  transaction_date date not null,
  recurring_expense_id uuid references recurring_expenses(id),
  receipt_attachment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 3. Budgets & Goals ---------------------------------------------------------

create table budgets (
  id uuid primary key default gen_random_uuid(),
  owner_id text references users(id),
  partnership_id uuid references partnerships(id),
  is_shared boolean not null default false,
  month date not null,
  rollover_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  check (owner_id is not null or partnership_id is not null)
);

create table budget_categories (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id),
  category_id uuid not null references categories(id),
  planned_amount numeric(14, 2) not null,
  rollover_amount numeric(14, 2) not null default 0,
  updated_at timestamptz not null default now()
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  owner_id text references users(id),
  partnership_id uuid references partnerships(id),
  is_shared boolean not null default false,
  goal_type text not null
    check (goal_type in ('wedding', 'house', 'vacation', 'emergency_fund', 'vehicle', 'baby', 'debt_payoff', 'retirement', 'custom')),
  name text not null,
  target_amount numeric(14, 2) not null,
  target_date date,
  status text not null default 'active'
    check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (owner_id is not null or partnership_id is not null)
);

-- Per-partner attribution, not a single anonymous total — UX/UI Blueprint §7.
create table goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id),
  contributor_id text not null references users(id),
  amount numeric(14, 2) not null,
  contribution_date date not null default current_date,
  source text not null default 'manual' check (source in ('manual', 'linked_transaction')),
  note text,
  created_at timestamptz not null default now()
);

-- 4. Wedding Mode -------------------------------------------------------------

create table wedding_details (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null unique references partnerships(id),
  wedding_date date,
  guest_count_estimate integer,
  status text not null default 'active'
    check (status in ('active', 'graduated', 'paused_or_cancelled')),
  graduated_at timestamptz,
  created_at timestamptz not null default now()
);

create table wedding_vendors (
  id uuid primary key default gen_random_uuid(),
  wedding_details_id uuid not null references wedding_details(id),
  name text not null,
  category text,
  contract_amount numeric(14, 2),
  deposit_amount numeric(14, 2),
  deposit_paid_at timestamptz,
  balance_due numeric(14, 2),
  balance_due_date date,
  status text,
  created_at timestamptz not null default now()
);

-- Confirmed 2026-08-02: plain ledger line, no structured contributor entity,
-- no implied account access for family members (PRD §12.8).
create table wedding_family_contributions (
  id uuid primary key default gen_random_uuid(),
  wedding_details_id uuid not null references wedding_details(id),
  contributor_name text not null,
  amount numeric(14, 2) not null,
  note text,
  recorded_by text not null references users(id),
  created_at timestamptz not null default now()
);

create table wedding_checklist_items (
  id uuid primary key default gen_random_uuid(),
  wedding_details_id uuid not null references wedding_details(id),
  title text not null,
  due_date date,
  is_complete boolean not null default false,
  assigned_to text references users(id)
);

-- 5. AI & Engagement -----------------------------------------------------------

create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  initiated_by text not null references users(id),
  partnership_id uuid references partnerships(id),
  conversation_type text not null check (conversation_type in ('purchase_advisor', 'financial_coach')),
  is_shared_to_activity_feed boolean not null default false,
  created_at timestamptz not null default now()
);

create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  input_mode text check (input_mode in ('text', 'voice', 'photo', 'receipt_scan', 'price_tag_scan')),
  attachment_id uuid,
  created_at timestamptz not null default now()
);

create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  owner_id text references users(id),
  partnership_id uuid references partnerships(id),
  insight_type text not null,
  payload jsonb not null default '{}'::jsonb,
  is_shared boolean not null default false,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  check (owner_id is not null or partnership_id is not null)
);

create table money_meetings (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships(id),
  week_of date not null,
  agenda jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'completed', 'skipped')),
  completed_at timestamptz,
  summary_notes text,
  created_at timestamptz not null default now()
);

create table activity_feed_events (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships(id),
  actor_id text not null references users(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id text not null references users(id),
  notification_type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  description text,
  duration_days integer
);

create table challenge_participations (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id),
  partnership_id uuid references partnerships(id),
  user_id text references users(id),
  progress_percent numeric(5, 2) not null default 0, -- relative only — never raw dollars, PRD §12.13
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  check (partnership_id is not null or user_id is not null)
);

-- 6. Billing --------------------------------------------------------------------

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships(id),
  payer_user_id text not null references users(id),
  billing_route text not null check (billing_route in ('stripe_web', 'apple_iap', 'google_play')),
  external_subscription_id text,
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Attachments ------------------------------------------------------------------

create table attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null references users(id),
  storage_path text not null, -- Vercel Blob path/URL (was Supabase Storage — §6.4)
  attachment_type text not null check (attachment_type in ('receipt', 'avatar', 'vendor_contract')),
  created_at timestamptz not null default now()
);

alter table transactions add constraint fk_receipt_attachment
  foreign key (receipt_attachment_id) references attachments(id);
alter table ai_messages add constraint fk_ai_message_attachment
  foreign key (attachment_id) references attachments(id);
