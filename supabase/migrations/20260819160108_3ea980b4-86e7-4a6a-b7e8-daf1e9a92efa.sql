
REVOKE ALL ON FUNCTION public.current_household_id() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_household_id() TO authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_household(text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.join_household(text, text) FROM public, anon;
