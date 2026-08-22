import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Minus, Plus, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mercado")({ head: () => ({ meta: [{ title: "MERCADO — HARMONY HUB" }] }), component: MarketPage });
type List = { id: string; name: string; archived: boolean; household_id: string };
type Item = { id: string; list_id: string; name: string; category: string; qty: number; unit: string; price: number; priority: string; done: boolean; household_id: string };
type Tab = "mercado" | "modo";
const units = ["UN", "KG", "G", "L", "ML", "PACOTE", "CAIXA", "POTE", "GARRAFA", "LATA", "DÚZIA", "PAR", "OUTRO"];

function smartUnit(name: string) {
  const n = name.toLowerCase();
  if (/(arroz|feijão|feijao|açúcar|acucar|farinha|sal|café|cafe|carne|frango|queijo|presunto)/.test(n)) return "KG";
  if (/(leite|suco|água|agua|refrigerante|óleo|oleo|vinho|vinagre)/.test(n)) return "L";
  if (/(iogurte|biscoito|bolacha|macarrão|macarrao|cereal)/.test(n)) return "PACOTE";
  if (/(sabonete|shampoo|detergente|molho|maionese)/.test(n)) return "UN";
  if (/(ovo|ovos)/.test(n)) return "DÚZIA";
  return "UN";
}

function MarketPage() {
  const lists = useHouseholdTable<List>("shopping_lists", "id,name,archived,household_id");
  const items = useHouseholdTable<Item>("shopping_items", "id,list_id,name,category,qty,unit,price,priority,done,household_id");
  const [tab, setTab] = useState<Tab>("mercado");
  const [active, setActive] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [name, setName] = useState("");
  const [listName, setListName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("UN");
  const [customUnit, setCustomUnit] = useState("");

  const current = active ? lists.rows.find(x => x.id === active) : undefined;
  const currentItems = current ? items.rows.filter(i => i.list_id === current.id) : [];
  const totalItems = items.rows.length;
  const doneItems = items.rows.filter(i => i.done).length;
  const totalEstimated = items.rows.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0);
  const estimated = currentItems.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0);

  function openAdd() { setEditing(null); setName(""); setPrice(""); setQty("1"); setUnit("UN"); setCustomUnit(""); setShowForm(true); }
  function openEdit(i: Item) { setEditing(i); setName(i.name); setPrice(String(i.price)); setQty(String(i.qty)); setUnit(units.includes(i.unit) ? i.unit : "OUTRO"); setCustomUnit(units.includes(i.unit) ? "" : i.unit); setShowForm(true); }
  function handleNameChange(value: string) { setName(value); if (!editing) setUnit(smartUnit(value)); }

  async function saveItem() {
    if (!name.trim()) return toast.error("INFORME O PRODUTO");
    const finalUnit = unit === "OUTRO" ? customUnit.trim().toUpperCase() : unit;
    if (!finalUnit) return toast.error("INFORME O TIPO DE ITEM");
    const numericQty = Number(qty.replace(",", "."));
    if (!numericQty || numericQty <= 0) return toast.error("INFORME UMA QUANTIDADE VÁLIDA");
    const numericPrice = Number(price.replace(",", ".")) || 0;
    try {
      if (editing) {
        await items.update(editing.id, { name: name.trim().toUpperCase(), qty: numericQty, unit: finalUnit, price: numericPrice });
        toast.success("ITEM ATUALIZADO");
      } else {
        let target = current;
        if (!target) {
          if (!listName.trim()) return toast.error("INFORME O NOME DA LISTA");
          target = await lists.insert({ name: listName.trim().toUpperCase(), archived: false });
        }
        await items.insert({ list_id: target.id, name: name.trim().toUpperCase(), price: numericPrice, qty: numericQty, unit: finalUnit, category: "OUTROS", priority: "MÉDIA", done: false });
        setActive(target.id); setTab("modo"); toast.success("ITEM ADICIONADO");
      }
      setShowForm(false); setEditing(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "NÃO FOI POSSÍVEL SALVAR"); }
  }
  async function toggle(i: Item) { try { await items.update(i.id, { done: !i.done }); } catch (e) { toast.error(e instanceof Error ? e.message : "NÃO FOI POSSÍVEL ATUALIZAR"); } }
  async function changeQty(i: Item, delta: number) { try { await items.update(i.id, { qty: Math.max(Number(i.qty) + delta, 1) }); } catch (e) { toast.error(e instanceof Error ? e.message : "NÃO FOI POSSÍVEL ATUALIZAR"); } }
  const openMode = () => { setActive(""); setTab("modo"); };

  return <div className="space-y-5 pb-8">
    <PageHeader title={tab === "mercado" ? "MERCADO" : "MODO MERCADO"} subtitle={tab === "mercado" ? "VISÃO GERAL DAS SUAS LISTAS E COMPRAS." : "ESCOLHA UMA LISTA PARA COMEÇAR AS COMPRAS."} action={tab === "mercado" ? <button type="button" onClick={openAdd} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="ADICIONAR ITEM"><Plus className="h-4 w-4" /></button> : undefined} />
    <div className="flex w-fit gap-1 rounded-xl border border-border bg-secondary/30 p-1"><button type="button" onClick={() => setTab("mercado")} className={cn("label-caps rounded-lg px-4 py-2 text-[11px] transition", tab === "mercado" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>MERCADO</button><button type="button" onClick={openMode} className={cn("label-caps rounded-lg px-4 py-2 text-[11px] transition", tab === "modo" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>MODO MERCADO</button></div>

    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={e => { if (e.currentTarget === e.target) setShowForm(false); }}><div className="w-full max-w-xl rounded-2xl border border-border bg-background p-5 shadow-xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="label-caps text-sm font-semibold">{editing ? "EDITAR ITEM" : "ADICIONAR ITEM"}</h2><p className="mt-1 text-xs text-muted-foreground">{current ? `LISTA: ${current.name}` : "CRIE SUA PRIMEIRA LISTA E ADICIONE UM PRODUTO."}</p></div><button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button></div><div className="grid gap-3 md:grid-cols-2">{!current && !editing && <input value={listName} onChange={e => setListName(e.target.value)} placeholder="NOME DA LISTA (EX.: SEMANA)" className="rounded-xl border border-input bg-background px-3 py-3 text-sm md:col-span-2" />}<input autoFocus value={name} onChange={e => handleNameChange(e.target.value)} placeholder="PRODUTO (EX.: ARROZ)" className="rounded-xl border border-input bg-background px-3 py-3 text-sm md:col-span-2"/><div><label className="mb-1 block text-[10px] text-muted-foreground">QUANTIDADE</label><input value={qty} onChange={e => setQty(e.target.value)} type="number" min="0.01" step="0.01" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" /></div><div><label className="mb-1 block text-[10px] text-muted-foreground">TIPO / UNIDADE</label><select value={unit} onChange={e => setUnit(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm">{units.map(u => <option key={u} value={u}>{u}</option>)}</select></div>{unit === "OUTRO" && <input value={customUnit} onChange={e => setCustomUnit(e.target.value)} placeholder="DIGITE A UNIDADE" className="rounded-xl border border-input bg-background px-3 py-3 text-sm md:col-span-2" />}<div><label className="mb-1 block text-[10px] text-muted-foreground">PREÇO POR UNIDADE</label><input value={price} onChange={e => setPrice(e.target.value)} placeholder="R$ 0,00" inputMode="decimal" className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" /></div><div className="flex items-end"><div className="w-full rounded-xl bg-secondary/50 px-3 py-3"><span className="block text-[10px] text-muted-foreground">TOTAL DO ITEM</span><strong>{formatCurrency(numericPreview(qty, price))}</strong></div></div><button type="button" onClick={() => void saveItem()} className="gradient-primary rounded-xl px-4 py-3 text-[11px] text-primary-foreground md:col-span-2">{editing ? "SALVAR ALTERAÇÕES" : "ADICIONAR À LISTA"}</button></div></div></div>}

    {tab === "mercado" ? <><div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><StatCard label="LISTAS" value={String(lists.rows.length)} tone="info"/><StatCard label="ITENS" value={String(totalItems)} tone="primary"/><StatCard label="CONCLUÍDOS" value={String(doneItems)} tone="success"/></div><Panel title="SUAS LISTAS DE COMPRAS"><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{lists.rows.map(list => { const count = items.rows.filter(i => i.list_id === list.id).length; const done = items.rows.filter(i => i.list_id === list.id && i.done).length; return <button type="button" key={list.id} onClick={() => { setActive(list.id); setTab("modo"); }} className="rounded-2xl border border-border p-4 text-left transition hover:border-primary/50 hover:bg-secondary/30"><p className="label-caps text-sm">{list.name}</p><p className="mt-2 text-xs text-muted-foreground">{count} ITENS · {done} CONCLUÍDOS</p></button>; })}{lists.rows.length === 0 && <div className="md:col-span-2 lg:col-span-3 py-10 text-center text-sm text-muted-foreground">NENHUMA LISTA CADASTRADA. CLIQUE NO + PARA CRIAR.</div>}</div></Panel><Panel title="RESUMO DE COMPRAS"><p className="text-xs text-muted-foreground">TOTAL ESTIMADO DAS LISTAS ATIVAS</p><p className="mt-1 text-2xl font-semibold">{formatCurrency(totalEstimated)}</p></Panel></> : <><Panel title="ESCOLHA UMA LISTA"><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{lists.rows.map(list => { const count = items.rows.filter(i => i.list_id === list.id).length; const done = items.rows.filter(i => i.list_id === list.id && i.done).length; return <button type="button" key={list.id} onClick={() => setActive(list.id)} className={cn("rounded-2xl border p-4 text-left transition", current?.id === list.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-secondary/30")}><p className="label-caps text-sm">{list.name}</p><p className="mt-2 text-xs text-muted-foreground">{count} ITENS · {done} CONCLUÍDOS</p></button>; })}{lists.rows.length === 0 && <p className="md:col-span-2 lg:col-span-3 py-8 text-center text-sm text-muted-foreground">NENHUMA LISTA AINDA. VOLTE PARA MERCADO E USE O + PARA CRIAR.</p>}</div></Panel>{current && <><div className="flex items-center justify-between"><div><p className="label-caps text-sm">{current.name}</p><p className="text-xs text-muted-foreground">LISTA SELECIONADA</p></div><button type="button" onClick={openAdd} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"><Plus className="h-4 w-4" /></button></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><StatCard label="ITENS" value={String(currentItems.length)} tone="info"/><StatCard label="CONCLUÍDOS" value={String(currentItems.filter(i => i.done).length)} tone="success"/><StatCard label="TOTAL ESTIMADO" value={formatCurrency(estimated)} tone="primary"/></div><Panel title="ITENS DO CARRINHO"><ul className="space-y-3">{currentItems.map(i => <li key={i.id} className={cn("rounded-2xl border border-border bg-secondary/30 p-3", i.done && "border-primary/50")}><div className="flex items-center gap-3"><button type="button" onClick={() => void toggle(i)} className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", i.done ? "gradient-primary border-transparent text-primary-foreground" : "border-border text-transparent")}><Check className="h-5 w-5"/></button><div className="min-w-0 flex-1"><p className={cn("label-caps text-sm", i.done && "line-through opacity-60")}>{i.name}</p><div className="mt-1 flex gap-2"><Tag>{i.qty} {i.unit}</Tag><Tag>{i.priority}</Tag></div></div><span className="text-sm font-semibold">{formatCurrency(Number(i.qty) * Number(i.price))}</span><button type="button" onClick={() => openEdit(i)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="EDITAR ITEM"><Pencil className="h-4 w-4"/></button></div><div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-2"><button type="button" onClick={() => void changeQty(i, -1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border"><Minus className="h-4 w-4"/></button><span className="w-8 text-center text-sm font-semibold">{i.qty}</span><button type="button" onClick={() => void changeQty(i, 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border"><Plus className="h-4 w-4"/></button></div><span className="text-xs text-muted-foreground">{formatCurrency(Number(i.price))} / {i.unit}</span></div></li>)}{currentItems.length === 0 && <li className="py-10 text-center text-sm text-muted-foreground">NENHUM ITEM CADASTRADO NESTA LISTA. CLIQUE NO + PARA ADICIONAR.</li>}</ul></Panel></>}</>}
  </div>;
}
function numericPreview(qty: string, price: string) { return (Number(qty.replace(",", ".")) || 0) * (Number(price.replace(",", ".")) || 0); }
