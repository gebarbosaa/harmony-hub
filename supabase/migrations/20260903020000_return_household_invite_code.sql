begin;

drop function if exists public.create_household(text, text);
create or replace function public.create_household(household_name text, my_name text)
returns table (household_id uuid, invite_code text)
language plpgsql security definer set search_path = public
as $$
declare new_id uuid; code text; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Não autenticado'; end if;
  if nullif(trim(household_name),'') is null then raise exception 'NOME_DO_GRUPO_OBRIGATORIO'; end if;
  loop
    code := upper(substring(replace(gen_random_uuid()::text,'-','') from 1 for 6));
    exit when not exists(select 1 from public.households where invite_code=code);
  end loop;
  insert into public.households(name,invite_code) values(trim(household_name),code) returning id into new_id;
  insert into public.profiles(id,household_id,name,initials)
  values(uid,new_id,upper(coalesce(nullif(trim(my_name),''),'USUÁRIO')),upper(substring(coalesce(nullif(trim(my_name),''),'US') from 1 for 2)))
  on conflict(id) do update set household_id=excluded.household_id,name=excluded.name,initials=excluded.initials,updated_at=now();
  insert into public.group_members(household_id,user_id,role,status) values(new_id,uid,'OWNER','ACTIVE')
  on conflict(household_id,user_id) do update set role='OWNER',status='ACTIVE',updated_at=now();
  return query select new_id, code;
end;
$$;
revoke all on function public.create_household(text,text) from public;
grant execute on function public.create_household(text,text) to authenticated;

commit;
