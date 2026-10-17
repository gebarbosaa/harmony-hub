-- Preserve the payment method selected for each business cash entry.
-- The composite foreign key prevents linking a cash entry to another household's method.
begin;
alter table public.business_payment_methods
  add constraint business_payment_methods_id_household_id_key unique (id, household_id);
alter table public.business_cash_entries
  add column if not exists payment_method_id uuid;
alter table public.business_cash_entries
  add constraint business_cash_entries_payment_method_household_fkey
  foreign key (payment_method_id, household_id)
  references public.business_payment_methods (id, household_id)
  on delete restrict;
commit;
