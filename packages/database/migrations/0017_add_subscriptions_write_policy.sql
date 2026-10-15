-- Added 2026-10-13 building the Stripe entitlements gate (SE-204). subscriptions
-- has carried a SELECT policy since 0002_rls.sql (`subscriptions_select`) but no
-- INSERT/UPDATE policy was ever added, because nothing wrote to it until now.
--
-- Every write still goes through withUserContext(payerUserId, ...), same as
-- every other table in this app — no service-role/RLS-bypass connection
-- anywhere. The checkout-session route sets payer_user_id = current_user_id()
-- at insert time (the signed-in user starting checkout). The Stripe webhook
-- has no Clerk session of its own, but Checkout Session metadata carries the
-- payer_user_id set when the session was created, so the webhook re-derives
-- it from there and runs its update through withUserContext(payerUserId, ...)
-- too — RLS applies uniformly either way.
create policy subscriptions_write on subscriptions for all
  using (payer_user_id = current_user_id() and partnership_is_active(partnership_id))
  with check (payer_user_id = current_user_id() and partnership_is_active(partnership_id));

-- A Stripe Customer ID is needed to create Billing Portal sessions (so a user
-- can update/cancel payment from Stripe's own hosted page) — nothing in the
-- existing schema held this (external_subscription_id is specifically the
-- *subscription* ID, not the *customer* ID, and the two are different Stripe
-- objects with different lifetimes: the customer can exist before any
-- subscription does, right after the first Checkout Session starts).
alter table subscriptions add column stripe_customer_id text;
