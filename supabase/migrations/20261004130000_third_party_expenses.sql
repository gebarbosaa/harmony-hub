-- Gastos de terceiros: pessoas e despesas vinculadas aos meios de pagamento do perfil pessoal.
create table if not exists public.third_parties (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create table if not exists public.third_party_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  third_party_id uuid not null references public.third_parties(id) on delete restrict,
  transaction_id uuid references public.transactions(id) on delete set null,
  date date not null default current_date,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  category text not null default 'TERCEIROS',
  payment_method_id uuid references public.household_payment_methods(id) on delete set null,
  card_id uuid references public.cards(id) on delete set null,
  account_id uuid references public.household_accounts(id) on delete set null,
  reimbursement_status text not null default 'PENDENTE' check (reimbursement_status in ('PENDENTE','PARCIAL','REEMBOLSADO')),
  reimbursed_amount numeric(14,2) not null default 0 check (reimbursed_amount >= 0 and reimbursed_amount <= amount),
  reimbursed_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_third_parties_household on public.third_parties(household_id);
create index if not exists idx_third_party_expenses_household_date on public.third_party_expenses(household_id, date desc);
create index if not exists idx_third_party_expenses_party on public.third_party_expenses(third_party_id);
create index if not exists idx_third_party_expenses_transaction on public.third_party_expenses(transaction_id);
create index if not exists idx_third_party_expenses_payment on public.third_party_expenses(payment_method_id);
create index if not exists idx_third_party_expenses_card on public.third_party_expenses(card_id);
create index if not exists idx_third_party_expenses_account on public.third_party_expenses(account_id);

alter table public.third_parties enable row level security;
alter table public.third_party_expenses enable row level security;

drop policy if exists third_parties_select on public.third_parties;
drop policy if exists third_parties_insert on public.third_parties;
drop policy if exists third_parties_update on public.third_parties;
drop policy if exists third_parties_delete on public.third_parties;
create policy third_parties_select on public.third_parties for select to authenticated using ((select public.current_household_id()) = household_id);
create policy third_parties_insert on public.third_parties for insert to authenticated with check ((select public.current_household_id()) = household_id);
create policy third_parties_update on public.third_parties for update to authenticated using ((select public.current_household_id()) = household_id) with check ((select public.current_household_id()) = household_id);
create policy third_parties_delete on public.third_parties for delete to authenticated using ((select public.current_household_id()) = household_id);

drop policy if exists third_party_expenses_select on public.third_party_expenses;
drop policy if exists third_party_expenses_insert on public.third_party_expenses;
drop policy if exists third_party_expenses_update on public.third_party_expenses;
drop policy if exists third_party_expenses_delete on public.third_party_expenses;
create policy third_party_expenses_select on public.third_party_expenses for select to authenticated using ((select public.current_household_id()) = household_id);
create policy third_party_expenses_insert on public.third_party_expenses for insert to authenticated with check ((select public.current_household_id()) = household_id);
create policy third_party_expenses_update on public.third_party_expenses for update to authenticated using ((select public.current_household_id()) = household_id) with check ((select public.current_household_id()) = household_id);
create policy third_party_expenses_delete on public.third_party_expenses for delete to authenticated using ((select public.current_household_id()) = household_id);

grant select, insert, update, delete on public.third_parties to authenticated;
grant select, insert, update, delete on public.third_party_expenses to authenticated;
