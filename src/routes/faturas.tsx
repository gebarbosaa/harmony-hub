import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, ProgressBar, StatCard, Tag } from "@/components/ui-kit";
import { cards } from "@/lib/mock-data";
import { formatCurrency, calculateInvoiceTotal } from "@/lib/finance";

export const Route = createFileRoute("/faturas")({
  head: () => ({
    meta: [
      { title: "FATURAS — MULTICAP" },
      { name: "description", content: "Faturas dos cartões com extrato unificado de compras, parcelas e fixos." },
      { property: "og:title", content: "FATURAS — MULTICAP" },
      {
        property: "og:description",
        content: "Faturas dos cartões com extrato unificado de compras, parcelas e fixos.",
      },
    ],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const total = cards.reduce(
    (s, c) => s + calculateInvoiceTotal(c.purchases, c.installments, c.fixed),
    0,
  );

  return (
    <div className="space-y-5">
      <PageHeader title="FATURAS" subtitle="Cartões, limites e extrato unificado do mês." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="TOTAL EM FATURAS" value={formatCurrency(total)} tone="primary" />
        <StatCard
          label="LIMITE DISPONÍVEL"
          value={formatCurrency(cards.reduce((s, c) => s + (c.limit - c.used), 0))}
          tone="success"
        />
        <StatCard label="CARTÕES ATIVOS" value={String(cards.length)} tone="info" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => {
          const invoice = calculateInvoiceTotal(c.purchases, c.installments, c.fixed);
          return (
            <Panel key={c.id}>
              <div className="gradient-primary shadow-elegant rounded-2xl p-4 text-primary-foreground">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="label-caps text-sm">{c.name}</p>
                    <p className="text-[11px] opacity-80">
                      {c.brand} · •••• {c.last4}
                    </p>
                  </div>
                  <span className="label-caps rounded-md bg-background/25 px-2 py-1 text-[10px]">
                    {c.status}
                  </span>
                </div>
                <p className="mt-6 text-2xl font-black">{formatCurrency(invoice)}</p>
                <p className="text-[11px] opacity-80">
                  FECHA DIA {c.close} · VENCE DIA {c.due}
                </p>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span className="label-caps">LIMITE UTILIZADO</span>
                  <span>
                    {formatCurrency(c.used)} / {formatCurrency(c.limit)}
                  </span>
                </div>
                <ProgressBar percent={(c.used / c.limit) * 100} />
              </div>

              <div className="mt-4 space-y-2">
                <p className="label-caps text-[10px] text-muted-foreground">EXTRATO UNIFICADO</p>
                {[
                  ["COMPRAS À VISTA", c.purchases],
                  ["PARCELAS ATIVAS", c.installments],
                  ["CUSTOS FIXOS DO CARTÃO", c.fixed],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2"
                  >
                    <span className="label-caps text-[10px] text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold">{formatCurrency(Number(value))}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <Tag tone={c.status === "ABERTA" ? "warning" : "info"}>{c.status}</Tag>
                <button className="label-caps ml-auto rounded-lg border border-primary/60 px-3 py-1.5 text-[10px] text-primary">
                  MARCAR COMO PAGA
                </button>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
