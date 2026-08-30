-- Atomic, ledger-integrated investment contributions (aportes) and redemptions (resgates).
-- Mirrors the pattern already used for installments/fixed costs: a single
-- SECURITY DEFINER function performs the balance change and the linked
-- transaction insert together, so the two can never desync.

create or replace function public.record_investment_contribution(
  p_investment_id uuid,
  p_amount numeric,
  p_date date default current_date,
  p_payment_method_id uuid default null,
  p_account_id uuid default null,
  p_responsible text default 'AMBAS',
  p_description text default null
) returns public.transactions
language plpgsql security definer set search_path = public as $$
declare
  v_household uuid := public.current_household_id();
  v_inv public.investments%rowtype;
  v_payment_kind public.pay_method := 'TRANSFERENCIA'::public.pay_method;
  v_payment_name text := null;
  v_payment_account_id uuid := null;
  v_next_index int;
  v_tx public.transactions;
begin
  if v_household is null then raise exception 'HOUSEHOLD_NOT_FOUND'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  select * into v_inv from public.investments
    where id = p_investment_id and household_id = v_household for update;
  if v_inv.id is null then raise exception 'INVESTMENT_NOT_FOUND'; end if;

  if p_payment_method_id is not null then
    select kind, name, account_id into v_payment_kind, v_payment_name, v_payment_account_id
      from public.household_payment_methods
      where id = p_payment_method_id and household_id = v_household;
    if not found then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  end if;

  update public.investments
    set invested = invested + p_amount,
        current_value = current_value + p_amount,
        updated_at = now()
    where id = v_inv.id;

  select coalesce(max(source_index), 0) + 1 into v_next_index
    from public.transactions where household_id = v_household
    and source_type = 'INVESTMENT' and source_id = v_inv.id;

  insert into public.transactions(
    household_id, date, description, amount, type, category, pay_method,
    responsible, paid, payment_method_id, payment_method_name, account_id,
    source_type, source_id, source_index
  ) values (
    v_household, coalesce(p_date, current_date),
    coalesce(nullif(trim(p_description), ''), 'APORTE — ' || v_inv.name),
    p_amount, 'INVESTIMENTO', 'APORTE DE INVESTIMENTO', v_payment_kind,
    coalesce(nullif(trim(p_responsible), ''), 'AMBAS'),
    true, p_payment_method_id, v_payment_name, coalesce(p_account_id, v_payment_account_id),
    'INVESTMENT', v_inv.id, v_next_index
  ) returning * into v_tx;

  return v_tx;
end; $$;
revoke all on function public.record_investment_contribution(uuid,numeric,date,uuid,uuid,text,text) from public, anon;
grant execute on function public.record_investment_contribution(uuid,numeric,date,uuid,uuid,text,text) to authenticated;

create or replace function public.record_investment_redemption(
  p_investment_id uuid,
  p_amount numeric,
  p_date date default current_date,
  p_payment_method_id uuid default null,
  p_account_id uuid default null,
  p_responsible text default 'AMBAS',
  p_description text default null
) returns public.transactions
language plpgsql security definer set search_path = public as $$
declare
  v_household uuid := public.current_household_id();
  v_inv public.investments%rowtype;
  v_payment_kind public.pay_method := 'TRANSFERENCIA'::public.pay_method;
  v_payment_name text := null;
  v_payment_account_id uuid := null;
  v_next_index int;
  v_tx public.transactions;
begin
  if v_household is null then raise exception 'HOUSEHOLD_NOT_FOUND'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  select * into v_inv from public.investments
    where id = p_investment_id and household_id = v_household for update;
  if v_inv.id is null then raise exception 'INVESTMENT_NOT_FOUND'; end if;
  if p_amount > v_inv.current_value then raise exception 'AMOUNT_EXCEEDS_BALANCE'; end if;

  if p_payment_method_id is not null then
    select kind, name, account_id into v_payment_kind, v_payment_name, v_payment_account_id
      from public.household_payment_methods
      where id = p_payment_method_id and household_id = v_household;
    if not found then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  end if;

  update public.investments
    set current_value = current_value - p_amount,
        updated_at = now()
    where id = v_inv.id;

  select coalesce(max(source_index), 0) + 1 into v_next_index
    from public.transactions where household_id = v_household
    and source_type = 'INVESTMENT_REDEMPTION' and source_id = v_inv.id;

  insert into public.transactions(
    household_id, date, description, amount, type, category, pay_method,
    responsible, paid, payment_method_id, payment_method_name, account_id,
    source_type, source_id, source_index
  ) values (
    v_household, coalesce(p_date, current_date),
    coalesce(nullif(trim(p_description), ''), 'RESGATE — ' || v_inv.name),
    p_amount, 'RECEITA', 'RESGATE DE INVESTIMENTO', v_payment_kind,
    coalesce(nullif(trim(p_responsible), ''), 'AMBAS'),
    true, p_payment_method_id, v_payment_name, coalesce(p_account_id, v_payment_account_id),
    'INVESTMENT_REDEMPTION', v_inv.id, v_next_index
  ) returning * into v_tx;

  return v_tx;
end; $$;
revoke all on function public.record_investment_redemption(uuid,numeric,date,uuid,uuid,text,text) from public, anon;
grant execute on function public.record_investment_redemption(uuid,numeric,date,uuid,uuid,text,text) to authenticated;

-- Atomic delete: removes the investment and every transaction generated from it
-- in one transaction, so a client-side failure can never leave orphaned rows.
create or replace function public.delete_investment(p_investment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_household uuid := public.current_household_id();
begin
  if v_household is null then raise exception 'HOUSEHOLD_NOT_FOUND'; end if;
  delete from public.transactions
    where household_id = v_household and source_id = p_investment_id
    and source_type in ('INVESTMENT','INVESTMENT_REDEMPTION');
  delete from public.investments where id = p_investment_id and household_id = v_household;
end; $$;
revoke all on function public.delete_investment(uuid) from public, anon;
grant execute on function public.delete_investment(uuid) to authenticated;
