-- Second instance of the exact bug class fixed in 0009
-- (categories_write): found by extending that same correctness read —
-- USING vs. WITH CHECK compared clause-by-clause — across the rest of
-- 0002_rls.sql's "for all" policies, rather than stopping at the one
-- table the first pass happened to start with.
--
-- Four policies have a USING clause that correctly requires
-- was_partnership_member(), but a WITH CHECK clause that only requires
-- partnership_is_active() — never was_partnership_member():
--   wedding_vendors_all, wedding_family_contributions_all,
--   wedding_checklist_items_all, money_meetings_all
--
-- USING gates which existing rows a query may touch (SELECT, and the
-- "which rows can I UPDATE/DELETE" filter); WITH CHECK gates the *new*
-- row values on INSERT and on UPDATE. For all four of these tables there
-- is no USING clause at all on INSERT (there's no existing row yet) — so
-- INSERT is governed entirely by WITH CHECK, and WITH CHECK on all four
-- never verifies the inserting user is actually a member of the
-- partnership the new row claims to belong to. Concretely: any
-- authenticated user, given (or guessing) another Partnership's
-- wedding_details_id or partnership_id — a UUID, not secret — could
-- INSERT a wedding_vendors/wedding_family_contributions/
-- wedding_checklist_items/money_meetings row falsely attributed to a
-- Partnership they were never a member of, as long as that Partnership
-- happens to be active (true for most real partnerships). The same gap
-- also weakens UPDATE for these tables: a real member of their own
-- Partnership could re-point an existing row's wedding_details_id/
-- partnership_id at a different (also-active) Partnership's id, since
-- WITH CHECK on the post-update row only re-checks partnership_is_active,
-- not membership.
--
-- Compare wedding_details_write (same file, correctly symmetric):
--   using (partnership_is_active(partnership_id) and was_partnership_member(partnership_id))
--   with check (partnership_is_active(partnership_id) and was_partnership_member(partnership_id))
-- That's the shape every one of these four should have had.
--
-- Not currently reachable through the app's own UI — every real write
-- route (POST /api/wedding/vendors, .../family-contributions,
-- .../checklist, GET /api/money-meeting's auto-create, POST
-- /api/money-meeting/complete) derives the partnership_id/
-- wedding_details_id from the *current user's own* active membership
-- server-side; nothing lets a client supply an arbitrary one. Fixed
-- anyway for the same reason 0009 was: this is the actual database-level
-- privacy boundary this project treats as authoritative, not application
-- code, and leaving it open is a live hole the moment any future route
-- (or a direct API call bypassing the client) reaches it.
--
-- Fix: add the missing was_partnership_member() check to each WITH
-- CHECK clause, matching its own USING clause (or, for money_meetings_all,
-- matching wedding_details_write's pattern). This only ADDS a required
-- condition, so it can only narrow access, never grant anything the old
-- policies didn't already (incorrectly) allow — every real write path
-- above already supplies a partnership/wedding_details id the writing
-- user is a genuine member of, so none of them can break.
drop policy wedding_vendors_all on wedding_vendors;
create policy wedding_vendors_all on wedding_vendors for all
  using (exists (select 1 from wedding_details w where w.id = wedding_details_id and was_partnership_member(w.partnership_id)))
  with check (exists (select 1 from wedding_details w where w.id = wedding_details_id and was_partnership_member(w.partnership_id) and partnership_is_active(w.partnership_id)));

drop policy wedding_family_contributions_all on wedding_family_contributions;
create policy wedding_family_contributions_all on wedding_family_contributions for all
  using (exists (select 1 from wedding_details w where w.id = wedding_details_id and was_partnership_member(w.partnership_id)))
  with check (exists (select 1 from wedding_details w where w.id = wedding_details_id and was_partnership_member(w.partnership_id) and partnership_is_active(w.partnership_id)));

drop policy wedding_checklist_items_all on wedding_checklist_items;
create policy wedding_checklist_items_all on wedding_checklist_items for all
  using (exists (select 1 from wedding_details w where w.id = wedding_details_id and was_partnership_member(w.partnership_id)))
  with check (exists (select 1 from wedding_details w where w.id = wedding_details_id and was_partnership_member(w.partnership_id) and partnership_is_active(w.partnership_id)));

drop policy money_meetings_all on money_meetings;
create policy money_meetings_all on money_meetings for all
  using (was_partnership_member(partnership_id))
  with check (was_partnership_member(partnership_id) and partnership_is_active(partnership_id));
