import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, ProgressBar, StatCard, Tag, PersonDot } from "@/components/ui-kit";
import { installments } from "@/lib/mock-data";
import { formatCurrency, calculateInstallmentValue } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parcelados")({
  head: () => ({
    meta: [
      { title: "PARCELADOS — MULTICAP" },
      { name: "description", content: "Controle de compras a prazo, parcelas pagas e valor restante." },
      { property: "og:title", content: "PARCELADOS — MULTICAP" },
      {
        property: "og:description",
        content: "Controle de compras a prazo, parcelas pagas e valor restante.",
      },
    ],
  }),
  component: InstallmentsPage,
});

function InstallmentsPage() {
  const [card, setCard] = useState("TODOS");
  const list = installments.filter((i) => card === "TODOS" || i.card === card);
  const active = list.filter((i) => i.paid < i.count);
  const monthly = active.reduce((s, i) => s + calculateInstallmentValue(i.total, i.count), 0);
  const remaining = active.reduce(
    (s, i) => s + calculateInstallmentValue(i.total, i.count) * (i.count - i.paid),
    0,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="PARCELADOS"
        subtitle="Compras a prazo e impacto nos próximos meses."
        action={
          <select
            value={card}
            onChange={(e) => setCard(e.target.value)}
            className="label-caps rounded-lg border border-input bg-background px-3 py-2 text-[10px]"
          >
            {["TODOS", "NUBANK", "INTER"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="PARCELAS DO MÊS" value={formatCurrency(monthly)} tone="primary" />
        <StatCard label="RESTANTE TOTAL" value={formatCurrency(remaining)} tone="danger" />
        <StatCard label="COMPRAS ATIVAS" value={String(active.length)} tone="info" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((i) => {
          const value = calculateInstallmentValue(i.total, i.count);
          const done = i.paid >= i.count;
          const percent = (i.paid / i.count) * 100;
          return (
            <Panel key={i.id} className={cn(done && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="label-caps text-sm">{i.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Tag tone="primary">{i.card}</Tag>
                    <Tag>{i.category}</Tag>
                    <PersonDot name={i.responsible} />
                  </div>
                </div>
                <Tag tone={done ? "success" : "warning"}>
                  {done ? "QUITADO" : `PARCELA ${i.paid + 1}/${i.count}`}
                </Tag>
              </div>
              <div className="mt-4 space-y-2">
                <ProgressBar percent={percent} tone="primary" />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{formatCurrency(value)} POR MÊS</span>
                  <span>
                    RESTANTE: {formatCurrency(Math.max(value * (i.count - i.paid), 0))}
                  </span>
                </div>
              </div>
              {!done ? (
                <div className="mt-3 flex gap-2">
                  <button className="label-caps rounded-lg border border-primary/60 px-3 py-1.5 text-[10px] text-primary">
                    MARCAR PARCELA PAGA
                  </button>
                  <button className="label-caps rounded-lg border border-border px-3 py-1.5 text-[10px] text-muted-foreground">
                    ANTECIPAR
                  </button>
                </div>
              ) : null}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
