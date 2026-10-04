-- Restore links between third-party expenses and their installment transactions.
-- Some older third-party installment records had transaction_id = NULL,
-- even though their matching installment existed.

with links as (
  select
    e.id as expense_id,
    i.id as installment_id
  from public.third_party_expenses e
  join public.installments i
    on i.household_id = e.household_id
   and upper(trim(i.name)) = upper(trim(e.description))
   and i.total_amount = e.amount
   and i.responsible = (
     select tp.name
     from public.third_parties tp
     where tp.id = e.third_party_id
   )
  where e.transaction_id is null
)
update public.transactions t
set third_party_expense_id = l.expense_id
from links l
where t.source_type = 'INSTALLMENT'
  and t.source_id = l.installment_id;

with links as (
  select
    e.id as expense_id,
    i.id as installment_id
  from public.third_party_expenses e
  join public.installments i
    on i.household_id = e.household_id
   and upper(trim(i.name)) = upper(trim(e.description))
   and i.total_amount = e.amount
   and i.responsible = (
     select tp.name
     from public.third_parties tp
     where tp.id = e.third_party_id
   )
  where e.transaction_id is null
)
update public.third_party_expenses e
set transaction_id = (
  select t.id
  from public.transactions t
  where t.source_type = 'INSTALLMENT'
    and t.source_id = links.installment_id
    and t.source_index = 1
  limit 1
)
from links
where e.id = links.expense_id;
