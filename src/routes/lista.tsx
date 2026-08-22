import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Pencil, Trash2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lista")({
  head: () => ({ meta: [{ title: "LISTA DE COMPRAS — HARMONY HUB" }] }),
  component: ShoppingPage,
});

type List = { id: string; name: string; archived: boolean; household_id: string };
type Item = {
  id: string;
  list_id: string;
  name: string;
  category: string;
  qty: number;
  unit: string;
  price: number;
  priority: string;
  done: boolean;
  household_id: string;
};

function ShoppingPage() {
  const lists = useHouseholdTable<List>("shopping_lists", "id,name,archived,household_id");
  const items = useHouseholdTable<Item>(
    "shopping_items",
    "id,list_id,name,category,qty,unit,price,priority,done,household_id",
  );
  const [active, setActive] = useState("");
  const [showListForm, setShowListForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [listName, setListName] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("1");
  const [editPrice, setEditPrice] = useState("");

  useEffect(() => {
    if (!active && lists.rows.length > 0) setActive(lists.rows[0].id);
    if (active && !lists.rows.some((list) => list.id === active)) {
      setActive(lists.rows[0]?.id ?? "");
    }
  }, [active, lists.rows]);

  const current = lists.rows.find((list) => list.id === active) ?? lists.rows[0];
  const currentItems = current ? items.rows.filter((item) => item.list_id === current.id) : [];
  const total = currentItems.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0);

  function openCreateList() {
    setListName("");
    setShowListForm(true);
  }

  function openAddItem() {
    if (!current) return toast.error("CRIE OU SELECIONE UMA LISTA");
    setName("");
    setPrice("");
    setQty("1");
    setShowItemForm(true);
  }

  async function addList() {
    const cleanName = listName.trim();
    if (!cleanName) return toast.error("INFORME O NOME DA LISTA");
    if (lists.rows.some((list) => list.name.toLowerCase() === cleanName.toLowerCase())) {
      return toast.error("ESSA LISTA JÁ EXISTE");
    }
    try {
      const created = await lists.insert({ name: cleanName.toUpperCase(), archived: false });
      await lists.refetch();
      setActive(created.id);
      setListName("");
      setShowListForm(false);
      toast.success(`LISTA “${created.name}” CRIADA`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL CRIAR A LISTA");
    }
  }

  async function renameList(list: List) {
    const nextName = window.prompt("NOVO NOME DA LISTA", list.name)?.trim();
    if (!nextName || nextName.toLowerCase() === list.name.toLowerCase()) return;
    if (lists.rows.some((other) => other.id !== list.id && other.name.toLowerCase() === nextName.toLowerCase())) {
      return toast.error("ESSA LISTA JÁ EXISTE");
    }
    try {
      await lists.update(list.id, { name: nextName.toUpperCase() });
      await lists.refetch();
      toast.success("LISTA RENOMEADA");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL RENOMEAR A LISTA");
    }
  }

  async function deleteList(list: List) {
    if (!window.confirm(`EXCLUIR A LISTA “${list.name}” E TODOS OS SEUS ITENS?`)) return;
    try {
      for (const item of items.rows.filter((row) => row.list_id === list.id)) {
        await items.remove(item.id);
      }
      await lists.remove(list.id);
      await Promise.all([lists.refetch(), items.refetch()]);
      if (active === list.id) setActive("");
      toast.success("LISTA EXCLUÍDA");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL EXCLUIR A LISTA");
    }
  }

  async function addItem() {
    if (!current) return toast.error("CRIE OU SELECIONE UMA LISTA");
    if (!name.trim()) return toast.error("INFORME O PRODUTO");
    try {
      await items.insert({
        list_id: current.id,
        name: name.trim().toUpperCase(),
        price: Number(price.replace(",", ".")) || 0,
        qty: Number(qty) || 1,
        unit: "UN",
        category: "OUTROS",
        priority: "MÉDIA",
        done: false,
      });
      await items.refetch();
      setName("");
      setPrice("");
      setQty("1");
      setShowItemForm(false);
      toast.success("ITEM ADICIONADO");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL SALVAR O ITEM");
    }
  }

  function startEdit(item: Item) {
    setEditing(item.id);
    setEditName(item.name);
    setEditQty(String(item.qty));
    setEditPrice(String(item.price ?? ""));
  }

  async function saveEdit(item: Item) {
    if (!editName.trim()) return toast.error("INFORME O PRODUTO");
    try {
      await items.update(item.id, {
        name: editName.trim().toUpperCase(),
        qty: Number(editQty) || 1,
        price: Number(editPrice.replace(",", ".")) || 0,
      });
      await items.refetch();
      setEditing(null);
      toast.success("ITEM EDITADO");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL EDITAR O ITEM");
    }
  }

  async function deleteItem(item: Item) {
    if (!window.confirm(`EXCLUIR “${item.name}”?`)) return;
    try {
      await items.remove(item.id);
      await items.refetch();
      if (editing === item.id) setEditing(null);
      toast.success("ITEM EXCLUÍDO");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL EXCLUIR O ITEM");
    }
  }

  async function toggle(item: Item) {
    try {
      await items.update(item.id, { done: !item.done });
      await items.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL ATUALIZAR");
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title="LISTA DE COMPRAS"
        subtitle="CLIQUE EM UMA LISTA PARA ABRIR TODOS OS ITENS. ADICIONE, EDITE OU EXCLUA O QUE PRECISAR."
      />

      {showListForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowListForm(false); }}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="label-caps text-sm font-semibold">NOVA LISTA</h2>
                <p className="mt-1 text-xs text-muted-foreground">CRIE UMA LISTA SEPARADA PARA MERCADO, FEIRA, FARMÁCIA, CASA ETC.</p>
              </div>
              <button type="button" onClick={() => setShowListForm(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <input autoFocus value={listName} onChange={(event) => setListName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addList(); }} placeholder="NOME DA LISTA" className="mb-3 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" />
            <button type="button" onClick={() => void addList()} className="gradient-primary w-full rounded-xl px-4 py-3 text-[11px] text-primary-foreground">CRIAR LISTA</button>
          </div>
        </div>
      )}

      {showItemForm && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowItemForm(false); }}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="label-caps text-sm font-semibold">ADICIONAR ITEM</h2>
                <p className="mt-1 text-xs text-muted-foreground">ADICIONANDO NA LISTA “{current.name}”.</p>
              </div>
              <button type="button" onClick={() => setShowItemForm(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input autoFocus value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addItem(); }} placeholder="PRODUTO" className="rounded-xl border border-input bg-background px-3 py-3 text-sm sm:col-span-2" />
              <input value={qty} onChange={(event) => setQty(event.target.value)} type="number" min="1" placeholder="QUANTIDADE" className="rounded-xl border border-input bg-background px-3 py-3 text-sm" />
              <input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="PREÇO" inputMode="decimal" className="rounded-xl border border-input bg-background px-3 py-3 text-sm" />
              <button type="button" onClick={() => void addItem()} className="gradient-primary label-caps rounded-xl px-4 py-3 text-[10px] text-primary-foreground sm:col-span-2">ADICIONAR ITEM</button>
            </div>
          </div>
        </div>
      )}

      <Panel title="SUAS LISTAS — CLIQUE PARA ABRIR">
        <div className="mb-4 flex justify-end">
          <button type="button" onClick={openCreateList} className="gradient-primary label-caps rounded-xl px-4 py-2.5 text-[10px] text-primary-foreground">NOVA LISTA</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.rows.map((list) => {
            const listItems = items.rows.filter((item) => item.list_id === list.id);
            const isActive = current?.id === list.id;
            return (
              <div key={list.id} className={cn("rounded-2xl border p-4 transition", isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50")}>
                <button type="button" onClick={() => setActive(list.id)} className="w-full text-left">
                  <p className="label-caps text-sm font-semibold">{list.name}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{listItems.length} {listItems.length === 1 ? "ITEM" : "ITENS"} · {listItems.filter((item) => item.done).length} CONCLUÍDOS</p>
                </button>
                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <button type="button" onClick={() => renameList(list)} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] label-caps hover:bg-muted"><Pencil className="h-3.5 w-3.5" /> EDITAR</button>
                  <button type="button" onClick={() => void deleteList(list)} className="flex items-center gap-1 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-[10px] label-caps text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> EXCLUIR</button>
                </div>
              </div>
            );
          })}
          {lists.rows.length === 0 && <div className="sm:col-span-2 lg:col-span-3 py-10 text-center text-sm text-muted-foreground">NENHUMA LISTA CRIADA AINDA. USE O BOTÃO NOVA LISTA ACIMA.</div>}
        </div>
      </Panel>

      {current ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="ITENS" value={String(currentItems.length)} tone="info" />
            <StatCard label="CONCLUÍDOS" value={String(currentItems.filter((item) => item.done).length)} tone="success" />
            <StatCard label="TOTAL ESTIMADO" value={formatCurrency(total)} tone="primary" />
          </div>

          <Panel title={`LISTA ATUAL — ${current.name}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="label-caps text-sm font-semibold">{current.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{currentItems.length} {currentItems.length === 1 ? "ITEM" : "ITENS"}</p>
              </div>
              <button type="button" onClick={openAddItem} aria-label="ADICIONAR ITEM À LISTA" title="ADICIONAR ITEM À LISTA" className="gradient-primary flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground shadow-elegant transition-transform active:scale-95">
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </Panel>

          <Panel title={`TODOS OS ITENS — ${current.name}`}>
            <ul className="divide-y divide-border">
              {currentItems.map((item) => (
                <li key={item.id} className="py-4">
                  {editing === item.id ? (
                    <div className="grid gap-2 md:grid-cols-[1fr_100px_140px_auto_auto] md:items-center">
                      <input value={editName} onChange={(event) => setEditName(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                      <input value={editQty} onChange={(event) => setEditQty(event.target.value)} type="number" min="1" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                      <input value={editPrice} onChange={(event) => setEditPrice(event.target.value)} inputMode="decimal" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                      <button type="button" onClick={() => void saveEdit(item)} className="rounded-lg bg-primary px-3 py-2 text-[10px] label-caps text-primary-foreground">SALVAR</button>
                      <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-border px-3 py-2 text-[10px] label-caps">CANCELAR</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => void toggle(item)} aria-label={item.done ? "DESMARCAR ITEM" : "MARCAR ITEM"} className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", item.done ? "gradient-primary border-transparent text-primary-foreground" : "border-border text-transparent")}><Check className="h-4 w-4" /></button>
                      <div className="min-w-0 flex-1">
                        <p className={cn("label-caps text-[11px]", item.done && "line-through opacity-60")}>{item.name}</p>
                        <div className="mt-1 flex gap-2"><Tag>{item.qty} {item.unit}</Tag><Tag>{item.priority}</Tag></div>
                      </div>
                      <span className="hidden text-sm font-semibold sm:block">{formatCurrency(Number(item.qty) * Number(item.price))}</span>
                      <button type="button" onClick={() => startEdit(item)} title="EDITAR ITEM" aria-label="EDITAR ITEM" className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => void deleteItem(item)} title="EXCLUIR ITEM" aria-label="EXCLUIR ITEM" className="rounded-lg border border-destructive/30 p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  )}
                </li>
              ))}
              {currentItems.length === 0 && <li className="py-10 text-center text-sm text-muted-foreground">ESTA LISTA ESTÁ VAZIA. CLIQUE NO + PARA ADICIONAR O PRIMEIRO ITEM.</li>}
            </ul>
          </Panel>
        </>
      ) : (
        <Panel title="COMECE UMA LISTA">
          <div className="py-6 text-center">
            <p className="mb-4 text-sm text-muted-foreground">CRIE UMA LISTA PARA COMEÇAR A ADICIONAR SEUS ITENS.</p>
            <button type="button" onClick={openCreateList} className="gradient-primary label-caps rounded-xl px-4 py-2.5 text-[10px] text-primary-foreground">NOVA LISTA</button>
          </div>
        </Panel>
      )}
    </div>
  );
}
