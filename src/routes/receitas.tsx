import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag, PersonDot } from "@/components/ui-kit";
import { ResponsibleField } from "@/components/responsible-field";
import { evaluateAmount, formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { MonthSelector, useGlobalMonth } from "@/hooks/use-global-month";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/receitas")({
  head: () => ({ meta: [{ title: "RECEITAS — HARMONY HUB" }] }),
  component: ReceitasPage,
});

type Row = {
  id: string; date: string; description: string; category: string; pay_method: string; responsible: string;
  amount: number; type: string; paid: boolean; household_id: string; payment_method_id: string | null;
  payment_method_name: string | null; account_id: string | null; source_type: string | null;
};
type Category = { id: string; name: string; kind: string; household_id: string };
type Payment = { id: string; name: string; description: string | null; kind: string; card_id: string | null; household_id: string };
type Account = { id: string; name: string; institution: string | null; household_id: string };

function ReceitasPage() {const isDesktop = useIsDesktop();
  const { month, setMonth } = useGlobalMonth("receitas");
  const tx = useHouseholdTable<Row>("transactions", "id,date,description,category,pay_method,responsible,amount,type,paid,household_id,payment_method_id,payment_method_name,account_id,source_type", "date");
  const categories = useHouseholdTable<Category>("categories", "id,name,kind,household_id", "name");
  const payments = useHouseholdTable<Payment>("household_payment_methods", "id,name,description,kind,card_id,household_id", "name");
  const accounts = useHouseholdTable<Account>("household_accounts", "id,name,institution,household_id", "name");
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Row | null>(null);
  const [description, setDescription] = useState(""); const [amount, setAmount] = useState(""); const [category, setCategory] = useState("");
  const [paymentId, setPaymentId] = useState(""); const [accountId, setAccountId] = useState(""); const [responsible, setResponsible] = useState("AMBAS");
  const [date, setDate] = useState(`${month}-01`); const [search, setSearch] = useState(""); const parsed = evaluateAmount(amount);
  const categoryOptions = useMemo(() => categories.rows.filter((c) => c.kind === "RECEITA" || c.kind === "AMBOS").map((c) => c.name.toUpperCase()).filter(Boolean), [categories.rows]);

  useEffect(() => { if (!editing) setDate(`${month}-01`); }, [month, editing]);
  useEffect(() => {
    if (!categoryOptions.includes(category)) setCategory(categoryOptions[0] ?? "");
    if (!payments.rows.some((p) => p.id === paymentId)) setPaymentId(payments.rows[0]?.id ?? "");
  }, [categoryOptions, payments.rows, category, paymentId]);
  useEffect(() => {
    if (!editing) return;
    const validCategory = categoryOptions.includes(editing.category);
    const validPayment = payments.rows.some((p) => p.id === editing.payment_method_id);
    if (!validCategory || !validPayment) {
      setEditing((current) => current ? {
        ...current,
        category: validCategory ? current.category : (categoryOptions[0] ?? ""),
        payment_method_id: validPayment ? current.payment_method_id : (payments.rows[0]?.id ?? null),
      } : current);
    }
  }, [editing, categoryOptions, payments.rows]);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ option?: string }>).detail;
      if (detail?.option === "NOVA RECEITA") { reset(); setOpen(true); }
    };
    window.addEventListener("multicap:open-create", handler);
    return () => window.removeEventListener("multicap:open-create", handler);
  }, [month]);

  const visible = useMemo(() => tx.rows.filter((t) => t.type === "RECEITA" && t.date.startsWith(month) && t.description.toLowerCase().includes(search.toLowerCase())), [tx.rows, month, search]);
  const total = useMemo(() => visible.reduce((sum, t) => sum + Number(t.amount), 0), [visible]);

  function reset() { setDescription(""); setAmount(""); setCategory(categoryOptions[0] ?? ""); setPaymentId(payments.rows[0]?.id ?? ""); setAccountId(""); setResponsible("AMBAS"); setDate(`${month}-01`); setEditing(null); }
  async function save() {
    const value = parsed; const payment = payments.rows.find((p) => p.id === paymentId); const normalizedDescription = description.trim().toUpperCase();
    if (!normalizedDescription || value == null || !Number.isFinite(value) || value <= 0) return void toast.error("PREENCHA UMA DESCRIÇÃO E UM VALOR VÁLIDO");
    if (!date) return void toast.error("INFORME A DATA DA RECEITA");
    if (!category || !categoryOptions.includes(category)) return void toast.error("SELECIONE UMA CATEGORIA VÁLIDA EM AJUSTES");
    if (!payment) return void toast.error("SELECIONE UMA FORMA DE PAGAMENTO VÁLIDA EM AJUSTES");
    try { await tx.insert({ date, description: normalizedDescription, amount: value, type: "RECEITA", category, pay_method: payment.kind, payment_method_id: payment.id, payment_method_name: payment.name, account_id: accountId || null, responsible, paid: true }); reset(); setOpen(false); toast.success("RECEITA SALVA"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO SALVAR RECEITA"); }
  }
  async function updateRow() {
    if (!editing) return; const payment = payments.rows.find((p) => p.id === editing.payment_method_id); const value = Number(editing.amount);
    if (!editing.description.trim() || !Number.isFinite(value) || value <= 0 || !editing.date || !editing.category || !categoryOptions.includes(editing.category) || !payment) return void toast.error("SELECIONE CATEGORIA E FORMA DE PAGAMENTO VÁLIDAS EM AJUSTES");
    try { await tx.update(editing.id, { date: editing.date, description: editing.description.trim().toUpperCase(), amount: value, category: editing.category, responsible: editing.responsible, paid: editing.paid, payment_method_id: payment.id, payment_method_name: payment.name, pay_method: payment.kind, account_id: editing.account_id || null }); setEditing(null); toast.success("RECEITA ATUALIZADA"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO ATUALIZAR RECEITA"); }
  }
  async function removeRow(row: Row) { if (!window.confirm(`EXCLUIR ${row.description}?`)) return; try { await tx.remove(row.id); toast.success("RECEITA EXCLUÍDA"); } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO EXCLUIR RECEITA"); } }

  return <div className="space-y-5">
    <PageHeader title="RECEITAS" subtitle={`ENTRADAS REGISTRADAS NO MÊS ${month}.`} action={<div className="flex items-center gap-2"><button type="button" onClick={()=>setOpen(v=>!v)} className="gradient-primary inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[10px] font-bold text-primary-foreground"><Plus className="h-4 w-4"/>{open?"FECHAR FORMULÁRIO":"NOVA RECEITA"}</button><MonthSelector month={month} setMonth={setMonth} /></div>} />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><StatCard label="TOTAL DE RECEITAS" value={formatCurrency(total)} tone="success" /><StatCard label="LANÇAMENTOS" value={String(visible.length)} tone="primary" /></div>
    <Panel title={`RECEITAS — ${month}`} aside={<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="BUSCAR..." className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs" />}>
      {tx.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">CARREGANDO...</p> : visible.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">NENHUMA RECEITA CADASTRADA NESTE MÊS.</p> : <ul className="divide-y divide-border">{visible.map((row) => <li key={row.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="label-caps truncate text-[11px]">{row.description}</p><div className="mt-1 flex flex-wrap items-center gap-2"><Tag>{row.category}</Tag><PersonDot name={row.responsible} /><span className="text-[10px] text-muted-foreground">{row.payment_method_name || row.pay_method}</span><span className="text-[10px] text-muted-foreground">{row.date}</span></div></div><div className="flex items-center gap-3"><p className="text-sm font-bold text-success">+{formatCurrency(Number(row.amount))}</p><button type="button" onClick={() => setEditing({ ...row })} className="text-xs text-primary">EDITAR</button><button type="button" onClick={() => void removeRow(row)} className="text-xs text-danger">EXCLUIR</button></div></li>)}</ul>}
    </Panel>
    {(open || isDesktop) && <div className="hidden lg:block rounded-2xl border border-border/70 bg-card p-5 shadow-[0_12px_40px_-30px_rgba(0,0,0,0.8)] md:p-6"><div className="mb-4"><p className="label-caps text-[9px] font-semibold tracking-[0.18em] text-primary">CADASTRO NO DESKTOP</p><h2 className="mt-1 text-base font-bold tracking-tight md:text-lg">NOVA RECEITA / EDITAR</h2></div><div className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><label><span className="label-caps text-[10px]">DESCRIÇÃO</span><input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10" /></label><label><span className="label-caps text-[10px]">VALOR</span><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10" /></label><label><span className="label-caps text-[10px]">DATA</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10" /></label><label><span className="label-caps text-[10px]">CATEGORIA</span><select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"><option value="">SELECIONE</option>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label><span className="label-caps text-[10px]">FORMA DE PAGAMENTO</span><select value={paymentId} onChange={(e) => setPaymentId(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"><option value="">SELECIONE</option>{payments.rows.map((payment) => <option key={payment.id} value={payment.id}>{payment.name.toUpperCase()}</option>)}</select></label><label><span className="label-caps text-[10px]">CONTA</span><select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"><option value="">NÃO INFORMADA</option>{accounts.rows.map((account) => <option key={account.id} value={account.id}>{account.name}{account.institution ? ` — ${account.institution}` : ""}</option>)}</select></label></div><button type="button" onClick={() => void save()} className="gradient-primary label-caps inline-flex w-fit items-center justify-center rounded-lg px-3 py-1.5 text-[9px] font-semibold text-primary-foreground">SALVAR RECEITA</button></div></div>}<Dialog open={open && !isDesktop} onOpenChange={setOpen}><DialogContent className="max-w-3xl rounded-3xl"><DialogHeader><DialogTitle className="label-caps">NOVA RECEITA</DialogTitle></DialogHeader><div className="grid gap-3 md:grid-cols-6"><label className="md:col-span-2"><span className="label-caps text-[10px]">DESCRIÇÃO</span><input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10" /></label><label><span className="label-caps text-[10px]">VALOR</span><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10" /></label><label><span className="label-caps text-[10px]">DATA</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10" /></label><label><span className="label-caps text-[10px]">CATEGORIA</span><select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"><option value="">SELECIONE</option>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label><span className="label-caps text-[10px]">FORMA DE PAGAMENTO</span><select value={paymentId} onChange={(e) => setPaymentId(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"><option value="">SELECIONE</option>{payments.rows.map((payment) => <option key={payment.id} value={payment.id}>{payment.name.toUpperCase()}</option>)}</select></label><label><span className="label-caps text-[10px]">CONTA</span><select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"><option value="">NÃO INFORMADA</option>{accounts.rows.map((account) => <option key={account.id} value={account.id}>{account.name}{account.institution ? ` — ${account.institution}` : ""}</option>)}</select></label><ResponsibleField value={responsible} onChange={setResponsible} /><button type="button" onClick={() => void save()} className="gradient-primary label-caps inline-flex w-fit items-center justify-center rounded-lg px-3 py-1.5 text-[9px] font-semibold text-primary-foreground">SALVAR RECEITA</button></div></DialogContent></Dialog>
    {editing && <Dialog open={!isDesktop} onOpenChange={(value) => !value && setEditing(null)}><DialogContent className="max-w-2xl rounded-3xl"><DialogHeader><DialogTitle className="label-caps">EDITAR RECEITA</DialogTitle></DialogHeader><div className="grid gap-3 md:grid-cols-2"><label><span className="label-caps text-[10px]">DESCRIÇÃO</span><input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label><label><span className="label-caps text-[10px]">VALOR</span><input type="number" min="0.01" step="0.01" value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })} className="mt-1 w-full rounded-xl border p-3" /></label><label><span className="label-caps text-[10px]">DATA</span><input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label><label><span className="label-caps text-[10px]">CATEGORIA</span><select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="mt-1 w-full rounded-xl border p-3"><option value="">SELECIONE</option>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label><span className="label-caps text-[10px]">FORMA DE PAGAMENTO</span><select value={editing.payment_method_id || ""} onChange={(e) => setEditing({ ...editing, payment_method_id: e.target.value || null })} className="mt-1 w-full rounded-xl border p-3"><option value="">SELECIONE</option>{payments.rows.map((payment) => <option key={payment.id} value={payment.id}>{payment.name.toUpperCase()}</option>)}</select></label><label><span className="label-caps text-[10px]">CONTA</span><select value={editing.account_id || ""} onChange={(e) => setEditing({ ...editing, account_id: e.target.value || null })} className="mt-1 w-full rounded-xl border p-3"><option value="">NÃO INFORMADA</option>{accounts.rows.map((account) => <option key={account.id} value={account.id}>{account.name}{account.institution ? ` — ${account.institution}` : ""}</option>)}</select></label></div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setEditing(null)} className="inline-flex h-9 min-w-[120px] items-center justify-center rounded-xl border border-border bg-background px-4 text-[10px] font-semibold transition-colors hover:bg-secondary">CANCELAR</button><button onClick={() => void updateRow()} className="gradient-primary label-caps inline-flex w-fit items-center justify-center rounded-lg px-3 py-1.5 text-[9px] font-semibold text-primary-foreground">SALVAR</button></div></DialogContent></Dialog>}
  </div>;
}
