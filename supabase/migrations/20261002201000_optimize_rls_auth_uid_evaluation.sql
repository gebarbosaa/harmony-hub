-- Optimize RLS policies by evaluating auth.uid() once per statement.
-- Semantics intentionally unchanged.

drop policy if exists "spreadsheet_connections_member_delete" on public.spreadsheet_connections;
create policy "spreadsheet_connections_member_delete" on public.spreadsheet_connections for delete
using (exists (select 1 from public.group_members gm where gm.household_id = spreadsheet_connections.household_id and gm.user_id = (select auth.uid()) and gm.status = 'ACTIVE'));

drop policy if exists "spreadsheet_connections_member_insert" on public.spreadsheet_connections;
create policy "spreadsheet_connections_member_insert" on public.spreadsheet_connections for insert
with check (exists (select 1 from public.group_members gm where gm.household_id = spreadsheet_connections.household_id and gm.user_id = (select auth.uid()) and gm.status = 'ACTIVE'));

drop policy if exists "spreadsheet_connections_member_select" on public.spreadsheet_connections;
create policy "spreadsheet_connections_member_select" on public.spreadsheet_connections for select
using (exists (select 1 from public.group_members gm where gm.household_id = spreadsheet_connections.household_id and gm.user_id = (select auth.uid()) and gm.status = 'ACTIVE'));

drop policy if exists "spreadsheet_connections_member_update" on public.spreadsheet_connections;
create policy "spreadsheet_connections_member_update" on public.spreadsheet_connections for update
using (exists (select 1 from public.group_members gm where gm.household_id = spreadsheet_connections.household_id and gm.user_id = (select auth.uid()) and gm.status = 'ACTIVE'))
with check (exists (select 1 from public.group_members gm where gm.household_id = spreadsheet_connections.household_id and gm.user_id = (select auth.uid()) and gm.status = 'ACTIVE'));

drop policy if exists "spreadsheet_sync_events_member_select" on public.spreadsheet_sync_events;
create policy "spreadsheet_sync_events_member_select" on public.spreadsheet_sync_events for select
using (exists (select 1 from public.group_members gm where gm.household_id = spreadsheet_sync_events.household_id and gm.user_id = (select auth.uid()) and gm.status = 'ACTIVE'));

drop policy if exists "open_finance_accounts_household_select" on public.open_finance_accounts;
create policy "open_finance_accounts_household_select" on public.open_finance_accounts for select
using (exists (select 1 from public.group_members gm where gm.household_id = open_finance_accounts.household_id and gm.user_id = (select auth.uid()) and gm.status = 'ACTIVE'));

drop policy if exists "open_finance_connections_household_select" on public.open_finance_connections;
create policy "open_finance_connections_household_select" on public.open_finance_connections for select
using (exists (select 1 from public.group_members gm where gm.household_id = open_finance_connections.household_id and gm.user_id = (select auth.uid()) and gm.status = 'ACTIVE'));

drop policy if exists "open_finance_transactions_household_select" on public.open_finance_transactions;
create policy "open_finance_transactions_household_select" on public.open_finance_transactions for select
using (exists (select 1 from public.group_members gm where gm.household_id = open_finance_transactions.household_id and gm.user_id = (select auth.uid()) and gm.status = 'ACTIVE'));
