-- goal_contributions_write (0002_rls.sql) only checked that the inserting
-- user was naming themselves as contributor_id — it never checked that the
-- goal itself is one they actually own or share. Any authenticated user who
-- knew (or guessed) another user's goal UUID could insert a contribution
-- row against it. This tightens the write check to mirror the existing
-- select policy: a contribution can only be added to a goal you own, or a
-- shared goal in a Partnership you're an active member of.
drop policy if exists goal_contributions_write on goal_contributions;
create policy goal_contributions_write on goal_contributions for insert
  with check (
    contributor_id = current_user_id()
    and exists (
      select 1 from goals g where g.id = goal_id
      and (g.owner_id = current_user_id() or (g.is_shared and was_partnership_member(g.partnership_id)))
    )
  );
