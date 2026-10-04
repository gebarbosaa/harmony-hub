import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag } from "@/components/ui-kit";
import { evaluateAmount, formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";

type ThirdParty = { id: string; name: string; notes: string | null; household_id: string };
type Category = { id: string; name: string; kind: string; household_id: string };
type Payment = { id: string; name: string; kind: string; card_id: string | null; household_id: string };
type Account = { id: string; name: string; household_id: string };
type ThirdPartyExpense = {
  id: string; date: string; description: string; amount: number; category: string;
  payment_method_id: string | null; payment_method_name: string | null; pay_method: string;
  card_id: string | null; card_name: string | null; account_id: string | null;
  third_party_id: string; third_party_status: string; third_party_reimbursed_at: string | null;
};

export const Route = createFileRoute("/terceiros")({
  head: () => ({ meta: [{ title: "TERCEIROS — HARMONY HUB" }] }),
  component: ThirdPartiesPage,
});

function ThirdPartiesPage() {
  const parties = useHouseholdTable<ThirdParty>("third_parties", "id,name,notes,household_id", "name");
  const tx = useHouseholdTable<ThirdPartyExpense>(
    "transactions",
    "id,date,description,amount,category,payment_method_id,payment_method_name,pay_method,card_id,card_name,account_id,third_party_id,third_party_status,third_party_reimbursed_at",
    "date",
  );
  const categories = useHouseholdTable<Category>("categories", "id,name,kind,household_id", "name");
  const payments = useHouseholdTable<Payment>("household_payment_methods", "id,name,kind,card_id,household_id", "name");
  const accounts = useHouseholdTable<Account>("household_accounts", "id,name,household_id", "name");

  const [partyOpen, setPartyOpen] = useState(false);
  const [partyEditing, setPartyEditing] = useState<string | null>(null);
  const [partyName, setPartyName] = useState("");
  const [partyNotes, setPartyNotes] = useState("");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editing, setEditing] = useState<ThirdPartyExpense | null>(null);
  const [thirdPartyId, setThirdPartyId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [status, setStatus] = useState("PENDENTE");
  const [search, setSearch] = useState("");

  const expenseRows = useMemo(
    () => tx.rows.filter((row) => row.third_party_id && row.description.toLowerCase().includes(search.toLowerCase())),
    [tx.rows, search],
  );
  const total = useMemo(() => expenseRows.reduce((sum, row) => sum + Number(row.amount), 0), [expenseRows]);
  const pending = useMemo(() => expenseRows.filter((row) => row.third_party_status !== "REEMBOLSADO").reduce((sum, row) => sum + Number(row.amount), 0), [expenseRows]);
  const reimbursed = total - pending;
  const selectedPayment = payments.rows.find((payment) => payment.id === paymentId);

  function openNewExpense() {
    setEditing(null);
    setThirdPartyId(parties.rows[0]?.id ?? "");
    setDescription("");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setCategory(categories.rows.find((item) => item.kind === "DESPESA")?.name ?? "");
    setPaymentId(payments.rows[0]?.id ?? "");
    setAccountId("");
    setStatus("PENDENTE");
    setExpenseOpen(true);
  }

  function openEditExpense(row: ThirdPartyExpense) {
    setEditing(row);
    setThirdPartyId(row.third_party_id);
    setDescription(row.description);
    setAmount(String(row.amount));
    setDate(row.date);
    setCategory(row.category);
    setPaymentId(row.payment_method_id ?? "");
    setAccountId(row.account_id ?? "");
    setStatus(row.third_party_status ?? "PENDENTE");
    setExpenseOpen(true);
  }

  async function saveParty() {
    const name = partyName.trim().toUpperCase();
    if (!name) return toast.error("INFORME O NOME DO TERCEIRO");
    try {
      if (partyEditing) await parties.update(partyEditing, { name, notes: partyNotes.trim().toUpperCase() || null });
      else await parties.insert({ name, notes: partyNotes.trim().toUpperCase() || null });
      setPartyOpen(false); setPartyEditing(null); setPartyName(""); setPartyNotes("");
      toast.success(partyEditing ? "TERCEIRO ATUALIZADO" : "TERCEIRO CADASTRADO");
    } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO SALVAR TERCEIRO"); }
  }

  async function removeParty(id: string) {
    if (!window.confirm("EXCLUIR ESTE TERCEIRO? OS GASTOS JÁ REGISTRADOS SERÃO PRESERVADOS.")) return;
    try { await parties.remove(id); toast.success("TERCEIRO EXCLUÍDO"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO EXCLUIR"); }
  }

  async function saveExpense() {
    const parsed = evaluateAmount(amount);
    if (!thirdPartyId || !description.trim() || !parsed || parsed <= 0 || !paymentId || !selectedPayment) {
      return toast.error("PREENCHA TERCEIRO, DESCRIÇÃO, VALOR E FORMA DE PAGAMENTO");
    }
    if (!category) return toast.error("CADASTRE UMA CATEGORIA DE DESPESA EM AJUSTES");
    const payload = {
      date, description: description.trim().toUpperCase(), amount: parsed, type: "DESPESA",
      category, pay_method: selectedPayment.kind, payment_method_id: paymentId,
      payment_method_name: selectedPayment.name, card_id: selectedPayment.card_id ?? null,
      card_name: selectedPayment.card_id ? selectedPayment.name : null,
      account_id: accountId || null, paid: true, third_party_id: thirdPartyId,
      third_party_status: status, third_party_reimbursed_at: status === "REEMBOLSADO" ? new Date().toISOString() : null,
    };
    try {
      if (editing) await tx.update(editing.id, payload);
      else await tx.insert(payload);
      setExpenseOpen(false); setEditing(null); toast.success(editing ? "GASTO ATUALIZADO" : "GASTO DE TERCEIRO REGISTRADO");
    } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO SALVAR GASTO"); }
  }

  async function removeExpense(row: ThirdPartyExpense) {
    if (!window.confirm("EXCLUIR ESTE GASTO?")) return;
    try { await tx.remove(row.id); toast.success("GASTO EXCLUÍDO"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO EXCLUIR"); }
  }

  const partyNameById = (id: string) => parties.rows.find((party) => party.id === id)?.name ?? "TERCEIRO";

  return <div className="space-y-5">
    <PageHeader title="TERCEIROS" subtitle="REGISTRE E ACOMPANHE GASTOS PAGOS POR VOCÊ EM NOME DE OUTRAS PESSOAS." action={<button type="button" onClick={openNewExpense} className="gradient-primary inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[10px] font-bold text-primary-foreground"><Plus className="h-4 w-4"/>NOVO GASTO</button>} />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard label="TOTAL DE GASTOS" value={formatCurrency(total)} tone="danger" />
      <StatCard label="A REEMBOLSAR" value={formatCurrency(pending)} tone="warning" />
      <StatCard label="REEMBOLSADO" value={formatCurrency(reimbursed)} tone="primary" />
    </div>

    <Panel title="TERCEIROS" aside={<button type="button" onClick={() => { setPartyEditing(null); setPartyName(""); setPartyNotes(""); setPartyOpen(true); }} className="text-[10px] font-bold text-primary">+ CADASTRAR TERCEIRO</button>}>
      {parties.rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">NENHUM TERCEIRO CADASTRADO.</p> :
        <div className="grid gap-2 md:grid-cols-2">{parties.rows.map((party) => {
          const rows = expenseRows.filter((row) => row.third_party_id === party.id);
          const value = rows.reduce((sum, row) => sum + Number(row.amount), 0);
          const openValue = rows.filter((row) => row.third_party_status !== "REEMBOLSADO").reduce((sum, row) => sum + Number(row.amount), 0);
          return <div key={party.id} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold">{party.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{rows.length} GASTO(S) · {formatCurrency(value)}</p><p className="text-[10px] text-warning">A REEMBOLSAR: {formatCurrency(openValue)}</p></div><div className="flex gap-2"><button onClick={() => { setPartyEditing(party.id); setPartyName(party.name); setPartyNotes(party.notes ?? ""); setPartyOpen(true); }} className="text-[10px] text-primary">EDITAR</button><button onClick={() => void removeParty(party.id)} className="text-[10px] text-danger"><Trash2 className="h-3 w-3"/></button></div></div></div>;
        })}</div>}
    </Panel>

    {partyOpen && <div className="rounded-2xl border bg-card p-5"><div className="grid gap-3 md:grid-cols-2"><label><span className="label-caps mb-1.5 block text-[9px] text-muted-foreground">NOME</span><input autoFocus value={partyName} onChange={(event) => setPartyName(event.target.value)} className="w-full rounded-xl border p-3"/></label><label><span className="label-caps mb-1.5 block text-[9px] text-muted-foreground">OBSERVAÇÕES</span><input value={partyNotes} onChange={(event) => setPartyNotes(event.target.value)} className="w-full rounded-xl border p-3"/></label><div className="flex gap-2 md:col-span-2"><button onClick={() => setPartyOpen(false)} className="rounded-xl border px-4 py-2 text-[10px]">CANCELAR</button><button onClick={() => void saveParty()} className="gradient-primary rounded-xl px-4 py-2 text-[10px] font-bold text-primary-foreground">SALVAR</button></div></div></div>}

    <Panel title="GASTOS DE TERCEIROS" aside={<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="BUSCAR..." className="rounded-lg border bg-background px-2 py-1.5 text-xs"/>}>
      {expenseRows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">NENHUM GASTO DE TERCEIRO REGISTRADO.</p> :
        <ul className="divide-y divide-border">{expenseRows.map((row) => <li key={row.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="label-caps truncate text-[11px]">{row.description}</p><div className="mt-1 flex flex-wrap items-center gap-2"><Tag>{partyNameById(row.third_party_id)}</Tag><Tag>{row.category}</Tag><span className="text-[10px] text-muted-foreground">{row.payment_method_name ?? row.pay_method}</span>{row.card_name && <span className="text-[10px] text-muted-foreground">• {row.card_name}</span>}<span className="text-[10px] text-muted-foreground">{row.date}</span><span className={row.third_party_status === "REEMBOLSADO" ? "text-[10px] text-primary" : "text-[10px] text-warning"}>{row.third_party_status}</span></div></div><div className="flex items-center gap-3"><p className="text-sm font-bold text-danger">-{formatCurrency(Number(row.amount))}</p><button onClick={() => openEditExpense(row)} className="text-xs text-primary">EDITAR</button><button onClick={() => void removeExpense(row)} className="text-xs text-danger">EXCLUIR</button></div></li>)}</ul>}
    </Panel>

    {expenseOpen && <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm md:p-6"><div className="mb-4"><p className="label-caps text-[9px] font-semibold tracking-[0.18em] text-primary">CADASTRO</p><h2 className="mt-1 text-base font-bold">{editing ? "EDITAR GASTO DE TERCEIRO" : "NOVO GASTO DE TERCEIRO"}</h2></div><div className="grid gap-3 md:grid-cols-2">
      <label><span className="label-caps mb-1.5 block text-[9px] text-muted-foreground">TERCEIRO</span><select value={thirdPartyId} onChange={(event) => setThirdPartyId(event.target.value)} className="w-full rounded-xl border bg-background p-3"><option value="">SELECIONE</option>{parties.rows.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label>
      <label><span className="label-caps mb-1.5 block text-[9px] text-muted-foreground">DESCRIÇÃO</span><input value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-xl border p-3"/></label>
      <label><span className="label-caps mb-1.5 block text-[9px] text-muted-foreground">VALOR</span><input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" className="w-full rounded-xl border p-3"/></label>
      <label><span className="label-caps mb-1.5 block text-[9px] text-muted-foreground">DATA</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border p-3"/></label>
      <label><span className="label-caps mb-1.5 block text-[9px] text-muted-foreground">CATEGORIA</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border bg-background p-3"><option value="">SELECIONE</option>{categories.rows.filter((item) => item.kind === "DESPESA").map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
      <label><span className="label-caps mb-1.5 block text-[9px] text-muted-foreground">FORMA DE PAGAMENTO</span><select value={paymentId} onChange={(event) => setPaymentId(event.target.value)} className="w-full rounded-xl border bg-background p-3"><option value="">SELECIONE</option>{payments.rows.map((payment) => <option key={payment.id} value={payment.id}>{payment.name}</option>)}</select></label>
      <label><span className="label-caps mb-1.5 block text-[9px] text-muted-foreground">CONTA</span><select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="w-full rounded-xl border bg-background p-3"><option value="">SEM CONTA</option>{accounts.rows.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      <label><span className="label-caps mb-1.5 block text-[9px] text-muted-foreground">STATUS DO REEMBOLSO</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-xl border bg-background p-3"><option value="PENDENTE">PENDENTE</option><option value="REEMBOLSADO">REEMBOLSADO</option></select></label>
      <div className="flex gap-2 md:col-span-2"><button onClick={() => setExpenseOpen(false)} className="rounded-xl border px-4 py-2 text-[10px]">CANCELAR</button><button onClick={() => void saveExpense()} className="gradient-primary rounded-xl px-4 py-2 text-[10px] font-bold text-primary-foreground">{editing ? "ATUALIZAR GASTO" : "SALVAR GASTO"}</button></div>
    </div></div>}
  </div>;
}
