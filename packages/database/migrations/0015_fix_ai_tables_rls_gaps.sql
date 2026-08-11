-- Two RLS gaps found in the AI Coach tables (0001_init.sql/0002_rls.sql),
-- both instances of bug classes this project has already fixed elsewhere
-- and, per Database Architecture §1/§10, fixes at the database layer
-- regardless of whether any route currently exercises the table — same
-- posture as 0007 (enabled/completed RLS on six then-unwired tables) and
-- 0009/0010/0012/0013 (the missing-was_partnership_member() gap, fixed on
-- five other tables already). Zero application code references
-- ai_conversations/ai_messages/ai_insights today (AI Coach has no real
-- backend yet, gated on a separate legal-review decision — see
-- PROJECT_MEMORY.md), but per this project's own repeated precedent that's
-- exactly the trigger for closing a policy gap now, before a real backend
-- ever makes it live.

-- 1. ai_conversations_write only checked `initiated_by = current_user_id()`
-- — it never verified the writer actually belongs to the partnership_id
-- they're setting, and never checked partnership_is_active() either. Any
-- authenticated user could insert a row with initiated_by = themselves and
-- partnership_id = any other active Partnership's id (a UUID, not a
-- secret) — ai_conversations_select's own `was_partnership_member(partnership_id)`
-- branch would then show that fabricated conversation to every real member
-- of the victim Partnership. ai_messages_insert (0007) only re-checks
-- `c.initiated_by = current_user_id()` against the parent conversation, so
-- the same attacker could plant fabricated messages into it too, equally
-- visible to the victim Partnership via ai_messages_select. The exact
-- missing-was_partnership_member() shape already fixed on accounts,
-- transactions, recurring_expenses, budgets, and goals (0012) and
-- activity_feed_events (0013) — missed on this table in all of those
-- sweeps. initiated_by is `not null` on this table (unlike categories/
-- ai_insights below), so this matches the accounts_write/goals_write shape
-- from 0012, not categories_write's owner-nullable one.
drop policy ai_conversations_write on ai_conversations;
create policy ai_conversations_write on ai_conversations for insert
  with check (
    initiated_by = current_user_id()
    and (partnership_id is null or (was_partnership_member(partnership_id) and partnership_is_active(partnership_id)))
  );

-- 2. ai_insights had a SELECT policy but no INSERT policy at all — the
-- same "no write policy" gap 0007 found and fixed on attachments and
-- challenge_participations, just missed on this table in that sweep (it
-- wasn't in 0007's own list, despite being exactly the same shape). Right
-- now this means nobody — not even a legitimate future AI Coach backend —
-- could insert a row at all; not a security hole (the opposite: overly
-- restrictive), but a real, verifiable completeness gap in the same audit
-- category. owner_id is nullable here (`check (owner_id is not null or
-- partnership_id is not null)`, for a fully-shared insight with no
-- individual owner), so this matches categories_write's (0009)
-- owner-nullable shape rather than ai_conversations_write's above.
create policy ai_insights_insert on ai_insights for insert
  with check (
    owner_id = current_user_id()
    or (partnership_id is not null and was_partnership_member(partnership_id) and partnership_is_active(partnership_id))
  );
