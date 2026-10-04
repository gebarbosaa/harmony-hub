with links as (
  select e.id expense_id,i.id installment_id,row_number() over(partition by e.id order by i.purchase_date asc,i.id) rn
  from public.third_party_expenses e
  join public.installments i on i.household_id=e.household_id
   and upper(trim(i.name))=upper(trim(e.description))
   and i.total_amount=e.amount
   and i.responsible=(select tp.name from public.third_parties tp where tp.id=e.third_party_id)
  where e.transaction_id is null
)
update public.transactions t set third_party_expense_id=l.expense_id
from links l
where l.rn=1
  and t.household_id=(select e.household_id from public.third_party_expenses e where e.id=l.expense_id)
  and t.source_type='INSTALLMENT' and t.source_id=l.installment_id;

with links as (
  select e.id expense_id,i.id installment_id,row_number() over(partition by e.id order by i.purchase_date asc,i.id) rn
  from public.third_party_expenses e
  join public.installments i on i.household_id=e.household_id
   and upper(trim(i.name))=upper(trim(e.description))
   and i.total_amount=e.amount
   and i.responsible=(select tp.name from public.third_parties tp where tp.id=e.third_party_id)
  where e.transaction_id is null
)
update public.third_party_expenses e
set transaction_id=(select t.id from public.transactions t where t.household_id=e.household_id and t.source_type='INSTALLMENT' and t.source_id=links.installment_id and t.source_index=1 limit 1)
from links
where links.rn=1 and e.id=links.expense_id
and exists(select 1 from public.transactions t where t.household_id=e.household_id and t.source_type='INSTALLMENT' and t.source_id=links.installment_id and t.source_index=1);

update public.third_party_expenses e
set paid=not exists(
 select 1 from public.transactions t
 where t.household_id=e.household_id and t.source_type='INSTALLMENT'
   and t.source_id=(select t0.source_id from public.transactions t0 where t0.id=e.transaction_id)
   and not t.paid
)
where exists(select 1 from public.transactions t where t.id=e.transaction_id and t.source_type='INSTALLMENT');