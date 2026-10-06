-- Canonical credit-card closing/invoice/installation synchronization.
-- The invoice period is always derived from the card closing day.
-- Installment-generated transaction dates are kept inside their target invoice period.

create or replace function private.installment_invoice_period_final(p_card_id uuid,p_purchase_date date,p_installment_index integer)
returns text language plpgsql stable security definer set search_path=''
as $$
declare v_first_period date;
begin
  if p_installment_index < 1 then raise exception 'INVALID_INSTALLMENT_INDEX'; end if;
  if p_card_id is null then v_first_period:=date_trunc('month',p_purchase_date)::date;
  else
    if not exists(select 1 from public.cards c where c.id=p_card_id) then raise exception 'CARD_NOT_FOUND'; end if;
    v_first_period:=to_date(public.card_invoice_period(p_card_id,p_purchase_date)||'-01','YYYY-MM-DD');
  end if;
  return to_char((v_first_period+((p_installment_index-1)*interval '1 month'))::date,'YYYY-MM');
end;
$$;

create or replace function public.installment_invoice_period(p_card_id uuid,p_purchase_date date,p_installment_index integer)
returns text language plpgsql stable security definer set search_path='public'
as $$
declare v_household uuid:=public.current_household_id();
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if p_card_id is null then return to_char(date_trunc('month',p_purchase_date)::date,'YYYY-MM'); end if;
  if v_household is null then raise exception 'HOUSEHOLD_NOT_FOUND'; end if;
  if not exists(select 1 from public.cards c where c.id=p_card_id and c.household_id=v_household) then raise exception 'CARD_NOT_FOUND'; end if;
  return private.installment_invoice_period_final(p_card_id,p_purchase_date,p_installment_index);
end;
$$;

create or replace function private.sync_installment_transactions_final()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  v_count int; v_idx int; v_amount numeric; v_date date; v_day int;
  v_month_start date; v_days_in_month int; v_first_period date;
  v_target_period date; v_close_day int;
begin
  if tg_op in ('UPDATE','DELETE') then
    delete from public.transactions
    where household_id=old.household_id and source_type='INSTALLMENT' and source_id=old.id;
  end if;

  if tg_op<>'DELETE' then
    v_count:=greatest(new.installments_count,1);
    v_day:=extract(day from new.purchase_date)::int;

    if new.card_id is not null then
      v_first_period:=to_date(private.installment_invoice_period_final(new.card_id,new.purchase_date,1)||'-01','YYYY-MM-DD');
      select close_day into v_close_day from public.cards where id=new.card_id;
    else
      v_first_period:=date_trunc('month',new.purchase_date)::date;
      v_close_day:=null;
    end if;

    for v_idx in 1..v_count loop
      if v_idx=1 then
        v_date:=new.purchase_date;
      else
        v_target_period:=(v_first_period+make_interval(months=>v_idx-1))::date;
        v_month_start:=date_trunc('month',v_target_period)::date;
        v_days_in_month:=extract(day from ((v_month_start+interval '1 month')::date-1))::int;
        v_date:=v_month_start+(least(v_day,coalesce(v_close_day,v_days_in_month),v_days_in_month)-1);
      end if;

      v_amount:=case when v_idx<v_count then round((new.total_amount/v_count)::numeric,2)
        else new.total_amount-round((new.total_amount/v_count)::numeric,2)*(v_count-1) end;

      insert into public.transactions(
        household_id,date,description,amount,type,category,pay_method,card_name,responsible,
        installment_current,installment_total,is_fixed,paid,payment_method_name,payment_method_id,
        card_id,source_type,source_id,source_index,source_total,source_period
      ) values (
        new.household_id,v_date,new.name,v_amount,'DESPESA',new.category,new.pay_method,new.card_name,
        new.responsible,v_idx,v_count,false,v_idx<=greatest(new.paid_count,0),
        new.payment_method_name,new.payment_method_id,new.card_id,'INSTALLMENT',new.id,v_idx,v_count,
        private.installment_invoice_period_final(new.card_id,new.purchase_date,v_idx)
      )
      on conflict (household_id,source_type,source_id,source_index)
      where source_type is not null and source_id is not null and source_index is not null
      do update set
        date=excluded.date,description=excluded.description,amount=excluded.amount,category=excluded.category,
        pay_method=excluded.pay_method,card_name=excluded.card_name,responsible=excluded.responsible,
        installment_current=excluded.installment_current,installment_total=excluded.installment_total,
        paid=excluded.paid,payment_method_name=excluded.payment_method_name,
        payment_method_id=excluded.payment_method_id,card_id=excluded.card_id,
        source_total=excluded.source_total,source_period=excluded.source_period;
    end loop;
  end if;
  return coalesce(new,old);
end;
$$;

create or replace function public.sync_installment_invoice_after()
returns trigger language plpgsql security definer set search_path='public'
as $$
declare v_n int; v_idx int; v_period text;
begin
  if tg_op in ('UPDATE','DELETE') and old.card_id is not null then
    v_n:=greatest(old.installments_count,1);
    for v_idx in 1..v_n loop
      v_period:=private.installment_invoice_period_final(old.card_id,old.purchase_date,v_idx);
      perform private.sync_card_invoice_final(old.household_id,old.card_id,v_period);
    end loop;
  end if;
  if tg_op<>'DELETE' and new.card_id is not null and new.pay_method='CREDITO' then
    v_n:=greatest(new.installments_count,1);
    for v_idx in 1..v_n loop
      v_period:=private.installment_invoice_period_final(new.card_id,new.purchase_date,v_idx);
      perform private.sync_card_invoice_final(new.household_id,new.card_id,v_period);
    end loop;
  end if;
  return coalesce(new,old);
end;
$$;

create or replace function public.sync_card_invoice(p_household_id uuid,p_card_id uuid,p_period text)
returns void language plpgsql security definer set search_path='public'
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_household_id is null or p_card_id is null or p_period is null then return; end if;
  if p_household_id<>public.current_household_id() then raise exception 'FORBIDDEN'; end if;
  if not public.has_household_permission(p_household_id,'UPDATE') then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.cards c where c.id=p_card_id and c.household_id=p_household_id) then raise exception 'INVALID_CARD'; end if;
  perform private.sync_card_invoice_final(p_household_id,p_card_id,p_period);
end;
$$;

create or replace function private.sync_card_invoices_after_close_change()
returns trigger language plpgsql security definer set search_path=''
as $$
declare r record;
begin
  if old.close_day is distinct from new.close_day then
    for r in
      select distinct household_id,card_id,public.card_invoice_period(new.id,date) period
      from public.transactions
      where household_id=new.household_id and card_id=new.id and type='DESPESA'
      union
      select household_id,card_id,period
      from public.invoices
      where household_id=new.household_id and card_id=new.id
    loop
      perform private.sync_card_invoice_final(r.household_id,r.card_id,r.period);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_card_invoices_after_close_change on public.cards;
create trigger trg_sync_card_invoices_after_close_change
after update of close_day on public.cards
for each row execute function private.sync_card_invoices_after_close_change();

update public.installments set updated_at=now() where id is not null;

do $$
declare r record;
begin
  for r in select distinct household_id,card_id,period from public.invoices where card_id is not null loop
    perform private.sync_card_invoice_final(r.household_id,r.card_id,r.period);
  end loop;
end $$;
