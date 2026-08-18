import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { PageHeader, Panel, StatCard, Tag } from "@/components/ui-kit";
import { shoppingLists } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lista")({
  head: () => ({
    meta: [
      { title: "LISTA DE COMPRAS — MULTICAP" },
      { name: "description", content: "Múltiplas listas de compras com quantidade, unidade e prioridade." },
      { property: "og:title", content: "LISTA DE COMPRAS — MULTICAP" },
      {
        property: "og:description",
        content: "Múltiplas listas de compras com quantidade, unidade e prioridade.",
      },
    ],
  }),
  component: ShoppingPage,
});

function ShoppingPage() {
  const [activeId, setActiveId] = useState(shoppingLists[0]!.id);
  const [done, setDone] = useState<string[]>(
    shoppingLists.flatMap((l) => l.items.filter((i) => i.done).map((i) => i.id)),
  );
  const list = shoppingLists.find((l) => l.id === activeId)!;
  const estimated = list.items.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="LISTA DE COMPRAS" subtitle="Organize itens por lista, categoria e prioridade." />

      <div className="flex flex-wrap gap-2">
        {shoppingLists.map((l) => (
          <button
            key={l.id}
            onClick={() => setActiveId(l.id)}
            className={cn(
              "label-caps rounded-xl border px-4 py-2 text-[11px] transition-colors",
              l.id === activeId
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {l.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="ITENS" value={String(list.items.length)} tone="info" />
        <StatCard
          label="CONCLUÍDOS"
          value={String(list.items.filter((i) => done.includes(i.id)).length)}
          tone="success"
        />
        <StatCard label="TOTAL ESTIMADO" value={formatCurrency(estimated)} tone="primary" />
      </div>

      <Panel title={`LISTA ${list.name}`}>
        <ul className="divide-y divide-border">
          {list.items.map((item) => {
            const checked = done.includes(item.id);
            return (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <button
                  onClick={() =>
                    setDone((prev) =>
                      checked ? prev.filter((x) => x !== item.id) : [...prev, item.id],
                    )
                  }
                  aria-label={`Marcar ${item.name}`}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                    checked
                      ? "gradient-primary border-transparent text-primary-foreground"
                      : "border-border text-transparent",
                  )}
                >
                  <Check className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn("label-caps text-[11px]", checked && "line-through opacity-60")}>
                    {item.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Tag>{item.category}</Tag>
                    <Tag
                      tone={
                        item.priority === "ALTA"
                          ? "danger"
                          : item.priority === "MÉDIA"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {item.priority}
                    </Tag>
                    <span className="text-[10px] text-muted-foreground">
                      {item.qty} {item.unit}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(item.qty * item.price)}</span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
