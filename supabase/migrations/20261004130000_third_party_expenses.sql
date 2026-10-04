-- Third-party expense tracking
create table if not exists public.third_parties (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.transactions add column if not exists third_party_id uuid references public.third_parties(id) on delete set null;
alter table public.transactions add column if not exists third_party_status text not null default 'PENDENTE';
alter table public.transactions add column if not exists third_party_reimbursed_at timestamptz;
alter table public.transactions add column if not exists third_party_notes text;
create index if not exists idx_third_parties_household on public.third_parties(household_id);
create index if not exists idx_transactions_third_party on public.transactions(third_party_id);
alter table public.third_parties enable row level security;
drop policy if exists "household third parties" on public.third_parties;
create policy "household third parties" on public.third_parties for all using (household_id = current_household_id()) with check (household_id = current_household_id());
