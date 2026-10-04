alter table public.third_party_expenses
  add column if not exists paid boolean not null default true;

create index if not exists idx_third_party_expenses_paid
  on public.third_party_expenses(household_id, paid, date desc);

update public.third_party_expenses e
set paid = coalesce(t.paid, e.paid)
from public.transactions t
where t.id = e.transaction_id;
