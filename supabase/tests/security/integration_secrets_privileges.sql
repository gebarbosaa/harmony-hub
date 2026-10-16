-- Run only after applying 20261016140000_restrict_integration_secret_access.sql
-- in a disposable/staging Supabase project. This script checks effective grants.
DO $$
BEGIN
  IF has_column_privilege('anon', 'public.spreadsheet_connections', 'sync_token', 'SELECT')
     OR has_column_privilege('authenticated', 'public.spreadsheet_connections', 'sync_token', 'SELECT')
     OR has_column_privilege('anon', 'public.spreadsheet_connections', 'token_hash', 'SELECT')
     OR has_column_privilege('authenticated', 'public.spreadsheet_connections', 'token_hash', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: client roles can read spreadsheet connection secrets';
  END IF;

  IF has_column_privilege('anon', 'public.spreadsheet_connections', 'sync_token', 'INSERT')
     OR has_column_privilege('authenticated', 'public.spreadsheet_connections', 'sync_token', 'INSERT')
     OR has_column_privilege('anon', 'public.spreadsheet_connections', 'sync_token', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.spreadsheet_connections', 'sync_token', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL: client roles can write spreadsheet connection secrets';
  END IF;

  IF has_table_privilege('anon', 'public.jarvis_integrations', 'SELECT')
     OR has_table_privilege('authenticated', 'public.jarvis_integrations', 'SELECT')
     OR has_table_privilege('anon', 'public.jarvis_integrations', 'INSERT')
     OR has_table_privilege('authenticated', 'public.jarvis_integrations', 'INSERT')
     OR has_table_privilege('anon', 'public.jarvis_integrations', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.jarvis_integrations', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL: client roles retain access to the retired Jarvis integration table';
  END IF;

  IF has_table_privilege('anon', 'public.open_finance_accounts', 'SELECT')
     OR has_table_privilege('anon', 'public.open_finance_connections', 'SELECT')
     OR has_table_privilege('anon', 'public.open_finance_transactions', 'SELECT')
     OR has_table_privilege('anon', 'public.spreadsheet_sync_events', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: anon retains SELECT on protected integration tables';
  END IF;

  IF NOT has_column_privilege('authenticated', 'public.spreadsheet_connections', 'name', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.spreadsheet_connections', 'DELETE')
     OR NOT has_table_privilege('authenticated', 'public.open_finance_accounts', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.open_finance_connections', 'DELETE')
     OR NOT has_table_privilege('authenticated', 'public.spreadsheet_sync_events', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: expected non-secret metadata or disconnect privileges are missing';
  END IF;
END $$;

SELECT 'PASS: integration credential and table grants match expected policy' AS result;
