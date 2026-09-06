import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useHouseholdMembers } from "@/hooks/use-household-members";
import { useHouseholdPaymentMethods } from "@/hooks/use-household-payment-methods";

export const Route = createFileRoute("/contas-a-pagar")({
  head: () => ({ meta: [{ title: "CONTAS A PAGAR — HARMONY HUB" }] }),
  component: ContasAPagarPage,
});

type Payable = { id: string; household_id: string; description: string; amount: number; due_date: string; category: string; account_id: string | null; payment_method_id: string | null; card_id: string | null; responsible: string; status: "PENDENTE" | "PAGA" | "CANCELADA"; paid_at?: string | null; linked_transaction_id?: string | null };
type Transaction = { id: string; source_type: string | null; source_id: string | null };
type Account = { id: string; name: string; household_id: string; institution?: string | null };
type Card = { id: string; name: string; last4?: string | null; household_id: string };
type PaymentMethod = { id: string; name: string; kind: string; card_id: string | null; household_id: string };
type Category = { id: string; name: string; kind: string; household_id: string };

function ContasAPagarPage() {
  const payable = useHouseholdTable<Payable>("accounts_payable", "*", "due_date");
  const transactions = useHouseholdTable<Transaction>("transactions", "id,source_type,source_id");
  const accounts = useHouseholdTable<Account>("household_accounts", "id,name,household_id,institution", "name");
  const cards = useHouseholdTable<Card>("cards", "id,name,last4,household_id", "name");
  const paymentsQuery = useHouseholdPaymentMethods();
  const payments = paymentsQuery.rows as PaymentMethod[];
  const categories = useHouseholdTable<Category>("categories", "id,name,kind,household_id", "name");
  const { data: members = [] } = useHouseholdMembers();
  const { rows, isLoading, insert, update, remove } = payable;
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [itemToPay, setItemToPay] = useState<Payable | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [methodId, setMethodId] = useState("");
  const [cardId, setCardId] = useState("");
  const [responsible, setResponsible] = useState("AMBAS");
  const today = new Date().toISOString().slice(0, 10);
  const pending = rows.filter(r => r.status === "PENDENTE");
  const overdue = pending.filter(r => r.due_date < today);
  const dueToday = pending.filter(r => r.due_date === today);
  const upcoming = pending.filter(r => r.due_date > today);
  const paid = rows.filter(r => r.status === "PAGA");
  const totalPending = useMemo(() => pending.reduce((s, r) => s + Number(r.amount), 0), [pending]);
  const totalOverdue = useMemo(() => overdue.reduce((s, r) => s + Number(r.amount), 0), [overdue]);
  const totalPaid = useMemo(() => paid.reduce((s, r) => s + Number(r.amount), 0), [paid]);
  const categoryOptions = useMemo(() => categories.rows.map(c => c.name.toUpperCase()).filter(Boolean), [categories.rows]);
  const selectedPayment = payments.find(p => p.id === methodId);
  const paymentIsCard = selectedPayment?.kind === "CREDITO" || Boolean(selectedPayment?.card_id);
  const inputClass = "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary";
  const actionClass = "inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-border px-3 text-xs font-medium hover:border-primary hover:text-primary";

  function reset() { setDescription(""); setAmount(""); setDueDate(""); setCategory(categoryOptions[0] ?? ""); }
  function openPayment(item: Payable) { setItemToPay(item); setAccountId(item.account_id ?? accounts.rows[0]?.id ?? ""); setMethodId(item.payment_method_id ?? ""); setCardId(item.card_id ?? ""); setResponsible(item.responsible || "AMBAS"); setPayOpen(true); }
  function closePayment() { setPayOpen(false); setItemToPay(null); setAccountId(""); setMethodId(""); setCardId(""); setResponsible("AMBAS"); }
  async function addPayable() { const value = Number(amount.replace(",", ".")); if (!description.trim() || !Number.isFinite(value) || value <= 0 || !dueDate || !category) { toast.error("PREENCHA DESCRIÇÃO, VALOR, VENCIMENTO E CATEGORIA"); return; } try { await insert({ description: description.trim(), amount: value, due_date: dueDate, category, account_id: null, payment_method_id: null, card_id: null, responsible: "", status: "PENDENTE", linked_transaction_id: null }); reset(); setOpen(false); toast.success("CONTA SALVA"); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO SALVAR CONTA"); } }
  async function markPaid(item: Payable) { const payment = payments.find(p => p.id === methodId); const requiresCard = payment?.kind === "CREDITO" || Boolean(payment?.card_id); if (!accountId || !methodId || !responsible || (requiresCard && !cardId)) { toast.error(requiresCard ? "SELECIONE CONTA, PAGAMENTO, CARTÃO E RESPONSÁVEL" : "PREENCHA CONTA, PAGAMENTO E RESPONSÁVEL"); return; } try { const selectedCard = requiresCard ? cards.rows.find(c => c.id === cardId) : null; let transactionId = item.linked_transaction_id ?? transactions.rows.find(t => t.source_type === "accounts_payable" && t.source_id === item.id)?.id ?? null; const data = { date: new Date().toISOString().slice(0, 10), description: item.description, amount: Number(item.amount), type: "DESPESA", category: item.category || "OUTROS", pay_method: payment?.kind ?? "DINHEIRO", payment_method_id: methodId, payment_method_name: payment?.name ?? "", card_id: selectedCard?.id ?? payment?.card_id ?? null, card_name: selectedCard ? `${selectedCard.name}${selectedCard.last4 ? ` •••• ${selectedCard.last4}` : ""}` : null, account_id: accountId, responsible, paid: true }; if (!transactionId) transactionId = (await transactions.insert({ ...data, source_type: "accounts_payable", source_id: item.id })).id; else await transactions.update(transactionId, data); await update(item.id, { status: "PAGA", paid_at: new Date().toISOString(), account_id: accountId, payment_method_id: methodId, card_id: selectedCard?.id ?? payment?.card_id ?? null, responsible, linked_transaction_id: transactionId }); closePayment(); toast.success("CONTA PAGA E LANÇADA EM MOVIMENTAÇÕES"); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO PAGAR CONTA"); } }
  async function deletePayable(item: Payable) { if (!window.confirm(`EXCLUIR ${item.description}?`)) return; try { const linkedId = item.linked_transaction_id ?? transactions.rows.find(t => t.source_type === "accounts_payable" && t.source_id === item.id)?.id; if (linkedId) await transactions.remove(linkedId); await remove(item.id); toast.success("CONTA EXCLUÍDA"); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO EXCLUIR CONTA"); } }

  return <div className="space-y-5"><PageHeader title="CONTAS A PAGAR" subtitle="CONTROLE DE VENCIMENTOS E OBRIGAÇÕES FINANCEIRAS." action={<button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"><Plus className="h-4 w-4"/>NOVA CONTA</button>}/><div className="grid gap-3 sm:grid-cols-3"><Panel><p className="label-caps text-xs text-muted-foreground">TOTAL A PAGAR</p><p className="mt-2 text-xl font-semibold">{formatCurrency(totalPending)}</p></Panel><Panel><p className="label-caps text-xs text-muted-foreground">TOTAL VENCIDO</p><p className="mt-2 text-xl font-semibold">{formatCurrency(totalOverdue)}</p></Panel><Panel><p className="label-caps text-xs text-muted-foreground">TOTAL PAGO</p><p className="mt-2 text-xl font-semibold">{formatCurrency(totalPaid)}</p></Panel></div>{isLoading ? <Panel>CARREGANDO...</Panel> : rows.length === 0 ? <Panel>NENHUMA CONTA A PAGAR CADASTRADA.</Panel> : <div className="space-y-3"><PayableSection title="VENCIDAS" tone="text-red-600" items={overdue} onPaid={openPayment} onDelete={deletePayable} actionClass={actionClass}/><PayableSection title="VENCENDO HOJE" tone="text-orange-600" items={dueToday} onPaid={openPayment} onDelete={deletePayable} actionClass={actionClass}/><PayableSection title="PRÓXIMOS VENCIMENTOS" tone="text-yellow-600" items={upcoming} onPaid={openPayment} onDelete={deletePayable} actionClass={actionClass}/><PayableSection title="PAGAS" tone="text-green-600" items={paid} onDelete={deletePayable} actionClass={actionClass}/></div>}
  {open && <Modal title="NOVA CONTA A PAGAR" close={() => setOpen(false)}><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span>DESCRIÇÃO</span><input className={inputClass} value={description} onChange={e => setDescription(e.target.value)} autoFocus/></label><label><span>VALOR</span><input className={inputClass} inputMode="decimal" placeholder="R$ 0,00" value={amount} onChange={e => setAmount(e.target.value)}/></label><label><span>VENCIMENTO</span><input className={inputClass} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}/></label><label className="sm:col-span-2"><span>CATEGORIA</span><select className={inputClass} value={category} onChange={e => setCategory(e.target.value)}><option value="">SELECIONE</option>{categoryOptions.map(c => <option key={c}>{c}</option>)}</select></label></div><div className="mt-6 flex justify-end gap-2"><button className={actionClass} onClick={() => setOpen(false)}>CANCELAR</button><button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground" onClick={addPayable}><Check className="h-4 w-4"/>SALVAR CONTA</button></div></Modal>}
  {payOpen && itemToPay && <Modal title="PAGAR CONTA" close={closePayment}><p className="mb-4 text-sm text-muted-foreground">{itemToPay.description} · {formatCurrency(Number(itemToPay.amount))}</p><div className="grid gap-4 sm:grid-cols-2"><label><span>CONTA</span><select className={inputClass} value={accountId} onChange={e => setAccountId(e.target.value)}><option value="">SELECIONE</option>{accounts.rows.map(a => <option key={a.id} value={a.id}>{a.name}{a.institution ? ` · ${a.institution}` : ""}</option>)}</select></label><label><span>FORMA DE PAGAMENTO</span><select className={inputClass} value={methodId} onChange={e => { setMethodId(e.target.value); const p = payments.find(x => x.id === e.target.value); setCardId(p?.card_id ?? ""); }}><option value="">SELECIONE</option>{payments.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}</select></label>{paymentIsCard && <label className="sm:col-span-2"><span>CARTÃO</span><select className={inputClass} value={cardId} onChange={e => setCardId(e.target.value)}><option value="">SELECIONE</option>{cards.rows.map(c => <option key={c.id} value={c.id}>{c.name}{c.last4 ? ` •••• ${c.last4}` : ""}</option>)}</select></label>}<label className="sm:col-span-2"><span>QUEM PAGOU</span><select className={inputClass} value={responsible} onChange={e => setResponsible(e.target.value)}><option value="AMBAS">AMBOS / COMPARTILHADO</option>{members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select></label></div><div className="mt-6 flex justify-end gap-2"><button className={actionClass} onClick={closePayment}>CANCELAR</button><button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground" onClick={() => markPaid(itemToPay)}><Check className="h-4 w-4"/>CONFIRMAR PAGAMENTO</button></div></Modal>}</div>;
}

function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) { return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 backdrop-blur-md" onMouseDown={close}><section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl" onMouseDown={e => e.stopPropagation()}><div className="mb-5 flex items-center justify-between"><h2 className="label-caps text-base font-semibold">{title}</h2><button onClick={close} aria-label="Fechar" className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"><X className="h-5 w-5"/></button></div>{children}</section></div>; }
function PayableSection({ title, tone, items, onPaid, onDelete, actionClass }: { title: string; tone: string; items: Payable[]; onPaid?: (item: Payable) => void; onDelete: (item: Payable) => void; actionClass: string }) { if (!items.length) return null; return <Panel><div className="mb-3 flex items-center justify-between"><h3 className={`label-caps text-xs font-semibold ${tone}`}>{title}</h3><span className="text-xs text-muted-foreground">{items.length}</span></div><div className="space-y-2">{items.map(item => <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{item.description}</p><p className="mt-1 text-xs text-muted-foreground">VENCIMENTO: {item.due_date} · {item.category}</p></div><div className="flex items-center justify-between gap-2"><span className="font-semibold">{formatCurrency(Number(item.amount))}</span>{onPaid && <button type="button" className={`${actionClass} text-green-600`} onClick={() => onPaid(item)}><Check className="h-3.5 w-3.5"/>PAGAR CONTA</button>}<button type="button" className={actionClass} onClick={() => onDelete(item)} aria-label="Excluir conta"><Trash2 className="h-3.5 w-3.5"/></button></div></div>)}</div></Panel>; }
