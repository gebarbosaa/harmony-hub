import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { PageHeader, Panel, Button, Input } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";

export const Route = createFileRoute("/contas-a-pagar")({ component: ContasAPagarPage });

type Payable = {
  id: string; description: string; amount: number; due_date: string; category: string;
  responsible: string; status: "PENDENTE" | "PAGA" | "CANCELADA"; notes?: string | null;
};

function ContasAPagarPage() {
  const { rows, loading, insertRow, updateRow, deleteRow } = useHouseholdTable<Payable>("accounts_payable", "*", "due_date", true);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("Outros");

  const today = new Date().toISOString().slice(0, 10);
  const pending = rows.filter((r) => r.status === "PENDENTE");
  const overdue = pending.filter((r) => r.due_date < today);
  const dueToday = pending.filter((r) => r.due_date === today);
  const upcoming = pending.filter((r) => r.due_date > today);
  const paid = rows.filter((r) => r.status === "PAGA");
  const totalPending = useMemo(() => pending.reduce((s, r) => s + Number(r.amount), 0), [pending]);
  const totalOverdue = useMemo(() => overdue.reduce((s, r) => s + Number(r.amount), 0), [overdue]);
  const totalPaid = useMemo(() => paid.reduce((s, r) => s + Number(r.amount), 0), [paid]);

  async function addPayable() {
    if (!description.trim() || !amount || !dueDate) return;
    await insertRow({ description: description.trim(), amount: Number(amount.replace(",", ".")), due_date: dueDate, category: category.trim() || "Outros", responsible: "", status: "PENDENTE" });
    setDescription(""); setAmount(""); setDueDate(""); setCategory("Outros");
  }

  async function markPaid(item: Payable) {
    await updateRow(item.id, { status: "PAGA", paid_at: new Date().toISOString() });
  }

  return <div className="space-y-5">
    <PageHeader title="CONTAS A PAGAR" subtitle="CONTROLE DE VENCIMENTOS E OBRIGAÇÕES FINANCEIRAS." />
    <div className="grid gap-3 sm:grid-cols-3">
      <Panel><p className="label-caps text-xs text-muted-foreground">TOTAL A PAGAR</p><p className="mt-2 text-xl font-semibold">{formatCurrency(totalPending)}</p></Panel>
      <Panel><p className="label-caps text-xs text-muted-foreground">TOTAL VENCIDO</p><p className="mt-2 text-xl font-semibold">{formatCurrency(totalOverdue)}</p></Panel>
      <Panel><p className="label-caps text-xs text-muted-foreground">TOTAL PAGO</p><p className="mt-2 text-xl font-semibold">{formatCurrency(totalPaid)}</p></Panel>
    </div>
    <Panel>
      <div className="mb-4 flex items-center gap-2"><Plus className="h-4 w-4"/><p className="label-caps text-xs">NOVA CONTA</p></div>
      <div className="grid gap-3 md:grid-cols-4">
        <Input placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input placeholder="Valor" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Input placeholder="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} />
      </div>
      <div className="mt-3"><Button onClick={addPayable} disabled={!description || !amount || !dueDate}>ADICIONAR CONTA</Button></div>
    </Panel>
    <section className="space-y-3">
      {loading ? <Panel>CARREGANDO...</Panel> : rows.length === 0 ? <Panel>NENHUMA CONTA A PAGAR CADASTRADA.</Panel> : <>
        <PayableSection title="VENCIDAS" tone="text-red-600" items={overdue} onPaid={markPaid} onDelete={deleteRow} />
        <PayableSection title="VENCENDO HOJE" tone="text-orange-600" items={dueToday} onPaid={markPaid} onDelete={deleteRow} />
        <PayableSection title="PRÓXIMOS VENCIMENTOS" tone="text-yellow-600" items={upcoming} onPaid={markPaid} onDelete={deleteRow} />
        <PayableSection title="PAGAS" tone="text-green-600" items={paid} onDelete={deleteRow} />
      </>}
    </section>
  </div>;
}

function PayableSection({ title, tone, items, onPaid, onDelete }: { title: string; tone: string; items: Payable[]; onPaid?: (item: Payable) => void; onDelete: (id: string) => Promise<unknown> | unknown }) {
  if (!items.length) return null;
  return <Panel><div className="mb-3 flex items-center justify-between"><p className={`label-caps text-xs ${tone}`}>{title}</p><span className="text-xs text-muted-foreground">{items.length}</span></div><div className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border p-3"><div className="min-w-0 flex-1"><p className="font-medium">{item.description}</p><p className="text-xs text-muted-foreground">Vencimento: {new Date(`${item.due_date}T12:00:00`).toLocaleDateString("pt-BR")} · {item.category}</p></div><p className="font-semibold">{formatCurrency(Number(item.amount))}</p>{onPaid && <Button variant="outline" size="sm" onClick={() => onPaid(item)} aria-label={`Marcar ${item.description} como paga`}><Check className="mr-1 h-4 w-4"/>PAGA</Button>}<Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} aria-label={`Excluir ${item.description}`}><Trash2 className="h-4 w-4"/></Button></div>)}</div></Panel>;
}
