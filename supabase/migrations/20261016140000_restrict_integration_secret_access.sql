-- Restrict client access to integration credentials and require authenticated
-- sessions for connection metadata. Edge Functions using service_role continue
-- to manage integration secrets server-side.
begin;

-- The Harmony Hub no longer exposes the Jarvis integration in its UI. Preserve
-- existing records for reversibility, but do not expose its bearer token to clients.
revoke all privileges on table public.jarvis_integrations from anon, authenticated;
revoke select (id, household_id, status, jarvis_token, jarvis_user_id, connected_at, updated_at)
  on table public.jarvis_integrations from anon, authenticated;
revoke insert (id, household_id, status, jarvis_token, jarvis_user_id, connected_at, updated_at)
  on table public.jarvis_integrations from anon, authenticated;
revoke update (id, household_id, status, jarvis_token, jarvis_user_id, connected_at, updated_at)
  on table public.jarvis_integrations from anon, authenticated;
revoke references (id, household_id, status, jarvis_token, jarvis_user_id, connected_at, updated_at)
  on table public.jarvis_integrations from anon, authenticated;

-- Spreadsheet connection tokens are consumed by server-side Edge Functions.
-- The browser may inspect non-secret connection metadata and remove a connection,
-- but must not read/write token_hash or sync_token or mutate connection secrets.
drop policy if exists spreadsheet_connections_member_delete on public.spreadsheet_connections;
drop policy if exists spreadsheet_connections_member_insert on public.spreadsheet_connections;
drop policy if exists spreadsheet_connections_member_select on public.spreadsheet_connections;
drop policy if exists spreadsheet_connections_member_update on public.spreadsheet_connections;

revoke all privileges on table public.spreadsheet_connections from anon, authenticated;
revoke select (id, household_id, name, spreadsheet_id, sheet_name, token_hash, active, created_at, updated_at, web_app_url, sync_token)
  on table public.spreadsheet_connections from anon, authenticated;
revoke insert (id, household_id, name, spreadsheet_id, sheet_name, token_hash, active, created_at, updated_at, web_app_url, sync_token)
  on table public.spreadsheet_connections from anon, authenticated;
revoke update (id, household_id, name, spreadsheet_id, sheet_name, token_hash, active, created_at, updated_at, web_app_url, sync_token)
  on table public.spreadsheet_connections from anon, authenticated;
revoke references (id, household_id, name, spreadsheet_id, sheet_name, token_hash, active, created_at, updated_at, web_app_url, sync_token)
  on table public.spreadsheet_connections from anon, authenticated;

grant select (id, household_id, name, spreadsheet_id, sheet_name, active, created_at, updated_at, web_app_url)
  on table public.spreadsheet_connections to authenticated;
grant delete on table public.spreadsheet_connections to authenticated;

create policy spreadsheet_connections_member_delete on public.spreadsheet_connections
  for delete to authenticated
  using (exists (
    select 1 from public.group_members gm
    where gm.household_id = spreadsheet_connections.household_id
      and gm.user_id = (select auth.uid())
      and gm.status = 'ACTIVE'
  ));
create policy spreadsheet_connections_member_select on public.spreadsheet_connections
  for select to authenticated
  using (exists (
    select 1 from public.group_members gm
    where gm.household_id = spreadsheet_connections.household_id
      and gm.user_id = (select auth.uid())
      and gm.status = 'ACTIVE'
  ));

-- Remove unnecessary anonymous and client write privileges from the Open Finance
-- tables. The authenticated application can read connection/account metadata;
-- trusted Edge Functions perform provider synchronization and mutations.
revoke all privileges on table public.open_finance_accounts from anon, authenticated;
grant select on table public.open_finance_accounts to authenticated;

revoke all privileges on table public.open_finance_connections from anon, authenticated;
grant select, delete on table public.open_finance_connections to authenticated;

revoke all privileges on table public.open_finance_transactions from anon, authenticated;
grant select on table public.open_finance_transactions to authenticated;

revoke all privileges on table public.spreadsheet_sync_events from anon, authenticated;
grant select on table public.spreadsheet_sync_events to authenticated;

-- Policies with role PUBLIC were already scoped to active group members via
-- auth.uid(), but explicitly limit their execution to signed-in users.
drop policy if exists open_finance_accounts_household_select on public.open_finance_accounts;
create policy open_finance_accounts_household_select on public.open_finance_accounts
  for select to authenticated
  using (exists (
    select 1 from public.group_members gm
    where gm.household_id = open_finance_accounts.household_id
      and gm.user_id = (select auth.uid())
      and gm.status = 'ACTIVE'
  ));

drop policy if exists open_finance_connections_household_select on public.open_finance_connections;
create policy open_finance_connections_household_select on public.open_finance_connections
  for select to authenticated
  using (exists (
    select 1 from public.group_members gm
    where gm.household_id = open_finance_connections.household_id
      and gm.user_id = (select auth.uid())
      and gm.status = 'ACTIVE'
  ));

drop policy if exists open_finance_transactions_household_select on public.open_finance_transactions;
create policy open_finance_transactions_household_select on public.open_finance_transactions
  for select to authenticated
  using (exists (
    select 1 from public.group_members gm
    where gm.household_id = open_finance_transactions.household_id
      and gm.user_id = (select auth.uid())
      and gm.status = 'ACTIVE'
  ));

drop policy if exists spreadsheet_sync_events_member_select on public.spreadsheet_sync_events;
create policy spreadsheet_sync_events_member_select on public.spreadsheet_sync_events
  for select to authenticated
  using (exists (
    select 1 from public.group_members gm
    where gm.household_id = spreadsheet_sync_events.household_id
      and gm.user_id = (select auth.uid())
      and gm.status = 'ACTIVE'
  ));

commit;
