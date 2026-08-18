import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Check } from "lucide-react";
import { PageHeader, Panel, Tag } from "@/components/ui-kit";
import { shoppingLists } from "@/lib/mock-data";
import { formatCurrency, calculateMarketSubtotal } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mercado")({
  head: () => ({
    meta: [
      { title: "MODO MERCADO — MULTICAP" },
      { name: "description", content: "Carrinho ao vivo com preços reais, total acumulado e histórico." },
      { property: "og:title", content: "MODO MERCADO — MULTICAP" },
      {
        property: "og:description",
        content: "Carrinho ao vivo com preços reais, total acumulado e histórico.",
      },
    ],
  }),
  component: MarketPage,
});

const history = [
  { id: "h1", place: "EXTRA HIPER", date: "12 JUL 2026", total: 612.4, items: 32 },
  { id: "h2", place: "ASSAÍ", date: "28 JUN 2026", total: 528.9, items: 27 },
  { id: "h3", place: "CARREFOUR", date: "14 JUN 2026", total: 691.3, items: 35 },
];

function MarketPage() {
  const [tab, setTab] = useState<"CARRINHO AO VIVO" | "HISTÓRICO E CÓPIAS">("CARRINHO AO VIVO");
  const base = shoppingLists[0]!.items;
  const [cart, setCart] = useState(
    base.map((i) => ({ ...i, real: i.price, quantity: i.qty, bought: false })),
  );

  const estimated = base.reduce((s, i) => s + i.qty * i.price, 0);
  const real = cart
    .filter((i) => i.bought)
    .reduce((s, i) => s + calculateMarketSubtotal(i.quantity, i.real), 0);

  const update = (id: string, patch: Partial<(typeof cart)[number]>) =>
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <div className="space-y-5 pb-24">
      <PageHeader title="MODO MERCADO" subtitle="Interface otimizada para usar durante as compras." />

      <div className="flex gap-2">
        {(["CARRINHO AO VIVO", "HISTÓRICO E CÓPIAS"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "label-caps flex-1 rounded-xl border px-4 py-3 text-[11px]",
              tab === t
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "CARRINHO AO VIVO" ? (
        <Panel title="ITENS DO CARRINHO">
          <ul className="space-y-3">
            {cart.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "rounded-2xl border border-border bg-secondary/30 p-3",
                  item.bought && "border-primary/50",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="label-caps text-sm">{item.name}</p>
                    <Tag>{item.unit === "KG" ? "POR PESO" : "POR UNIDADE"}</Tag>
                  </div>
                  <button
                    onClick={() => update(item.id, { bought: !item.bought })}
                    aria-label={`Comprar ${item.name}`}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl border",
                      item.bought
                        ? "gradient-primary border-transparent text-primary-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    <Check className="h-6 w-6" />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      aria-label="Diminuir"
                      onClick={() =>
                        update(item.id, { quantity: Math.max(item.quantity - 1, 0.5) })
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-lg"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <span className="w-16 text-center text-lg font-bold">
                      {item.quantity}
                      <span className="ml-1 text-[10px] text-muted-foreground">{item.unit}</span>
                    </span>
                    <button
                      aria-label="Aumentar"
                      onClick={() => update(item.id, { quantity: item.quantity + 1 })}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-border"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  <label className="ml-auto flex items-center gap-2">
                    <span className="label-caps text-[10px] text-muted-foreground">PREÇO</span>
                    <input
                      type="number"
                      step="0.01"
                      value={item.real}
                      onChange={(e) => update(item.id, { real: Number(e.target.value) })}
                      className="w-24 rounded-xl border border-input bg-background px-3 py-2.5 text-right text-base font-semibold outline-none focus:border-primary"
                    />
                  </label>
                </div>
                <p className="mt-2 text-right text-sm font-bold text-primary">
                  {formatCurrency(calculateMarketSubtotal(item.quantity, item.real))}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <Panel title="COMPRAS ANTERIORES">
          <ul className="space-y-3">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-3"
              >
                <div>
                  <p className="label-caps text-[12px]">{h.place}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {h.date} · {h.items} itens
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatCurrency(h.total)}</p>
                  <button className="label-caps text-[10px] text-primary">DUPLICAR LISTA</button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {tab === "CARRINHO AO VIVO" ? (
        <div className="gradient-primary shadow-elegant fixed inset-x-0 bottom-16 z-30 px-4 py-3 text-primary-foreground lg:bottom-0 lg:left-64">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-[11px]">
            <div>
              <p className="label-caps opacity-80">TOTAL ESTIMADO</p>
              <p className="text-base font-bold">{formatCurrency(estimated)}</p>
            </div>
            <div>
              <p className="label-caps opacity-80">TOTAL REAL</p>
              <p className="text-base font-bold">{formatCurrency(real)}</p>
            </div>
            <div>
              <p className="label-caps opacity-80">DIFERENÇA</p>
              <p className="text-base font-bold">{formatCurrency(real - estimated)}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
