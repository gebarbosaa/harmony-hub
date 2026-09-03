begin;

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('OWNER','ADMIN','EDITOR','MEMBER','VIEWER')),
  status text not null default 'ACTIVE' check (status in ('INVITED','ACTIVE','SUSPENDED')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create index if not exists group_members_user_idx on public.group_members(user_id);
create index if not exists group_members_household_role_idx on public.group_members(household_id, role);

insert into public.group_members (household_id, user_id, role, status, joined_at)
select p.household_id, p.id, 'OWNER', 'ACTIVE', coalesce(p.created_at, now())
from public.profiles p
where p.household_id is not null
  and not exists (
    select 1 from public.group_members gm
    where gm.household_id = p.household_id and gm.user_id = p.id
  );

create or replace function public.has_household_permission(p_household_id uuid, p_permission text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.household_id = p_household_id
      and gm.user_id = auth.uid()
      and gm.status = 'ACTIVE'
      and case
        when gm.role in ('OWNER','ADMIN') then true
        when gm.role = 'EDITOR' and p_permission in ('SELECT','INSERT','UPDATE') then true
        when gm.role = 'MEMBER' and p_permission in ('SELECT','INSERT') then true
        when gm.role = 'VIEWER' and p_permission = 'SELECT' then true
        when p_permission = 'MANAGE_MEMBERS' and gm.role in ('OWNER','ADMIN') then true
        else false
      end
  );
$$;
revoke all on function public.has_household_permission(uuid,text) from public;
grant execute on function public.has_household_permission(uuid,text) to authenticated;

alter table public.group_members enable row level security;
drop policy if exists group_members_select on public.group_members;
drop policy if exists group_members_insert on public.group_members;
drop policy if exists group_members_update on public.group_members;
drop policy if exists group_members_delete on public.group_members;
create policy group_members_select on public.group_members for select to authenticated using (household_id = public.current_household_id());
create policy group_members_insert on public.group_members for insert to authenticated with check (household_id = public.current_household_id() and public.has_household_permission(household_id,'MANAGE_MEMBERS'));
create policy group_members_update on public.group_members for update using (household_id = public.current_household_id() and public.has_household_permission(household_id,'MANAGE_MEMBERS')) with check (household_id = public.current_household_id() and public.has_household_permission(household_id,'MANAGE_MEMBERS'));
create policy group_members_delete on public.group_members for delete using (household_id = public.current_household_id() and public.has_household_permission(household_id,'MANAGE_MEMBERS'));

create or replace function public.create_household(household_name text, my_name text)
returns uuid language plpgsql security definer set search_path = public
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
  return new_id;
end;
$$;
revoke all on function public.create_household(text,text) from public;
grant execute on function public.create_household(text,text) to authenticated;

commit;
