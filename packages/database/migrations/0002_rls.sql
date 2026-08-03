-- Row-Level Security policies — the actual privacy enforcement layer per
-- Database Architecture §10 and §1 ("privacy is enforced by the database,
-- not the application"). Every policy below reads current_user_id(), which
-- the Vercel API layer must set via set_config('app.current_user_id', ...)
-- at the start of each authenticated request's transaction (see 0001_init.sql
-- header note). No table here is ever queried through a service-role
-- connection for a live user request — see PROJECT_MEMORY.md §6.0's
-- auth-passthrough rule.

-- Database Architecture §11: a disconnected Partnership's shared data is
-- readable by former members indefinitely, but never mutable by anyone —
-- the workspace is frozen, not just restricted to the non-initiator.
create or replace function partnership_is_active(p_partnership_id uuid) returns boolean as $$
  select status = 'active' from partnerships where id = p_partnership_id
$$ language sql stable;

create or replace function was_partnership_member(p_partnership_id uuid) returns boolean as $$
  select exists (
    select 1 from partnership_members
    where partnership_id = p_partnership_id and user_id = current_user_id()
  )
$$ language sql stable;

-- users ----------------------------------------------------------------------
-- Row created once on first login (synced from Clerk) — a user may only ever
-- create/see/update their own profile row, never anyone else's.
alter table users enable row level security;
create policy users_select_self on users for select using (id = current_user_id());
create policy users_insert_self on users for insert with check (id = current_user_id());
create policy users_update_self on users for update using (id = current_user_id());

-- partnerships / members / invites --------------------------------------------
-- A brand-new partnership row has no members yet, so it's inert from a privacy
-- standpoint — any authenticated user may create the shell (Backend
-- Architecture §3.1's Partnership accept/invite flow does this atomically
-- with the membership insert below). The membership insert is what actually
-- gates who can join: a user may only ever insert a partnership_members row
-- for themselves, never on someone else's behalf.
alter table partnerships enable row level security;
create policy partnerships_select_member on partnerships for select
  using (was_partnership_member(id));
create policy partnerships_insert on partnerships for insert
  with check (current_user_id() is not null);
create policy partnerships_update_member on partnerships for update
  using (was_partnership_member(id));

alter table partnership_members enable row level security;
create policy partnership_members_select on partnership_members for select
  using (user_id = current_user_id() or was_partnership_member(partnership_id));
create policy partnership_members_insert on partnership_members for insert
  with check (user_id = current_user_id());
create policy partnership_members_update on partnership_members for update
  using (user_id = current_user_id());

alter table partnership_invites enable row level security;
create policy partnership_invites_select on partnership_invites for select
  using (inviter_id = current_user_id());
create policy partnership_invites_insert on partnership_invites for insert
  with check (inviter_id = current_user_id());
create policy partnership_invites_update on partnership_invites for update
  using (inviter_id = current_user_id());

-- accounts ---------------------------------------------------------------------
alter table accounts enable row level security;
create policy accounts_select on accounts for select
  using (owner_id = current_user_id() or (is_shared and was_partnership_member(partnership_id)));
create policy accounts_write on accounts for all
  using (owner_id = current_user_id() and (partnership_id is null or partnership_is_active(partnership_id)))
  with check (owner_id = current_user_id() and (partnership_id is null or partnership_is_active(partnership_id)));

-- transactions -------------------------------------------------------------------
alter table transactions enable row level security;
create policy transactions_select on transactions for select
  using (owner_id = current_user_id() or (is_shared and was_partnership_member(partnership_id)));
create policy transactions_write on transactions for all
  using (owner_id = current_user_id() and (partnership_id is null or partnership_is_active(partnership_id)))
  with check (owner_id = current_user_id() and (partnership_id is null or partnership_is_active(partnership_id)));

-- categories / recurring_expenses -------------------------------------------------
alter table categories enable row level security;
create policy categories_select on categories for select
  using (owner_id = current_user_id() or was_partnership_member(partnership_id));
create policy categories_write on categories for all
  using (owner_id = current_user_id() or (partnership_id is not null and partnership_is_active(partnership_id)))
  with check (owner_id = current_user_id() or (partnership_id is not null and partnership_is_active(partnership_id)));

alter table recurring_expenses enable row level security;
create policy recurring_expenses_select on recurring_expenses for select
  using (owner_id = current_user_id() or (is_shared and was_partnership_member(partnership_id)));
create policy recurring_expenses_write on recurring_expenses for all
  using (owner_id = current_user_id() and (partnership_id is null or partnership_is_active(partnership_id)))
  with check (owner_id = current_user_id() and (partnership_id is null or partnership_is_active(partnership_id)));

-- budgets / budget_categories -------------------------------------------------------
alter table budgets enable row level security;
create policy budgets_select on budgets for select
  using (owner_id = current_user_id() or (is_shared and was_partnership_member(partnership_id)));
create policy budgets_write on budgets for all
  using (owner_id = current_user_id() and (partnership_id is null or partnership_is_active(partnership_id)))
  with check (owner_id = current_user_id() and (partnership_id is null or partnership_is_active(partnership_id)));

alter table budget_categories enable row level security;
create policy budget_categories_select on budget_categories for select
  using (exists (
    select 1 from budgets b where b.id = budget_id
    and (b.owner_id = current_user_id() or (b.is_shared and was_partnership_member(b.partnership_id)))
  ));
create policy budget_categories_write on budget_categories for all
  using (exists (select 1 from budgets b where b.id = budget_id and b.owner_id = current_user_id()))
  with check (exists (select 1 from budgets b where b.id = budget_id and b.owner_id = current_user_id()));

-- goals / goal_contributions -------------------------------------------------------
alter table goals enable row level security;
create policy goals_select on goals for select
  using (owner_id = current_user_id() or (is_shared and was_partnership_member(partnership_id)));
create policy goals_write on goals for all
  using (owner_id = current_user_id() and (partnership_id is null or partnership_is_active(partnership_id)))
  with check (owner_id = current_user_id() and (partnership_id is null or partnership_is_active(partnership_id)));

alter table goal_contributions enable row level security;
create policy goal_contributions_select on goal_contributions for select
  using (exists (
    select 1 from goals g where g.id = goal_id
    and (g.owner_id = current_user_id() or (g.is_shared and was_partnership_member(g.partnership_id)))
  ));
create policy goal_contributions_write on goal_contributions for insert
  with check (contributor_id = current_user_id());

-- Wedding Mode tables inherit visibility from their parent Partnership --------------
alter table wedding_details enable row level security;
create policy wedding_details_select on wedding_details for select
  using (was_partnership_member(partnership_id));
create policy wedding_details_write on wedding_details for all
  using (partnership_is_active(partnership_id) and was_partnership_member(partnership_id))
  with check (partnership_is_active(partnership_id) and was_partnership_member(partnership_id));

alter table wedding_vendors enable row level security;
create policy wedding_vendors_all on wedding_vendors for all
  using (exists (select 1 from wedding_details w where w.id = wedding_details_id and was_partnership_member(w.partnership_id)))
  with check (exists (select 1 from wedding_details w where w.id = wedding_details_id and partnership_is_active(w.partnership_id)));

alter table wedding_family_contributions enable row level security;
create policy wedding_family_contributions_all on wedding_family_contributions for all
  using (exists (select 1 from wedding_details w where w.id = wedding_details_id and was_partnership_member(w.partnership_id)))
  with check (exists (select 1 from wedding_details w where w.id = wedding_details_id and partnership_is_active(w.partnership_id)));

alter table wedding_checklist_items enable row level security;
create policy wedding_checklist_items_all on wedding_checklist_items for all
  using (exists (select 1 from wedding_details w where w.id = wedding_details_id and was_partnership_member(w.partnership_id)))
  with check (exists (select 1 from wedding_details w where w.id = wedding_details_id and partnership_is_active(w.partnership_id)));

-- AI ---------------------------------------------------------------------------------
alter table ai_conversations enable row level security;
create policy ai_conversations_select on ai_conversations for select
  using (initiated_by = current_user_id() or (partnership_id is not null and was_partnership_member(partnership_id)));
create policy ai_conversations_write on ai_conversations for insert
  with check (initiated_by = current_user_id());

alter table ai_messages enable row level security;
create policy ai_messages_select on ai_messages for select
  using (exists (
    select 1 from ai_conversations c where c.id = conversation_id
    and (c.initiated_by = current_user_id() or (c.partnership_id is not null and was_partnership_member(c.partnership_id)))
  ));

alter table ai_insights enable row level security;
create policy ai_insights_select on ai_insights for select
  using (owner_id = current_user_id() or (is_shared and was_partnership_member(partnership_id)));

-- Engagement ----------------------------------------------------------------------------
alter table money_meetings enable row level security;
create policy money_meetings_all on money_meetings for all
  using (was_partnership_member(partnership_id))
  with check (partnership_is_active(partnership_id));

-- activity_feed_events is populated only by trusted server-side code that has
-- already validated the underlying data is shared (Database Architecture §10) —
-- RLS still applies to reads so a stale/misrouted row can never leak.
alter table activity_feed_events enable row level security;
create policy activity_feed_events_select on activity_feed_events for select
  using (was_partnership_member(partnership_id));

alter table notifications enable row level security;
create policy notifications_select on notifications for select
  using (recipient_id = current_user_id());
create policy notifications_update on notifications for update
  using (recipient_id = current_user_id());

-- Community / Challenges — progress_percent only, never raw dollar amounts
-- (enforced by the column itself in 0001_init.sql, not by RLS) -------------------------
alter table challenge_participations enable row level security;
create policy challenge_participations_select on challenge_participations for select
  using (user_id = current_user_id() or (partnership_id is not null and was_partnership_member(partnership_id)));

-- Billing -------------------------------------------------------------------------------
alter table subscriptions enable row level security;
create policy subscriptions_select on subscriptions for select
  using (was_partnership_member(partnership_id));

-- Attachments -----------------------------------------------------------------------------
alter table attachments enable row level security;
create policy attachments_select on attachments for select
  using (owner_id = current_user_id());
