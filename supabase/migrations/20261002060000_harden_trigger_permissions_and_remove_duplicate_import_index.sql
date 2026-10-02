begin;

revoke execute on function public.sync_transaction_to_installment() from public, anon, authenticated;
drop index if exists public.transactions_import_fingerprint_uq;

commit;
