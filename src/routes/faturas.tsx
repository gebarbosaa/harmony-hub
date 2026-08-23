import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { MonthSelector, useGlobalMonth } from "@/hooks/use-global-month";

export const Route = createFileRoute("/faturas")({
  head: () => ({ meta: [{ title: "FATURAS — MULTICAP" }] }),
  component: InvoicesPage,
});

type Card = {
  id: string;
  name: string;
  brand: string | null;
  last4: string | null;
  credit_limit: number;
  due_day: number;
  close_day: number;
  household_id: string;
};

type Invoice = {
  id: string;
  card_id: string | null;
  period: string;
  total: number;
  status: string;
  household_id: string;
};

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  card_name: string | null;
};

function InvoicesPage() {
  const { month, setMonth } = useGlobalMonth("faturas");
  const cards = useHouseholdTable<Card>(
    "cards",
    "id,name,brand,last4,credit_limit,due_day,close_day,household_id",
    "name",
  );
  const invoices = useHouseholdTable<Invoice>(
    "invoices",
    "id,card_id,period,total,status,household_id",
    "period",
  );
  const transactions = useHouseholdTable<Transaction>(
    "transactions",
    "id,date,description,amount,card_name",
    "date",
  );

  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [brand, setBrand] = useState("");
  const [last4, setLast4] = useState("");
  const [closeDay, setCloseDay] = useState("28");
  const [dueDay, setDueDay] = useState("5");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const monthTransactions = useMemo(
    () => transactions.rows.filter((item) => item.date.startsWith(month)),
    [transactions.rows, month],
  );

  const monthInvoices = useMemo(
    () => invoices.rows.filter((item) => item.period === month),
    [invoices.rows, month],
  );

  const cardTransactions = (card: Card) =>
    monthTransactions.filter(
      (item) => item.card_name?.toUpperCase() === card.name.toUpperCase(),
    );

  const cardTotal = (card: Card) =>
    cardTransactions(card).reduce((sum, item) => sum + Number(item.amount), 0);

  async function addCard() {
    const numericLimit = Number(limit.replace(",", "."));
    if (!name.trim() || numericLimit <= 0) {
      toast.error("PREENCHA NOME E LIMITE");
      return;
    }

    try {
      await cards.insert({
        name: name.trim().toUpperCase(),
        brand: brand.trim().toUpperCase() || null,
        last4: last4.trim() || null,
        credit_limit: numericLimit,
        close_day: Number(closeDay) || 28,
        due_day: Number(dueDay) || 5,
      });
      setName("");
      setLimit("");
      setBrand("");
      setLast4("");
      toast.success("CARTÃO SALVO");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ERRO AO SALVAR");
    }
  }

  async function createInvoice(card: Card) {
    const existing = monthInvoices.find((item) => item.card_id === card.id);
    const total = cardTotal(card);

    try {
      if (existing) {
        await invoices.update(existing.id, { total });
        toast.success("FATURA ATUALIZADA");
      } else {
        await invoices.insert({
          card_id: card.id,
          period: month,
          total,
          status: "ABERTA",
        });
        toast.success("FATURA CRIADA");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ERRO AO SALVAR FATURA");
    }
  }

  async function toggleInvoice(invoice: Invoice) {
    try {
      await invoices.update(invoice.id, {
        status: invoice.status === "PAGA" ? "ABERTA" : "PAGA",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ERRO AO ATUALIZAR FATURA");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="FATURAS"
        subtitle={`CARTÕES E REGISTROS DE ${month}.`}
        action={<MonthSelector month={month} setMonth={setMonth} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="TOTAL EM FATURAS"
          value={formatCurrency(monthTransactions.reduce((sum, item) => sum + Number(item.amount), 0))}
          tone="primary"
        />
        <StatCard
          label="LIMITE TOTAL"
          value={formatCurrency(cards.rows.reduce((sum, card) => sum + Number(card.credit_limit), 0))}
          tone="success"
        />
        <StatCard label="CARTÕES" value={String(cards.rows.length)} tone="info" />
      </div>

      <Panel title="NOVO CARTÃO">
        <div className="grid gap-3 md:grid-cols-6">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="NOME DO CARTÃO" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm md:col-span-2" />
          <input value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="LIMITE" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          <input type="number" min="1" max="31" value={closeDay} onChange={(event) => setCloseDay(event.target.value)} placeholder="FECHAMENTO" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          <input type="number" min="1" max="31" value={dueDay} onChange={(event) => setDueDay(event.target.value)} placeholder="VENCIMENTO" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          <input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="BANDEIRA" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          <input maxLength={4} value={last4} onChange={(event) => setLast4(event.target.value.replace(/\D/g, ""))} placeholder="4 ÚLTIMOS" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          <button onClick={() => void addCard()} className="gradient-primary rounded-xl px-4 py-2.5 text-[11px] font-semibold text-primary-foreground md:col-span-2">
            SALVAR CARTÃO
          </button>
        </div>
      </Panel>

      <Panel title={`CARTÕES — ${month}`}>
        {cards.rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">NENHUM CARTÃO CADASTRADO.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {cards.rows.map((card) => {
              const total = cardTotal(card);
              const invoice = monthInvoices.find((item) => item.card_id === card.id);
              return (
                <button key={card.id} type="button" onClick={() => setSelectedCard(card)} className="rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="label-caps text-sm">{card.name}</p>
                      <p className="text-[11px] text-muted-foreground">{card.brand || "SEM BANDEIRA"} · •••• {card.last4 || "----"}</p>
                    </div>
                    <Tag tone="info">LIMITE {formatCurrency(Number(card.credit_limit))}</Tag>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{cardTransactions(card).length} REGISTROS</span>
                    <span className="font-semibold">{formatCurrency(invoice?.total ?? total)}</span>
                  </div>
                  <p className="mt-2 text-[9px] text-muted-foreground">FECHAMENTO DIA {card.close_day} · VENCIMENTO DIA {card.due_day}</p>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title={`FATURAS — ${month}`}>
        {monthInvoices.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">NENHUMA FATURA CRIADA.</p>
        ) : (
          <div className="space-y-2">
            {monthInvoices.map((invoice) => {
              const card = cards.rows.find((item) => item.id === invoice.card_id);
              return (
                <div key={invoice.id} className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-3">
                  <button onClick={() => card && setSelectedCard(card)} className="text-left">
                    <p className="label-caps text-[11px]">{card?.name || "CARTÃO"}</p>
                    <p className="text-[10px] text-muted-foreground">{invoice.period}</p>
                  </button>
                  <div className="flex items-center gap-3">
                    <b>{formatCurrency(Number(invoice.total))}</b>
                    <button onClick={() => void toggleInvoice(invoice)}>
                      <Tag tone={invoice.status === "PAGA" ? "success" : "warning"}>{invoice.status}</Tag>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" onClick={() => setSelectedCard(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-background p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="label-caps text-lg">{selectedCard.name}</p>
                <p className="text-sm text-muted-foreground">FATURA {month} · •••• {selectedCard.last4 || "----"}</p>
              </div>
              <button onClick={() => setSelectedCard(null)} className="rounded-lg border px-3 py-1.5 text-xs">FECHAR</button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
              <StatCard label="TOTAL" value={formatCurrency(cardTotal(selectedCard))} tone="primary" />
              <StatCard label="REGISTROS" value={String(cardTransactions(selectedCard).length)} tone="info" />
              <StatCard label="LIMITE" value={formatCurrency(Number(selectedCard.credit_limit))} tone="success" />
            </div>

            <div className="mt-5 flex justify-end">
              <button onClick={() => void createInvoice(selectedCard)} className="gradient-primary rounded-xl px-4 py-2 text-[10px] text-primary-foreground">
                CRIAR / ATUALIZAR FATURA
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-border">
              {cardTransactions(selectedCard).length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">NENHUM REGISTRO NESTE CARTÃO PARA O MÊS.</p>
              ) : (
                <div className="divide-y divide-border">
                  {cardTransactions(selectedCard).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="label-caps text-[11px]">{transaction.description}</p>
                        <p className="text-[10px] text-muted-foreground">{transaction.date}</p>
                      </div>
                      <b>{formatCurrency(Number(transaction.amount))}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
