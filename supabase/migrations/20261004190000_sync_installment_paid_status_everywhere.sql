create or replace function private.sync_installment_paid_count_final()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
  v_total int;
begin
  if tg_op = 'UPDATE'
     and new.source_type = 'INSTALLMENT'
     and new.source_id is not null
     and old.paid is distinct from new.paid then
    select count(*) into v_count
      from public.transactions
     where household_id = new.household_id
       and source_type = 'INSTALLMENT'
       and source_id = new.source_id
       and paid;
    select installments_count into v_total
      from public.installments
     where id = new.source_id
       and household_id = new.household_id;
    update public.installments
       set paid_count = least(coalesce(v_count,0), greatest(coalesce(v_total,1),1))
     where id = new.source_id
       and household_id = new.household_id;
    update public.third_party_expenses e
       set paid = (coalesce(v_count,0) >= greatest(coalesce(v_total,1),1))
     where e.household_id = new.household_id
       and e.transaction_id in (
         select t.id from public.transactions t
          where t.household_id = new.household_id
            and t.source_type = 'INSTALLMENT'
            and t.source_id = new.source_id
            and t.source_index = 1
       );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_installment_paid_count_final on public.transactions;
create trigger trg_sync_installment_paid_count_final
after update of paid on public.transactions
for each row
when (new.source_type = 'INSTALLMENT' and new.source_id is not null)
execute function private.sync_installment_paid_count_final();

update public.installments i
   set paid_count = least(
     (select count(*) from public.transactions t
       where t.household_id = i.household_id
         and t.source_type = 'INSTALLMENT'
         and t.source_id = i.id
         and t.paid),
     i.installments_count
   )
 where exists (
   select 1 from public.transactions t
    where t.household_id = i.household_id
      and t.source_type = 'INSTALLMENT'
      and t.source_id = i.id
 );

update public.third_party_expenses e
   set paid = case
     when t.source_type = 'INSTALLMENT' then not exists (
       select 1 from public.transactions ti
        where ti.household_id = t.household_id
          and ti.source_type = 'INSTALLMENT'
          and ti.source_id = t.source_id
          and not ti.paid
     )
     else coalesce(t.paid, e.paid)
   end
  from public.transactions t
 where t.id = e.transaction_id
   and e.household_id = t.household_id;