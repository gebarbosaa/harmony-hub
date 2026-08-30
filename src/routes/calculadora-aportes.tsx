import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel } from "@/components/ui-kit";
import { formatCurrency, requiredMonthlyContribution, futureValue, monthsToTarget } from "@/lib/finance";

export const Route = createFileRoute("/calculadora-aportes")({
  head: () => ({ meta: [{ title: "CALCULADORA DE APORTES — MULTICAP" }] }),
  component: ContributionCalculatorPage,
});

function ContributionCalculatorPage() {
  const [target, setTarget] = useState(100000);
  const [initial, setInitial] = useState(0);
  const [months, setMonths] = useState(60);
  const [rate, setRate] = useState(10);
  const [monthly, setMonthly] = useState(1000);
  const annual = rate / 100;

  return <div className="space-y-5">
    <PageHeader title="CALCULADORA DE APORTES" subtitle="PLANEJE QUANTO INVESTIR POR MÊS PARA ATINGIR SEUS OBJETIVOS." />
    <Panel title="SIMULADOR DE APORTES">
      <div className="grid gap-3 md:grid-cols-5">
        {[["OBJETIVO", target, setTarget], ["VALOR INICIAL", initial, setInitial], ["PRAZO (MESES)", months, setMonths], ["TAXA A.A. (%)", rate, setRate], ["APORTE MENSAL", monthly, setMonthly]].map(([label, value, setter]) => <label key={String(label)}>
          <span className="label-caps text-[10px] text-muted-foreground">{String(label)}</span>
          <input type="number" value={value as number} onChange={e => (setter as (v: number) => void)(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
        </label>)}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="gradient-soft rounded-xl border border-primary/40 p-4"><p className="label-caps text-[10px] text-muted-foreground">APORTE NECESSÁRIO</p><p className="mt-1 text-lg font-bold text-primary">{formatCurrency(requiredMonthlyContribution(target, initial, months, annual))}</p></div>
        <div className="rounded-xl border border-border bg-secondary/40 p-4"><p className="label-caps text-[10px] text-muted-foreground">MONTANTE FINAL</p><p className="mt-1 text-lg font-bold">{formatCurrency(futureValue(monthly, initial, months, annual))}</p></div>
        <div className="rounded-xl border border-border bg-secondary/40 p-4"><p className="label-caps text-[10px] text-muted-foreground">TEMPO NECESSÁRIO</p><p className="mt-1 text-lg font-bold">{monthsToTarget(target, monthly, initial, annual)} meses</p></div>
      </div>
    </Panel>
  </div>;
}
