-- Remove an older policy that directly queried profiles from the profiles UPDATE policy,
-- which caused: infinite recursion detected in policy for relation "profiles".
drop policy if exists profiles_update_own_profile on public.profiles;
