begin;

create or replace function public.has_household_permission(p_household_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.household_id = p_household_id and p.household_id is not null);
$$;
revoke all on function public.has_household_permission(uuid, text) from public;
grant execute on function public.has_household_permission(uuid, text) to authenticated;

drop function if exists public.join_household(text, text);
drop function if exists public.switch_household(uuid);
drop function if exists public.get_my_household();
drop function if exists public.delete_household(uuid);
drop table if exists public.group_members cascade;
drop view if exists public.household_members cascade;

drop table if exists public.google_calendar_event_links cascade;
drop table if exists public.google_calendar_connections cascade;
drop table if exists public.calendar_events cascade;
drop table if exists public.reminders cascade;
drop table if exists public.tasks cascade;
drop table if exists public.domestic_tasks cascade;
drop table if exists public.habit_logs cascade;
drop table if exists public.habits cascade;
drop table if exists public.shopping_items cascade;
drop table if exists public.shopping_lists cascade;
drop table if exists public.harmony_notes cascade;
drop type if exists public.privacy_level cascade;
drop type if exists public.task_quadrant cascade;

drop function if exists public.create_household(text, text);
create or replace function public.create_household(household_name text, my_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid; code text; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Não autenticado'; end if;
  if exists (select 1 from public.profiles where id = uid and household_id is not null) then raise exception 'VOCÊ JÁ POSSUI UM ESPAÇO FINANCEIRO'; end if;
  if nullif(trim(household_name), '') is null then raise exception 'NOME_DO_ESPACO_FINANCEIRO_OBRIGATORIO'; end if;
  loop
    code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  insert into public.households(name, invite_code) values (trim(household_name), code) returning id into new_id;
  insert into public.profiles(id, household_id, name, initials)
  values (uid, new_id, upper(coalesce(nullif(trim(my_name), ''), 'USUÁRIO')), upper(substring(coalesce(nullif(trim(my_name), ''), 'US') from 1 for 2)))
  on conflict (id) do update set household_id = new_id, name = excluded.name, updated_at = now();
  return new_id;
end;
$$;
revoke all on function public.create_household(text, text) from public;
grant execute on function public.create_household(text, text) to authenticated;

commit;
