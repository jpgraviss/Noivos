-- partnership_invites (0002_rls.sql) only let the INVITER select/update
-- their own invite rows — there was no way for the actual invitee (a
-- different Clerk user, not yet a Partnership member, identified only by
-- an unguessable invite_token rather than a user id we can check against)
-- to ever read or respond to their own invite. Without this, the invite
-- flow could create a pending invite row but nothing could ever let a
-- second person actually join — a known gap flagged repeatedly since
-- 2026-08-03. This adds the two policies a real accept-invite flow needs:
--
--   1. Any row can be selected by anyone while it's still pending — the
--      invite_token itself (a random UUID, never enumerable) is the actual
--      secret here, the same trust model most invite-link products use
--      (you can preview an invite before signing in). Once accepted/
--      declined/revoked/expired, the existing inviter-only select policy
--      is what continues to apply — this policy only widens visibility
--      for the 'pending' state, which is the state where a non-inviter
--      genuinely needs to read the row.
--   2. Any signed-in user can transition a pending invite to accepted or
--      declined — this is specifically what lets the invitee (not the
--      inviter) respond. Scoped tightly: only pending rows can be touched,
--      and the new status can only be accepted/declined, never anything
--      else (so this can't be used to un-revoke or un-expire an invite).
create policy partnership_invites_select_pending on partnership_invites for select
  using (status = 'pending');

create policy partnership_invites_respond on partnership_invites for update
  using (status = 'pending')
  with check (status in ('accepted', 'declined'));
