drop policy if exists calendar_events_insert on public.calendar_events;
create policy calendar_events_insert on public.calendar_events
for insert to authenticated
with check (household_id=public.current_household_id() and owner_id=(select auth.uid()));
