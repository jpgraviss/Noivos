-- Fixes a real, currently-live RLS bug found via a correctness read of
-- 0002_rls.sql (2026-08-07): categories_write is the only write/"for all"
-- policy in the entire file that uses OR where every sibling table
-- (accounts_write, transactions_write, recurring_expenses_write,
-- budgets_write, goals_write) uses AND, and its partnership branch never
-- checks was_partnership_member() at all — it only checks that the row's
-- own partnership_id is set and that partnership is active, with zero
-- reference to who's actually asking.
--
-- Concretely, with the current OR-shaped policy:
--   using (owner_id = current_user_id() or (partnership_id is not null and partnership_is_active(partnership_id)))
-- Since apps/web/src/app/api/budget/route.ts's category bootstrap sets
-- owner_id = NULL for shared categories (unlike budgets, which always keeps
-- owner_id = the creating user even when shared — see budget_categories_write's
-- deliberately owner-scoped design), the owner_id branch is never true for a
-- shared category row, which means write access for EVERY shared category on
-- the entire platform rests entirely on "is some partnership_id active" —
-- true for literally any signed-in user, partnership member or not. Any
-- authenticated user could UPDATE/DELETE any other Partnership's shared
-- categories, or INSERT a category falsely attributed to a Partnership they
-- were never a member of, given its (random, but not secret) UUID.
--
-- Not currently reachable through the app's own UI — no route lets a user
-- supply an arbitrary categoryId for UPDATE/DELETE today, and the one write
-- path (the default-category bootstrap) already succeeds on first run per
-- migration 0008's unique indexes — but this is the actual database-level
-- enforcement layer this project's own stated philosophy treats as the real
-- privacy boundary, not the application code, so it's fixed now rather than
-- left as a live hole until some future route reaches it. Same posture as
-- 0007's audit (plaid_items/account_balance_snapshots/challenges all got RLS
-- enabled despite zero current app usage).
--
-- Fix: AND instead of OR (matching every sibling policy's shape), and add
-- the missing was_partnership_member() check so the partnership branch is
-- actually scoped to users who are members of THAT specific partnership,
-- not "any active partnership on the platform." This only ADDS a required
-- condition — it can only narrow access, never grant anything the old
-- policy didn't already (incorrectly) allow, so it can't break the one
-- legitimate write path (an actual member's bootstrap insert).
drop policy categories_write on categories;
create policy categories_write on categories for all
  using (
    owner_id = current_user_id()
    or (partnership_id is not null and was_partnership_member(partnership_id) and partnership_is_active(partnership_id))
  )
  with check (
    owner_id = current_user_id()
    or (partnership_id is not null and was_partnership_member(partnership_id) and partnership_is_active(partnership_id))
  );
