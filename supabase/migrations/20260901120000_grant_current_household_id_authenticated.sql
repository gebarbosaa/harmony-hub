begin;

grant execute on function public.current_household_id() to authenticated;

commit;
