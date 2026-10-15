-- SE-81 (2026-10-13): the account-deletion routine needs to purge rows that
-- a real user's own RLS-scoped connection genuinely cannot touch —
-- ai_conversations/ai_messages/ai_insights/goal_contributions/
-- challenge_participations/attachments/notifications were all deliberately
-- built insert-only or select-only (see 0015's own comment on
-- ai_conversations/ai_insights — not an oversight, a closed gap). Per
-- packages/database/README.md's own documented exception ("reserved only
-- for async/system-initiated writes — Plaid webhooks, scheduled jobs...
-- even those must replicate the ownership/sharing checks in code since RLS
-- won't be doing it for them"), account deletion is exactly that kind of
-- system-initiated lifecycle event, not a live user CRUD request — fired
-- either by this app's own "Delete my account" route or by Clerk's
-- `user.deleted` webhook, never by arbitrary request input.
--
-- A SECURITY DEFINER function, modeled directly on 0014's
-- disconnect_partnership_members trigger (the only existing precedent in
-- this schema for "needs elevated reach beyond one user's own RLS window"),
-- is the narrow, auditable mechanism: it runs as this migration's own role
-- (same role every migration runs as — no FORCE ROW LEVEL SECURITY is set
-- anywhere in this schema, so the table owner already doesn't go through
-- RLS; this function just makes that bypass deliberate and scoped instead
-- of incidental), only ever receives the one already-authenticated user id
-- the caller is deleting, and every statement inside it filters by that
-- exact id — it does not touch any other user's rows.
--
-- Deliberately leaves alone: activity_feed_events, money_meetings, and
-- every wedding_* table (all partnership-level keepsake data, same as a
-- live Partnership disconnect already preserves), categories (owner_id-
-- scoped but non-PII — just a name/icon, and still referenced by surviving
-- shared transactions' category_id), and any is_shared = true row this
-- user owns (the same keepsake boundary used everywhere else in this app).
-- Real Plaid access-token revocation (the network call itself) happens in
-- application code before this function runs — this function only deletes
-- the now-stale plaid_items row and its encrypted token.
create or replace function delete_user_account_data(target_user_id text) returns void as $$
begin
  -- 1. Leave any active partnership first, exactly like a live
  -- /api/partnership/disconnect request — same two statements, same
  -- disconnect_partnership_members trigger (0014) firing off the
  -- partnerships UPDATE to close out the other member's row too.
  update partnerships set status = 'disconnected', disconnected_at = now(), disconnected_by = target_user_id
    where id in (
      select pm.partnership_id from partnership_members pm
      join partnerships p on p.id = pm.partnership_id
      where pm.user_id = target_user_id and pm.left_at is null and p.status <> 'disconnected'
    );
  update partnership_members set left_at = now()
    where user_id = target_user_id and left_at is null;

  -- 2. Detach this user's Plaid connections. Shared accounts survive
  -- (keepsake) but go manual — there's no connection left to sync them with
  -- once the access token is gone. Personal accounts are deleted outright
  -- in step 5 below; nulling plaid_item_id here first means that delete
  -- doesn't need its own special case for "was this a Plaid account."
  update accounts set is_manual = true
    where is_shared = true and plaid_item_id in (select id from plaid_items where user_id = target_user_id);
  update accounts set plaid_item_id = null
    where plaid_item_id in (select id from plaid_items where user_id = target_user_id);
  delete from plaid_items where user_id = target_user_id;

  -- 3. Null out FKs that would otherwise block deleting this user's own
  -- attachments in step 6 — a receipt/photo this user uploaded might still
  -- be referenced by a transaction or AI message that isn't being deleted
  -- (e.g. a kept shared transaction).
  update transactions set receipt_attachment_id = null
    where receipt_attachment_id in (select id from attachments where owner_id = target_user_id);
  update ai_messages set attachment_id = null
    where attachment_id in (select id from attachments where owner_id = target_user_id);

  -- 4. Contributions to a still-shared goal are the other partner's real
  -- financial history too (per-partner attribution is the whole point of
  -- this table — UX/UI Blueprint §7), so only a contribution tied to a
  -- goal that is NOT shared comes out here. Must run before step 5 deletes
  -- those personal goals, while the subquery below can still see them.
  delete from goal_contributions where contributor_id = target_user_id
    and goal_id in (select id from goals where is_shared = false);

  -- 5. Personal (is_shared = false) financial data. Transactions tied to a
  -- personal account are removed regardless of the transaction's own
  -- is_shared flag (the account they'd belong to is about to be gone
  -- either way); any other personal transaction is caught by the second
  -- delete below (e.g. a personal purchase logged against a shared account).
  delete from account_balance_snapshots where account_id in (
    select id from accounts where owner_id = target_user_id and is_shared = false
  );
  delete from transactions where owner_id = target_user_id and account_id in (
    select id from accounts where owner_id = target_user_id and is_shared = false
  );
  delete from transactions where owner_id = target_user_id and is_shared = false;
  delete from budget_categories where budget_id in (
    select id from budgets where owner_id = target_user_id and is_shared = false
  );
  delete from budgets where owner_id = target_user_id and is_shared = false;
  delete from goals where owner_id = target_user_id and is_shared = false;
  delete from recurring_expenses where owner_id = target_user_id and is_shared = false;
  delete from accounts where owner_id = target_user_id and is_shared = false;

  -- 6. AI history, insights, attachments, notifications, challenge
  -- participation — the tables with no delete policy at all (see this
  -- migration's own header comment).
  delete from ai_messages where conversation_id in (
    select id from ai_conversations where initiated_by = target_user_id
  );
  delete from ai_conversations where initiated_by = target_user_id;
  delete from ai_insights where owner_id = target_user_id;
  delete from challenge_participations where user_id = target_user_id;
  delete from attachments where owner_id = target_user_id;
  delete from notifications where recipient_id = target_user_id;

  -- 7. Soft-delete + scrub the users row itself — deleted_at has existed
  -- since 0001_init.sql specifically for this ("Database Architecture §12:
  -- request-driven deletion"). Never hard-deleted: no table in this schema
  -- cascades on users(id), and every kept/shared row above (plus
  -- activity_feed_events, wedding_* tables, money_meetings, categories)
  -- still needs a valid users(id) for its actor/contributor/owner column
  -- to point at.
  update users set deleted_at = now(), display_name = null, avatar_url = null, birthdate = null
    where id = target_user_id;
end;
$$ language plpgsql security definer set search_path = public;
