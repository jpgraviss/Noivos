-- activity_feed_events (0001_init.sql) shipped with a SELECT-only RLS
-- policy (0002_rls.sql) — the comment there assumed it would only ever be
-- populated by "trusted server-side code that has already validated the
-- underlying data is shared." In practice, per this project's hard rule
-- (PROJECT_MEMORY.md §6.0), a live user request must never run on a
-- service-role/bypass-RLS connection — so without an INSERT policy, the
-- Vercel API layer's normal per-user connection has no way to write here
-- at all. This adds one: an event can only be inserted by its own actor,
-- into a Partnership they're currently an active member of.
create policy activity_feed_events_insert on activity_feed_events for insert
  with check (
    actor_id = current_user_id()
    and partnership_is_active(partnership_id)
  );
