alter table public.transactions
  add column if not exists third_party_expense_id uuid references public.third_party_expenses(id) on delete set null;

create index if not exists idx_transactions_third_party_expense
  on public.transactions(third_party_expense_id);

update public.transactions t
set third_party_expense_id = e.id
from public.third_party_expenses e
join public.transactions linked on linked.id = e.transaction_id
where linked.source_type = 'INSTALLMENT'
  and linked.source_id is not null
  and t.source_type = 'INSTALLMENT'
  and t.source_id = linked.source_id
  and t.third_party_expense_id is null;

update public.transactions t
set third_party_expense_id = e.id
from public.third_party_expenses e
where e.transaction_id = t.id
  and t.third_party_expense_id is null;
