create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null,
  title text not null,
  date date not null,
  time text,
  category text not null default 'OUTROS',
  description text,
  responsible text not null default 'AMBAS / COMPARTILHADO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_events enable row level security;

create policy "calendar_events_select" on public.calendar_events for select using (owner_id = auth.uid());
create policy "calendar_events_insert" on public.calendar_events for insert with check (owner_id = auth.uid());
create policy "calendar_events_update" on public.calendar_events for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "calendar_events_delete" on public.calendar_events for delete using (owner_id = auth.uid());
