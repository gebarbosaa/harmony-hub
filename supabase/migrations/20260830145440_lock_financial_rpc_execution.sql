revoke execute on function public.card_invoice_period(uuid,date) from anon,authenticated;
revoke execute on function public.sync_card_invoice(uuid,uuid,text) from anon,authenticated;
revoke execute on function public.sync_installment_invoice_after() from anon,authenticated;
revoke execute on function public.sync_transaction_invoice_after() from anon,authenticated;
