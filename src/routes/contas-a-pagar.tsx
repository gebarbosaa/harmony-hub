import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useHouseholdMembers } from "@/hooks/use-household-members";

export const Route = createFileRoute("/contas-a-pagar")({ component: ContasAPagarPage });

type Payable = { id: string; household_id: string; description: string; amount: number; due_date: string; category: string; account_id: string | null; payment_method_id: string | null; card_id: string | null; responsible: string; status: "PENDENTE" | "PAGA" | "CANCELADA"; notes?: string | null; paid_at?: string | null; linked_transaction_id?: string | null };
type Transaction = { id: string; source_type: string | null; source_id: string | null };
type Account = { id: string; name: string; household_id: string };
type Card = { id: string; name: string; brand?: string | null; last4?: string | null; household_id: string };

const PAYMENT_OPTIONS = ["DINHEIRO", "CARTÃO", "PIX", "TRANSFERÊNCIA", "BOLETO"];

function ContasAPagarPage() {
  const payable = useHouseholdTable<Payable>("accounts_payable", "*", "due_date");
  const transactions = useHouseholdTable<Transaction>("transactions", "id,source_type,source_id");
  const accounts = useHouseholdTable<Account>("household_accounts", "id,name,household_id", "name");
  const cards = useHouseholdTable<Card>("cards", "id,name,brand,last4,household_id", "name");
  const { data: members = [] } = useHouseholdMembers();
  const { rows, isLoading, insert, update, remove } = payable;
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payableToPay, setPayableToPay] = useState<Payable | null>(null);
  const [paidAccountId, setPaidAccountId] = useState("");
  const [paidMethod, setPaidMethod] = useState("");
  const [paidCardId, setPaidCardId] = useState("");
  const [paidResponsible, setPaidResponsible] = useState("AMBAS");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("Outros");
  const today = new Date().toISOString().slice(0, 10);
  const pending = rows.filter(r => r.status === "PENDENTE");
  const overdue = pending.filter(r => r.due_date < today);
  const dueToday = pending.filter(r => r.due_date === today);
  const upcoming = pending.filter(r => r.due_date > today);
  const paid = rows.filter(r => r.status === "PAGA");
  const totalPending = useMemo(() => pending.reduce((s, r) => s + Number(r.amount), 0), [pending]);
  const totalOverdue = useMemo(() => overdue.reduce((s, r) => s + Number(r.amount), 0), [overdue]);
  const totalPaid = useMemo(() => paid.reduce((s, r) => s + Number(r.amount), 0), [paid]);
  const inputClass = "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";
  const actionClass = "inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-border px-3 text-xs font-medium transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50";

  function resetForm() { setDescription(""); setAmount(""); setDueDate(""); setCategory("Outros"); }
  function openPayment(item: Payable) {
    setPayableToPay(item); setPaidAccountId(item.account_id ?? accounts.rows[0]?.id ?? ""); setPaidMethod(""); setPaidCardId(item.card_id ?? ""); setPaidResponsible(item.responsible || "AMBAS"); setPayOpen(true);
  }
  function closePayment() { setPayOpen(false); setPayableToPay(null); setPaidAccountId(""); setPaidMethod(""); setPaidCardId(""); setPaidResponsible("AMBAS"); }

  async function addPayable() {
    const value = Number(amount.replace(",", "."));
    if (!description.trim() || !Number.isFinite(value) || value <= 0 || !dueDate) { toast.error("PREENCHA DESCRIÇÃO, VALOR E VENCIMENTO"); return; }
    try {
      await insert({ description: description.trim(), amount: value, due_date: dueDate, category: category.trim() || "Outros", account_id: null, payment_method_id: null, card_id: null, responsible: "", status: "PENDENTE", linked_transaction_id: null });
      resetForm(); setOpen(false); toast.success("CONTA SALVA");
    } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO SALVAR CONTA"); }
  }

  async function markPaid(item: Payable, accountId: string, method: string, cardId: string, responsible: string) {
    if (!accountId || !method || !responsible || (method === "CARTÃO" && !cardId)) { toast.error(method === "CARTÃO" ? "SELECIONE A CONTA, O CARTÃO E QUEM PAGOU" : "PREENCHA CONTA, FORMA DE PAGAMENTO E QUEM PAGOU"); return; }
    try {
      const selectedCard = method === "CARTÃO" ? cards.rows.find(c => c.id === cardId) : null;
      let transactionId = item.linked_transaction_id ?? transactions.rows.find(t => t.source_type === "accounts_payable" && t.source_id === item.id)?.id ?? null;
      const transactionData = { date: new Date().toISOString().slice(0, 10), description: item.description, amount: Number(item.amount), type: "DESPESA", category: item.category || "OUTROS", pay_method: method, payment_method_id: null, payment_method_name: method, card_id: selectedCard?.id ?? null, card_name: selectedCard ? `${selectedCard.name}${selectedCard.last4 ? ` •••• ${selectedCard.last4}` : ""}` : null, account_id: accountId, responsible, paid: true };
      if (!transactionId) { const created = await transactions.insert({ ...transactionData, source_type: "accounts_payable", source_id: item.id }); transactionId = created.id; }
      else await transactions.update(transactionId, transactionData);
      await update(item.id, { status: "PAGA", paid_at: new Date().toISOString(), account_id: accountId, payment_method_id: null, card_id: selectedCard?.id ?? null, responsible, linked_transaction_id: transactionId });
      closePayment(); toast.success("CONTA PAGA E LANÇADA EM MOVIMENTAÇÕES");
    } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO PAGAR CONTA"); }
  }

  async function removePayable(item: Payable) {
    if (!window.confirm(`EXCLUIR ${item.description}?`)) return;
    try { const linkedId = item.linked_transaction_id ?? transactions.rows.find(t => t.source_type === "accounts_payable" && t.source_id === item.id)?.id; if (linkedId) await transactions.remove(linkedId); await remove(item.id); toast.success("CONTA EXCLUÍDA"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO EXCLUIR CONTA"); }
  }

  return <div className="space-y-5"><PageHeader title="CONTAS A PAGAR" subtitle="CONTROLE DE VENCIMENTOS E OBRIGAÇÕES FINANCEIRAS." action={<button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:scale-95"><Plus className="h-4 w-4"/>NOVA CONTA</button>}/><div className="grid gap-3 sm:grid-cols-3"><Panel><p className="label-caps text-xs text-muted-foreground">TOTAL A PAGAR</p><p className="mt-2 text-xl font-semibold">{formatCurrency(totalPending)}</p></Panel><Panel><p className="label-caps text-xs text-muted-foreground">TOTAL VENCIDO</p><p className="mt-2 text-xl font-semibold">{formatCurrency(totalOverdue)}</p></Panel><Panel><p className="label-caps text-xs text-muted-foreground">TOTAL PAGO</p><p className="mt-2 text-xl font-semibold">{formatCurrency(totalPaid)}</p></Panel></div><section className="space-y-3">{isLoading ? <Panel>CARREGANDO...</Panel> : rows.length === 0 ? <Panel>NENHUMA CONTA A PAGAR CADASTRADA.</Panel> : <><PayableSection title="VENCIDAS" tone="text-red-600" items={overdue} onPaid={openPayment} onDelete={removePayable} actionClass={actionClass}/><PayableSection title="VENCENDO HOJE" tone="text-orange-600" items={dueToday} onPaid={openPayment} onDelete={removePayable} actionClass={actionClass}/><PayableSection title="PRÓXIMOS VENCIMENTOS" tone="text-yellow-600" items={upcoming} onPaid={openPayment} onDelete={removePayable} actionClass={actionClass}/><PayableSection title="PAGAS" tone="text-green-600" items={paid} onDelete={removePayable} actionClass={actionClass}/></>}</section>

  {open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 backdrop-blur-md" onMouseDown={() => setOpen(false)}><section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl md:p-6" onMouseDown={e => e.stopPropagation()}><div className="mb-6 flex items-center justify-between gap-3"><div><p className="label-caps text-[9px] font-semibold tracking-[0.18em] text-primary">NOVO REGISTRO</p><h2 className="label-caps mt-1 text-base font-semibold">NOVA CONTA A PAGAR</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-5 w-5"/></button></div><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">DESCRIÇÃO</span><input className={inputClass} placeholder="Ex.: Conta de energia" value={description} onChange={e => setDescription(e.target.value)} autoFocus/></label><label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">VALOR</span><input className={inputClass} placeholder="R$ 0,00" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}/></label><label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">VENCIMENTO</span><input className={inputClass} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}/></label><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">CATEGORIA</span><input className={inputClass} placeholder="Ex.: Moradia" value={category} onChange={e => setCategory(e.target.value)}/></label></div><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className={actionClass} onClick={() => { resetForm(); setOpen(false); }}>CANCELAR</button><button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50" onClick={addPayable} disabled={!description.trim() || !amount || !dueDate}><Check className="h-4 w-4"/>SALVAR CONTA</button></div></section></div>}

  {payOpen && payableToPay && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 backdrop-blur-md" onMouseDown={closePayment}><section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl md:p-6" onMouseDown={e => e.stopPropagation()}><div className="mb-5 flex items-start justify-between gap-3"><div><p className="label-caps text-[9px] font-semibold tracking-[0.18em] text-primary">PAGAMENTO</p><h2 className="label-caps mt-1 text-base font-semibold">PAGAR CONTA</h2><p className="mt-1 text-sm text-muted-foreground">{payableToPay.description} · {formatCurrency(Number(payableToPay.amount))}</p></div><button type="button" onClick={closePayment} aria-label="Fechar" className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-5 w-5"/></button></div><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">CONTA QUE SAIU O DINHEIRO</span><select className={inputClass} value={paidAccountId} onChange={e => setPaidAccountId(e.target.value)}><option value="">SELECIONE A CONTA</option>{accounts.rows.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">FORMA DE PAGAMENTO</span><select className={inputClass} value={paidMethod} onChange={e => { setPaidMethod(e.target.value); if (e.target.value !== "CARTÃO") setPaidCardId(""); }}><option value="">SELECIONE</option>{PAYMENT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>{paidMethod === "CARTÃO" && <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">CARTÃO</span><select className={inputClass} value={paidCardId} onChange={e => setPaidCardId(e.target.value)}><option value="">SELECIONE O CARTÃO</option>{cards.rows.map(card => <option key={card.id} value={card.id}>{card.name}{card.last4 ? ` •••• ${card.last4}` : ""}</option>)}</select></label>}<label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">QUEM PAGOU</span><select className={inputClass} value={paidResponsible} onChange={e => setPaidResponsible(e.target.value)}><option value="AMBAS">AMBOS / COMPARTILHADO</option>{members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select></label></div><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className={actionClass} onClick={closePayment}>CANCELAR</button><button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground" onClick={() => markPaid(payableToPay, paidAccountId, paidMethod, paidCardId, paidResponsible)}><Check className="h-4 w-4"/>CONFIRMAR PAGAMENTO</button></div></section></div>}
  </div>;
}

function PayableSection({ title, tone, items, onPaid, onDelete, actionClass }: { title: string; tone: string; items: Payable[]; onPaid?: (item: Payable) => void; onDelete: (item: Payable) => void; actionClass: string }) {
  if (!items.length) return null;
  return <Panel><div className="mb-3 flex items-center justify-between"><h3 className={`label-caps text-xs font-semibold ${tone}`}>{title}</h3><span className="text-xs text-muted-foreground">{items.length}</span></div><div className="space-y-2">{items.map(item => <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-medium">{item.description}</p><p className="mt-1 text-xs text-muted-foreground">VENCIMENTO: {item.due_date} · {item.category}</p></div><div className="flex items-center justify-between gap-2 sm:justify-end"><span className="font-semibold">{formatCurrency(Number(item.amount))}</span>{onPaid && <button type="button" className={`${actionClass} border-green-500/30 text-green-600`} onClick={() => onPaid(item)}><Check className="h-3.5 w-3.5"/>PAGAR CONTA</button>}<button type="button" className={actionClass} onClick={() => onDelete(item)} aria-label="Excluir conta"><Trash2 className="h-3.5 w-3.5"/></button></div></div>)}</div></Panel>;
}
