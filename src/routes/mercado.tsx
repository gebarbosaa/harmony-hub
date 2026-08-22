import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mercado")({
  head: () => ({ meta: [{ title: "MERCADO — HARMONY HUB" }] }),
  component: MarketPage,
});

type List = { id: string; name: string; archived: boolean; household_id: string };
type Item = { id: string; list_id: string; name: string; category: string; qty: number; unit: string; price: number; priority: string; done: boolean; household_id: string };

type Tab = "mercado" | "modo";

function MarketPage() {
  const lists = useHouseholdTable<List>("shopping_lists", "id,name,archived,household_id");
  const items = useHouseholdTable<Item>("shopping_items", "id,list_id,name,category,qty,unit,price,priority,done,household_id");
  const [tab, setTab] = useState<Tab>("mercado");
  const [active, setActive] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [listName, setListName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");

  const current = active ? lists.rows.find(x => x.id === active) : lists.rows[0];
  const currentItems = current ? items.rows.filter(i => i.list_id === current.id) : [];
  const totalItems = items.rows.length;
  const doneItems = items.rows.filter(i => i.done).length;
  const totalEstimated = items.rows.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0);
  const estimated = currentItems.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0);

  async function addItem() {
    if (!name.trim()) return toast.error("INFORME O PRODUTO");
    try {
      let target = current;
      if (!target) {
        if (!listName.trim()) return toast.error("INFORME O NOME DA LISTA");
        target = await lists.insert({ name: listName.trim().toUpperCase(), archived: false });
        setActive(target.id);
      }
      await items.insert({ list_id: target.id, name: name.trim().toUpperCase(), price: Number(price.replace(",", ".")) || 0, qty: Number(qty) || 1, unit: "UN", category: "OUTROS", priority: "MÉDIA", done: false });
      setName(""); setListName(""); setPrice(""); setQty("1"); setShowForm(false); setTab("modo"); toast.success("ITEM ADICIONADO");
    } catch (e) { toast.error(e instanceof Error ? e.message : "NÃO FOI POSSÍVEL SALVAR"); }
  }
  async function toggle(i: Item) { try { await items.update(i.id, { done: !i.done }); } catch (e) { toast.error(e instanceof Error ? e.message : "NÃO FOI POSSÍVEL ATUALIZAR"); } }
  async function changeQty(i: Item, delta: number) { try { await items.update(i.id, { qty: Math.max(Number(i.qty) + delta, 1) }); } catch (e) { toast.error(e instanceof Error ? e.message : "NÃO FOI POSSÍVEL ATUALIZAR"); } }

  return <div className="space-y-5 pb-8">
    <PageHeader title={tab === "mercado" ? "MERCADO" : "MODO MERCADO"} subtitle={tab === "mercado" ? "VISÃO GERAL DAS SUAS LISTAS E COMPRAS." : "SUA LISTA DE COMPRAS REAL, SINCRONIZADA COM SEUS DADOS."} action={tab === "modo" ? <button onClick={() => setShowForm(true)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="ADICIONAR ITEM"><Plus className="h-4 w-4" /></button> : undefined} />

    <div className="flex w-fit gap-1 rounded-xl border border-border bg-secondary/30 p-1">
      <button onClick={() => setTab("mercado")} className={cn("label-caps rounded-lg px-4 py-2 text-[11px] transition", tab === "mercado" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>MERCADO</button>
      <button onClick={() => setTab("modo")} className={cn("label-caps rounded-lg px-4 py-2 text-[11px] transition", tab === "modo" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>MODO MERCADO</button>
    </div>

    {tab === "mercado" ? <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><StatCard label="LISTAS" value={String(lists.rows.length)} tone="info"/><StatCard label="ITENS" value={String(totalItems)} tone="primary"/><StatCard label="CONCLUÍDOS" value={String(doneItems)} tone="success"/></div>
      <Panel title="SUAS LISTAS DE COMPRAS">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{lists.rows.map(list => { const count = items.rows.filter(i => i.list_id === list.id).length; const done = items.rows.filter(i => i.list_id === list.id && i.done).length; return <button key={list.id} onClick={() => { setActive(list.id); setTab("modo"); }} className="rounded-2xl border border-border p-4 text-left transition hover:border-primary/50 hover:bg-secondary/30"><p className="label-caps text-sm">{list.name}</p><p className="mt-2 text-xs text-muted-foreground">{count} ITENS · {done} CONCLUÍDOS</p></button>; })}{lists.rows.length === 0 && <div className="md:col-span-2 lg:col-span-3 py-10 text-center text-sm text-muted-foreground">NENHUMA LISTA CADASTRADA. ENTRE EM MODO MERCADO E CLIQUE NO + PARA CRIAR.</div>}</div>
      </Panel>
      <Panel title="RESUMO DE COMPRAS"><p className="text-xs text-muted-foreground">TOTAL ESTIMADO DAS LISTAS ATIVAS</p><p className="mt-1 text-2xl font-semibold">{formatCurrency(totalEstimated)}</p></Panel>
    </> : <>
      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={e => { if (e.currentTarget === e.target) setShowForm(false); }}><div className="w-full max-w-lg rounded-2xl border border-border bg-background p-5 shadow-xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="label-caps text-sm font-semibold">ADICIONAR ITEM</h2><p className="mt-1 text-xs text-muted-foreground">{current ? `ADICIONE UM PRODUTO À LISTA ${current.name}.` : "CRIE SUA PRIMEIRA LISTA E ADICIONE UM PRODUTO."}</p></div><button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="FECHAR"><X className="h-4 w-4" /></button></div><div className="grid gap-3 md:grid-cols-2">{!current && <input autoFocus value={listName} onChange={e => setListName(e.target.value)} placeholder="NOME DA LISTA (EX.: SEMANA)" className="rounded-xl border border-input bg-background px-3 py-3 text-sm md:col-span-2" />}<input autoFocus={Boolean(current)} value={name} onChange={e => setName(e.target.value)} placeholder="PRODUTO" className="rounded-xl border border-input bg-background px-3 py-3 text-sm md:col-span-2"/><input value={qty} onChange={e => setQty(e.target.value)} type="number" min="1" placeholder="QUANTIDADE" className="rounded-xl border border-input bg-background px-3 py-3 text-sm"/><input value={price} onChange={e => setPrice(e.target.value)} placeholder="PREÇO" inputMode="decimal" className="rounded-xl border border-input bg-background px-3 py-3 text-sm"/><button onClick={() => void addItem()} className="gradient-primary rounded-xl px-4 py-3 text-[11px] text-primary-foreground md:col-span-2">ADICIONAR</button></div></div></div>}
      <div className="flex flex-wrap gap-2">{lists.rows.map(l => <button key={l.id} onClick={() => setActive(l.id)} className={cn("label-caps rounded-xl border px-4 py-2 text-[11px]", current?.id === l.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>{l.name}</button>)}</div>
      {current ? <><div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><StatCard label="ITENS" value={String(currentItems.length)} tone="info"/><StatCard label="CONCLUÍDOS" value={String(currentItems.filter(i => i.done).length)} tone="success"/><StatCard label="TOTAL ESTIMADO" value={formatCurrency(estimated)} tone="primary"/></div><Panel title="ITENS DO CARRINHO"><ul className="space-y-3">{currentItems.map(i => <li key={i.id} className={cn("rounded-2xl border border-border bg-secondary/30 p-3", i.done && "border-primary/50")}><div className="flex items-center gap-3"><button onClick={() => void toggle(i)} className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", i.done ? "gradient-primary border-transparent text-primary-foreground" : "border-border text-transparent")}><Check className="h-5 w-5"/></button><div className="min-w-0 flex-1"><p className={cn("label-caps text-sm", i.done && "line-through opacity-60")}>{i.name}</p><div className="mt-1 flex gap-2"><Tag>{i.qty} {i.unit}</Tag><Tag>{i.priority}</Tag></div></div><span className="text-sm font-semibold">{formatCurrency(Number(i.qty) * Number(i.price))}</span></div><div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-2"><button onClick={() => void changeQty(i, -1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border"><Minus className="h-4 w-4"/></button><span className="w-8 text-center text-sm font-semibold">{i.qty}</span><button onClick={() => void changeQty(i, 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border"><Plus className="h-4 w-4"/></button></div><span className="text-xs text-muted-foreground">{formatCurrency(Number(i.price))} / {i.unit}</span></div></li>)}{currentItems.length === 0 && <li className="py-10 text-center text-sm text-muted-foreground">NENHUM ITEM CADASTRADO NESTA LISTA.</li>}</ul></Panel></> : <Panel title="LISTA DE COMPRAS"><p className="py-8 text-center text-sm text-muted-foreground">NENHUMA LISTA DE COMPRAS CADASTRADA. CLIQUE NO + PARA CRIAR SUA PRIMEIRA LISTA E ADICIONAR UM ITEM.</p></Panel>}
    </>}
  </div>;
}
