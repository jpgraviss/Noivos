-- SE-70 (2026-10-15): Plaid's TRANSACTIONS/SYNC_UPDATES_AVAILABLE and
-- ITEM/ERROR webhooks arrive with no Clerk session at all — just a Plaid-
-- signed JWT body naming a plaid_item_id this app itself handed Plaid at
-- Link time. Before this app can run withUserContext(ownerId, ...) for the
-- real sync/status-update work (which then goes through plaid_items'
-- ordinary RLS exactly like every other route), it first has to learn
-- *which* user owns that item_id — and plaid_items_select's RLS (user_id =
-- current_user_id()) means there's no current_user_id() to set yet in
-- order to read that.
--
-- Same "needs elevated reach beyond one user's own RLS window" shape as
-- 0014's disconnect_partnership_members trigger and 0018's
-- delete_user_account_data() — a narrow SECURITY DEFINER function, not a
-- bypass connection: it returns exactly one column (a user id, not
-- remotely secret on its own) for an exact plaid_item_id match, and that
-- id is Plaid's own, signature-verified identifier (verified in
-- lib/plaid.ts's verifyPlaidWebhookSignature before this is ever called),
-- not arbitrary caller input.
create or replace function lookup_plaid_item_owner(target_plaid_item_id text) returns text as $$
  select user_id from plaid_items where plaid_item_id = target_plaid_item_id;
$$ language sql security definer set search_path = public;
