begin;

create or replace function public.business_consume_recipe_for_production()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  item record;
  v_recipe_id uuid;
  v_yield numeric;
  needed numeric;
  total_cost numeric := 0;
  item_count integer := 0;
begin
  select p.recipe_id into v_recipe_id
  from public.business_products p
  where p.id = new.product_id
    and p.household_id = new.household_id
    and p.business_id = new.business_id;

  if v_recipe_id is null then
    raise exception 'RECEITA_OBRIGATORIA: o produto precisa estar vinculado a uma receita';
  end if;

  select r.yield_quantity into v_yield
  from public.business_recipes r
  where r.id = v_recipe_id
    and r.household_id = new.household_id
    and r.business_id = new.business_id;

  if coalesce(v_yield, 0) <= 0 then
    raise exception 'RENDIMENTO_INVALIDO: a receita precisa ter rendimento maior que zero';
  end if;

  for item in
    select ri.ingredient_id, ri.quantity, ri.waste_percent, i.stock_quantity, i.cost_per_base_unit
    from public.business_recipe_items ri
    join public.business_ingredients i
      on i.id = ri.ingredient_id
     and i.household_id = new.household_id
     and i.business_id = new.business_id
    where ri.recipe_id = v_recipe_id
      and ri.household_id = new.household_id
      and ri.business_id = new.business_id
  loop
    item_count := item_count + 1;
    needed := (item.quantity / v_yield) * new.quantity * (1 + item.waste_percent / 100);

    if item.stock_quantity < needed then
      raise exception 'ESTOQUE_INSUFICIENTE: ingrediente % precisa de %, disponível %', item.ingredient_id, needed, item.stock_quantity;
    end if;

    update public.business_ingredients
      set stock_quantity = stock_quantity - needed, updated_at = now()
    where id = item.ingredient_id
      and household_id = new.household_id
      and business_id = new.business_id;

    insert into public.business_stock_movements(
      household_id,business_id,ingredient_id,movement_type,quantity,unit_cost,reference_id,description
    ) values (
      new.household_id,new.business_id,item.ingredient_id,'PRODUCAO',-needed,item.cost_per_base_unit,new.id,'Consumo da produção'
    );

    total_cost := total_cost + needed * item.cost_per_base_unit;
  end loop;

  if item_count = 0 then
    raise exception 'RECEITA_SEM_INGREDIENTES: a receita precisa ter pelo menos um ingrediente';
  end if;

  new.total_cost := total_cost;
  return new;
end
$$;

create or replace function public.business_sync_sale_cash()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.business_cash_entries
    where household_id = old.household_id
      and business_id = old.business_id
      and source_type = 'VENDA'
      and source_id = old.id;
    return old;
  end if;

  insert into public.business_cash_entries(
    household_id,business_id,entry_date,description,entry_type,category,amount,source_type,source_id
  ) values (
    new.household_id,new.business_id,new.sale_date,
    coalesce(nullif(trim(new.customer_name),''),'VENDA') || ' — VENDA',
    'ENTRADA','VENDAS',new.total_amount,'VENDA',new.id
  );

  return new;
end
$$;

drop trigger if exists business_sync_sale_cash on public.business_sales;
create trigger business_sync_sale_cash
after insert on public.business_sales
for each row execute function public.business_sync_sale_cash();

revoke execute on function public.business_sync_sale_cash() from public, anon, authenticated;

commit;
