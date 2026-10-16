-- Run only after applying the SECURITY DEFINER hardening migration in a
-- disposable/staging Supabase project. This is a read-only privilege/config check.
DO $$
DECLARE
  fn regprocedure;
  functions regprocedure[] := ARRAY[
    'public.create_household(text,text)'::regprocedure,
    'public.current_household_id()'::regprocedure,
    'public.get_my_household()'::regprocedure,
    'public.has_household_permission(uuid,text)'::regprocedure,
    'public.installment_invoice_period(uuid,date,integer)'::regprocedure,
    'public.join_household(text,text)'::regprocedure,
    'public.record_investment_contribution(uuid,numeric,date,uuid,uuid,text,text)'::regprocedure,
    'public.record_investment_redemption(uuid,numeric,date,uuid,uuid,text,text)'::regprocedure,
    'public.rename_my_household(text)'::regprocedure
  ];
BEGIN
  FOREACH fn IN ARRAY functions LOOP
    IF has_function_privilege('anon', fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'FAIL: anon can execute %', fn;
    END IF;
    IF NOT has_function_privilege('authenticated', fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'FAIL: authenticated cannot execute required RPC %', fn;
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      CROSS JOIN LATERAL unnest(coalesce(p.proconfig, ARRAY[]::text[])) AS setting
      WHERE p.oid = fn
        AND setting LIKE 'search_path=%'
        AND regexp_replace(setting, '^search_path=', '') IN ('', '""')
    ) THEN
      RAISE EXCEPTION 'FAIL: % does not have an empty search_path', fn;
    END IF;
  END LOOP;
END $$;

SELECT 'PASS: SECURITY DEFINER RPC execute grants and search_path match expected policy' AS result;
