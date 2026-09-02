-- Fix profile updates: the previous policy queried group_members, whose policies
-- can resolve through profiles/current_household_id and cause recursive RLS evaluation.
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());
