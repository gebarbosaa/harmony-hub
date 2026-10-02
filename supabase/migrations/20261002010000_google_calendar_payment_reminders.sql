create table if not exists public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  household_id uuid references public.households(id) on delete cascade,
  google_email text,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz,
  calendar_id text not null default 'primary',
  sync_enabled boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, calendar_id)
);

alter table public.google_calendar_connections enable row level security;
create policy google_calendar_connections_select on public.google_calendar_connections for select to authenticated using (user_id = (select auth.uid()));
create policy google_calendar_connections_insert on public.google_calendar_connections for insert to authenticated with check (user_id = (select auth.uid()));
create policy google_calendar_connections_update on public.google_calendar_connections for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy google_calendar_connections_delete on public.google_calendar_connections for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.google_calendar_event_links (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.google_calendar_connections(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  source_period text,
  google_event_id text not null,
  google_etag text,
  due_date date not null,
  last_local_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(connection_id, source_type, source_id, source_period)
);

alter table public.google_calendar_event_links enable row level security;
create policy google_calendar_event_links_select on public.google_calendar_event_links for select to authenticated using (exists (select 1 from public.google_calendar_connections c where c.id=connection_id and c.user_id=(select auth.uid())));
create policy google_calendar_event_links_insert on public.google_calendar_event_links for insert to authenticated with check (exists (select 1 from public.google_calendar_connections c where c.id=connection_id and c.user_id=(select auth.uid())));
create policy google_calendar_event_links_update on public.google_calendar_event_links for update to authenticated using (exists (select 1 from public.google_calendar_connections c where c.id=connection_id and c.user_id=(select auth.uid()))) with check (exists (select 1 from public.google_calendar_connections c where c.id=connection_id and c.user_id=(select auth.uid())));
create policy google_calendar_event_links_delete on public.google_calendar_event_links for delete to authenticated using (exists (select 1 from public.google_calendar_connections c where c.id=connection_id and c.user_id=(select auth.uid())));

create index if not exists google_calendar_event_links_connection_idx on public.google_calendar_event_links(connection_id);
create index if not exists google_calendar_event_links_source_idx on public.google_calendar_event_links(source_type, source_id);