import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag, PersonDot } from "@/components/ui-kit";
import { formatCurrency, evaluateAmount } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useHouseholdMembers } from "@/hooks/use-household-members";

export const Route = createFileRoute("/fluxo")({
  head: () => ({ meta: [{ title: "FLUXO MENSAL — MULTICAP" }, { name: "description", content: "Lance receitas, despesas, transferências e investimentos do mês." }] }),
  component: FlowPage,
});

type TxType = "RECEITA" | "DESPESA" | "TRANSFERENCIA" | "INVESTIMENTO";
type Row = { id: string; date: string; description: string; category: string; pay_method: string; responsible: string; amount: number; type: TxType; paid: boolean; household_id: string };
const TYPES: TxType[] = ["RECEITA", "DESPESA", "TRANSFERENCIA", "INVESTIMENTO"];
const typeColor: Record<TxType, string> = { RECEITA: "text-success", DESPESA: "text-danger", TRANSFERENCIA: "text-info", INVESTIMENTO: "text-primary" };

function FlowPage() {
  const { rows, insert, update, remove, isLoading } = useHouseholdTable<Row>("transactions", "id,date,description,category,pay_method,responsible,amount,type,paid,household_id");
  const { data: members = [] } = useHouseholdMembers();
  const [type, setType] = useState<TxType>("DESPESA");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("ALIMENTAÇÃO");
  const [responsible, setResponsible] = useState("AMBAS");
  const [filter, setFilter] = useState<"TODOS" | TxType>("TODOS");
  const [search, setSearch] = useState("");
  const parsed = evaluateAmount(amount);

  useEffect(() => {
    const requestedType = new URLSearchParams(window.location.search).get("tipo")?.toUpperCase();
    if (requestedType === "DESPESA" || requestedType === "RECEITA" || requestedType === "TRANSFERENCIA" || requestedType === "INVESTIMENTO") setType(requestedType);
  }, []);

  const totals = useMemo(() => ({
    income: rows.filter(t => t.type === "RECEITA").reduce((s,t) => s + Number(t.amount), 0),
    expense: rows.filter(t => t.type === "DESPESA").reduce((s,t) => s + Number(t.amount), 0),
    invested: rows.filter(t => t.type === "INVESTIMENTO").reduce((s,t) => s + Number(t.amount), 0),
  }), [rows]);
  const visible = rows.filter(t => (filter === "TODOS" || t.type === filter) && t.description.toLowerCase().includes(search.toLowerCase()));

  async function add() {
    if (!description.trim() || !parsed || parsed <= 0) return toast.error("PREENCHA DESCRIÇÃO E VALOR");
    try {
      await insert({ date: new Date().toISOString().slice(0,10), description: description.trim().toUpperCase(), amount: parsed, type, category, pay_method: "PIX", responsible, paid: true });
      setDescription(""); setAmount(""); toast.success("LANÇAMENTO SALVO");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar"); }
  }
  async function togglePaid(t: Row) { try { await update(t.id, { paid: !t.paid }); } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível atualizar"); } }
  async function removeRow(t: Row) { if (!window.confirm(`Excluir ${t.description}?`)) return; try { await remove(t.id); toast.success("LANÇAMENTO EXCLUÍDO"); } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível excluir"); } }

  return <div className="space-y-5">
    <PageHeader title="FLUXO MENSAL" subtitle="Lançamentos à vista, receitas e transferências." />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="RECEITAS" value={formatCurrency(totals.income)} tone="success" /><StatCard label="DESPESAS" value={formatCurrency(totals.expense)} tone="danger" /><StatCard label="INVESTIDO" value={formatCurrency(totals.invested)} tone="primary" /><StatCard label="RESULTADO" value={formatCurrency(totals.income - totals.expense)} tone={totals.income - totals.expense >= 0 ? "success" : "danger"} /></div>
    <Panel title="CADASTRO RÁPIDO">
      <div className="mb-3 flex flex-wrap gap-2">{TYPES.map(t => <button key={t} type="button" onClick={() => setType(t)} className={cn("label-caps rounded-lg border px-3 py-1.5 text-[10px]", type === t ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>{t}</button>)}</div>
      <div className="grid gap-3 md:grid-cols-4">
        <label className="md:col-span-2"><span className="label-caps text-[10px] text-muted-foreground">DESCRIÇÃO</span><input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Mercado, salário, aluguel…" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" /></label>
        <label><span className="label-caps text-[10px] text-muted-foreground">VALOR</span><input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="120 / 3" inputMode="text" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />{parsed !== null && <span className="mt-1 block text-[10px] text-primary">= {formatCurrency(parsed)}</span>}</label>
        <label><span className="label-caps text-[10px] text-muted-foreground">CATEGORIA</span><select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option>ALIMENTAÇÃO</option><option>MORADIA</option><option>TRANSPORTE</option><option>LAZER</option><option>SAÚDE</option><option>RENDA</option><option>OUTROS</option></select></label>
        <label><span className="label-caps text-[10px] text-muted-foreground">RESPONSÁVEL</span><select value={responsible} onChange={e=>setResponsible(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option value="AMBAS">AMBOS / COMPARTILHADO</option>{members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select></label>
        <button type="button" onClick={add} className="gradient-primary label-caps mt-auto rounded-xl px-4 py-2.5 text-[11px] text-primary-foreground md:col-span-2">SALVAR LANÇAMENTO</button>
      </div>
    </Panel>
    <Panel title="LANÇAMENTOS" aside={<div className="flex flex-wrap items-center gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar…" className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs" /><select value={filter} onChange={e=>setFilter(e.target.value as typeof filter)} className="label-caps rounded-lg border border-input bg-background px-2 py-1.5 text-[10px]">{["TODOS",...TYPES].map(f=><option key={f}>{f}</option>)}</select></div>}>
      {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando lançamentos...</p> : visible.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum lançamento cadastrado.</p> : <ul className="divide-y divide-border">{visible.map(t=><li key={t.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="label-caps truncate text-[11px]">{t.description}</p><div className="mt-1 flex flex-wrap items-center gap-2"><Tag>{t.category}</Tag><PersonDot name={t.responsible}/><span className="text-[10px] text-muted-foreground">{t.pay_method}</span></div></div><div className="flex items-center gap-3 text-right"><div><p className={cn("text-sm font-bold", typeColor[t.type])}>{t.type === "RECEITA" ? "+" : "-"}{formatCurrency(Number(t.amount))}</p><button type="button" onClick={()=>togglePaid(t)}><Tag tone={t.paid ? "success" : "warning"}>{t.paid ? "PAGO" : "PENDENTE"}</Tag></button></div><button type="button" onClick={()=>removeRow(t)} className="text-xs text-danger">Excluir</button></div></li>)}</ul>}
    </Panel>
  </div>;
}
