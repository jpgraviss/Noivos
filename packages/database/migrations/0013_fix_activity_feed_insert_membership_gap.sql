-- Fixes the same bug class as 0009/0010/0012, found by grepping every
-- migration file for partnership_is_active() to make sure 0012's five
-- fixes were actually the complete list this time (0010's own re-audit
-- claimed the same thing and was wrong about five other tables — see
-- 0012's comment) — turned up one more, in a migration that isn't part
-- of 0002_rls.sql's original block at all: 0005_add_activity_feed_insert_
-- policy.sql's activity_feed_events_insert.
--
--   create policy activity_feed_events_insert on activity_feed_events for insert
--     with check (
--       actor_id = current_user_id()
--       and partnership_is_active(partnership_id)
--     );
--
-- Same shape, same hole: proves the actor is themselves and that the
-- referenced Partnership is merely active, never that the actor is
-- actually a member of it. Any authenticated user could insert an
-- activity_feed_events row with actor_id = themselves and partnership_id
-- set to any other active Partnership's id — activity_feed_events_select
-- (using (was_partnership_member(partnership_id)), correctly written) would
-- then show that fabricated event to every real member of that other
-- Partnership's shared feed. Lower severity than 0012's five tables (this
-- can only inject a misleading *sentence* — see lib/activity.ts's
-- describeActivityEvent, which only ever renders a fixed set of known
-- event_type templates against actor name + amounts/names from payload,
-- not arbitrary text — not real financial data), but still a genuine
-- cross-tenant injection into a real user's feed, and the same "database
-- is the actual enforcement layer" philosophy applies regardless of
-- severity tier. Not reachable through the app's own UI today —
-- lib/activity.ts's logActivityEvent() is only ever called server-side
-- with a partnershipId already derived from the calling route's own
-- verified data (e.g. a category's real partnership_id), never from
-- direct client input.
--
-- Fix: add the missing was_partnership_member(partnership_id) check.
-- Narrows-only — cannot break the app's own logActivityEvent() call sites,
-- which only ever pass a partnershipId the calling user is a genuine
-- member of.
drop policy activity_feed_events_insert on activity_feed_events;
create policy activity_feed_events_insert on activity_feed_events for insert
  with check (
    actor_id = current_user_id()
    and was_partnership_member(partnership_id)
    and partnership_is_active(partnership_id)
  );
