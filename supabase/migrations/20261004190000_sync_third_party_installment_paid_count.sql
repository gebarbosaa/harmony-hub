create or replace function private.sync_installment_paid_count_final()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if tg_op = 'UPDATE'
     and new.source_type = 'INSTALLMENT'
     and new.source_id is not null
     and old.paid is distinct from new.paid then
    select count(*)
      into v_count
      from public.transactions
     where household_id = new.household_id
       and source_type = 'INSTALLMENT'
       and source_id = new.source_id
       and paid;

    update public.installments
       set paid_count = least(v_count, installments_count)
     where id = new.source_id
       and household_id = new.household_id;
  end if;

  return new;
end;
$$;

update public.installments i
   set paid_count = least(
     (select count(*)
        from public.transactions t
       where t.household_id = i.household_id
         and t.source_type = 'INSTALLMENT'
         and t.source_id = i.id
         and t.paid),
     i.installments_count
   )
 where exists (
   select 1 from public.transactions t
    where t.source_type = 'INSTALLMENT'
      and t.source_id = i.id
 );
