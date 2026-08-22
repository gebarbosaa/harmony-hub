import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronDown, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lista")({
  head: () => ({ meta: [{ title: "LISTA DE COMPRAS — MULTICAP" }] }),
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
  const [listName, setListName] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");

  useEffect(() => {
    if (!active && lists.rows.length > 0) setActive(lists.rows[0].id);
    if (active && !lists.rows.some((list) => list.id === active)) {
      setActive(lists.rows[0]?.id ?? "");
    }
  }, [active, lists.rows]);

  const current = lists.rows.find((list) => list.id === active) ?? lists.rows[0];
  const currentItems = current ? items.rows.filter((item) => item.list_id === current.id) : [];
  const total = currentItems.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0);

  async function addList() {
    const cleanName = listName.trim();
    if (!cleanName) return toast.error("INFORME O NOME DA LISTA");

    if (lists.rows.some((list) => list.name.toLowerCase() === cleanName.toLowerCase())) {
      return toast.error("ESSA LISTA JÁ EXISTE");
    }

    try {
      const created = await lists.insert({ name: cleanName.toUpperCase(), archived: false });
      setListName("");
      setActive(created.id);
      toast.success(`LISTA “${cleanName.toUpperCase()}” CRIADA`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL CRIAR A LISTA");
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
      setName("");
      setPrice("");
      setQty("1");
      toast.success("ITEM ADICIONADO");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL SALVAR O ITEM");
    }
  }

  async function toggle(item: Item) {
    try {
      await items.update(item.id, { done: !item.done });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL ATUALIZAR");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="LISTA DE COMPRAS"
        subtitle="Crie várias listas, escolha qual está usando e registre os itens em tempo real."
      />

      <Panel title="MINHAS LISTAS">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <ListPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={current?.id ?? ""}
              onChange={(event) => setActive(event.target.value)}
              className="w-full appearance-none rounded-xl border border-input bg-background py-3 pl-10 pr-10 text-sm font-medium outline-none focus:border-primary"
            >
              {lists.rows.length === 0 ? (
                <option value="">Nenhuma lista criada</option>
              ) : (
                lists.rows.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <div className="flex gap-2">
            <input
              value={listName}
              onChange={(event) => setListName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addList();
              }}
              placeholder="Nova lista: Mercado, Feira..."
              className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm md:w-64"
            />
            <button
              onClick={addList}
              className="gradient-primary label-caps rounded-xl px-4 text-[10px] text-primary-foreground"
            >
              CRIAR
            </button>
          </div>
        </div>

        {lists.rows.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {lists.rows.map((list) => (
              <button
                key={list.id}
                onClick={() => setActive(list.id)}
                className={cn(
                  "label-caps rounded-xl border px-4 py-2 text-[11px] transition-colors",
                  current?.id === list.id
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50",
                )}
              >
                {list.name}
              </button>
            ))}
          </div>
        )}
      </Panel>

      {current ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="ITENS" value={String(currentItems.length)} tone="info" />
            <StatCard
              label="CONCLUÍDOS"
              value={String(currentItems.filter((item) => item.done).length)}
              tone="success"
            />
            <StatCard label="TOTAL ESTIMADO" value={formatCurrency(total)} tone="primary" />
          </div>

          <Panel title={`NOVO ITEM — ${current.name}`}>
            <div className="grid gap-3 md:grid-cols-4">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Produto"
                className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm md:col-span-2"
              />
              <input
                value={qty}
                onChange={(event) => setQty(event.target.value)}
                type="number"
                min="1"
                placeholder="Qtd"
                className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
              />
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="Preço"
                inputMode="decimal"
                className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
              />
              <button
                onClick={addItem}
                className="gradient-primary label-caps rounded-xl px-4 py-2.5 text-[10px] text-primary-foreground md:col-span-2"
              >
                ADICIONAR ITEM
              </button>
            </div>
          </Panel>

          <Panel title={`ITENS — ${current.name}`}>
            <ul className="divide-y divide-border">
              {currentItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <button
                    onClick={() => toggle(item)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border",
                      item.done
                        ? "gradient-primary border-transparent text-primary-foreground"
                        : "border-border text-transparent",
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <div className="flex-1">
                    <p className={cn("label-caps text-[11px]", item.done && "line-through opacity-60")}>
                      {item.name}
                    </p>
                    <div className="mt-1 flex gap-2">
                      <Tag>
                        {item.qty} {item.unit}
                      </Tag>
                      <Tag>{item.priority}</Tag>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatCurrency(Number(item.qty) * Number(item.price))}
                  </span>
                </li>
              ))}
              {currentItems.length === 0 && (
                <li className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum item cadastrado nesta lista.
                </li>
              )}
            </ul>
          </Panel>
        </>
      ) : (
        <Panel title="COMECE UMA LISTA">
          <p className="py-6 text-center text-sm text-muted-foreground">
            Crie sua primeira lista acima. Depois você poderá alternar entre Mercado, Feira, Farmácia ou qualquer outra lista.
          </p>
        </Panel>
      )}
    </div>
  );
}
