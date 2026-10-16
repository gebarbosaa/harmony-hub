-- Personal organization modules for Harmony Hub
create table if not exists public.personal_module_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_key text not null check (module_key in ('desenvolvimento-pessoal','casa','leitura','alimentacao','habitos-rotina')),
  tab_key text not null,
  entries jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint personal_module_data_user_module_tab_key unique (user_id, module_key, tab_key)
);

alter table public.personal_module_data enable row level security;

drop policy if exists "Users can read their own personal module data" on public.personal_module_data;
create policy "Users can read their own personal module data"
  on public.personal_module_data for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own personal module data" on public.personal_module_data;
create policy "Users can insert their own personal module data"
  on public.personal_module_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own personal module data" on public.personal_module_data;
create policy "Users can update their own personal module data"
  on public.personal_module_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own personal module data" on public.personal_module_data;
create policy "Users can delete their own personal module data"
  on public.personal_module_data for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.personal_module_data to authenticated;
