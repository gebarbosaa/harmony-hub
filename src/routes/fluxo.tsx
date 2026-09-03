import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, CalendarDays, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader, Panel, StatCard, Tag, PersonDot } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { useHouseholdTable } from "@/hooks/use-household-data";

export const Route = createFileRoute("/fluxo")({
  head: () => ({ meta: [{ title: "FLUXO — HARMONY HUB" }, { name: "description", content: "Fluxo financeiro consolidado por período." }] }),
  component: FluxoPage,
});

type Tx = { id: string; date: string; description: string; category: string; pay_method: string; responsible: string; amount: number; type: "RECEITA" | "DESPESA" | "TRANSFERENCIA" | "INVESTIMENTO"; paid: boolean; household_id: string };
type Period = "HOJE" | "SEMANA" | "MES" | "ANO";

const amountSign = (type: Tx["type"]) => type === "RECEITA" ? 1 : type === "DESPESA" || type === "INVESTIMENTO" ? -1 : 0;
const typeLabel = (type: Tx["type"]) => type === "RECEITA" ? "RECEITA" : type === "DESPESA" ? "DESPESA" : type === "INVESTIMENTO" ? "INVESTIMENTO" : "TRANSFERÊNCIA";

function FluxoPage() {
  const tx = useHouseholdTable<Tx>("transactions", "id,date,description,category,pay_method,responsible,amount,type,paid,household_id", "date");
  const [period, setPeriod] = useState<Period>("MES");
  const [typeFilter, setTypeFilter] = useState<"TODOS" | Tx["type"]>("TODOS");
  const [search, setSearch] = useState("");

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const monthKey = todayKey.slice(0, 7);
  const yearKey = todayKey.slice(0, 4);
  const startOfWeek = new Date(today);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const weekStart = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, "0")}-${String(startOfWeek.getDate()).padStart(2, "0")}`;

  const visible = useMemo(() => tx.rows.filter(row => {
    if (!row.date) return false;
    const inPeriod = period === "HOJE" ? row.date === todayKey : period === "SEMANA" ? row.date >= weekStart && row.date <= todayKey : period === "MES" ? row.date.startsWith(monthKey) : row.date.startsWith(yearKey);
    const inType = typeFilter === "TODOS" || row.type === typeFilter;
    const needle = search.trim().toLowerCase();
    const inSearch = !needle || `${row.description} ${row.category} ${row.pay_method} ${row.responsible}`.toLowerCase().includes(needle);
    return inPeriod && inType && inSearch;
  }).sort((a, b) => b.date.localeCompare(a.date)), [tx.rows, period, typeFilter, search, todayKey, monthKey, yearKey, weekStart]);

  const income = visible.filter(t => t.type === "RECEITA").reduce((s, t) => s + Number(t.amount), 0);
  const expenses = visible.filter(t => t.type === "DESPESA").reduce((s, t) => s + Number(t.amount), 0);
  const investments = visible.filter(t => t.type === "INVESTIMENTO").reduce((s, t) => s + Number(t.amount), 0);
  const net = visible.reduce((s, t) => s + Number(t.amount) * amountSign(t.type), 0);

  const grouped = useMemo(() => {
    const groups = new Map<string, Tx[]>();
    visible.forEach(row => groups.set(row.date, [...(groups.get(row.date) ?? []), row]));
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [visible]);

  return <div className="space-y-5">
    <PageHeader title="FLUXO" subtitle="TODAS AS MOVIMENTAÇÕES FINANCEIRAS ORGANIZADAS POR PERÍODO." />
    <div className="flex flex-wrap gap-2">
      {(["HOJE", "SEMANA", "MES", "ANO"] as Period[]).map(item => <button key={item} type="button" onClick={() => setPeriod(item)} className={cn("label-caps rounded-lg border px-3 py-2 text-[10px]", period === item ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{item === "MES" ? "MÊS" : item}</button>)}
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="RECEITAS" value={formatCurrency(income)} tone="success" />
      <StatCard label="DESPESAS" value={formatCurrency(expenses)} tone="danger" />
      <StatCard label="INVESTIMENTOS" value={formatCurrency(investments)} tone="info" />
      <StatCard label="SALDO DO FLUXO" value={formatCurrency(net)} tone={net >= 0 ? "success" : "danger"} />
    </div>
    <Panel>
      <div className="flex flex-col gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="BUSCAR NO FLUXO..." className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
        <div className="flex flex-wrap gap-2">
          {(["TODOS", "RECEITA", "DESPESA", "INVESTIMENTO", "TRANSFERENCIA"] as const).map(item => <button key={item} type="button" onClick={() => setTypeFilter(item === "TODOS" ? "TODOS" : item)} className={cn("label-caps rounded-lg border px-3 py-2 text-[10px]", typeFilter === item ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{item === "TODOS" ? "TODOS" : typeLabel(item)}</button>)}
        </div>
      </div>
    </Panel>
    <Panel title={period === "ANO" ? `FLUXO — ${yearKey}` : period === "MES" ? `FLUXO — ${monthKey}` : "FLUXO DO PERÍODO"}>
      {tx.isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">CARREGANDO FLUXO...</p> : grouped.length === 0 ? <div className="py-12 text-center"><Wallet className="mx-auto mb-3 h-8 w-8 text-muted-foreground"/><p className="text-sm font-semibold">NENHUMA MOVIMENTAÇÃO</p><p className="mt-1 text-xs text-muted-foreground">Receitas, despesas, investimentos e transferências aparecerão aqui.</p></div> : <div className="space-y-5">{grouped.map(([date, rows]) => { const dayTotal = rows.reduce((s, t) => s + Number(t.amount) * amountSign(t.type), 0); return <section key={date}><div className="mb-2 flex items-center justify-between border-b border-border pb-2"><span className="label-caps flex items-center gap-1 text-[11px] text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</span><span className={cn("text-xs font-bold", dayTotal >= 0 ? "text-success" : "text-danger")}>{dayTotal >= 0 ? "+" : "-"}{formatCurrency(Math.abs(dayTotal))}</span></div><div className="divide-y divide-border">{rows.map(t => <div key={t.id} className="flex items-center gap-3 py-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{t.type === "RECEITA" ? <ArrowUpCircle className="h-4 w-4" /> : t.type === "DESPESA" || t.type === "INVESTIMENTO" ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowLeftRight className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{t.description}</p><div className="mt-1 flex flex-wrap items-center gap-2"><Tag>{t.category}</Tag><PersonDot name={t.responsible} /><span className="text-[10px] text-muted-foreground">{t.pay_method}</span></div></div><div className="text-right"><p className={cn("text-sm font-bold", t.type === "RECEITA" ? "text-success" : t.type === "DESPESA" || t.type === "INVESTIMENTO" ? "text-danger" : "text-foreground")}>{amountSign(t.type) > 0 ? "+" : amountSign(t.type) < 0 ? "-" : ""}{formatCurrency(Math.abs(Number(t.amount)))}</p><Tag tone={t.paid ? "success" : "warning"}>{t.paid ? "PAGO" : "PENDENTE"}</Tag></div></div>)}</div></section> })}</div>}
    </Panel>
  </div>;
}
