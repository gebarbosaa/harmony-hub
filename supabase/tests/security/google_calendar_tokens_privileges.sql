-- Manual post-migration regression checks for Google Calendar token privileges.
-- Run only AFTER applying 20261016120000_secure_google_calendar_tokens.sql
-- in a disposable/staging Supabase project. This script is read-only.
DO $$
BEGIN
  IF has_column_privilege('anon', 'public.google_calendar_connections', 'access_token', 'SELECT')
     OR has_column_privilege('anon', 'public.google_calendar_connections', 'refresh_token', 'SELECT')
     OR has_column_privilege('anon', 'public.google_calendar_connections', 'token_expires_at', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: anon can read Google OAuth secret columns';
  END IF;

  IF has_column_privilege('authenticated', 'public.google_calendar_connections', 'access_token', 'SELECT')
     OR has_column_privilege('authenticated', 'public.google_calendar_connections', 'refresh_token', 'SELECT')
     OR has_column_privilege('authenticated', 'public.google_calendar_connections', 'token_expires_at', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: authenticated can read Google OAuth secret columns';
  END IF;

  IF has_column_privilege('anon', 'public.google_calendar_connections', 'access_token', 'INSERT')
     OR has_column_privilege('anon', 'public.google_calendar_connections', 'refresh_token', 'INSERT')
     OR has_column_privilege('authenticated', 'public.google_calendar_connections', 'access_token', 'INSERT')
     OR has_column_privilege('authenticated', 'public.google_calendar_connections', 'refresh_token', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: client roles can insert Google OAuth tokens';
  END IF;

  IF has_column_privilege('anon', 'public.google_calendar_connections', 'access_token', 'UPDATE')
     OR has_column_privilege('anon', 'public.google_calendar_connections', 'refresh_token', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.google_calendar_connections', 'access_token', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.google_calendar_connections', 'refresh_token', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL: client roles can update Google OAuth tokens';
  END IF;

  IF NOT has_column_privilege('authenticated', 'public.google_calendar_connections', 'user_id', 'SELECT')
     OR NOT has_column_privilege('authenticated', 'public.google_calendar_connections', 'google_email', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: authenticated cannot read connection status metadata';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.google_calendar_connections', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: authenticated cannot disconnect Google Calendar';
  END IF;

  IF has_table_privilege('anon', 'public.google_calendar_connections', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: anon can delete Google Calendar connections';
  END IF;
END $$;

SELECT 'PASS: Google Calendar token column privileges match expected policy' AS result;
