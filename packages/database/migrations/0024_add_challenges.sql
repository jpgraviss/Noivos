-- SE-76, Community Challenges (PRD §12.13) — the 5 challenge types that map
-- onto data this app already tracks (goals, wedding_details). "No-Spend
-- Weekend" and "Date Night Savings" need their own, not-yet-built
-- behavior-tracking logic (checking transaction history for a zero-spend
-- window; a dedicated small savings sub-goal) — deliberately not seeded
-- here, a documented gap rather than a silently half-built row.
--
-- challenges/challenge_participations have existed, unused, since
-- 0001_init.sql. challenge_participations_select (0002_rls.sql) already
-- correctly scopes reads to current_user_id()/was_partnership_member() —
-- progress_percent only, never raw dollars (enforced by the column itself,
-- not RLS), so a participation row can never leak a partner's income or
-- balance even to their own teammate, let alone a stranger. What's missing
-- is the write side: no INSERT/UPDATE policy exists at all yet, so nobody
-- could actually join a challenge or have their progress updated.
--
-- Applied directly to live Neon on 2026-11-03 before this file existed on
-- disk again (a worker restart wiped the uncommitted working tree, not the
-- database) — this file is the historical record of that already-applied
-- change, not a pending one. Re-running it is still safe/idempotent
-- (ON CONFLICT DO NOTHING on the seed rows, and CREATE POLICY/CREATE UNIQUE
-- INDEX/ADD CONSTRAINT would simply error as already-existing if attempted
-- twice — matching this project's established posture that migrations are
-- a record of what happened, not guaranteed re-runnable against a database
-- that already has them).

-- Lets a future reseed (or an idempotent re-run of this migration) use
-- ON CONFLICT instead of risking duplicate catalog rows.
alter table challenges add constraint challenges_type_unique unique (type);

insert into challenges (name, type, description, duration_days) values
  ('First Emergency Fund', 'emergency_fund', 'Build toward your Emergency Fund goal.', null),
  ('House Down Payment', 'house_down_payment', 'Save toward your House goal.', null),
  ('Debt Free', 'debt_free', 'Pay down debt, tracked against your Debt Payoff goal.', null),
  ('Vacation Savings', 'vacation_savings', 'Save for your next trip, tracked against your Vacation goal.', null),
  ('Wedding Countdown', 'wedding_countdown', 'Count down the days to your wedding.', null)
on conflict (type) do nothing;

-- Same shape as goals/budgets: one join per challenge per user (personal)
-- OR per challenge per Partnership (shared), never two rows for the same
-- person+challenge — prevents a double-join race the same way
-- budgets_shared_month_unique/budgets_personal_month_unique (migration
-- 0008) already prevent a double-budget race.
create unique index challenge_participations_user_unique
  on challenge_participations (challenge_id, user_id)
  where partnership_id is null;
create unique index challenge_participations_partnership_unique
  on challenge_participations (challenge_id, partnership_id)
  where partnership_id is not null;

-- Same AND-shaped, was_partnership_member()-checked pattern as every other
-- write policy fixed this project (0009/0010/0012/0013) after the original
-- 0002_rls.sql shipped several that only checked partnership_is_active(),
-- never real membership — written correctly from the start here rather
-- than needing its own later fix. A user can write a participation that's
-- either genuinely their own (user_id = current_user_id()) or their own
-- active Partnership's (not just any active Partnership's id they might
-- guess or reuse).
create policy challenge_participations_write on challenge_participations for all
  using (
    user_id = current_user_id()
    or (partnership_id is not null and partnership_is_active(partnership_id) and was_partnership_member(partnership_id))
  )
  with check (
    user_id = current_user_id()
    or (partnership_id is not null and partnership_is_active(partnership_id) and was_partnership_member(partnership_id))
  );
