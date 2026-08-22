import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mercado")({
  head: () => ({ meta: [{ title: "MODO MERCADO — HARMONY HUB" }] }),
  component: MarketPage,
});

type List = { id: string; name: string; archived: boolean; household_id: string };
type Item = { id: string; list_id: string; name: string; category: string; qty: number; unit: string; price: number; priority: string; done: boolean; household_id: string };

function MarketPage() {
  const lists = useHouseholdTable<List>("shopping_lists", "id,name,archived,household_id");
  const items = useHouseholdTable<Item>("shopping_items", "id,list_id,name,category,qty,unit,price,priority,done,household_id");
  const [active, setActive] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");

  const current = active ? lists.rows.find(x => x.id === active) : lists.rows[0];
  const currentItems = current ? items.rows.filter(i => i.list_id === current.id) : [];
  const estimated = currentItems.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0);

  async function addItem() {
    if (!current) return toast.error("CRIE UMA LISTA DE COMPRAS PRIMEIRO");
    if (!name.trim()) return toast.error("INFORME O PRODUTO");
    try {
      await items.insert({ list_id: current.id, name: name.trim().toUpperCase(), price: Number(price.replace(",", ".")) || 0, qty: Number(qty) || 1, unit: "UN", category: "OUTROS", priority: "MÉDIA", done: false });
      setName(""); setPrice(""); setQty("1"); setShowForm(false); toast.success("ITEM ADICIONADO");
    } catch (e) { toast.error(e instanceof Error ? e.message : "NÃO FOI POSSÍVEL SALVAR"); }
  }
  async function toggle(i: Item) { try { await items.update(i.id, { done: !i.done }); } catch (e) { toast.error(e instanceof Error ? e.message : "NÃO FOI POSSÍVEL ATUALIZAR"); } }
  async function changeQty(i: Item, delta: number) { try { await items.update(i.id, { qty: Math.max(Number(i.qty) + delta, 1) }); } catch (e) { toast.error(e instanceof Error ? e.message : "NÃO FOI POSSÍVEL ATUALIZAR"); } }

  return <div className="space-y-5 pb-8">
    <PageHeader title="MODO MERCADO" subtitle="Sua lista de compras real, sincronizada com seus dados." action={<button onClick={() => setShowForm(true)} disabled={!current} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40" aria-label="ADICIONAR ITEM"><Plus className="h-4 w-4" /></button>} />

    {showForm && current && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={e => { if (e.currentTarget === e.target) setShowForm(false); }}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-5 shadow-xl">
        <div className="mb-5 flex items-center justify-between"><div><h2 className="label-caps text-sm font-semibold">ADICIONAR ITEM</h2><p className="mt-1 text-xs text-muted-foreground">ADICIONE UM PRODUTO À LISTA {current.name}.</p></div><button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="FECHAR"><X className="h-4 w-4" /></button></div>
        <div className="grid gap-3 md:grid-cols-2"><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="PRODUTO" className="rounded-xl border border-input bg-background px-3 py-3 text-sm md:col-span-2"/><input value={qty} onChange={e => setQty(e.target.value)} type="number" min="1" placeholder="QUANTIDADE" className="rounded-xl border border-input bg-background px-3 py-3 text-sm"/><input value={price} onChange={e => setPrice(e.target.value)} placeholder="PREÇO" inputMode="decimal" className="rounded-xl border border-input bg-background px-3 py-3 text-sm"/><button onClick={() => void addItem()} className="gradient-primary rounded-xl px-4 py-3 text-[11px] text-primary-foreground md:col-span-2">ADICIONAR</button></div>
      </div>
    </div>}

    <div className="flex flex-wrap gap-2">{lists.rows.map(l => <button key={l.id} onClick={() => setActive(l.id)} className={cn("label-caps rounded-xl border px-4 py-2 text-[11px]", current?.id === l.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>{l.name}</button>)}</div>
    {current ? <><div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><StatCard label="ITENS" value={String(currentItems.length)} tone="info"/><StatCard label="CONCLUÍDOS" value={String(currentItems.filter(i => i.done).length)} tone="success"/><StatCard label="TOTAL ESTIMADO" value={formatCurrency(estimated)} tone="primary"/></div><Panel title="ITENS DO CARRINHO"><ul className="space-y-3">{currentItems.map(i => <li key={i.id} className={cn("rounded-2xl border border-border bg-secondary/30 p-3", i.done && "border-primary/50")}><div className="flex items-center gap-3"><button onClick={() => void toggle(i)} className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", i.done ? "gradient-primary border-transparent text-primary-foreground" : "border-border text-transparent")}><Check className="h-5 w-5"/></button><div className="min-w-0 flex-1"><p className={cn("label-caps text-sm", i.done && "line-through opacity-60")}>{i.name}</p><div className="mt-1 flex gap-2"><Tag>{i.qty} {i.unit}</Tag><Tag>{i.priority}</Tag></div></div><span className="text-sm font-semibold">{formatCurrency(Number(i.qty) * Number(i.price))}</span></div><div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-2"><button onClick={() => void changeQty(i, -1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border"><Minus className="h-4 w-4"/></button><span className="w-8 text-center text-sm font-semibold">{i.qty}</span><button onClick={() => void changeQty(i, 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border"><Plus className="h-4 w-4"/></button></div><span className="text-xs text-muted-foreground">{formatCurrency(Number(i.price))} / {i.unit}</span></div></li>)}{currentItems.length === 0 && <li className="py-10 text-center text-sm text-muted-foreground">NENHUM ITEM CADASTRADO NESTA LISTA.</li>}</ul></Panel></> : <Panel title="LISTA DE COMPRAS"><p className="py-8 text-center text-sm text-muted-foreground">NENHUMA LISTA DE COMPRAS CADASTRADA.</p></Panel>}
  </div>;
}
