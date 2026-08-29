import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Search, CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader, Panel, StatCard, Tag, PersonDot } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { MonthSelector, useGlobalMonth } from "@/hooks/use-global-month";

export const Route = createFileRoute("/movimentacoes")({
  head: () => ({ meta: [{ title: "MOVIMENTAÇÕES — MULTICAP" }, { name: "description", content: "Extrato financeiro completo do MULTICAP." }] }),
  component: MovimentacoesPage,
});

type TxType = "RECEITA" | "DESPESA" | "TRANSFERENCIA" | "INVESTIMENTO";
type Row = { id: string; date: string; description: string; category: string; pay_method: string; responsible: string; amount: number; type: TxType; paid: boolean; household_id: string };

function MovimentacoesPage() {
  const { month, setMonth } = useGlobalMonth("movimentacoes");
  const tx = useHouseholdTable<Row>("transactions", "id,date,description,category,pay_method,responsible,amount,type,paid,household_id");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"TODOS" | TxType>("TODOS");

  const visible = useMemo(() => tx.rows
    .filter(t => t.date.startsWith(month))
    .filter(t => filter === "TODOS" || t.type === filter)
    .filter(t => `${t.description} ${t.category} ${t.pay_method} ${t.responsible}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [tx.rows, month, filter, search]);

  const totals = useMemo(() => ({
    income: visible.filter(t => t.type === "RECEITA").reduce((s, t) => s + Number(t.amount), 0),
    expense: visible.filter(t => t.type === "DESPESA").reduce((s, t) => s + Number(t.amount), 0),
    investment: visible.filter(t => t.type === "INVESTIMENTO").reduce((s, t) => s + Number(t.amount), 0),
  }), [visible]);

  return <div className="space-y-5">
    <PageHeader title="MOVIMENTAÇÕES" subtitle="EXTRATO COMPLETO DOS SEUS LANÇAMENTOS FINANCEIROS." action={<MonthSelector month={month} setMonth={setMonth} />} />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="ENTRADAS" value={formatCurrency(totals.income)} tone="success" />
      <StatCard label="SAÍDAS" value={formatCurrency(totals.expense)} tone="danger" />
      <StatCard label="INVESTIMENTOS" value={formatCurrency(totals.investment)} tone="primary" />
      <StatCard label="SALDO DO PERÍODO" value={formatCurrency(totals.income - totals.expense - totals.investment)} tone={totals.income - totals.expense - totals.investment >= 0 ? "success" : "danger"} />
    </div>
    <Panel>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="BUSCAR NO EXTRATO..." className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" /></div>
        <div className="flex flex-wrap gap-2">{(["TODOS", "RECEITA", "DESPESA", "INVESTIMENTO", "TRANSFERENCIA"] as const).map(f => <button key={f} type="button" onClick={() => setFilter(f)} className={cn("label-caps rounded-lg border px-3 py-2 text-[10px]", filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{f}</button>)}</div>
      </div>
    </Panel>
    <Panel title={`EXTRATO — ${month}`}>
      {tx.isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">CARREGANDO EXTRATO...</p> : visible.length === 0 ? <div className="py-12 text-center"><ArrowLeftRight className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="text-sm font-semibold">NENHUMA MOVIMENTAÇÃO ENCONTRADA</p><p className="mt-1 text-xs text-muted-foreground">Tente outro mês, filtro ou termo de busca.</p></div> : <div className="divide-y divide-border">{visible.map(t => { const positive = t.type === "RECEITA"; const negative = t.type === "DESPESA" || t.type === "INVESTIMENTO"; const Icon = positive ? ArrowDownLeft : negative ? ArrowUpRight : ArrowLeftRight; return <div key={t.id} className="flex items-center gap-3 py-3.5"><div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", positive ? "bg-success/10 text-success" : negative ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary")}><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{t.description}</p><div className="mt-1 flex flex-wrap items-center gap-2"><Tag>{t.category}</Tag><PersonDot name={t.responsible} /><span className="flex items-center gap-1 text-[10px] text-muted-foreground"><CalendarDays className="h-3 w-3" />{new Date(`${t.date}T12:00:00`).toLocaleDateString("pt-BR")}</span>{t.pay_method && <span className="text-[10px] text-muted-foreground">{t.pay_method}</span>}</div></div><div className="text-right"><p className={cn("text-sm font-bold", positive ? "text-success" : negative ? "text-danger" : "text-primary")}>{positive ? "+" : negative ? "-" : ""}{formatCurrency(Math.abs(Number(t.amount)))}</p><Tag tone={t.paid ? "success" : "warning"}>{t.paid ? "PAGO" : "PENDENTE"}</Tag></div></div> })}</div>}
    </Panel>
  </div>;
}
