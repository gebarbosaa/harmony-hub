-- Keep Google OAuth credentials server-side only.
-- The UI needs only connection metadata for status and DELETE for disconnect.
-- OAuth callback and synchronization read/write tokens through service_role.
-- RLS remains enabled and scopes user-facing reads/deletes to auth.uid().

-- Remove direct client writes. OAuth and sync writes are handled by Edge Functions.
drop policy if exists google_calendar_connections_insert on public.google_calendar_connections;
drop policy if exists google_calendar_connections_update on public.google_calendar_connections;

-- Remove table-level privileges and all existing column-level grants. A table-level
-- REVOKE does not remove column grants, so explicitly revoke every current column.
revoke all privileges on table public.google_calendar_connections from anon, authenticated;

revoke select (
  id, user_id, household_id, google_email, access_token, refresh_token,
  token_expires_at, calendar_id, sync_enabled, last_synced_at, created_at, updated_at
) on table public.google_calendar_connections from anon, authenticated;

revoke insert (
  id, user_id, household_id, google_email, access_token, refresh_token,
  token_expires_at, calendar_id, sync_enabled, last_synced_at, created_at, updated_at
) on table public.google_calendar_connections from anon, authenticated;

revoke update (
  id, user_id, household_id, google_email, access_token, refresh_token,
  token_expires_at, calendar_id, sync_enabled, last_synced_at, created_at, updated_at
) on table public.google_calendar_connections from anon, authenticated;

revoke references (
  id, user_id, household_id, google_email, access_token, refresh_token,
  token_expires_at, calendar_id, sync_enabled, last_synced_at, created_at, updated_at
) on table public.google_calendar_connections from anon, authenticated;

-- Status reads expose only non-secret metadata and remain constrained by the
-- existing google_calendar_connections_select RLS policy (user_id = auth.uid()).
grant select (
  id, user_id, household_id, google_email, calendar_id, sync_enabled,
  last_synced_at, created_at, updated_at
) on table public.google_calendar_connections to authenticated;

-- Disconnect remains available to the owner under the existing DELETE policy.
grant delete on table public.google_calendar_connections to authenticated;

-- service_role retains the access required by the server-side Edge Functions.
