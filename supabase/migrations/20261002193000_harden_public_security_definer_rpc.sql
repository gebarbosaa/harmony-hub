-- Keep the household/investment RPCs available to signed-in users while removing
-- their implicit PUBLIC/anon EXECUTE privilege.
REVOKE EXECUTE ON FUNCTION public.create_household(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_household(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_household_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_household_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_household() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_household() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_household_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_household_permission(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.installment_invoice_period(uuid, date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.installment_invoice_period(uuid, date, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.join_household(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_household(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.record_investment_contribution(uuid, numeric, date, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_investment_contribution(uuid, numeric, date, uuid, uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.record_investment_redemption(uuid, numeric, date, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_investment_redemption(uuid, numeric, date, uuid, uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.rename_my_household(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_my_household(text) TO authenticated;
