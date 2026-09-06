-- accounts_payable ledger synchronization must be AFTER-trigger based because it writes transactions.
-- pg_trigger_depth prevents the internal link update from recursively running the sync logic.
create or replace function private.sync_accounts_payable_transaction() returns trigger
language plpgsql security definer set search_path='public,pg_catalog' as $$
declare v_tx uuid; v_date date;
begin
  if pg_trigger_depth()>1 then return coalesce(new,old); end if;
  if tg_op in ('UPDATE','DELETE') and old.linked_transaction_id is not null then
    if tg_op='DELETE' or new.status<>'PAGA' then
      delete from public.transactions
        where id=old.linked_transaction_id and household_id=old.household_id
          and source_type='ACCOUNTS_PAYABLE' and source_id=old.id;
      if tg_op<>'DELETE' then
        update public.accounts_payable set linked_transaction_id=null,updated_at=now()
          where id=old.id and household_id=old.household_id;
      end if;
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  if new.status<>'PAGA' then return new; end if;
  v_date:=coalesce(new.paid_at::date,new.due_date,current_date);
  if new.linked_transaction_id is not null then
    update public.transactions set
      date=v_date,description=new.description,amount=new.amount,category=new.category,
      responsible=new.responsible,paid=true,payment_method_id=new.payment_method_id,
      card_id=new.card_id,account_id=new.account_id,
      payment_method_name=(select hpm.name from public.household_payment_methods hpm where hpm.id=new.payment_method_id),
      pay_method=coalesce((select hpm.kind from public.household_payment_methods hpm where hpm.id=new.payment_method_id),pay_method),
      card_name=(select c.name from public.cards c where c.id=new.card_id),updated_at=now()
      where id=new.linked_transaction_id and household_id=new.household_id
        and source_type='ACCOUNTS_PAYABLE' and source_id=new.id;
    if found then return new; end if;
  end if;
  insert into public.transactions(
    household_id,date,description,amount,type,category,pay_method,card_name,responsible,paid,
    payment_method_name,payment_method_id,card_id,account_id,source_type,source_id,source_index,source_total,source_period
  ) values (
    new.household_id,v_date,new.description,new.amount,'DESPESA',new.category,
    coalesce((select hpm.kind from public.household_payment_methods hpm where hpm.id=new.payment_method_id),'BOLETO'),
    (select c.name from public.cards c where c.id=new.card_id),new.responsible,true,
    (select hpm.name from public.household_payment_methods hpm where hpm.id=new.payment_method_id),
    new.payment_method_id,new.card_id,new.account_id,'ACCOUNTS_PAYABLE',new.id,1,1,to_char(v_date,'YYYY-MM')
  ) returning id into v_tx;
  update public.accounts_payable set linked_transaction_id=v_tx,updated_at=now()
    where id=new.id and household_id=new.household_id;
  return new;
end;
$$;
drop trigger if exists trg_sync_accounts_payable_transaction on public.accounts_payable;
create trigger trg_sync_accounts_payable_transaction
after insert or update or delete on public.accounts_payable
for each row execute function private.sync_accounts_payable_transaction();
