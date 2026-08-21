create or replace function public.manage_household_data(p_action text, p_confirmation text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_household_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if upper(coalesce(p_confirmation, '')) <> 'EXCLUIR' then
    raise exception 'CONFIRMATION_REQUIRED';
  end if;

  select household_id into v_household_id from public.profiles where id = v_user_id;
  if v_household_id is null then
    raise exception 'HOUSEHOLD_NOT_FOUND';
  end if;

  if p_action = 'clear_transactions' then
    delete from public.transactions where household_id = v_household_id;
    return 'TRANSACTIONS_CLEARED';
  end if;

  if p_action in ('delete_all_data', 'factory_reset') then
    delete from public.shopping_items where household_id = v_household_id;
    delete from public.fixed_cost_payments where household_id = v_household_id;
    delete from public.habit_logs where household_id = v_household_id;
    delete from public.invoices where household_id = v_household_id;
    delete from public.transactions where household_id = v_household_id;
    delete from public.budgets where household_id = v_household_id;
    delete from public.cards where household_id = v_household_id;
    delete from public.categories where household_id = v_household_id;
    delete from public.fixed_costs where household_id = v_household_id;
    delete from public.goals where household_id = v_household_id;
    delete from public.habits where household_id = v_household_id;
    delete from public.installments where household_id = v_household_id;
    delete from public.investments where household_id = v_household_id;
    delete from public.payment_methods where household_id = v_household_id;
    delete from public.reminders where household_id = v_household_id;
    delete from public.shopping_lists where household_id = v_household_id;
    delete from public.tasks where household_id = v_household_id;

    if p_action = 'factory_reset' then
      insert into public.categories (household_id, name, kind)
      values
        (v_household_id, 'MORADIA', 'DESPESA'),
        (v_household_id, 'ALIMENTAÇÃO', 'DESPESA'),
        (v_household_id, 'TRANSPORTE', 'DESPESA'),
        (v_household_id, 'LAZER', 'DESPESA'),
        (v_household_id, 'SAÚDE', 'DESPESA'),
        (v_household_id, 'IMPOSTOS', 'DESPESA'),
        (v_household_id, 'RENDA', 'RECEITA');

      insert into public.payment_methods (household_id, name, kind)
      values
        (v_household_id, 'PIX', 'PIX'::public.pay_method),
        (v_household_id, 'DÉBITO', 'DEBITO'::public.pay_method),
        (v_household_id, 'CARTÃO', 'CREDITO'::public.pay_method),
        (v_household_id, 'BOLETO', 'BOLETO'::public.pay_method),
        (v_household_id, 'DINHEIRO', 'DINHEIRO'::public.pay_method);
    end if;

    return case when p_action = 'factory_reset' then 'FACTORY_RESET' else 'ALL_DATA_DELETED' end;
  end if;

  raise exception 'INVALID_ACTION';
end;
$$;

revoke execute on function public.manage_household_data(text, text) from public;
revoke execute on function public.manage_household_data(text, text) from anon;
grant execute on function public.manage_household_data(text, text) to authenticated;
