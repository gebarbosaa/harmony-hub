begin;

-- The app no longer exposes group/household management. Disable the legacy RPC endpoints
-- so an authenticated user cannot join/switch into another household or invoke destructive
-- household operations through the Data API.
revoke all on function public.create_household(text, text) from public, anon, authenticated;
revoke all on function public.join_household(text, text) from public, anon, authenticated;
revoke all on function public.switch_household(uuid) from public, anon, authenticated;
revoke all on function public.delete_household(uuid) from public, anon, authenticated;

-- This function is SECURITY DEFINER because it reads card configuration outside the caller's
-- normal table privileges. Enforce ownership through the caller's current household before
-- using any card data, preventing cross-household probing by card UUID.
create or replace function public.installment_invoice_period(
  p_card_id uuid,
  p_purchase_date date,
  p_installment_number integer
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

  if p_installment_number < 1 then
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
    (v_first_period + ((p_installment_number - 1) * interval '1 month'))::date,
    'YYYY-MM'
  );
end;
$$;

revoke all on function public.installment_invoice_period(uuid, date, integer) from public, anon;
grant execute on function public.installment_invoice_period(uuid, date, integer) to authenticated;

commit;
