import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader, Panel, ProgressBar, StatCard, Tag, PersonDot } from "@/components/ui-kit";
import { goals } from "@/lib/mock-data";
import { formatCurrency, calculateGoalProgress } from "@/lib/finance";

export const Route = createFileRoute("/metas")({
  head: () => ({
    meta: [
      { title: "METAS E CAIXINHAS — MULTICAP" },
      { name: "description", content: "Objetivos financeiros, caixinhas compartilhadas e progresso." },
      { property: "og:title", content: "METAS E CAIXINHAS — MULTICAP" },
      {
        property: "og:description",
        content: "Objetivos financeiros, caixinhas compartilhadas e progresso.",
      },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const saved = goals.reduce((s, g) => s + g.current, 0);
  const target = goals.reduce((s, g) => s + g.target, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="METAS E CAIXINHAS" subtitle="Objetivos do casal e reservas individuais." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="GUARDADO" value={formatCurrency(saved)} tone="success" />
        <StatCard label="OBJETIVO TOTAL" value={formatCurrency(target)} tone="primary" />
        <StatCard
          label="APORTE MENSAL"
          value={formatCurrency(goals.reduce((s, g) => s + g.monthly, 0))}
          tone="info"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {goals.map((g) => {
          const percent = calculateGoalProgress(g.current, g.target);
          return (
            <Panel key={g.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="label-caps text-sm">{g.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Tag tone={g.shared ? "primary" : "neutral"}>
                      {g.shared ? "COMPARTILHADA" : "PRIVADA"}
                    </Tag>
                    <PersonDot name={g.responsible} />
                  </div>
                </div>
                <span className="label-caps text-xs text-primary">{Math.round(percent)}%</span>
              </div>
              <p className="mt-3 text-sm">
                {formatCurrency(g.current)}{" "}
                <span className="text-muted-foreground">/ {formatCurrency(g.target)}</span>
              </p>
              <div className="mt-2">
                <ProgressBar percent={percent} tone="primary" />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Aporte {formatCurrency(g.monthly)}/mês</span>
                <span>Previsão: {g.deadline}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => toast.success(`CONTRIBUIÇÃO ADICIONADA EM ${g.name}`)}
                  className="gradient-primary label-caps rounded-lg px-3 py-1.5 text-[10px] text-primary-foreground"
                >
                  ADICIONAR
                </button>
                <button className="label-caps rounded-lg border border-border px-3 py-1.5 text-[10px] text-muted-foreground">
                  RETIRAR
                </button>
                <button className="label-caps rounded-lg border border-border px-3 py-1.5 text-[10px] text-muted-foreground">
                  HISTÓRICO
                </button>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
