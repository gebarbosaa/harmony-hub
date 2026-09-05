begin;

-- Evaluate this exposed view with the caller's permissions/RLS.
alter view public.household_members set (security_invoker = true);

-- Pin the trigger function to trusted schemas.
alter function public.accounts_payable_set_updated_at() set search_path = public, pg_catalog;

-- Cover foreign keys used by payable joins and filters.
create index if not exists accounts_payable_account_id_idx on public.accounts_payable (account_id);
create index if not exists accounts_payable_card_id_idx on public.accounts_payable (card_id);
create index if not exists accounts_payable_payment_method_id_idx on public.accounts_payable (payment_method_id);

commit;
