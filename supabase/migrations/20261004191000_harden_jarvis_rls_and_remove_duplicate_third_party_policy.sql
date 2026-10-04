drop policy if exists "household third parties" on public.third_parties;

drop policy if exists jarvis_integrations_insert on public.jarvis_integrations;
drop policy if exists jarvis_integrations_select on public.jarvis_integrations;
drop policy if exists jarvis_integrations_update on public.jarvis_integrations;

create policy jarvis_integrations_insert
on public.jarvis_integrations
for insert to authenticated
with check (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = jarvis_integrations.household_id
      and hm.user_id = (select auth.uid())
  )
);

create policy jarvis_integrations_select
on public.jarvis_integrations
for select to authenticated
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = jarvis_integrations.household_id
      and hm.user_id = (select auth.uid())
  )
);

create policy jarvis_integrations_update
on public.jarvis_integrations
for update to authenticated
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = jarvis_integrations.household_id
      and hm.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = jarvis_integrations.household_id
      and hm.user_id = (select auth.uid())
  )
);