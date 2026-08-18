import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, Panel, ProgressBar, StatCard, Tag } from "@/components/ui-kit";
import { investments, portfolioEvolution } from "@/lib/mock-data";
import {
  formatCurrency,
  requiredMonthlyContribution,
  futureValue,
  monthsToTarget,
} from "@/lib/finance";

export const Route = createFileRoute("/investimentos")({
  head: () => ({
    meta: [
      { title: "INVESTIMENTOS — MULTICAP" },
      { name: "description", content: "Carteira, rentabilidade e calculadora de aportes do casal." },
      { property: "og:title", content: "INVESTIMENTOS — MULTICAP" },
      {
        property: "og:description",
        content: "Carteira, rentabilidade e calculadora de aportes do casal.",
      },
    ],
  }),
  component: InvestmentsPage,
});

function InvestmentsPage() {
  const invested = investments.reduce((s, i) => s + i.invested, 0);
  const current = investments.reduce((s, i) => s + i.current, 0);
  const profit = current - invested;

  const [target, setTarget] = useState(100000);
  const [initial, setInitial] = useState(20000);
  const [months, setMonths] = useState(60);
  const [rate, setRate] = useState(10);
  const [monthly, setMonthly] = useState(1000);

  const annual = rate / 100;

  return (
    <div className="space-y-5">
      <PageHeader title="INVESTIMENTOS" subtitle="Carteira consolidada e simulações de aporte." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="VALOR APLICADO" value={formatCurrency(invested)} tone="info" />
        <StatCard label="VALOR ATUAL" value={formatCurrency(current)} tone="primary" />
        <StatCard label="RESULTADO" value={formatCurrency(profit)} tone="success" />
        <StatCard
          label="RENTABILIDADE"
          value={`${((profit / invested) * 100).toFixed(1)}%`}
          tone="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="EVOLUÇÃO DA CARTEIRA" className="lg:col-span-2">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioEvolution}>
                <defs>
                  <linearGradient id="g-port" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--orange-primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--orange-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} width={56} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatCurrency(v)}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="var(--orange-primary)"
                  strokeWidth={2.5}
                  fill="url(#g-port)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="DISTRIBUIÇÃO POR ATIVO">
          <div className="space-y-4">
            {investments.map((i) => (
              <div key={i.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="label-caps text-[11px]">{i.name}</span>
                  <span className="text-xs font-semibold">{formatCurrency(i.current)}</span>
                </div>
                <ProgressBar percent={(i.current / current) * 100} tone="primary" />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <Tag>{i.type}</Tag>
                  <span className="text-success">
                    +{(((i.current - i.invested) / i.invested) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="CALCULADORA DE APORTES">
        <div className="grid gap-3 md:grid-cols-5">
          {[
            ["OBJETIVO", target, setTarget],
            ["VALOR INICIAL", initial, setInitial],
            ["PRAZO (MESES)", months, setMonths],
            ["TAXA A.A. (%)", rate, setRate],
            ["APORTE MENSAL", monthly, setMonthly],
          ].map(([label, value, setter]) => (
            <label key={String(label)}>
              <span className="label-caps text-[10px] text-muted-foreground">{String(label)}</span>
              <input
                type="number"
                value={value as number}
                onChange={(e) => (setter as (v: number) => void)(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="gradient-soft rounded-xl border border-primary/40 p-4">
            <p className="label-caps text-[10px] text-muted-foreground">APORTE NECESSÁRIO</p>
            <p className="mt-1 text-lg font-bold text-primary">
              {formatCurrency(requiredMonthlyContribution(target, initial, months, annual))}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <p className="label-caps text-[10px] text-muted-foreground">MONTANTE FINAL</p>
            <p className="mt-1 text-lg font-bold">
              {formatCurrency(futureValue(monthly, initial, months, annual))}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <p className="label-caps text-[10px] text-muted-foreground">TEMPO NECESSÁRIO</p>
            <p className="mt-1 text-lg font-bold">
              {monthsToTarget(target, monthly, initial, annual)} meses
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Os resultados são estimativas e não constituem recomendação financeira.
        </p>
      </Panel>
    </div>
  );
}
