import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mercado")({
  head: () => ({ meta: [{ title: "MERCADO — HARMONY HUB" }] }),
  component: MarketPage,
});

type List = { id: string; name: string; archived: boolean; household_id: string };
type Item = {
  id: string; list_id: string; name: string; category: string; qty: number | null;
  unit: string; price: number | null; priority: string; done: boolean; household_id: string;
};

function MarketPage() {
  const lists = useHouseholdTable<List>("shopping_lists", "id,name,archived,household_id");
  const items = useHouseholdTable<Item>("shopping_items", "id,list_id,name,category,qty,unit,price,priority,done,household_id");
  const [active, setActive] = useState("");
  const [showListForm, setShowListForm] = useState(false);
  const [listName, setListName] = useState("");
  const [product, setProduct] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("1");
  const [editPrice, setEditPrice] = useState("");

  useEffect(() => {
    if (!active && lists.rows.length) setActive(lists.rows[0].id);
    if (active && !lists.rows.some((list) => list.id === active)) setActive(lists.rows[0]?.id ?? "");
  }, [active, lists.rows]);

  const current = lists.rows.find((list) => list.id === active) ?? lists.rows[0];
  const currentItems = current ? items.rows.filter((item) => item.list_id === current.id) : [];
  const total = currentItems.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0);

  function openNewList() { setListName(""); setShowListForm(true); }

  async function createList() {
    const clean = listName.trim();
    if (!clean) return toast.error("INFORME O NOME DA LISTA");
    if (lists.rows.some((list) => list.name.toLowerCase() === clean.toLowerCase())) return toast.error("ESSA LISTA JÁ EXISTE");
    try {
      const created = await lists.insert({ name: clean.toUpperCase(), archived: false });
      await lists.refetch();
      setActive(created.id);
      setShowListForm(false);
      toast.success("LISTA CRIADA");
    } catch (error) { toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL CRIAR A LISTA"); }
  }

  async function renameList(list: List) {
    const value = window.prompt("NOVO NOME DA LISTA", list.name)?.trim();
    if (!value || value.toLowerCase() === list.name.toLowerCase()) return;
    try { await lists.update(list.id, { name: value.toUpperCase() }); await lists.refetch(); toast.success("LISTA RENOMEADA"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL RENOMEAR"); }
  }

  async function removeList(list: List) {
    if (!window.confirm(`EXCLUIR A LISTA “${list.name}” E SEUS ITENS?`)) return;
    try {
      for (const item of items.rows.filter((row) => row.list_id === list.id)) await items.remove(item.id);
      await lists.remove(list.id);
      await Promise.all([lists.refetch(), items.refetch()]);
      toast.success("LISTA EXCLUÍDA");
    } catch (error) { toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL EXCLUIR"); }
  }

  async function addItem() {
    if (!current) return toast.error("CRIE UMA LISTA PRIMEIRO");
    if (!product.trim()) return toast.error("INFORME O PRODUTO");
    try {
      await items.insert({ list_id: current.id, name: product.trim().toUpperCase(), category: "OUTROS", qty: Number(qty) || 1, unit: "UN", price: Number(price.replace(",", ".")) || 0, priority: "MÉDIA", done: false });
      await items.refetch(); setProduct(""); setQty("1"); setPrice(""); toast.success("ITEM ADICIONADO");
    } catch (error) { toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL ADICIONAR"); }
  }

  function startEdit(item: Item) { setEditing(item.id); setEditName(item.name); setEditQty(String(item.qty ?? 1)); setEditPrice(String(item.price ?? 0)); }

  async function saveEdit(item: Item) {
    if (!editName.trim()) return toast.error("INFORME O PRODUTO");
    try { await items.update(item.id, { name: editName.trim().toUpperCase(), qty: Number(editQty) || 1, price: Number(editPrice.replace(",", ".")) || 0 }); await items.refetch(); setEditing(null); toast.success("ITEM EDITADO"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL EDITAR"); }
  }

  async function removeItem(item: Item) {
    if (!window.confirm(`EXCLUIR “${item.name}”?`)) return;
    try { await items.remove(item.id); await items.refetch(); toast.success("ITEM EXCLUÍDO"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL EXCLUIR"); }
  }

  async function toggle(item: Item) {
    try { await items.update(item.id, { done: !item.done }); await items.refetch(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL ATUALIZAR"); }
  }

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title="MERCADO"
        subtitle="ESCOLHA UMA LISTA PARA VER, ADICIONAR, EDITAR OU EXCLUIR SEUS ITENS."
        action={<button type="button" onClick={openNewList} aria-label="CRIAR NOVA LISTA" title="CRIAR NOVA LISTA" className="gradient-primary flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground shadow-lg"><Plus className="h-5 w-5" /></button>}
      />

      {showListForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => { if (e.currentTarget === e.target) setShowListForm(false); }}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="label-caps text-sm font-semibold">NOVA LISTA</h2><p className="mt-1 text-xs text-muted-foreground">CRIE UMA LISTA SEPARADA.</p></div><button type="button" onClick={() => setShowListForm(false)} className="rounded-lg p-2 hover:bg-muted"><X className="h-4 w-4" /></button></div>
            <input autoFocus value={listName} onChange={(e) => setListName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void createList(); }} placeholder="NOME DA LISTA" className="mb-3 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" />
            <button type="button" onClick={() => void createList()} className="gradient-primary w-full rounded-xl px-4 py-3 text-[11px] text-primary-foreground">CRIAR LISTA</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="LISTAS" value={String(lists.rows.length)} tone="info" />
        <StatCard label="ITENS" value={String(currentItems.length)} tone="primary" />
        <StatCard label="TOTAL" value={formatCurrency(total)} tone="success" />
      </div>

      <Panel title="LISTAS">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.rows.map((list) => {
            const count = items.rows.filter((item) => item.list_id === list.id).length;
            return <div key={list.id} className={cn("rounded-2xl border p-4", current?.id === list.id ? "border-primary bg-primary/5" : "border-border")}>
              <button type="button" onClick={() => setActive(list.id)} className="w-full text-left"><p className="label-caps text-sm font-semibold">{list.name}</p><p className="mt-2 text-xs text-muted-foreground">{count} {count === 1 ? "ITEM" : "ITENS"}</p></button>
              <div className="mt-3 flex gap-2 border-t border-border pt-3"><button type="button" onClick={() => renameList(list)} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] label-caps"><Pencil className="h-3.5 w-3.5" /> EDITAR</button><button type="button" onClick={() => void removeList(list)} className="flex items-center gap-1 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-[10px] label-caps text-destructive"><Trash2 className="h-3.5 w-3.5" /> EXCLUIR</button></div>
            </div>;
          })}
          {!lists.rows.length && <div className="sm:col-span-2 lg:col-span-3 py-10 text-center text-sm text-muted-foreground">NENHUMA LISTA. CLIQUE NO + PARA CRIAR.</div>}
        </div>
      </Panel>

      {current && <>
        <Panel title={`ADICIONAR ITEM — ${current.name}`}>
          <div className="grid gap-3 md:grid-cols-4">
            <input value={product} onChange={(e) => setProduct(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void addItem(); }} placeholder="PRODUTO" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm md:col-span-2" />
            <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min="1" placeholder="QTD" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="PREÇO" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
            <button type="button" onClick={() => void addItem()} className="gradient-primary label-caps rounded-xl px-4 py-2.5 text-[10px] text-primary-foreground md:col-span-2">ADICIONAR ITEM</button>
          </div>
        </Panel>

        <Panel title={`ITENS — ${current.name}`}>
          <ul className="divide-y divide-border">
            {currentItems.map((item) => <li key={item.id} className="py-4">
              {editing === item.id ? <div className="grid gap-2 md:grid-cols-[1fr_100px_140px_auto_auto]"><input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" /><input value={editQty} onChange={(e) => setEditQty(e.target.value)} type="number" min="1" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" /><input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} inputMode="decimal" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" /><button type="button" onClick={() => void saveEdit(item)} className="rounded-lg bg-primary px-3 py-2 text-[10px] label-caps text-primary-foreground">SALVAR</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-border px-3 py-2 text-[10px] label-caps">CANCELAR</button></div> : <div className="flex items-center gap-3"><button type="button" onClick={() => void toggle(item)} className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", item.done ? "gradient-primary border-transparent text-primary-foreground" : "border-border text-transparent")}><Check className="h-4 w-4" /></button><div className="min-w-0 flex-1"><p className={cn("label-caps text-[11px]", item.done && "line-through opacity-60")}>{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.qty} UN · {formatCurrency(Number(item.price || 0))}</p></div><span className="hidden text-sm font-semibold sm:block">{formatCurrency(Number(item.qty || 0) * Number(item.price || 0))}</span><button type="button" onClick={() => startEdit(item)} title="EDITAR" className="rounded-lg border border-border p-2"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => void removeItem(item)} title="EXCLUIR" className="rounded-lg border border-destructive/30 p-2 text-destructive"><Trash2 className="h-4 w-4" /></button></div>}
            </li>)}
            {!currentItems.length && <li className="py-10 text-center text-sm text-muted-foreground">NENHUM ITEM NESTA LISTA.</li>}
          </ul>
        </Panel>
      </>}
    </div>
  );
}
