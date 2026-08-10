-- Fixes a severe, currently-live RLS bug affecting five tables — found
-- while building the Goals Personal/Shared toggle (2026-08-08), which
-- would have started actively writing to goals.partnership_id/is_shared
-- and made it worth re-checking that write path's actual enforcement.
-- This is the SAME bug class already fixed twice this session (0009's
-- categories_write, 0010's four WITH CHECK-only gaps) — a "for all" write
-- policy that checks partnership_is_active(partnership_id) but never
-- was_partnership_member(partnership_id) — except this time it was missed
-- during 0010's own re-audit ("re-verified every remaining for insert/for
-- update policy... all correctly scope to current_user_id()" — that
-- assessment was wrong for these five; owner_id = current_user_id() alone
-- does NOT prove membership of an attacker-supplied partnership_id).
--
-- accounts_write, transactions_write, recurring_expenses_write,
-- budgets_write, and goals_write in 0002_rls.sql all share this exact
-- shape:
--   using (owner_id = current_user_id() and (partnership_id is null or partnership_is_active(partnership_id)))
--   with check (same)
-- Concretely: any authenticated user could INSERT a row with
-- owner_id = themselves and partnership_id = ANY OTHER active
-- Partnership's id (a UUID, not secret — observable from an invite link,
-- guessable via enumeration, or simply known if the attacker was ever a
-- member and later left). The row's OWN table passes RLS because the
-- attacker genuinely owns it. But each table's SELECT policy
-- (e.g. accounts_select: owner_id = current_user_id() or (is_shared and
-- was_partnership_member(partnership_id))) then lets every REAL member of
-- that OTHER Partnership see the attacker's row too, once is_shared is
-- set — because was_partnership_member() correctly checks the row's real
-- partnership_id, which the attacker was free to set to anyone's. This is
-- a genuine cross-tenant data-injection hole across the five most
-- sensitive financial tables in the schema (including accounts and
-- transactions), not just a read-scoping gap — worse than 0009's
-- categories_write, which only affected one lower-sensitivity table.
--
-- Not currently reachable through the app's own UI — no route lets a
-- client supply an arbitrary partnership_id for these writes; every real
-- route derives it server-side from findActiveMembership(userId, client),
-- the user's own genuine membership. But per this project's stated
-- philosophy (Database Architecture §1/§10: "privacy is enforced by the
-- database, not the application"), the database itself must not depend on
-- every current and future caller behaving — fixed now rather than left
-- as a live hole. Same posture as 0007/0009/0010.
--
-- Fix: add the missing was_partnership_member(partnership_id) check
-- alongside partnership_is_active(partnership_id) in both using and with
-- check, on all five policies. This only ADDS a required condition — it
-- can only narrow access, never grant anything the old policy didn't
-- already (incorrectly) allow, so it cannot break any of the five real
-- write paths (findOrCreateManualAccount, budget transactions, the
-- default-category/budget bootstrap, and — once built — Goals), all of
-- which already supply a partnership_id the writing user genuinely
-- belongs to.

drop policy accounts_write on accounts;
create policy accounts_write on accounts for all
  using (owner_id = current_user_id() and (partnership_id is null or (was_partnership_member(partnership_id) and partnership_is_active(partnership_id))))
  with check (owner_id = current_user_id() and (partnership_id is null or (was_partnership_member(partnership_id) and partnership_is_active(partnership_id))));

drop policy transactions_write on transactions;
create policy transactions_write on transactions for all
  using (owner_id = current_user_id() and (partnership_id is null or (was_partnership_member(partnership_id) and partnership_is_active(partnership_id))))
  with check (owner_id = current_user_id() and (partnership_id is null or (was_partnership_member(partnership_id) and partnership_is_active(partnership_id))));

drop policy recurring_expenses_write on recurring_expenses;
create policy recurring_expenses_write on recurring_expenses for all
  using (owner_id = current_user_id() and (partnership_id is null or (was_partnership_member(partnership_id) and partnership_is_active(partnership_id))))
  with check (owner_id = current_user_id() and (partnership_id is null or (was_partnership_member(partnership_id) and partnership_is_active(partnership_id))));

drop policy budgets_write on budgets;
create policy budgets_write on budgets for all
  using (owner_id = current_user_id() and (partnership_id is null or (was_partnership_member(partnership_id) and partnership_is_active(partnership_id))))
  with check (owner_id = current_user_id() and (partnership_id is null or (was_partnership_member(partnership_id) and partnership_is_active(partnership_id))));

drop policy goals_write on goals;
create policy goals_write on goals for all
  using (owner_id = current_user_id() and (partnership_id is null or (was_partnership_member(partnership_id) and partnership_is_active(partnership_id))))
  with check (owner_id = current_user_id() and (partnership_id is null or (was_partnership_member(partnership_id) and partnership_is_active(partnership_id))));
