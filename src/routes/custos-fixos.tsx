import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, StatCard, Tag, PersonDot } from "@/components/ui-kit";
import { fixedCosts } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/custos-fixos")({
  head: () => ({
    meta: [
      { title: "CUSTOS FIXOS — MULTICAP" },
      { name: "description", content: "Controle de despesas recorrentes e matriz anual de meses ativos." },
      { property: "og:title", content: "CUSTOS FIXOS — MULTICAP" },
      {
        property: "og:description",
        content: "Controle de despesas recorrentes e matriz anual de meses ativos.",
      },
    ],
  }),
  component: FixedCostsPage,
});

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function FixedCostsPage() {
  const monthly = fixedCosts.filter((f) => f.months[7]).reduce((s, f) => s + f.amount, 0);
  const annual = fixedCosts.reduce(
    (s, f) => s + f.amount * f.months.filter(Boolean).length,
    0,
  );

  return (
    <div className="space-y-5">
      <PageHeader title="CUSTOS FIXOS" subtitle="Despesas recorrentes e recorrência anual." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="TOTAL DO MÊS" value={formatCurrency(monthly)} tone="primary" />
        <StatCard label="CUSTO ANUAL ESTIMADO" value={formatCurrency(annual)} tone="info" />
        <StatCard label="DESPESAS ATIVAS" value={String(fixedCosts.length)} tone="success" />
      </div>

      <Panel title="DESPESAS RECORRENTES">
        <div className="space-y-3">
          {fixedCosts.map((f) => (
            <div key={f.id} className="rounded-xl border border-border bg-secondary/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="label-caps text-[12px]">{f.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Tag>{f.category}</Tag>
                    <Tag tone="warning">DIA {f.day}</Tag>
                    <PersonDot name={f.responsible} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatCurrency(f.amount)}</p>
                  <div className="mt-1 flex gap-2">
                    <button className="label-caps text-[10px] text-primary">PAUSAR</button>
                    <button className="label-caps text-[10px] text-danger">ENCERRAR</button>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-12 gap-1">
                {MONTHS.map((m, i) => (
                  <div
                    key={m}
                    className={cn(
                      "label-caps rounded-md py-1 text-center text-[8px]",
                      f.months[i]
                        ? "gradient-primary text-primary-foreground"
                        : "bg-background text-muted-foreground",
                    )}
                  >
                    {m}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
