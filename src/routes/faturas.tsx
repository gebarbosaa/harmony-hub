import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useHouseholdMembers } from "@/hooks/use-household-members";

export const Route = createFileRoute("/faturas")({ head: () => ({ meta: [{ title: "FATURAS — MULTICAP" }] }), component: InvoicesPage });

type Card = { id: string; name: string; brand: string | null; last4: string | null; credit_limit: number; due_day: number; close_day: number; household_id: string };
type Invoice = { id: string; card_id: string | null; period: string; total: number; status: string; household_id: string };
type Tx = { id: string; date: string; description: string; amount: number; category: string; pay_method: string; responsible: string; type: string; paid: boolean; card_name: string | null; household_id: string };
type Category = { id: string; name: string; kind: string; household_id: string };

const DEFAULT_CATEGORIES = ["ALIMENTAÇÃO", "MORADIA", "TRANSPORTE", "LAZER", "SAÚDE", "IMPOSTOS", "RENDA", "OUTROS"];

function InvoicesPage() {
  const cards = useHouseholdTable<Card>("cards", "id,name,brand,last4,credit_limit,due_day,close_day,household_id");
  const invoices = useHouseholdTable<Invoice>("invoices", "id,card_id,period,total,status,household_id", "period");
  const transactions = useHouseholdTable<Tx>("transactions", "id,date,description,amount,category,pay_method,responsible,type,paid,card_name,household_id", "date");
  const categories = useHouseholdTable<Category>("categories", "id,name,kind,household_id", "name");
  const { data: members = [] } = useHouseholdMembers();

  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [due, setDue] = useState("5");
  const [close, setClose] = useState("28");
  const [brand, setBrand] = useState("");
  const [last4, setLast4] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const categoryOptions = useMemo(() => {
    const names = categories.rows.map(c => c.name.toUpperCase());
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...names])).sort();
  }, [categories.rows]);

  async function addCard() {
    const value = Number(limit.replace(",", "."));
    if (!name.trim() || value <= 0) return toast.error("PREENCHA NOME E LIMITE");
    try {
      await cards.insert({ name: name.trim().toUpperCase(), credit_limit: value, due_day: Number(due), close_day: Number(close), brand: brand.trim() || null, last4: last4.trim() || null });
      setName(""); setLimit(""); setBrand(""); setLast4(""); toast.success("CARTÃO SALVO");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar"); }
  }

  async function addInvoice(card: Card) {
    const period = new Date().toISOString().slice(0, 7);
    try {
      await invoices.insert({ card_id: card.id, period, total: 0, status: "ABERTA" });
      toast.success("FATURA CRIADA");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível criar a fatura"); }
  }

  async function toggle(i: Invoice) {
    try { await invoices.update(i.id, { status: i.status === "PAGA" ? "ABERTA" : "PAGA" }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível atualizar"); }
  }

  function invoiceCard(invoice: Invoice) {
    return cards.rows.find(c => c.id === invoice.card_id) ?? null;
  }

  function invoiceRows(invoice: Invoice) {
    const card = invoiceCard(invoice);
    if (!card) return [];
    return transactions.rows.filter(t => t.card_name?.toUpperCase() === card.name.toUpperCase() && t.date.startsWith(invoice.period));
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editing.description.trim() || Number(editing.amount) <= 0) return toast.error("PREENCHA DESCRIÇÃO E VALOR");
    setSaving(true);
    try {
      await transactions.update(editing.id, {
        description: editing.description.trim().toUpperCase(),
        amount: Number(editing.amount),
        category: editing.category,
        responsible: editing.responsible,
        paid: editing.paid,
      });
      setEditing(null);
      toast.success("REGISTRO ATUALIZADO");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível atualizar"); }
    finally { setSaving(false); }
  }

  async function createCategory() {
    const value = newCategory.trim().toUpperCase();
    if (!value) return;
    if (categoryOptions.includes(value)) return toast.info("ESSA CATEGORIA JÁ EXISTE");
    try {
      await categories.insert({ name: value, kind: "DESPESA" });
      setNewCategory("");
      toast.success("CATEGORIA ADICIONADA");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível adicionar a categoria"); }
  }

  async function updateInvoiceTotal(invoice: Invoice) {
    const total = invoiceRows(invoice).reduce((sum, row) => sum + Number(row.amount), 0);
    if (Number(invoice.total) === total) return;
    try { await invoices.update(invoice.id, { total }); } catch { /* o registro continua visível mesmo sem recalcular a fatura */ }
  }

  const selectedRows = selectedInvoice ? invoiceRows(selectedInvoice) : [];
  const selectedCard = selectedInvoice ? invoiceCard(selectedInvoice) : null;

  return <div className="space-y-5">
    <PageHeader title="FATURAS" subtitle="Cadastre cartões e acompanhe suas faturas reais." />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <StatCard label="TOTAL EM FATURAS" value={formatCurrency(invoices.rows.reduce((s, i) => s + Number(i.total), 0))} tone="primary" />
      <StatCard label="LIMITE TOTAL" value={formatCurrency(cards.rows.reduce((s, c) => s + Number(c.credit_limit), 0))} tone="success" />
      <StatCard label="CARTÕES" value={String(cards.rows.length)} tone="info" />
    </div>

    <Panel title="NOVO CARTÃO">
      <div className="grid gap-3 md:grid-cols-6">
        <label className="md:col-span-2"><span className="label-caps text-[10px] text-muted-foreground">NOME</span><input value={name} onChange={e => setName(e.target.value)} placeholder="Nubank" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>
        <label><span className="label-caps text-[10px] text-muted-foreground">LIMITE</span><input value={limit} onChange={e => setLimit(e.target.value)} inputMode="decimal" placeholder="0,00" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>
        <label><span className="label-caps text-[10px] text-muted-foreground">FECHAMENTO</span><input type="number" min="1" max="31" value={close} onChange={e => setClose(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>
        <label><span className="label-caps text-[10px] text-muted-foreground">VENCIMENTO</span><input type="number" min="1" max="31" value={due} onChange={e => setDue(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>
        <label><span className="label-caps text-[10px] text-muted-foreground">BANDEIRA</span><input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Visa" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>
        <label><span className="label-caps text-[10px] text-muted-foreground">4 ÚLTIMOS</span><input maxLength={4} value={last4} onChange={e => setLast4(e.target.value)} placeholder="1234" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>
        <button onClick={addCard} className="gradient-primary label-caps rounded-xl px-4 py-2.5 text-[11px] text-primary-foreground md:col-span-2">SALVAR CARTÃO</button>
      </div>
    </Panel>

    <Panel title="CARTÕES E FATURAS">
      {cards.rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum cartão cadastrado.</p> : <div className="grid gap-3 md:grid-cols-2">{cards.rows.map(c => <div key={c.id} className="rounded-2xl border border-border bg-card p-4"><div className="flex justify-between"><div><p className="label-caps text-sm">{c.name}</p><p className="text-[11px] text-muted-foreground">{c.brand || "Sem bandeira"} · •••• {c.last4 || "----"}</p></div><Tag tone="info">LIMITE {formatCurrency(Number(c.credit_limit))}</Tag></div><div className="mt-4"><p className="text-[11px] text-muted-foreground">Fechamento dia {c.close_day} · Vencimento dia {c.due_day}</p><button onClick={() => addInvoice(c)} className="label-caps mt-3 rounded-lg border border-primary/60 px-3 py-1.5 text-[10px] text-primary">CRIAR FATURA DO MÊS</button></div></div>)}</div>}
    </Panel>

    <Panel title="FATURAS CADASTRADAS">
      {invoices.rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma fatura cadastrada.</p> : <div className="space-y-2">{invoices.rows.map(i => {
        const card = invoiceCard(i);
        const count = invoiceRows(i).length;
        return <button key={i.id} type="button" onClick={() => { setSelectedInvoice(i); void updateInvoiceTotal(i); }} className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-3 text-left transition-colors hover:border-primary/60 hover:bg-secondary/60">
          <div><p className="label-caps text-[11px]">{i.period}</p><p className="text-xs text-muted-foreground">{card?.name || "Cartão"} · {count} {count === 1 ? "registro" : "registros"}</p></div>
          <div className="flex items-center gap-3"><span className="font-semibold">{formatCurrency(Number(i.total))}</span><span onClick={e => e.stopPropagation()}><button type="button" onClick={() => toggle(i)}><Tag tone={i.status === "PAGA" ? "success" : "warning"}>{i.status}</Tag></button></span></div>
        </button>;
      })}</div>}
    </Panel>

    {selectedInvoice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" onClick={() => setSelectedInvoice(null)}>
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="label-caps text-lg">FATURA {selectedInvoice.period}</p><p className="text-sm text-muted-foreground">{selectedCard?.name || "Cartão"} · {selectedRows.length} registros</p></div>
          <div className="flex items-center gap-2"><Tag tone={selectedInvoice.status === "PAGA" ? "success" : "warning"}>{selectedInvoice.status}</Tag><button type="button" onClick={() => setSelectedInvoice(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">FECHAR</button></div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3"><StatCard label="TOTAL DA FATURA" value={formatCurrency(selectedRows.reduce((s, r) => s + Number(r.amount), 0))} tone="primary" /><StatCard label="REGISTROS" value={String(selectedRows.length)} tone="info" /><StatCard label="LIMITE" value={formatCurrency(Number(selectedCard?.credit_limit || 0))} tone="success" /></div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="label-caps text-xs">REGISTROS DA FATURA</p><p className="text-[11px] text-muted-foreground">Clique em um registro para editar categoria, responsável, valor e descrição.</p></div>
          <div className="flex items-end gap-2"><label><span className="label-caps text-[9px] text-muted-foreground">NOVA CATEGORIA</span><input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Ex.: PET" className="mt-1 w-36 rounded-lg border border-input bg-background px-2.5 py-2 text-xs" /></label><button type="button" onClick={createCategory} className="rounded-lg border border-primary px-3 py-2 text-[10px] text-primary">ADICIONAR</button></div>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          {selectedRows.length === 0 ? <div className="py-10 text-center"><p className="text-sm text-muted-foreground">Nenhum registro encontrado nesta fatura.</p><p className="mt-1 text-[11px] text-muted-foreground">Os registros são associados pelo cartão e pelo mês da fatura.</p></div> : <div className="divide-y divide-border">{selectedRows.map(row => <button key={row.id} type="button" onClick={() => setEditing({ ...row })} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/50"><div className="min-w-0"><p className="label-caps truncate text-[11px]">{row.description}</p><div className="mt-1 flex flex-wrap gap-1.5"><Tag>{row.category}</Tag><Tag>{row.responsible}</Tag><Tag>{row.pay_method}</Tag><span className="text-[10px] text-muted-foreground">{row.date}</span></div></div><span className="shrink-0 font-semibold">{formatCurrency(Number(row.amount))}</span></button>)}</div>}
        </div>

        <div className="mt-4 flex justify-end"><button type="button" onClick={() => void updateInvoiceTotal(selectedInvoice)} className="rounded-lg border border-border px-3 py-2 text-[10px]">ATUALIZAR TOTAL DA FATURA</button></div>
      </div>
    </div>}

    {editing && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3" onClick={() => setEditing(null)}>
      <div className="w-full max-w-xl rounded-2xl border border-border bg-background p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between"><div><p className="label-caps text-sm">EDITAR REGISTRO</p><p className="text-[11px] text-muted-foreground">Alterações ficam salvas no lançamento real.</p></div><button type="button" onClick={() => setEditing(null)} className="text-xs text-muted-foreground">FECHAR</button></div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="md:col-span-2"><span className="label-caps text-[10px] text-muted-foreground">DESCRIÇÃO</span><input value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>
          <label><span className="label-caps text-[10px] text-muted-foreground">VALOR</span><input type="number" step="0.01" value={editing.amount} onChange={e => setEditing({ ...editing, amount: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>
          <label><span className="label-caps text-[10px] text-muted-foreground">CATEGORIA</span><select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">{categoryOptions.map(c => <option key={c}>{c}</option>)}</select></label>
          <label><span className="label-caps text-[10px] text-muted-foreground">RESPONSÁVEL</span><select value={editing.responsible} onChange={e => setEditing({ ...editing, responsible: e.target.value })} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option value="AMBAS">AMBOS / COMPARTILHADO</option>{members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select></label>
          <label><span className="label-caps text-[10px] text-muted-foreground">PAGAMENTO</span><input value={editing.pay_method} readOnly className="mt-1 w-full rounded-xl border border-input bg-secondary/40 px-3 py-2.5 text-sm text-muted-foreground" /></label>
          <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5"><input type="checkbox" checked={editing.paid} onChange={e => setEditing({ ...editing, paid: e.target.checked })} /><span className="label-caps text-[10px]">FATURA/REGISTRO PAGO</span></label>
        </div>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-border px-4 py-2.5 text-[10px]">CANCELAR</button><button type="button" disabled={saving} onClick={() => void saveEdit()} className="gradient-primary rounded-xl px-4 py-2.5 text-[10px] text-primary-foreground disabled:opacity-50">{saving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}</button></div>
      </div>
    </div>}
  </div>;
}
