create or replace function public.sync_installment_invoice_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_start date;
  v_n int;
  v_idx int;
  v_period text;
begin
  if tg_op in ('UPDATE','DELETE') and old.card_id is not null then
    v_start := old.purchase_date;
    v_n := greatest(old.installments_count,1);
    for v_idx in 0..v_n-1 loop
      v_period := to_char((date_trunc('month',v_start)::date + make_interval(months=>v_idx)),'YYYY-MM-DD');
      v_period := left(v_period,7);
      perform private.sync_card_invoice_final(old.household_id, old.card_id, v_period);
    end loop;
  end if;

  if tg_op <> 'DELETE' and new.card_id is not null and new.pay_method='CREDITO' then
    v_start := new.purchase_date;
    v_n := greatest(new.installments_count,1);
    for v_idx in 0..v_n-1 loop
      v_period := to_char((date_trunc('month',v_start)::date + make_interval(months=>v_idx)),'YYYY-MM');
      perform private.sync_card_invoice_final(new.household_id, new.card_id, v_period);
    end loop;
  end if;

  return coalesce(new,old);
end;
$function$;
