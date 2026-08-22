import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, History, ListChecks, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mercado")({
  head: () => ({ meta: [{ title: "MERCADO — HARMONY HUB" }] }),
  component: MarketPage,
});

type List = { id: string; name: string; archived: boolean; completed_at: string | null; transaction_id: string | null; created_at: string };
type Item = { id: string; list_id: string; name: string; category: string; qty: number | null; unit: string; price: number | null; actual_price: number | null; actual_qty: number | null; done: boolean };
type Tab = "planning" | "market" | "history";

const money = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;
const sector = (name: string) => {
  const n = name.toUpperCase();
  if (/CARNE|FRANGO|PEIXE|LINGUIÇA/.test(n)) return "AÇOUGUE";
  if (/LEITE|QUEIJO|IOGURTE|MANTEIGA|REQUEIJÃO/.test(n)) return "LATICÍNIOS";
  if (/MAÇÃ|BANANA|LARANJA|FRUTA|VERDURA|LEGUME|ALFACE|TOMATE|CEBOLA/.test(n)) return "HORTIFRUTI";
  if (/SABÃO|DETERGENTE|LIMPEZA|ESPONJA|DESINFETANTE/.test(n)) return "LIMPEZA";
  if (/SHAMPOO|SABONETE|CREME|HIGIENE|PASTA DE DENTE/.test(n)) return "HIGIENE";
  return "MERCEARIA";
};

function MarketPage() {
  const lists = useHouseholdTable<List>("shopping_lists", "id,name,archived,completed_at,transaction_id,created_at");
  const items = useHouseholdTable<Item>("shopping_items", "id,list_id,name,category,qty,unit,price,actual_price,actual_qty,done");
  const [tab, setTab] = useState<Tab>("planning");
  const [active, setActive] = useState("");
  const [newList, setNewList] = useState("");
  const [product, setProduct] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [modal, setModal] = useState(false);
  const [pay, setPay] = useState("ALIMENTACAO");
  const [responsible, setResponsible] = useState("AMBAS");
  const [finalValue, setFinalValue] = useState("");

  const activeLists = lists.rows.filter((l) => !l.archived);
  const history = useMemo(() => lists.rows.filter((l) => l.archived).sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime()), [lists.rows]);
  useEffect(() => {
    if (!active && activeLists[0]) setActive(activeLists[0].id);
    if (active && !activeLists.some((l) => l.id === active)) setActive(activeLists[0]?.id || "");
  }, [active, activeLists]);

  const current = activeLists.find((l) => l.id === active);
  const currentItems = current ? items.rows.filter((i) => i.list_id === current.id) : [];
  const estimated = currentItems.reduce((s, i) => s + Number(i.qty || 0) * Number(i.price || 0), 0);
  const real = currentItems.filter((i) => i.done).reduce((s, i) => s + Number(i.actual_qty ?? i.qty ?? 0) * Number(i.actual_price || 0), 0);
  const bought = currentItems.filter((i) => i.done).length;
  const grouped = useMemo(() => currentItems.reduce<Record<string, Item[]>>((acc, item) => { (acc[item.category || "OUTROS"] ||= []).push(item); return acc; }, {}), [currentItems]);

  async function createList() {
    if (!newList.trim()) return toast.error("INFORME O NOME DA LISTA");
    try { const row = await lists.insert({ name: newList.trim().toUpperCase(), archived: false }); setActive(row.id); setNewList(""); toast.success("LISTA CRIADA"); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO CRIAR LISTA"); }
  }

  async function addItem() {
    if (!current) return toast.error("CRIE UMA LISTA PRIMEIRO");
    if (!product.trim()) return toast.error("INFORME O PRODUTO");
    try { await items.insert({ list_id: current.id, name: product.trim().toUpperCase(), category: sector(product), qty: Number(qty) || 1, unit: "UN", price: money(price), actual_price: null, actual_qty: null, done: false }); setProduct(""); setQty("1"); setPrice(""); toast.success("ITEM ADICIONADO"); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO ADICIONAR"); }
  }

  async function toggle(item: Item) {
    try { await items.update(item.id, { done: !item.done, actual_qty: !item.done ? (item.actual_qty ?? item.qty ?? 1) : null }); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO ATUALIZAR"); }
  }

  async function updateReal(item: Item, field: "actual_qty" | "actual_price", value: string) {
    try { await items.update(item.id, { [field]: field === "actual_qty" ? Number(value) || 0 : money(value) }); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO SALVAR"); }
  }

  async function finish() {
    const amount = money(finalValue || real.toFixed(2));
    if (!current || bought === 0 || amount <= 0) return toast.error("O TOTAL REAL PRECISA SER MAIOR QUE R$ 0,00");
    try {
      const { error } = await supabase.rpc("finalize_shopping_list", { p_list_id: current.id, p_pay_method: pay, p_responsible: responsible, p_amount_override: amount });
      if (error) throw error;
      toast.success("COMPRA FINALIZADA — LANÇAMENTO CRIADO NO FLUXO MENSAL");
      setModal(false); setTab("history");
      await Promise.all([lists.refetch(), items.refetch()]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO FINALIZAR COMPRA"); }
  }

  async function duplicate(list: List) {
    try {
      const copy = await lists.insert({ name: list.name, archived: false });
      for (const item of items.rows.filter((i) => i.list_id === list.id)) await items.insert({ list_id: copy.id, name: item.name, category: item.category, qty: item.qty, unit: item.unit, price: item.price, actual_price: null, actual_qty: null, done: false });
      setActive(copy.id); setTab("planning"); toast.success("LISTA DUPLICADA");
    } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO DUPLICAR LISTA"); }
  }

  return (
    <div className="space-y-5 pb-36">
      <PageHeader title="MERCADO" subtitle="PLANEJE, COMPRE AO VIVO E CONSULTE SUAS COMPRAS." action={<button onClick={() => setNewList("")} className="gradient-primary flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground"><Plus className="h-5 w-5" /></button>} />
      <div className="grid grid-cols-3 rounded-2xl border bg-muted/30 p-1">
        {[["planning", "PLANEJAMENTO", ListChecks], ["market", "MODO MERCADO", ShoppingCart], ["history", "HISTÓRICO", History]].map(([id, label, Icon]) => <button key={id as string} onClick={() => setTab(id as Tab)} className={cn("flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-[10px] label-caps", tab === id && "bg-background text-primary shadow-sm")}><Icon className="h-4 w-4" />{label as string}</button>)}
      </div>

      {tab === "planning" && <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><StatCard label="LISTAS ATIVAS" value={String(activeLists.length)} tone="info" /><StatCard label="ITENS" value={String(currentItems.length)} tone="primary" /><StatCard label="TOTAL ESTIMADO" value={formatCurrency(estimated)} tone="success" /></div>
        <Panel title="NOVA LISTA"><div className="flex gap-2"><input value={newList} onChange={(e) => setNewList(e.target.value)} placeholder="NOME DA LISTA" className="flex-1 rounded-xl border px-3 py-2.5" /><button onClick={() => void createList()} className="gradient-primary rounded-xl px-4 py-2.5 text-[10px] text-primary-foreground">CRIAR</button></div></Panel>
        <Panel title="LISTAS"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{activeLists.map((list) => <div key={list.id} className={cn("rounded-2xl border p-4", active === list.id && "border-primary bg-primary/5")}><button onClick={() => setActive(list.id)} className="w-full text-left"><b>{list.name}</b><p className="text-xs text-muted-foreground">{items.rows.filter((i) => i.list_id === list.id).length} ITENS</p></button><button disabled={!items.rows.some((i) => i.list_id === list.id)} onClick={() => { setActive(list.id); setTab("market"); }} className="mt-3 w-full rounded-lg bg-primary px-2 py-2 text-[10px] text-primary-foreground disabled:opacity-40">IR AO MERCADO</button></div>)}</div></Panel>
        {current && <Panel title={`ADICIONAR ITEM — ${current.name}`}><div className="grid gap-3 md:grid-cols-4"><input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="PRODUTO" className="rounded-xl border px-3 py-2.5 md:col-span-2" /><input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min="1" placeholder="QTD" className="rounded-xl border px-3 py-2.5" /><input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="PREÇO ESTIMADO" className="rounded-xl border px-3 py-2.5" /><button onClick={() => void addItem()} className="gradient-primary rounded-xl px-4 py-2.5 text-[10px] text-primary-foreground">ADICIONAR ITEM</button></div></Panel>}
      </>}

      {tab === "market" && current && <>
        <div className="sticky top-0 z-20 rounded-2xl border border-orange-300 bg-orange-500 p-4 text-white"><div className="flex items-center justify-between"><div><p className="text-xs">MODO MERCADO</p><b className="text-lg">{current.name}</b></div><b>{bought} de {currentItems.length} itens</b></div></div>
        <Panel title="ITENS POR SETOR"><div className="space-y-4">{Object.entries(grouped).map(([category, rows]) => <div key={category}><p className="mb-2 text-[10px] font-semibold text-muted-foreground">{category}</p>{rows.map((item) => { const subtotal = Number(item.actual_qty ?? item.qty ?? 0) * Number(item.actual_price || 0); return <div key={item.id} className="rounded-xl border p-3"><button onClick={() => void toggle(item)} className="flex w-full items-center gap-3 text-left"><span className={cn("flex h-7 w-7 items-center justify-center rounded-lg border", item.done && "bg-primary text-primary-foreground")}>{item.done && <Check className="h-4 w-4" />}</span><b className="flex-1">{item.name}</b><span className="text-xs text-muted-foreground">{item.qty} {item.unit}</span></button>{item.done && <div className="mt-3 grid gap-2 sm:grid-cols-3"><label className="text-[10px]">QTD REAL<input value={item.actual_qty ?? item.qty ?? ""} onChange={(e) => void updateReal(item, "actual_qty", e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label><label className="text-[10px]">PREÇO REAL<input value={item.actual_price ?? ""} onChange={(e) => void updateReal(item, "actual_price", e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="0,00" /></label><div><p className="text-[10px]">SUBTOTAL</p><b>{formatCurrency(subtotal)}</b></div></div>}</div>; })}</div>)}</div></Panel>
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur"><div className="mx-auto flex max-w-4xl items-center justify-between gap-3"><div><p className="text-[10px] text-muted-foreground">TOTAL ESTIMADO</p><b>{formatCurrency(estimated)}</b><p className="text-[10px] font-semibold text-primary">TOTAL REAL {formatCurrency(real)}</p></div><button disabled={bought === 0 || real <= 0} onClick={() => { setFinalValue(real.toFixed(2)); setModal(true); }} className="gradient-primary rounded-xl px-4 py-3 text-xs font-bold text-primary-foreground disabled:opacity-40">FINALIZAR COMPRA</button></div></div>
      </>}

      {tab === "history" && <Panel title="COMPRAS FINALIZADAS"><div className="space-y-3">{history.map((list) => <div key={list.id} className="rounded-2xl border p-4"><div className="flex items-center justify-between"><div><b>{list.name}</b><p className="text-xs text-muted-foreground">{list.completed_at ? new Date(list.completed_at).toLocaleString("pt-BR") : ""}</p></div><span className="rounded-full bg-success/10 px-2 py-1 text-[10px] text-success">✓ LANÇADO NO FLUXO</span></div><button onClick={() => void duplicate(list)} className="mt-3 rounded-lg border px-3 py-2 text-[10px]">DUPLICAR LISTA</button></div>)}{!history.length && <p className="py-10 text-center text-sm text-muted-foreground">NENHUMA COMPRA FINALIZADA.</p>}</div></Panel>}

      {modal && current && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-2xl bg-background p-5"><div className="mb-4 flex items-center justify-between"><b>FINALIZAR COMPRA</b><button onClick={() => setModal(false)}><X /></button></div><label className="mb-3 block text-xs">FORMA DE PAGAMENTO<select value={pay} onChange={(e) => setPay(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3"><option value="ALIMENTACAO">CARTÃO DE ALIMENTAÇÃO</option><option value="PIX">PIX</option><option value="CREDITO">CARTÃO DE CRÉDITO</option></select></label><label className="mb-3 block text-xs">RESPONSÁVEL<select value={responsible} onChange={(e) => setResponsible(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3"><option>AMBAS</option><option>MARIA</option><option>LUCAS</option></select></label><label className="block text-xs">TOTAL REAL<input value={finalValue} onChange={(e) => setFinalValue(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3 text-lg font-bold" /></label><button onClick={() => void finish()} className="gradient-primary mt-4 w-full rounded-xl px-4 py-3 text-xs font-bold text-primary-foreground">CONFIRMAR E LANÇAR NO FLUXO</button></div></div>}
    </div>
  );
}
