-- Harden SECURITY DEFINER functions against search_path object shadowing.
-- Their table and helper references are schema-qualified; pg_catalog built-ins
-- remain available implicitly when search_path is empty.
alter function public.create_household(text, text) set search_path = '';
alter function public.current_household_id() set search_path = '';
alter function public.get_my_household() set search_path = '';
alter function public.has_household_permission(uuid, text) set search_path = '';
alter function public.installment_invoice_period(uuid, date, integer) set search_path = '';
alter function public.join_household(text, text) set search_path = '';
alter function public.record_investment_contribution(uuid, numeric, date, uuid, uuid, text, text) set search_path = '';
alter function public.record_investment_redemption(uuid, numeric, date, uuid, uuid, text, text) set search_path = '';
alter function public.rename_my_household(text) set search_path = '';
