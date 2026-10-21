-- Notifications (PRD §12.14, SE-75) — notifications has carried a SELECT
-- and an UPDATE policy (both recipient_id = current_user_id()) since
-- 0002_rls.sql, but no INSERT policy at all, because nothing wrote to it.
-- A notification is inherently about telling someone *else* about your
-- own action (e.g. "your partner joined"), so recipient_id = current_
-- user_id() alone can't cover the real use case — this policy also
-- allows inserting for anyone who shares an active Partnership membership
-- with the inserting user, the same real-world boundary every other
-- "write affects your partner too" policy in this schema already uses
-- (was_partnership_member()/partnership_is_active() elsewhere), just
-- expressed directly here since notifications has no partnership_id
-- column of its own to check against.
create policy notifications_insert on notifications for insert
  with check (
    recipient_id = current_user_id()
    or exists (
      select 1 from partnership_members pm1
      join partnership_members pm2 on pm1.partnership_id = pm2.partnership_id
      where pm1.user_id = current_user_id()
        and pm2.user_id = recipient_id
        and pm1.left_at is null
        and pm2.left_at is null
    )
  );
