begin;

-- Group membership must be visible to the authenticated user for every group
-- they belong to, not only the currently selected household.
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
for select to authenticated
using (user_id = auth.uid() or household_id = public.current_household_id());

-- A user may switch only to a household in which they have an active membership.
create or replace function public.switch_household(p_household_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Não autenticado'; end if;

  if not exists (
    select 1 from public.group_members gm
    where gm.household_id = p_household_id
      and gm.user_id = uid
      and gm.status = 'ACTIVE'
  ) then
    raise exception 'Você não pertence a este grupo';
  end if;

  update public.profiles
  set household_id = p_household_id,
      updated_at = now()
  where id = uid;

  return p_household_id;
end;
$$;

revoke all on function public.switch_household(uuid) from public;
grant execute on function public.switch_household(uuid) to authenticated;

-- Prevent direct client-side reassignment of a profile to an arbitrary household.
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and (
    household_id is null
    or exists (
      select 1 from public.group_members gm
      where gm.household_id = profiles.household_id
        and gm.user_id = auth.uid()
        and gm.status = 'ACTIVE'
    )
  )
);

commit;
