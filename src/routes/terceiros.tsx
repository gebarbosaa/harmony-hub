import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDownCircle, CheckCircle2, CircleDollarSign, Plus, UserRound, Wallet, X } from "lucide-react";
import { PageHeader, Panel, StatCard, Tag } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useGlobalMonth, MonthSelector } from "@/hooks/use-global-month";

export const Route = createFileRoute("/terceiros")({
  head: () => ({ meta: [{ title: "TERCEIROS — HARMONY HUB" }] }),
  component: ThirdPartiesPage,
});

type ThirdParty = { id: string; name: string; notes: string | null; active: boolean; household_id: string };
type Payment = { id: string; name: string; kind: string | null; card_id: string | null; account_id: string | null; household_id: string };
type Card = { id: string; name: string; brand: string | null; last4: string | null; account_id: string | null; household_id: string };
type Account = { id: string; name: string; institution: string | null; household_id: string };
type Category = { id: string; name: string; kind: string; household_id: string };
type Installment = { id: string; name: string; total_amount: number; installments_count: number; household_id: string };
type Expense = {
  id: string; third_party_id: string; transaction_id: string | null; date: string; description: string;
  amount: number; category: string; payment_method_id: string | null; card_id: string | null;
  account_id: string | null; reimbursement_status: "PENDENTE" | "PARCIAL" | "REEMBOLSADO";
  reimbursed_amount: number; paid: boolean; reimbursed_at: string | null; notes: string | null; household_id: string;
};

function ThirdPartiesPage() {
  const { month, setMonth } = useGlobalMonth("terceiros");
  const parties = useHouseholdTable<ThirdParty>("third_parties", "id,name,notes,active,household_id", "name");
  const expenses = useHouseholdTable<Expense>("third_party_expenses", "id,third_party_id,transaction_id,date,description,amount,category,payment_method_id,card_id,account_id,reimbursement_status,reimbursed_amount,reimbursed_at,notes,paid,household_id", "date");
  const payments = useHouseholdTable<Payment>("household_payment_methods", "id,name,kind,card_id,account_id,household_id", "name");
  const cards = useHouseholdTable<Card>("cards", "id,name,brand,last4,account_id,household_id", "name");
  const accounts = useHouseholdTable<Account>("household_accounts", "id,name,institution,household_id", "name");
  const categories = useHouseholdTable<Category>("categories", "id,name,kind,household_id", "name");
  const installments = useHouseholdTable<Installment>("installments", "id,name,total_amount,installments_count,household_id", "purchase_date");

  const [open, setOpen] = useState(false);
  const [partyModal, setPartyModal] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [partyNotes, setPartyNotes] = useState("");
  const [partyActive, setPartyActive] = useState(true);
  const [editingParty, setEditingParty] = useState<ThirdParty | null>(null);
  const [partyId, setPartyId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState("2");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [cardId, setCardId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [reimbursementStatus, setReimbursementStatus] = useState<Expense["reimbursement_status"]>("PENDENTE");
  const [reimbursedAmount, setReimbursedAmount] = useState("0");
  const [paid, setPaid] = useState(true);
  const [notes, setNotes] = useState("");

  const expenseRows = useMemo(() => expenses.rows.filter((row) => row.date.startsWith(month)), [expenses.rows, month]);
  const thirdPartyInstallmentRows = useMemo(() => installments.rows.filter((installment) => {
    return thirdPartyInstallmentIds.has(installment.id) && Number(installment.paid_count) < Number(installment.installments_count);
  }).map((installment) => {
    const expense = expenses.rows.find((item) => item.transaction_id);
    return expense ? { expense, installment } : null;
  }).filter(Boolean) as Array<{expense: Expense; installment: Installment}>;
  const total = useMemo(() => expenseRows.reduce((sum, row) => sum + Number(row.amount), 0), [expenseRows]);
  const pending = useMemo(() => expenseRows.reduce((sum, row) => sum + Math.max(Number(row.amount) - Number(row.reimbursed_amount), 0), 0), [expenseRows]);
  const reimbursed = useMemo(() => expenseRows.reduce((sum, row) => sum + Number(row.reimbursed_amount), 0), [expenseRows]);
  const expenseCategories = useMemo(() => categories.rows.filter((item) => item.kind === "DESPESA").map((item) => item.name.toUpperCase()), [categories.rows]);

  useEffect(() => {
    if (!date) setDate(`${month}-01`);
    if (!category && expenseCategories.length) setCategory(expenseCategories[0]);
    if (!partyId && parties.rows.length) setPartyId(parties.rows.find((p) => p.active)?.id ?? parties.rows[0].id);
    if (!paymentId && payments.rows.length) setPaymentId(payments.rows[0].id);
  }, [month, date, category, expenseCategories, partyId, parties.rows, paymentId, payments.rows]);

  const selectedPayment = payments.rows.find((p) => p.id === paymentId);
  const paymentCardId = selectedPayment?.card_id ?? "";
  const effectiveCardId = cardId || paymentCardId;

  function resetForm() {
    setPartyId(parties.rows.find((p) => p.active)?.id ?? parties.rows[0]?.id ?? "");
    setDescription("");
    setAmount("");
    setIsInstallment(false);
    setInstallmentCount("2");
    setDate(`${month}-01`);
    setCategory(expenseCategories[0] ?? "TERCEIROS");
    setPaymentId(payments.rows[0]?.id ?? "");
    setCardId("");
    setAccountId("");
    setReimbursementStatus("PENDENTE");
    setReimbursedAmount("0");
    setPaid(true);
    setNotes("");
  }

  async function createParty() {
    const name = partyName.trim().toUpperCase();
    if (!name) return toast.error("INFORME O NOME DO TERCEIRO");
    if (parties.rows.some((p) => p.name.toUpperCase() === name)) return toast.error("ESSE TERCEIRO JÁ ESTÁ CADASTRADO");
    try {
      const created = await parties.insert({ name, notes: partyNotes.trim() || null, active: partyActive });
      setPartyName(""); setPartyNotes(""); setPartyActive(true); setPartyModal(false);
      if (created?.id) setPartyId(String(created.id));
      toast.success("TERCEIRO CADASTRADO");
    } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO CADASTRAR TERCEIRO"); }
  }

  function openEditParty(party: ThirdParty) {
    setEditingParty(party);
    setPartyName(party.name);
    setPartyNotes(party.notes ?? "");
    setPartyActive(party.active);
    setPartyModal(true);
  }

  async function saveParty() {
    const name = partyName.trim().toUpperCase();
    if (!name) return toast.error("INFORME O NOME DO TERCEIRO");
    const duplicate = parties.rows.some((p) => p.id !== editingParty?.id && p.name.toUpperCase() === name);
    if (duplicate) return toast.error("ESSE TERCEIRO JÁ ESTÁ CADASTRADO");
    try {
      if (editingParty) {
        await parties.update(editingParty.id, { name, notes: partyNotes.trim() || null, active: partyActive });
        if (!partyActive && partyId === editingParty.id) setPartyId(parties.rows.find((p) => p.active && p.id !== editingParty.id)?.id ?? "");
        toast.success("TERCEIRO ATUALIZADO");
      } else {
        await createParty();
        return;
      }
      setPartyName(""); setPartyNotes(""); setPartyActive(true); setEditingParty(null); setPartyModal(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO SALVAR TERCEIRO"); }
  }

  async function saveExpense() {
    const value = Number(String(amount).replace(",", "."));
    const reimbursedValue = Number(String(reimbursedAmount || "0").replace(",", "."));
    if (!partyId || !description.trim() || !Number.isFinite(value) || value <= 0) return toast.error("PREENCHA TERCEIRO, DESCRIÇÃO E VALOR");
    if (!paymentId) return toast.error("SELECIONE A FORMA DE PAGAMENTO");
    if (reimbursedValue < 0 || reimbursedValue > value) return toast.error("VALOR REEMBOLSADO INVÁLIDO");
    const status = reimbursedValue >= value ? "REEMBOLSADO" : reimbursedValue > 0 ? "PARCIAL" : reimbursementStatus;
    const selectedParty = parties.rows.find((p) => p.id === partyId);
    const selectedPayment = payments.rows.find((p) => p.id === paymentId);
    if (!selectedParty || !selectedPayment) return toast.error("DADOS DO TERCEIRO OU PAGAMENTO NÃO ENCONTRADOS");

    let transactionId: string | null = null;
    let installmentId: string | null = null;
    const installmentTotal = Number(installmentCount);
    if (isInstallment && (!Number.isInteger(installmentTotal) || installmentTotal < 2 || installmentTotal > 120)) {
      return toast.error("INFORME UMA QUANTIDADE DE 2 A 120 PARCELAS");
    }
    try {
      if (isInstallment) {
        const installment = await installments.insert({
          name: description.trim().toUpperCase(),
          purchase_date: date,
          total_amount: value,
          installments_count: installmentTotal,
          paid_count: 0,
          category: category || "TERCEIROS",
          pay_method: selectedPayment.kind || "CREDITO",
          payment_method_id: selectedPayment.id,
          payment_method_name: selectedPayment.name,
          card_id: effectiveCardId || null,
          card_name: effectiveCardId ? (cards.rows.find((c) => c.id === effectiveCardId)?.name ?? selectedPayment.name) : null,
          responsible: selectedParty.name,
        });
        installmentId = installment.id;
        const client = (await import("@/integrations/supabase/client")).supabase;
        const { data: firstTransaction, error: transactionError } = await client.from("transactions")
          .select("id").eq("source_type", "INSTALLMENT").eq("source_id", installment.id).eq("source_index", 1).maybeSingle();
        if (transactionError) throw transactionError;
        if (!firstTransaction?.id) throw new Error("NÃO FOI POSSÍVEL VINCULAR A PRIMEIRA PARCELA AO GASTO");
        transactionId = firstTransaction.id;
      } else {
        const transaction = await (await import("@/integrations/supabase/client")).supabase.from("transactions").insert({
          date,
          description: description.trim().toUpperCase(),
          amount: value,
          type: "DESPESA",
          category: category || "TERCEIROS",
          pay_method: selectedPayment.kind || "PIX",
          payment_method_id: selectedPayment.id,
          payment_method_name: selectedPayment.name,
          card_id: effectiveCardId || null,
          card_name: effectiveCardId ? (cards.rows.find((c) => c.id === effectiveCardId)?.name ?? selectedPayment.name) : null,
          account_id: accountId || selectedPayment.account_id || null,
          responsible: selectedParty.name,
          paid,
          source_type: "THIRD_PARTY",
        }).select("id").single();
        if (transaction.error) throw transaction.error;
        transactionId = transaction.data.id;
      }
      const createdExpense = await expenses.insert({
        third_party_id: selectedParty.id,
        transaction_id: transactionId,
        date,
        description: description.trim().toUpperCase(),
        amount: value,
        category: category || "TERCEIROS",
        payment_method_id: selectedPayment.id,
        card_id: effectiveCardId || null,
        account_id: accountId || selectedPayment.account_id || null,
        reimbursement_status: status,
        reimbursed_amount: reimbursedValue,
        reimbursed_at: reimbursedValue > 0 ? date : null,
        notes: notes.trim() || null,
        paid,
      });
      if (createdExpense?.id && transactionId) {
        const client = (await import("@/integrations/supabase/client")).supabase;
        if (installmentId) {
          const { error } = await client.from("transactions").update({ third_party_expense_id: createdExpense.id }).eq("source_type", "INSTALLMENT").eq("source_id", installmentId);
          if (error) throw error;
        } else {
          const { error } = await client.from("transactions").update({ third_party_expense_id: createdExpense.id }).eq("id", transactionId);
          if (error) throw error;
        }
      }
      toast.success("GASTO DE TERCEIRO REGISTRADO");
      setOpen(false);
      resetForm();
    } catch (error) {
      if (installmentId) {
        await (await import("@/integrations/supabase/client")).supabase.from("installments").delete().eq("id", installmentId);
      } else if (transactionId) {
        await (await import("@/integrations/supabase/client")).supabase.from("transactions").delete().eq("id", transactionId);
      }
      toast.error(error instanceof Error ? error.message : "ERRO AO REGISTRAR GASTO");
    }
  }

  async function togglePaid(row: Expense, nextPaid: boolean) {
    try {
      await expenses.update(row.id, { paid: nextPaid });
      if (row.transaction_id) {
        const client = (await import("@/integrations/supabase/client")).supabase;
        const { error } = await client.from("transactions").update({ paid: nextPaid }).eq("id", row.transaction_id);
        if (error) throw error;
      }
      toast.success(nextPaid ? "GASTO MARCADO COMO PAGO" : "GASTO MARCADO COMO NÃO PAGO");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ERRO AO ATUALIZAR PAGAMENTO");
    }
  }

  async function markReimbursed(row: Expense) {
    try {
      await expenses.update(row.id, { reimbursement_status: "REEMBOLSADO", reimbursed_amount: Number(row.amount), reimbursed_at: new Date().toISOString().slice(0, 10) });
      toast.success("REEMBOLSO REGISTRADO");
    } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO ATUALIZAR REEMBOLSO"); }
  }

  async function removeExpense(row: Expense) {
    if (!window.confirm(`EXCLUIR O GASTO DE ${parties.rows.find((p) => p.id === row.third_party_id)?.name ?? "TERCEIRO"}? O LANÇAMENTO FINANCEIRO TAMBÉM SERÁ EXCLUÍDO.`)) return;
    try {
      if (row.transaction_id) {
        const client = (await import("@/integrations/supabase/client")).supabase;
        const { data: linkedTransaction, error: lookupError } = await client.from("transactions").select("source_type,source_id").eq("id", row.transaction_id).maybeSingle();
        if (lookupError) throw lookupError;
        if (linkedTransaction?.source_type === "INSTALLMENT" && linkedTransaction.source_id) {
          const { error } = await client.from("installments").delete().eq("id", linkedTransaction.source_id);
          if (error) throw error;
        } else {
          const { error } = await client.from("transactions").delete().eq("id", row.transaction_id);
          if (error) throw error;
        }
      }
      await expenses.remove(row.id);
      toast.success("GASTO EXCLUÍDO");
    } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO EXCLUIR"); }
  }

  return <div className="space-y-5">
    <PageHeader title="TERCEIROS" subtitle="ACOMPANHE GASTOS DE OUTRAS PESSOAS PAGOS COM SEUS CARTÕES, CONTAS OU OUTRAS FORMAS DE PAGAMENTO." action={<div className="flex items-center gap-2"><button type="button" onClick={() => { resetForm(); setOpen((value) => !value); }} className="gradient-primary inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[10px] font-bold text-primary-foreground"><Plus className="h-4 w-4"/>{open ? "FECHAR" : "NOVO GASTO DE TERCEIRO"}</button><MonthSelector month={month} setMonth={setMonth}/></div>} />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard label="GASTOS DE TERCEIROS" value={formatCurrency(total)} tone="danger" />
      <StatCard label="REEMBOLSADO" value={formatCurrency(reimbursed)} tone="success" />
      <StatCard label="A REEMBOLSAR" value={formatCurrency(pending)} tone="warning" />
    </div>
    {open && <Panel title="DADOS DO GASTO DE TERCEIRO"><div className="grid gap-3 md:grid-cols-2">
      <label className="md:col-span-2"><span className="label-caps mb-1.5 block text-[9px] font-semibold text-muted-foreground">TERCEIRO</span><div className="flex gap-2"><select value={partyId} onChange={(e) => setPartyId(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm"><option value="">SELECIONE</option>{parties.rows.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button type="button" onClick={() => setPartyModal(true)} className="rounded-xl border px-3" title="Cadastrar terceiro"><Plus className="h-4 w-4"/></button></div></label>
      <label><span className="label-caps mb-1.5 block text-[9px] font-semibold text-muted-foreground">DESCRIÇÃO</span><input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm" placeholder="EX.: COMPRA DO JOÃO"/></label>
      <label><span className="label-caps mb-1.5 block text-[9px] font-semibold text-muted-foreground">{isInstallment ? "VALOR TOTAL DA COMPRA" : "VALOR"}</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm" placeholder="0,00"/>{isInstallment && Number(installmentCount) >= 2 && Number(amount.replace(/\./g, "").replace(",", ".")) > 0 && <span className="mt-1 block text-[10px] text-muted-foreground">≈ {formatCurrency(Number(amount.replace(/\./g, "").replace(",", ".")) / Number(installmentCount))} por parcela, em {installmentCount}x</span>}</label>
      <label className="flex items-center gap-2 rounded-xl border px-3 py-2.5"><input type="checkbox" checked={isInstallment} onChange={(e) => setIsInstallment(e.target.checked)} className="h-4 w-4"/><span className="text-xs font-semibold">COMPRA PARCELADA</span></label>
      {isInstallment && <label><span className="label-caps mb-1.5 block text-[9px] font-semibold text-muted-foreground">QUANTIDADE DE PARCELAS</span><input type="number" min="2" max="120" step="1" value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm"/><span className="mt-1 block text-[10px] text-muted-foreground">Será registrado em Parcelas e distribuído nas faturas quando houver cartão.</span></label>}
      <label><span className="label-caps mb-1.5 block text-[9px] font-semibold text-muted-foreground">DATA</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm"/></label>
      <label><span className="label-caps mb-1.5 block text-[9px] font-semibold text-muted-foreground">CATEGORIA</span><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm">{expenseCategories.map((item) => <option key={item}>{item}</option>)}{expenseCategories.length === 0 && <option>TERCEIROS</option>}</select></label>
      <label><span className="label-caps mb-1.5 block text-[9px] font-semibold text-muted-foreground">FORMA DE PAGAMENTO</span><select value={paymentId} onChange={(e) => { setPaymentId(e.target.value); setCardId(""); }} className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm"><option value="">SELECIONE</option>{payments.rows.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label><span className="label-caps mb-1.5 block text-[9px] font-semibold text-muted-foreground">CARTÃO (OPCIONAL)</span><select value={cardId || paymentCardId} onChange={(e) => setCardId(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm"><option value="">SEM CARTÃO</option>{cards.rows.map((c) => <option key={c.id} value={c.id}>{c.name}{c.last4 ? ` •••• ${c.last4}` : ""}</option>)}</select></label>
      <label><span className="label-caps mb-1.5 block text-[9px] font-semibold text-muted-foreground">CONTA (OPCIONAL)</span><select value={accountId || selectedPayment?.account_id || ""} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm"><option value="">SEM CONTA</option>{accounts.rows.map((a) => <option key={a.id} value={a.id}>{a.name}{a.institution ? ` — ${a.institution}` : ""}</option>)}</select></label>
      <label className="flex items-center justify-between rounded-xl border px-3 py-2.5"><span><span className="label-caps mb-1.5 block text-[9px] font-semibold text-muted-foreground">PAGAMENTO</span><span className="text-xs">{paid ? "PAGO" : "NÃO PAGO"}</span></span><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-4 w-4"/></label>
      <label><span className="label-caps mb-1.5 block text-[9px] font-semibold text-muted-foreground">REEMBOLSO</span><select value={reimbursementStatus} onChange={(e) => setReimbursementStatus(e.target.value as Expense["reimbursement_status"])} className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm"><option value="PENDENTE">PENDENTE</option><option value="PARCIAL">PARCIAL</option><option value="REEMBOLSADO">REEMBOLSADO</option></select></label>
      <label><span className="label-caps mb-1.5 block text-[9px] font-semibold text-muted-foreground">VALOR REEMBOLSADO</span><input inputMode="decimal" value={reimbursedAmount} onChange={(e) => setReimbursedAmount(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm" placeholder="0,00"/></label>
      <label className="md:col-span-2"><span className="label-caps mb-1.5 block text-[9px] font-semibold text-muted-foreground">OBSERVAÇÕES</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20 w-full rounded-xl border bg-background px-3 py-2.5 text-sm"/></label>
      <div className="flex gap-2 md:col-span-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2 text-[10px] font-semibold">CANCELAR</button><button type="button" onClick={() => void saveExpense()} className="gradient-primary rounded-xl px-4 py-2 text-[10px] font-bold text-primary-foreground">SALVAR GASTO</button></div>
    </div></Panel>}
    <Panel title="TERCEIROS CADASTRADOS" aside={<button type="button" onClick={() => { setEditingParty(null); setPartyName(""); setPartyNotes(""); setPartyActive(true); setPartyModal(true); }} className="rounded-lg border px-3 py-1.5 text-[9px] font-bold">NOVO TERCEIRO</button>}>
      {parties.rows.length === 0 ? <p className="py-5 text-center text-xs text-muted-foreground">NENHUM TERCEIRO CADASTRADO.</p> :
      <div className="grid gap-2 md:grid-cols-2">{parties.rows.map((party) => <div key={party.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
        <div className="min-w-0"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-primary"/><p className="truncate text-sm font-semibold">{party.name}</p><Tag tone={party.active ? "success" : "danger"}>{party.active ? "ATIVO" : "INATIVO"}</Tag></div>{party.notes && <p className="mt-1 truncate text-[10px] text-muted-foreground">{party.notes}</p>}</div>
        <button type="button" onClick={() => openEditParty(party)} className="shrink-0 rounded-lg border px-3 py-2 text-[9px] font-bold">EDITAR</button>
      </div>)}</div>}
    </Panel>
    {thirdPartyInstallmentRows.length > 0 && <Panel title="PARCELAMENTOS DE TERCEIROS"><div className="space-y-3">{thirdPartyInstallmentRows.map(({ expense, installment }) => <div key={installment.id} className="rounded-xl border p-4"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-semibold">{installment.name}</p><p className="text-[10px] text-muted-foreground">{expense.description} · {installment.installments_count}X · {installment.purchase_date}</p></div><div className="text-right"><p className="font-bold text-danger">-{formatCurrency(Number(installment.total_amount))}</p><p className="text-[10px] text-muted-foreground">PARCELA {Math.min(Number(installment.paid_count)+1,Number(installment.installments_count))}/{Number(installment.installments_count)}</p></div></div></div>)}</div></Panel>}
    <Panel title={`GASTOS DE TERCEIROS — ${month}`}>
      {expenseRows.length === 0 ? <div className="py-12 text-center"><UserRound className="mx-auto mb-3 h-8 w-8 text-muted-foreground"/><p className="text-sm font-semibold">NENHUM GASTO DE TERCEIRO</p><p className="mt-1 text-xs text-muted-foreground">Registre quem gastou, quanto, onde saiu o dinheiro e se houve reembolso.</p></div> :
      <div className="space-y-3">{expenseRows.map((row) => { const party = parties.rows.find((p) => p.id === row.third_party_id); const payment = payments.rows.find((p) => p.id === row.payment_method_id); const card = cards.rows.find((c) => c.id === row.card_id); const account = accounts.rows.find((a) => a.id === row.account_id); return <div key={row.id} className="rounded-xl border p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><UserRound className="h-4 w-4 text-primary"/><p className="text-sm font-semibold">{party?.name ?? "TERCEIRO"}</p><Tag>{row.category}</Tag><Tag tone={row.reimbursement_status === "REEMBOLSADO" ? "success" : row.reimbursement_status === "PARCIAL" ? "warning" : "danger"}>{row.reimbursement_status}</Tag></div><p className="mt-1 text-xs">{row.description}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground"><span>{row.date}</span>{payment && <span>• {payment.name}</span>}{card && <span>• {card.name}</span>}{account && <span>• {account.name}</span>}</div></div><div className="flex items-center gap-3"><div className="text-right"><p className="text-sm font-bold text-danger">-{formatCurrency(Number(row.amount))}</p><p className="text-[10px] text-muted-foreground">REEMBOLSADO {formatCurrency(Number(row.reimbursed_amount))}</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[9px] font-bold"><input type="checkbox" checked={row.paid} onChange={(e) => void togglePaid(row, e.target.checked)} className="h-4 w-4"/><span>{row.paid ? "PAGO" : "NÃO PAGO"}</span></label>{row.reimbursement_status !== "REEMBOLSADO" && <button type="button" onClick={() => void markReimbursed(row)} className="rounded-lg border px-3 py-2 text-[9px] font-bold text-success"><CheckCircle2 className="mr-1 inline h-3 w-3"/>REEMBOLSADO</button>}<button type="button" onClick={() => void removeExpense(row)} className="rounded-lg border px-3 py-2 text-[9px] font-bold text-danger"><X className="mr-1 inline h-3 w-3"/>EXCLUIR</button></div></div></div>})}</div>}
    </Panel>
    {partyModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-3xl bg-background p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><p className="label-caps text-[9px] text-primary">CADASTRO</p><p className="text-sm font-bold">{editingParty ? "EDITAR TERCEIRO" : "NOVO TERCEIRO"}</p></div><button type="button" onClick={() => { setPartyModal(false); setEditingParty(null); }}><X className="h-5 w-5"/></button></div><label className="block"><span className="label-caps mb-1.5 block text-[9px] font-semibold text-muted-foreground">NOME *</span><input autoFocus value={partyName} onChange={(e) => setPartyName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void saveParty(); }} placeholder="EX.: JOÃO SILVA" className="w-full rounded-xl border bg-background p-3"/></label><label className="mt-3 block"><span className="label-caps mb-1.5 block text-[9px] font-semibold text-muted-foreground">OBSERVAÇÕES</span><textarea value={partyNotes} onChange={(e) => setPartyNotes(e.target.value)} placeholder="EX.: IRMÃO, AMIGO, COLEGA..." className="min-h-20 w-full rounded-xl border bg-background p-3 text-sm"/></label><label className="mt-3 flex items-center justify-between rounded-xl border p-3"><span><span className="label-caps block text-[9px] font-semibold">STATUS</span><span className="text-xs text-muted-foreground">{partyActive ? "Pode ser usado em novos lançamentos" : "Oculto dos novos lançamentos"}</span></span><input type="checkbox" checked={partyActive} onChange={(e) => setPartyActive(e.target.checked)} className="h-4 w-4"/></label><div className="mt-3 flex gap-2"><button type="button" onClick={() => { setPartyModal(false); setEditingParty(null); }} className="w-full rounded-xl border p-3 text-[10px] font-bold">CANCELAR</button><button type="button" onClick={() => void saveParty()} className="gradient-primary w-full rounded-xl p-3 text-[10px] font-bold text-primary-foreground">{editingParty ? "SALVAR ALTERAÇÕES" : "CADASTRAR TERCEIRO"}</button></div></div></div>}
  </div>;
}
