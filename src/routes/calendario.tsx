import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, Tag } from "@/components/ui-kit";
import { dailySpend, transactions, appointments } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "CALENDÁRIO — MULTICAP" },
      { name: "description", content: "Mapa de calor de gastos e compromissos por dia do mês." },
      { property: "og:title", content: "CALENDÁRIO — MULTICAP" },
      {
        property: "og:description",
        content: "Mapa de calor de gastos e compromissos por dia do mês.",
      },
    ],
  }),
  component: CalendarPage,
});

const WEEK = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const TODAY = 18;
const DAYS = 31;
const FIRST_WEEKDAY = 6; // 1 de agosto de 2026 cai no sábado

function heatLevel(value: number) {
  if (value === 0) return 0;
  if (value < 100) return 1;
  if (value < 350) return 2;
  if (value < 900) return 3;
  return 4;
}

const HEAT = [
  "bg-secondary/40",
  "bg-primary/15",
  "bg-primary/35",
  "bg-primary/60",
  "gradient-primary",
];

function CalendarPage() {
  const [selected, setSelected] = useState(TODAY);
  const dayTx = transactions.filter((t) => Number(t.date.slice(-2)) === selected);
  const dayAppointments = appointments.filter((a) => a.date.startsWith(String(selected)));

  return (
    <div className="space-y-5">
      <PageHeader
        title="CALENDÁRIO"
        subtitle="Gastos e compromissos organizados por data."
        action={<Tag tone="primary">AGOSTO 2026</Tag>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="mb-2 grid grid-cols-7 gap-1.5">
            {WEEK.map((d) => (
              <span key={d} className="label-caps text-center text-[10px] text-muted-foreground">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: FIRST_WEEKDAY }).map((_, i) => (
              <span key={`e${i}`} />
            ))}
            {Array.from({ length: DAYS }, (_, i) => i + 1).map((day) => {
              const spend = dailySpend[day] ?? 0;
              const level = heatLevel(spend);
              return (
                <button
                  key={day}
                  onClick={() => setSelected(day)}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-xl border border-border/60 text-[11px] transition-all",
                    HEAT[level],
                    day === TODAY && "border-primary shadow-elegant",
                    selected === day && "ring-2 ring-primary",
                  )}
                >
                  <span className="font-semibold">{day}</span>
                  {spend > 0 ? (
                    <span className="text-[8px] opacity-80">
                      {spend >= 1000 ? `${(spend / 1000).toFixed(1)}k` : Math.round(spend)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="label-caps">MENOR</span>
            {HEAT.map((h) => (
              <span key={h} className={cn("h-3 w-6 rounded", h)} />
            ))}
            <span className="label-caps">MAIOR</span>
          </div>
        </Panel>

        <Panel title={`DIA ${selected} DE AGOSTO`}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <p className="label-caps text-[10px] text-muted-foreground">GASTO</p>
              <p className="mt-1 text-sm font-bold text-danger">
                {formatCurrency(dailySpend[selected] ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <p className="label-caps text-[10px] text-muted-foreground">RECEBIDO</p>
              <p className="mt-1 text-sm font-bold text-success">
                {formatCurrency(
                  dayTx.filter((t) => t.type === "RECEITA").reduce((s, t) => s + t.amount, 0),
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <p className="label-caps text-[10px] text-muted-foreground">LANÇAMENTOS</p>
            {dayTx.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum lançamento neste dia.</p>
            ) : (
              dayTx.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2"
                >
                  <div>
                    <p className="label-caps text-[11px]">{t.description}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t.category} · {t.responsible}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      t.type === "RECEITA" ? "text-success" : "text-danger",
                    )}
                  >
                    {formatCurrency(t.amount)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-2">
            <p className="label-caps text-[10px] text-muted-foreground">COMPROMISSOS</p>
            {dayAppointments.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem compromissos.</p>
            ) : (
              dayAppointments.map((a) => (
                <div key={a.id} className="rounded-xl border border-border bg-secondary/30 px-3 py-2">
                  <p className="label-caps text-[11px]">{a.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.time} · {a.category}
                  </p>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
