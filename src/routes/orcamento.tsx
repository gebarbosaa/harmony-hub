import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, ProgressBar, StatCard, Tag } from "@/components/ui-kit";
import { categoryDistribution } from "@/lib/mock-data";
import { formatCurrency, calculateBudgetUsage } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orcamento")({
  head: () => ({
    meta: [
      { title: "ORÇAMENTO MENSAL — MULTICAP" },
      { name: "description", content: "Tetos de gasto por categoria com alertas configuráveis." },
      { property: "og:title", content: "ORÇAMENTO MENSAL — MULTICAP" },
      {
        property: "og:description",
        content: "Tetos de gasto por categoria com alertas configuráveis.",
      },
    ],
  }),
  component: BudgetPage,
});

const ALERTS = [50, 75, 90, 100];

function BudgetPage() {
  const [alerts, setAlerts] = useState<number[]>([75, 100]);
  const spent = categoryDistribution.reduce((s, c) => s + c.value, 0);
  const budget = categoryDistribution.reduce((s, c) => s + c.budget, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="ORÇAMENTO MENSAL" subtitle="Defina o teto de gastos de cada categoria." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="ORÇADO" value={formatCurrency(budget)} tone="primary" />
        <StatCard label="GASTO" value={formatCurrency(spent)} tone="danger" />
        <StatCard label="DISPONÍVEL" value={formatCurrency(budget - spent)} tone="success" />
        <StatCard
          label="UTILIZADO"
          value={`${Math.round(calculateBudgetUsage(spent, budget))}%`}
          tone="info"
        />
      </div>

      <Panel title="CATEGORIAS">
        <div className="space-y-5">
          {categoryDistribution.map((cat) => {
            const usage = calculateBudgetUsage(cat.value, cat.budget);
            const over = cat.value > cat.budget;
            return (
              <div key={cat.name} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="label-caps text-[11px]">{cat.name}</span>
                  <span className="text-sm font-semibold">
                    {formatCurrency(cat.value)}{" "}
                    <span className="text-muted-foreground">/ {formatCurrency(cat.budget)}</span>
                  </span>
                </div>
                <ProgressBar percent={usage} />
                <div className="flex items-center justify-between text-[11px]">
                  <span className={cn(over ? "text-danger" : "text-muted-foreground")}>
                    {Math.round(usage)}% UTILIZADO
                  </span>
                  <span className={over ? "text-danger" : "text-success"}>
                    {over
                      ? `EXCEDIDO EM ${formatCurrency(cat.value - cat.budget)}`
                      : `RESTAM ${formatCurrency(cat.budget - cat.value)}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="ALERTAS CONFIGURÁVEIS">
        <div className="flex flex-wrap gap-2">
          {ALERTS.map((a) => {
            const active = alerts.includes(a);
            return (
              <button
                key={a}
                onClick={() =>
                  setAlerts((prev) => (active ? prev.filter((x) => x !== a) : [...prev, a]))
                }
                className={cn(
                  "label-caps rounded-xl border px-4 py-2 text-[11px] transition-colors",
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {a}%
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Você será avisado quando o consumo de qualquer categoria atingir os limites selecionados.
        </p>
        <div className="mt-3 flex gap-2">
          <Tag tone="warning">PRÓXIMO DO LIMITE</Tag>
          <Tag tone="danger">ACIMA DO ORÇAMENTO</Tag>
        </div>
      </Panel>
    </div>
  );
}
