import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Flame } from "lucide-react";
import { PageHeader, Panel, ProgressBar, Tag } from "@/components/ui-kit";
import { habits } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/habitos")({
  head: () => ({
    meta: [
      { title: "HÁBITOS — MULTICAP" },
      { name: "description", content: "Hábitos individuais, compartilhados e desafios do casal." },
      { property: "og:title", content: "HÁBITOS — MULTICAP" },
      {
        property: "og:description",
        content: "Hábitos individuais, compartilhados e desafios do casal.",
      },
    ],
  }),
  component: HabitsPage,
});

function grid(seed: number) {
  return Array.from({ length: 31 }, (_, i) => (i * seed) % 7);
}

function HabitsPage() {
  const [tab, setTab] = useState<"MEUS HÁBITOS" | "HÁBITOS DE PARCEIRO">("MEUS HÁBITOS");
  const list = habits.filter((h) =>
    tab === "MEUS HÁBITOS"
      ? h.owner === "MARIA" || h.owner === "AMBAS"
      : (h.owner === "LUCAS" || h.owner === "AMBAS") && h.privacy !== "PRIVADO",
  );

  return (
    <div className="space-y-5">
      <PageHeader title="HÁBITOS" subtitle="Constância individual e desafios compartilhados." />

      <div className="flex gap-2">
        {(["MEUS HÁBITOS", "HÁBITOS DE PARCEIRO"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "label-caps flex-1 rounded-full border px-4 py-2.5 text-[11px]",
              tab === t
                ? "gradient-primary border-transparent text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((h, index) => (
          <Panel key={h.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="label-caps text-sm">{h.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Tag tone={h.privacy === "PRIVADO" ? "neutral" : "primary"}>{h.privacy}</Tag>
                  <Tag>{h.owner}</Tag>
                </div>
              </div>
              <span className="flex items-center gap-1 text-primary">
                <Flame className="h-4 w-4" />
                <span className="text-sm font-bold">{h.streak}</span>
              </span>
            </div>

            <div className="mt-4 grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
              {grid(index + 2).map((v, i) => (
                <span
                  key={i}
                  className={cn(
                    "aspect-square rounded-[4px]",
                    v === 0
                      ? "bg-secondary/50"
                      : v < 3
                        ? "bg-primary/25"
                        : v < 5
                          ? "bg-primary/60"
                          : "gradient-primary",
                  )}
                />
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <ProgressBar percent={h.monthly} tone="primary" />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{h.monthly}% no mês</span>
                <span>Melhor sequência: {h.best} dias</span>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
