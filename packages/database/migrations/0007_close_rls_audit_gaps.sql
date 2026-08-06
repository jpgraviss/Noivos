-- Closes six RLS gaps found during a systematic audit (2026-08-05): every
-- table in 0001_init.sql cross-referenced against every policy across
-- 0002_rls.sql/0005/0006. None of these are exploitable *today* — nothing
-- in the app queries these tables yet — but each would be a real hole the
-- moment the related feature gets built, so closing them now rather than
-- waiting to remember later.

-- 1. plaid_items had NO RLS enabled at all. This table holds
-- access_token_encrypted (a real bank access token) — must never be
-- readable/writable across users once Plaid integration exists. Personal
-- only (no partnership sharing at this layer — accounts.is_shared governs
-- shared visibility of the resulting *accounts*, not the underlying link).
alter table plaid_items enable row level security;
create policy plaid_items_select on plaid_items for select
  using (user_id = current_user_id());
create policy plaid_items_write on plaid_items for all
  using (user_id = current_user_id())
  with check (user_id = current_user_id());

-- 2. account_balance_snapshots had NO RLS enabled at all. Read-only for
-- users — per Backend Architecture, daily snapshots are written by a
-- scheduled job, which (per the hard rule in PROJECT_MEMORY.md §6.0) is
-- allowed to use a service-role/bypass-RLS connection since it's a
-- system-initiated write, not a live user request. Visibility mirrors the
-- parent account's (owner or shared-and-active-partnership-member).
alter table account_balance_snapshots enable row level security;
create policy account_balance_snapshots_select on account_balance_snapshots for select
  using (exists (
    select 1 from accounts a where a.id = account_id
    and (a.owner_id = current_user_id() or (a.is_shared and was_partnership_member(a.partnership_id)))
  ));

-- 3. challenges (the catalog/template table itself — distinct from
-- challenge_participations, which already had RLS) had NO RLS enabled at
-- all. It's public reference data with no owner concept, so this is a
-- straightforward "any signed-in user can read the catalog" policy, no
-- write policy — challenge definitions are managed out-of-band (seed data/
-- admin), never written by a live user request.
alter table challenges enable row level security;
create policy challenges_select on challenges for select
  using (current_user_id() is not null);

-- 4. attachments had a SELECT policy but no INSERT policy — nobody could
-- ever upload their own receipt/avatar/vendor-contract row.
create policy attachments_insert on attachments for insert
  with check (owner_id = current_user_id());

-- 5. ai_messages had a SELECT policy but no INSERT policy — once AI Coach
-- gets a real backend, the API route (running as the authenticated user
-- for the whole request) needs to insert both the user's message and the
-- assistant's reply into the same conversation. Scoped to the message's
-- conversation being one this user themselves initiated — deliberately
-- narrower than ai_messages_select's shared-partnership read visibility,
-- since there's no current product flow for a partner to co-author
-- messages in someone else's AI conversation, only to read it if shared.
create policy ai_messages_insert on ai_messages for insert
  with check (exists (
    select 1 from ai_conversations c where c.id = conversation_id
    and c.initiated_by = current_user_id()
  ));

-- 6. challenge_participations had a SELECT policy but no INSERT policy —
-- nobody could ever actually join a challenge. Handles both participation
-- shapes the schema allows: a solo join (user_id set) or a couple's shared
-- participation (partnership_id set), per the table's own check constraint.
create policy challenge_participations_insert on challenge_participations for insert
  with check (
    (user_id is not null and user_id = current_user_id())
    or (partnership_id is not null and was_partnership_member(partnership_id) and partnership_is_active(partnership_id))
  );
