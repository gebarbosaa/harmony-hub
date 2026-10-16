-- Keep Google OAuth credentials server-side only.
-- The UI needs only connection metadata for status and DELETE for disconnect.
-- OAuth callback and synchronization write/read tokens through service_role.
-- Event-link RLS policies also need connection id/user_id, so SELECT remains
-- scoped to non-secret columns rather than being removed entirely.

-- Remove direct client writes. They are handled only by server-side Edge Functions.
drop policy if exists google_calendar_connections_insert on public.google_calendar_connections;
drop policy if exists google_calendar_connections_update on public.google_calendar_connections;

-- Remove broad table privileges and any prior column grants for browser roles.
revoke all privileges on table public.google_calendar_connections from anon, authenticated;
revoke select (access_token, refresh_token, token_expires_at)
  on table public.google_calendar_connections from anon, authenticated;
revoke insert (id, user_id, household_id, google_email, access_token, refresh_token,
  token_expires_at, calendar_id, sync_enabled, last_synced_at, created_at, updated_at)
  on table public.google_calendar_connections from anon, authenticated;
revoke update (id, user_id, household_id, google_email, access_token, refresh_token,
  token_expires_at, calendar_id, sync_enabled, last_synced_at, created_at, updated_at)
  on table public.google_calendar_connections from anon, authenticated;

-- Status reads expose only non-secret metadata and remain constrained by the
-- existing google_calendar_connections_select RLS policy (user_id = auth.uid()).
grant select (id, user_id, household_id, google_email, calendar_id, sync_enabled,
  last_synced_at, created_at, updated_at)
  on table public.google_calendar_connections to authenticated;

-- Disconnect remains available to the owner under the existing DELETE policy.
grant delete on table public.google_calendar_connections to authenticated;

-- RLS stays enabled. service_role retains the access required by Edge Functions.
