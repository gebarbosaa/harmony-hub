import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag, PersonDot } from "@/components/ui-kit";
import { evaluateAmount, formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useHouseholdMembers } from "@/hooks/use-household-members";
import { MonthSelector, useGlobalMonth } from "@/hooks/use-global-month";

export const Route = createFileRoute("/receitas")({
  head: () => ({ meta: [{ title: "RECEITAS — MULTICAP" }] }),
  component: ReceitasPage,
});

type Row = { id: string; date: string; description: string; category: string; pay_method: string; responsible: string; amount: number; type: string; paid: boolean; household_id: string };
type Category = { id: string; name: string; kind: string; household_id: string };
type Payment = { id: string; name: string; description: string | null; household_id: string };

function ReceitasPage() {
  const { month, setMonth } = useGlobalMonth("receitas");
  const tx = useHouseholdTable<Row>("transactions", "id,date,description,category,pay_method,responsible,amount,type,paid,household_id");
  const categories = useHouseholdTable<Category>("categories", "id,name,kind,household_id", "name");
  const payments = useHouseholdTable<Payment>("household_payment_methods", "id,name,description,household_id", "name");
  const { data: members = [] } = useHouseholdMembers();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [responsible, setResponsible] = useState("AMBAS");
  const [date, setDate] = useState(`${month}-01`);
  const [search, setSearch] = useState("");
  const parsed = evaluateAmount(amount);
  const categoryOptions = useMemo(() => categories.rows.map(c => c.name.toUpperCase()).filter(Boolean), [categories.rows]);
  const paymentOptions = useMemo(() => payments.rows.map(p => ({ name: p.name.toUpperCase(), value: p.name })), [payments.rows]);
  useEffect(() => { setDate(`${month}-01`); }, [month]);
  useEffect(() => { if (!categoryOptions.includes(category)) setCategory(categoryOptions[0] ?? ""); if (!paymentOptions.some(p => p.value === payMethod)) setPayMethod(paymentOptions[0]?.value ?? ""); }, [categoryOptions, paymentOptions, category, payMethod]);
  const visible = useMemo(() => tx.rows.filter(t => t.type === "RECEITA" && t.date.startsWith(month) && t.description.toLowerCase().includes(search.toLowerCase())), [tx.rows, month, search]);
  const total = useMemo(() => visible.reduce((sum, t) => sum + Number(t.amount), 0), [visible]);

  async function add() {
    if (!description.trim() || !parsed || parsed <= 0) { toast.error("PREENCHA DESCRIÇÃO E VALOR"); return; }
    if (!category) { toast.error("CADASTRE UMA CATEGORIA EM CONFIGURAÇÕES"); return; }
    try {
      await tx.insert({ date, description: description.trim().toUpperCase(), amount: parsed, type: "RECEITA", category, pay_method: payMethod, responsible, paid: true });
      setDescription(""); setAmount(""); toast.success("RECEITA SALVA");
    } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO SALVAR"); }
  }
  async function removeRow(t: Row) {
    if (!window.confirm(`EXCLUIR ${t.description}?`)) return;
    try { await tx.remove(t.id); toast.success("RECEITA EXCLUÍDA"); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO EXCLUIR"); }
  }
  return <div className="space-y-5">
    <PageHeader title="RECEITAS" subtitle={`ENTRADAS REGISTRADAS NO MÊS ${month}.`} action={<MonthSelector month={month} setMonth={setMonth} />} />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><StatCard label="TOTAL DE RECEITAS" value={formatCurrency(total)} tone="success" /><StatCard label="LANÇAMENTOS" value={String(visible.length)} tone="primary" /></div>
    <Panel title="NOVA RECEITA"><div className="grid gap-3 md:grid-cols-6">
      <label className="md:col-span-2"><span className="label-caps text-[10px] text-muted-foreground">DESCRIÇÃO</span><input value={description} onChange={e => setDescription(e.target.value)} placeholder="SALÁRIO, FREELA, VENDA..." className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>
      <label><span className="label-caps text-[10px] text-muted-foreground">VALOR</span><input value={amount} onChange={e => setAmount(e.target.value)} placeholder="1500" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />{parsed !== null && <span className="mt-1 block text-[10px] text-primary">= {formatCurrency(parsed)}</span>}</label>
      <label><span className="label-caps text-[10px] text-muted-foreground">DATA</span><input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>
      <label><span className="label-caps text-[10px] text-muted-foreground">CATEGORIA</span><select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option value="">SELECIONE</option>{categoryOptions.map(c => <option key={c}>{c}</option>)}</select></label>
      <label><span className="label-caps text-[10px] text-muted-foreground">FORMA DE PAGAMENTO</span><select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option value="">SELECIONE</option>{paymentOptions.map(p => <option key={p.value} value={p.value}>{p.name}</option>)}</select></label>
      <label><span className="label-caps text-[10px] text-muted-foreground">RESPONSÁVEL</span><select value={responsible} onChange={e => setResponsible(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option value="AMBAS">AMBOS / COMPARTILHADO</option>{members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select></label>
      <button type="button" onClick={add} className="gradient-primary label-caps rounded-xl px-3 py-2 text-[10px] text-primary-foreground md:col-span-2">SALVAR RECEITA</button>
    </div></Panel>
    <Panel title={`RECEITAS — ${month}`} aside={<input value={search} onChange={e => setSearch(e.target.value)} placeholder="BUSCAR..." className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs" />}>
      {tx.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">CARREGANDO...</p> : visible.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">NENHUMA RECEITA CADASTRADA NESTE MÊS.</p> : <ul className="divide-y divide-border">{visible.map(t => <li key={t.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="label-caps truncate text-[11px]">{t.description}</p><div className="mt-1 flex flex-wrap items-center gap-2"><Tag>{t.category}</Tag><PersonDot name={t.responsible} /><span className="text-[10px] text-muted-foreground">{t.pay_method}</span><span className="text-[10px] text-muted-foreground">{t.date}</span></div></div><div className="flex items-center gap-3"><p className="text-sm font-bold text-success">+{formatCurrency(Number(t.amount))}</p><button type="button" onClick={() => void removeRow(t)} className="text-xs text-danger">EXCLUIR</button></div></li>)}</ul>}
    </Panel></div>;
}
