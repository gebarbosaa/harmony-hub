-- Keep Google OAuth credentials server-side only.
-- The Harmony UI uses google-calendar-oauth for status/disconnect and the
-- Edge Functions use service_role for token reads/writes and synchronization.
-- Authenticated clients must not read or mutate rows containing access_token
-- and refresh_token through the public Data API.
drop policy if exists google_calendar_connections_select on public.google_calendar_connections;
drop policy if exists google_calendar_connections_insert on public.google_calendar_connections;
drop policy if exists google_calendar_connections_update on public.google_calendar_connections;
drop policy if exists google_calendar_connections_delete on public.google_calendar_connections;

-- RLS remains enabled. No authenticated policy is intentionally recreated:
-- the Edge Functions operate through the server-side service_role client.
