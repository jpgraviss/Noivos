-- Found via a systematic audit of everything added since the 0013 RLS-fix
-- sprint (prompted by "keep going on developments" once the Linear backlog
-- was genuinely exhausted) — the same three bug classes this project has
-- hit and fixed before, checked against every table/route added since.

-- 1. subscriptions_write (0017) only checked `payer_user_id =
-- current_user_id() and partnership_is_active(partnership_id)` — missing
-- was_partnership_member(partnership_id), the exact gap already fixed on
-- accounts/transactions/recurring_expenses/budgets/goals (0012),
-- activity_feed_events (0013), and ai_conversations/ai_insights (0015),
-- just missed on this table when it was added two migrations after 0015.
-- Concretely: any authenticated user could insert a `subscriptions` row
-- with payer_user_id = themselves and partnership_id = any other active
-- Partnership's id (a UUID, not secret) and status = 'active' —
-- subscriptions_select's own was_partnership_member(partnership_id) check
-- would then show that fabricated row to every real member of the victim
-- Partnership, and lib/entitlements.ts's isPremium() reads this table
-- directly, so this could forge Premium entitlement for a Partnership the
-- attacker was never a member of. Not reachable through today's UI (the
-- Stripe webhook derives partnership_id server-side from Checkout Session
-- metadata, never client input) — same "fix at the DB layer regardless of
-- current reachability" standard 0015 itself was built on.
drop policy subscriptions_write on subscriptions;
create policy subscriptions_write on subscriptions for all
  using (payer_user_id = current_user_id() and was_partnership_member(partnership_id) and partnership_is_active(partnership_id))
  with check (payer_user_id = current_user_id() and was_partnership_member(partnership_id) and partnership_is_active(partnership_id));

-- 2. Missing foreign-key indexes, same "deferred because zero query
-- traffic, now activated by a later feature" shape 0011 itself already
-- documented for these exact tables. ai_conversations/ai_messages were
-- correctly left unindexed by 0011 and 0015 ("zero application code
-- references them" at the time) — no longer true since AI Coach/Purchase
-- Advisor got a real backend (2026-08-14/2026-10-08): GET/POST
-- /api/ai/coach and .../purchase-advisor both filter ai_conversations by
-- (initiated_by, conversation_type) and ai_messages by conversation_id on
-- every single request. transactions.merchant_name/recurring_expense_id
-- were similarly unindexed since 0001_init.sql (unused) until SE-77's
-- recurring-expense detection (migration 0020 + lib/recurringExpenses.ts,
-- 2026-10-16) made both a real, hot query path on every GET
-- /api/recurring-expenses call.
create index ai_conversations_initiated_by_type_idx on ai_conversations (initiated_by, conversation_type);
create index ai_messages_conversation_idx on ai_messages (conversation_id);
create index transactions_merchant_name_idx on transactions (merchant_name);
create index transactions_recurring_expense_id_idx on transactions (recurring_expense_id);

-- 3. subscriptions.external_subscription_id had no uniqueness constraint
-- at all — the same "select/insert with nothing preventing a duplicate"
-- shape 0008 fixed on five other tables, here specifically because
-- Stripe's webhook delivery is explicitly documented as at-least-once: a
-- redelivered `checkout.session.completed` event (api/webhooks/stripe/
-- route.ts) would insert a second, fully duplicate subscription row for
-- the same real Stripe subscription, since that INSERT has no ON
-- CONFLICT guard. Partial (excludes null) since a row could theoretically
-- exist without one, though every current INSERT always supplies it.
create unique index subscriptions_external_subscription_id_unique
  on subscriptions (external_subscription_id)
  where external_subscription_id is not null;
