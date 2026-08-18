import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag, PersonDot } from "@/components/ui-kit";
import { transactions as seed, type Transaction, type TxType } from "@/lib/mock-data";
import { formatCurrency, evaluateAmount } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fluxo")({
  head: () => ({
    meta: [
      { title: "FLUXO MENSAL — MULTICAP" },
      {
        name: "description",
        content: "Lance receitas, despesas, transferências e investimentos do mês.",
      },
      { property: "og:title", content: "FLUXO MENSAL — MULTICAP" },
      {
        property: "og:description",
        content: "Lance receitas, despesas, transferências e investimentos do mês.",
      },
    ],
  }),
  component: FlowPage,
});

const TYPES: TxType[] = ["RECEITA", "DESPESA", "TRANSFERENCIA", "INVESTIMENTO"];

const typeColor: Record<TxType, string> = {
  RECEITA: "text-success",
  DESPESA: "text-danger",
  TRANSFERENCIA: "text-info",
  INVESTIMENTO: "text-primary",
};

function FlowPage() {
  const [items, setItems] = useState<Transaction[]>(seed);
  const [type, setType] = useState<TxType>("DESPESA");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("ALIMENTAÇÃO");
  const [responsible, setResponsible] = useState<Transaction["responsible"]>("AMBAS");
  const [filter, setFilter] = useState<"TODOS" | TxType>("TODOS");
  const [search, setSearch] = useState("");

  const parsed = evaluateAmount(amount);

  const totals = useMemo(() => {
    const income = items.filter((t) => t.type === "RECEITA").reduce((s, t) => s + t.amount, 0);
    const expense = items.filter((t) => t.type === "DESPESA").reduce((s, t) => s + t.amount, 0);
    const invested = items
      .filter((t) => t.type === "INVESTIMENTO")
      .reduce((s, t) => s + t.amount, 0);
    return { income, expense, invested, result: income - expense };
  }, [items]);

  const visible = items.filter(
    (t) =>
      (filter === "TODOS" || t.type === filter) &&
      t.description.toLowerCase().includes(search.toLowerCase()),
  );

  const add = () => {
    if (!description.trim() || !parsed) {
      toast.error("PREENCHA DESCRIÇÃO E VALOR");
      return;
    }
    setItems((prev) => [
      {
        id: crypto.randomUUID(),
        date: "2026-08-18",
        description: description.toUpperCase(),
        category,
        method: "PIX",
        responsible,
        amount: parsed,
        type,
        status: "PAGO",
      },
      ...prev,
    ]);
    setDescription("");
    setAmount("");
    toast.success("LANÇAMENTO SALVO");
  };

  return (
    <div className="space-y-5">
      <PageHeader title="FLUXO MENSAL" subtitle="Lançamentos à vista, receitas e transferências." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="RECEITAS" value={formatCurrency(totals.income)} tone="success" />
        <StatCard label="DESPESAS" value={formatCurrency(totals.expense)} tone="danger" />
        <StatCard label="INVESTIDO" value={formatCurrency(totals.invested)} tone="primary" />
        <StatCard
          label="RESULTADO"
          value={formatCurrency(totals.result)}
          tone={totals.result >= 0 ? "success" : "danger"}
        />
      </div>

      <Panel title="CADASTRO RÁPIDO">
        <div className="mb-3 flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "label-caps rounded-lg border px-3 py-1.5 text-[10px] transition-colors",
                type === t
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="md:col-span-2">
            <span className="label-caps text-[10px] text-muted-foreground">DESCRIÇÃO</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mercado, salário, aluguel…"
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
          <label>
            <span className="label-caps text-[10px] text-muted-foreground">VALOR (aceita 50+30)</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="120 / 3"
              inputMode="text"
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            {parsed !== null ? (
              <span className="mt-1 block text-[10px] text-primary">= {formatCurrency(parsed)}</span>
            ) : null}
          </label>
          <label>
            <span className="label-caps text-[10px] text-muted-foreground">CATEGORIA</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {["ALIMENTAÇÃO", "MORADIA", "TRANSPORTE", "LAZER", "SAÚDE", "RENDA"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label-caps text-[10px] text-muted-foreground">RESPONSÁVEL</span>
            <select
              value={responsible}
              onChange={(e) => setResponsible(e.target.value as Transaction["responsible"])}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {["MARIA", "LUCAS", "AMBAS"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <button
            onClick={add}
            className="gradient-primary label-caps mt-auto rounded-xl px-4 py-2.5 text-[11px] text-primary-foreground md:col-span-2"
          >
            SALVAR LANÇAMENTO
          </button>
        </div>
      </Panel>

      <Panel
        title="LANÇAMENTOS"
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="label-caps rounded-lg border border-input bg-background px-2 py-1.5 text-[10px]"
            >
              {["TODOS", ...TYPES].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
        }
      >
        <ul className="divide-y divide-border">
          {visible.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="label-caps truncate text-[11px]">{t.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Tag>{t.category}</Tag>
                  <PersonDot name={t.responsible} />
                  <span className="text-[10px] text-muted-foreground">{t.method}</span>
                </div>
              </div>
              <div className="text-right">
                <p className={cn("text-sm font-bold", typeColor[t.type])}>
                  {t.type === "RECEITA" ? "+" : "-"}
                  {formatCurrency(t.amount)}
                </p>
                <Tag tone={t.status === "PAGO" ? "success" : "warning"}>{t.status}</Tag>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
