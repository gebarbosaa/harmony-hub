import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";

type Payable = {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  category: string;
  status: "PENDENTE" | "PAGA" | "CANCELADA";
};

export const Route = createFileRoute("/contas-a-pagar")({
  ssr: false,
  head: () => ({ meta: [{ title: "CONTAS A PAGAR — HARMONY HUB" }] }),
  component: ContasAPagarPage,
});

function ContasAPagarPage() {
  const { rows, isLoading, error, insert, update, remove } = useHouseholdTable<Payable>(
    "accounts_payable",
    "id,description,amount,due_date,category,status",
    "due_date",
  );
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const pending = rows.filter((item) => item.status === "PENDENTE");
  const overdue = pending.filter((item) => item.due_date < today);
  const upcoming = pending.filter((item) => item.due_date >= today);
  const paid = rows.filter((item) => item.status === "PAGA");
  const totalPending = useMemo(() => pending.reduce((sum, item) => sum + Number(item.amount), 0), [pending]);
  const totalOverdue = useMemo(() => overdue.reduce((sum, item) => sum + Number(item.amount), 0), [overdue]);
  const totalPaid = useMemo(() => paid.reduce((sum, item) => sum + Number(item.amount), 0), [paid]);

  async function save() {
    const value = Number(amount.replace(",", "."));
    if (!description.trim() || !Number.isFinite(value) || value <= 0 || !dueDate || !category.trim()) {
      toast.error("PREENCHA DESCRIÇÃO, VALOR, VENCIMENTO E CATEGORIA");
      return;
    }
    try {
      await insert({
        description: description.trim(),
        amount: value,
        due_date: dueDate,
        category: category.trim().toUpperCase(),
        status: "PENDENTE",
      });
      setDescription("");
      setAmount("");
      setDueDate("");
      setCategory("");
      setOpen(false);
      toast.success("CONTA SALVA");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ERRO AO SALVAR CONTA");
    }
  }

  async function markPaid(item: Payable) {
    try {
      await update(item.id, { status: "PAGA", paid_at: new Date().toISOString() });
      toast.success("CONTA MARCADA COMO PAGA");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ERRO AO PAGAR CONTA");
    }
  }

  async function removeItem(item: Payable) {
    if (!window.confirm(`EXCLUIR ${item.description}?`)) return;
    try {
      await remove(item.id);
      toast.success("CONTA EXCLUÍDA");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ERRO AO EXCLUIR CONTA");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="CONTAS A PAGAR"
        subtitle="CONTROLE DE VENCIMENTOS E OBRIGAÇÕES FINANCEIRAS."
        action={
          <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> NOVA CONTA
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Panel><p className="label-caps text-xs text-muted-foreground">TOTAL A PAGAR</p><p className="mt-2 text-xl font-semibold">{formatCurrency(totalPending)}</p></Panel>
        <Panel><p className="label-caps text-xs text-muted-foreground">TOTAL VENCIDO</p><p className="mt-2 text-xl font-semibold">{formatCurrency(totalOverdue)}</p></Panel>
        <Panel><p className="label-caps text-xs text-muted-foreground">TOTAL PAGO</p><p className="mt-2 text-xl font-semibold">{formatCurrency(totalPaid)}</p></Panel>
      </div>

      {error ? (
        <Panel>
          <p className="font-medium">NÃO FOI POSSÍVEL CARREGAR AS CONTAS.</p>
          <p className="mt-1 text-sm text-muted-foreground">{error instanceof Error ? error.message : "ERRO AO CONSULTAR CONTAS A PAGAR."}</p>
        </Panel>
      ) : isLoading ? (
        <Panel>CARREGANDO...</Panel>
      ) : rows.length === 0 ? (
        <Panel>
          <div className="py-8 text-center">
            <p className="font-medium">NENHUMA CONTA A PAGAR CADASTRADA.</p>
            <p className="mt-1 text-sm text-muted-foreground">Cadastre uma conta para começar seu controle.</p>
          </div>
        </Panel>
      ) : (
        <div className="space-y-3">
          <Section title="VENCIDAS" items={overdue} onPaid={markPaid} onDelete={removeItem} />
          <Section title="PRÓXIMOS VENCIMENTOS" items={upcoming} onPaid={markPaid} onDelete={removeItem} />
          <Section title="PAGAS" items={paid} onDelete={removeItem} />
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3" onMouseDown={() => setOpen(false)}>
          <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="label-caps text-base font-semibold">NOVA CONTA A PAGAR</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary" aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-4">
              <label><span className="text-xs font-medium">DESCRIÇÃO</span><input className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" value={description} onChange={(event) => setDescription(event.target.value)} autoFocus /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label><span className="text-xs font-medium">VALOR</span><input className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" inputMode="decimal" placeholder="R$ 0,00" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
                <label><span className="text-xs font-medium">VENCIMENTO</span><input className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
              </div>
              <label><span className="text-xs font-medium">CATEGORIA</span><input className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" placeholder="Ex.: MORADIA" value={category} onChange={(event) => setCategory(event.target.value)} /></label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-xl border border-border px-4 text-xs font-medium">CANCELAR</button>
              <button type="button" onClick={save} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground"><Check className="h-4 w-4" /> SALVAR CONTA</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Section({ title, items, onPaid, onDelete }: { title: string; items: Payable[]; onPaid?: (item: Payable) => void; onDelete: (item: Payable) => void }) {
  if (!items.length) return null;
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between"><h3 className="label-caps text-xs font-semibold">{title}</h3><span className="text-xs text-muted-foreground">{items.length}</span></div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-medium">{item.description}</p><p className="mt-1 text-xs text-muted-foreground">VENCIMENTO: {item.due_date} · {item.category}</p></div>
            <div className="flex items-center justify-between gap-2"><span className="font-semibold">{formatCurrency(Number(item.amount))}</span>{onPaid && <button type="button" onClick={() => onPaid(item)} className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-xs font-medium hover:border-primary hover:text-primary"><Check className="h-3.5 w-3.5" /> PAGAR</button>}<button type="button" onClick={() => onDelete(item)} className="inline-flex h-9 items-center justify-center rounded-xl border border-border px-3 text-xs font-medium hover:border-primary hover:text-primary" aria-label="Excluir conta"><Trash2 className="h-3.5 w-3.5" /></button></div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
