alter table public.transactions
  add column if not exists third_party_expense_id uuid references public.third_party_expenses(id) on delete set null;

create index if not exists idx_transactions_third_party_expense
  on public.transactions(third_party_expense_id);