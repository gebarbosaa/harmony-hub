create or replace function private.sync_card_payment_method() returns trigger language plpgsql security definer set search_path='' as $$
declare
  v_payment_id uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.household_payment_methods
    where household_id = old.household_id and card_id = old.id;
    return old;
  end if;

  select id into v_payment_id
  from public.household_payment_methods
  where household_id = new.household_id and card_id = new.id
  limit 1;

  if v_payment_id is null then
    select id into v_payment_id
    from public.household_payment_methods
    where household_id = new.household_id
      and upper(name) = upper(new.name)
      and kind = 'CREDITO'
      and card_id is null
    limit 1;
  end if;

  if v_payment_id is null then
    insert into public.household_payment_methods (household_id, name, description, kind, card_id)
    values (new.household_id, new.name, 'CARTÃO DE CRÉDITO', 'CREDITO', new.id);
  else
    update public.household_payment_methods
    set name = new.name,
        kind = 'CREDITO',
        card_id = new.id,
        description = coalesce(description, 'CARTÃO DE CRÉDITO')
    where id = v_payment_id and household_id = new.household_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_card_payment_method on public.cards;
create trigger trg_sync_card_payment_method
after insert or update or delete on public.cards
for each row execute function private.sync_card_payment_method();

do $$
declare
  c record;
  p_id uuid;
begin
  for c in select id, household_id, name from public.cards loop
    select id into p_id
    from public.household_payment_methods
    where household_id = c.household_id and card_id = c.id
    limit 1;
    if p_id is null then
      insert into public.household_payment_methods (household_id, name, description, kind, card_id)
      values (c.household_id, c.name, 'CARTÃO DE CRÉDITO', 'CREDITO', c.id);
    end if;
  end loop;
end $$;
