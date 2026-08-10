-- Fixes a severe bug: POST /api/partnership/disconnect only updates the
-- disconnecting user's own partnership_members row --
-- partnership_members_update's RLS policy permits only
-- `user_id = current_user_id()`, so the app's RLS-scoped connection cannot
-- touch the other member's row directly, by design (see that route's own
-- prior comment, now out of date). The other partner's partnership_members
-- row is left with left_at still null forever, even though the
-- partnership itself is now 'disconnected' -- silently defeating the
-- one_active_partnership_per_user unique index's real intent
-- (0001_init.sql): that a user has at most one *active* partnership.
--
-- Concretely, for the non-initiating partner: findActiveMembership()
-- correctly reports them as not connected (it excludes
-- p.status = 'disconnected'), so the app invites them to create or accept
-- a new Partnership -- but the INSERT into partnership_members for that
-- new Partnership always collides with their stale left_at IS NULL row
-- under the unique index (Postgres 23505), which invite/accept both
-- translate to "you're already in a Partnership -- disconnect first."
-- Calling disconnect again finds no active membership (already
-- disconnected) and returns "you're not currently connected." An
-- unrecoverable dead end via the app for every ordinary disconnect, not an
-- edge case.
--
-- Fixed with a SECURITY DEFINER trigger -- the standard Postgres pattern
-- for a narrowly-scoped, system-triggered side effect an RLS-scoped
-- connection correctly can't perform itself (the same carve-out class as
-- the async/system-initiated writes documented in
-- packages/database/README.md's "never connect with a superuser/bypass-RLS
-- role for a live user request" rule -- this trigger *is* that
-- system-initiated write, just running inside the same transaction as the
-- triggering UPDATE rather than a separate service-role connection). Runs
-- as this function's owner (whichever role applies this migration -- the
-- table owner, exempt from RLS since no table here has
-- FORCE ROW LEVEL SECURITY set), so it can close out every member's row
-- regardless of who initiated the disconnect.
--
-- Also revokes any still-pending invites for the disconnected partnership.
-- Without this, a pending invite (14-day expiry, see 0006) accepted after
-- the inviter disconnects would create the exact same permanently-orphaned
-- membership row for the invitee -- accept/route.ts's own lookup never
-- checked the linked partnership's status. That route also gets a
-- defense-in-depth status check in this same change (see the paired
-- application-code diff), so a stale pending invite is rejected even if
-- this trigger somehow didn't fire for it.
create or replace function disconnect_partnership_members() returns trigger as $$
begin
  if new.status = 'disconnected' and old.status is distinct from new.status then
    update partnership_members
      set left_at = now()
      where partnership_id = new.id and left_at is null;
    update partnership_invites
      set status = 'revoked', responded_at = now()
      where partnership_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists partnerships_disconnect_cleanup on partnerships;
create trigger partnerships_disconnect_cleanup
  after update on partnerships
  for each row
  execute function disconnect_partnership_members();

-- One-time backfill for any partnership that was already disconnected
-- before this migration existed -- its members' partnership_members rows
-- and any still-pending invites never got cleaned up (the exact bug this
-- migration fixes going forward). Idempotent no-op if none exist.
update partnership_members pm
  set left_at = now()
  from partnerships p
  where p.id = pm.partnership_id and p.status = 'disconnected' and pm.left_at is null;

update partnership_invites pi
  set status = 'revoked', responded_at = now()
  from partnerships p
  where p.id = pi.partnership_id and p.status = 'disconnected' and pi.status = 'pending';
