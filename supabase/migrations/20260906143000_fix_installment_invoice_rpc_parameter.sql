-- Keep the RPC contract aligned with the frontend.
-- The function historically exposed p_installment_number while the app calls
-- p_installment_index. PostgreSQL identifies functions by types, so the
-- parameter name must be replaced by dropping/recreating the same signature.

drop function if exists public.installment_invoice_period(uuid, date, integer);

create function public.installment_invoice_period(
  p_card_id uuid,
  p_purchase_date date,
  p_installment_index integer
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_first_period date;
  v_household uuid := public.current_household_id();
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if p_installment_index < 1 then
    raise exception 'Número de parcela inválido';
  end if;

  if p_card_id is null then
    v_first_period := date_trunc('month', p_purchase_date)::date;
  else
    if v_household is null then
      raise exception 'HOUSEHOLD_NOT_FOUND';
    end if;

    if not exists (
      select 1
      from public.cards c
      where c.id = p_card_id
        and c.household_id = v_household
    ) then
      raise exception 'CARD_NOT_FOUND';
    end if;

    v_first_period := to_date(
      public.card_invoice_period(p_card_id, p_purchase_date) || '-01',
      'YYYY-MM-DD'
    );
  end if;

  return to_char(
    (v_first_period + ((p_installment_index - 1) * interval '1 month'))::date,
    'YYYY-MM'
  );
end;
$$;

revoke all on function public.installment_invoice_period(uuid, date, integer) from public, anon;
grant execute on function public.installment_invoice_period(uuid, date, integer) to authenticated;
