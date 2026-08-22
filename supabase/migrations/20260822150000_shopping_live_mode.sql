ALTER TABLE public.shopping_lists
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL;

ALTER TABLE public.shopping_items
  ADD COLUMN IF NOT EXISTS actual_qty numeric;

CREATE OR REPLACE FUNCTION public.finalize_shopping_list(
  p_list_id uuid,
  p_pay_method public.pay_method,
  p_responsible text,
  p_amount_override numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_household_id uuid := public.current_household_id();
  v_user_id uuid := auth.uid();
  v_list public.shopping_lists%ROWTYPE;
  v_total numeric := 0;
  v_transaction_id uuid;
BEGIN
  IF v_user_id IS NULL OR v_household_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO v_list FROM public.shopping_lists WHERE id=p_list_id AND household_id=v_household_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SHOPPING_LIST_NOT_FOUND'; END IF;
  IF COALESCE(v_list.archived,false) THEN RAISE EXCEPTION 'SHOPPING_LIST_ALREADY_FINALIZED'; END IF;
  SELECT COALESCE(SUM(COALESCE(actual_qty,qty,0)*COALESCE(actual_price,0)),0) INTO v_total
  FROM public.shopping_items WHERE list_id=p_list_id AND household_id=v_household_id AND done=true;
  IF v_total<=0 THEN RAISE EXCEPTION 'SHOPPING_TOTAL_ZERO'; END IF;
  IF p_amount_override IS NOT NULL THEN
    IF p_amount_override<=0 THEN RAISE EXCEPTION 'SHOPPING_TOTAL_ZERO'; END IF;
    v_total:=p_amount_override;
  END IF;
  INSERT INTO public.transactions(household_id,created_by,date,description,amount,type,category,pay_method,responsible,paid)
  VALUES(v_household_id,v_user_id,current_date,'MERCADO — '||v_list.name,v_total,'DESPESA'::public.tx_type,'ALIMENTAÇÃO',p_pay_method,NULLIF(TRIM(p_responsible),''),true)
  RETURNING id INTO v_transaction_id;
  UPDATE public.shopping_lists SET archived=true,completed_at=now(),transaction_id=v_transaction_id,updated_at=now()
  WHERE id=p_list_id AND household_id=v_household_id;
  RETURN v_transaction_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.finalize_shopping_list(uuid,public.pay_method,text,numeric) FROM public;
REVOKE EXECUTE ON FUNCTION public.finalize_shopping_list(uuid,public.pay_method,text,numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.finalize_shopping_list(uuid,public.pay_method,text,numeric) TO authenticated;
