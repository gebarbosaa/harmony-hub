import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Panel } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { MonthSelector, useGlobalMonth } from "@/hooks/use-global-month";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendario")({
  head: () => ({ meta: [{ title: "CALENDÁRIO — MULTICAP" }] }),
  component: CalendarPage,
});

type Tx = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  responsible: string;
  type: string;
  paid: boolean;
  household_id: string;
};

const WEEK = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function CalendarPage() {
  const { month, setMonth } = useGlobalMonth("calendario");
  const [selected, setSelected] = useState<number | null>(null);
  const tx = useHouseholdTable<Tx>(
    "transactions",
    "id,date,description,amount,category,responsible,type,paid,household_id",
    "date",
  );

  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const days = new Date(year, monthNumber, 0).getDate();
  const first = new Date(year, monthNumber - 1, 1).getDay();
  const monthly = useMemo(() => tx.rows.filter((t) => t.date.startsWith(month)), [tx.rows, month]);

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const spendByDay = useMemo(() => {
    const map = new Map<number, number>();
    monthly.filter((t) => t.type === "DESPESA").forEach((t) => {
      const day = Number(t.date.slice(-2));
      map.set(day, (map.get(day) ?? 0) + Number(t.amount));
    });
    return map;
  }, [monthly]);

  const incomeByDay = useMemo(() => {
    const map = new Map<number, number>();
    monthly.filter((t) => t.type === "RECEITA").forEach((t) => {
      const day = Number(t.date.slice(-2));
      map.set(day, (map.get(day) ?? 0) + Number(t.amount));
    });
    return map;
  }, [monthly]);

  const payableByDay = useMemo(() => {
    const map = new Map<number, number>();
    monthly.filter((t) => t.type === "DESPESA" && !t.paid).forEach((t) => {
      const day = Number(t.date.slice(-2));
      map.set(day, (map.get(day) ?? 0) + Number(t.amount));
    });
    return map;
  }, [monthly]);

  const selectedDay = selected ?? (month === todayKey.slice(0, 7) ? now.getDate() : 1);
  const selectedKey = `${month}-${String(selectedDay).padStart(2, "0")}`;
  const selectedTx = monthly.filter((t) => t.date === selectedKey);
  const selectedSpend = selectedTx.filter((t) => t.type === "DESPESA").reduce((s, t) => s + Number(t.amount), 0);
  const selectedIncome = selectedTx.filter((t) => t.type === "RECEITA").reduce((s, t) => s + Number(t.amount), 0);
  const selectedPayable = selectedTx.filter((t) => t.type === "DESPESA" && !t.paid).reduce((s, t) => s + Number(t.amount), 0);

  function openMovements(day: number) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    setSelected(day);
    window.location.assign(`/movimentacoes?date=${date}`);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="CALENDÁRIO"
        subtitle="VISÃO FINANCEIRA DIÁRIA: GASTOS, RECEBIMENTOS E CONTAS A PAGAR."
        action={<MonthSelector month={month} setMonth={setMonth} />}
      />

      <Panel>
        <div className="mb-3 flex flex-wrap gap-3 text-[9px] font-semibold uppercase tracking-wide">
          <span className="text-danger">● GASTOS</span>
          <span className="text-success">● RECEBIMENTOS</span>
          <span className="text-warning">● A PAGAR</span>
        </div>
        <div className="mb-2 grid grid-cols-7 gap-1.5">
          {WEEK.map((day) => <span key={day} className="label-caps text-center text-[10px] text-muted-foreground">{day}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: first }).map((_, i) => <span key={`empty-${i}`} />)}
          {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
            const dayKey = `${month}-${String(day).padStart(2, "0")}`;
            const spend = spendByDay.get(day) ?? 0;
            const income = incomeByDay.get(day) ?? 0;
            const payable = payableByDay.get(day) ?? 0;
            const isToday = dayKey === todayKey;
            const isSelected = selectedDay === day;
            return (
              <button
                type="button"
                key={day}
                onClick={() => openMovements(day)}
                className={cn(
                  "relative flex min-h-[92px] flex-col items-center justify-start gap-1 rounded-xl border p-2 text-[11px] transition-all hover:border-primary hover:bg-primary/5",
                  isToday ? "border-primary ring-2 ring-primary" : "border-border/60",
                  isSelected && !isToday && "ring-2 ring-primary",
                )}
              >
                <span className="font-bold">{day}</span>
                {spend > 0 && <span className="max-w-full truncate text-[8px] font-semibold text-danger">− {formatCurrency(spend)}</span>}
                {income > 0 && <span className="max-w-full truncate text-[8px] font-semibold text-success">+ {formatCurrency(income)}</span>}
                {payable > 0 && <span className="max-w-full truncate text-[8px] font-semibold text-warning">A PAGAR {formatCurrency(payable)}</span>}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title={`${selectedKey} — RESUMO FINANCEIRO`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <p className="label-caps text-[10px] text-muted-foreground">GASTOS</p>
            <p className="mt-1 text-sm font-bold text-danger">{formatCurrency(selectedSpend)}</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <p className="label-caps text-[10px] text-muted-foreground">RECEBIMENTOS</p>
            <p className="mt-1 text-sm font-bold text-success">{formatCurrency(selectedIncome)}</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-3">
            <p className="label-caps text-[10px] text-muted-foreground">A PAGAR</p>
            <p className="mt-1 text-sm font-bold text-warning">{formatCurrency(selectedPayable)}</p>
          </div>
        </div>
        <button type="button" onClick={() => openMovements(selectedDay)} className="gradient-primary mt-4 w-full rounded-xl px-4 py-2.5 text-[10px] font-semibold text-primary-foreground">
          VER MOVIMENTAÇÕES DESTE DIA
        </button>
      </Panel>
    </div>
  );
}
