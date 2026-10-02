import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag, PersonDot } from "@/components/ui-kit";
import { ResponsibleField } from "@/components/responsible-field";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useHouseholdPaymentMethods } from "@/hooks/use-household-payment-methods";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { MonthSelector, useGlobalMonth } from "@/hooks/use-global-month";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/custos-fixos")({
  head: () => ({ meta: [{ title: "CUSTOS FIXOS E ASSINATURAS — MULTICAP" }] }),
  component: FixedCostsPage,
});

type Row = {
  id: string; name: string; amount: number; category: string; due_day: number;
  months: boolean[]; responsible: string; pay_method: string; card_name?: string | null;
  payment_method_name?: string | null; payment_method_id?: string | null; card_id?: string | null;
  household_id: string;
};

type FormState = {
  name: string; amount: string; category: string; day: string; responsible: string;
  paymentId: string; months: boolean[];
};
type Category = { id: string; name: string; kind: string; household_id: string };

const MONTHS = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

const SUBSCRIPTION_LOGOS: Record<string, string> = {
  netflix: "https://cdn.simpleicons.org/netflix",
  spotify: "https://cdn.simpleicons.org/spotify",
  disney: "https://cdn.simpleicons.org/disneyplus",
  "disney+": "https://cdn.simpleicons.org/disneyplus",
  youtube: "https://cdn.simpleicons.org/youtube",
  "youtube premium": "https://cdn.simpleicons.org/youtube",
  amazon: "https://cdn.simpleicons.org/amazon",
  "amazon prime": "https://cdn.simpleicons.org/amazon",
  "prime video": "https://cdn.simpleicons.org/primevideo",
  apple: "https://cdn.simpleicons.org/apple",
  "apple music": "https://cdn.simpleicons.org/applemusic",
  icloud: "https://cdn.simpleicons.org/icloud",
  google: "https://cdn.simpleicons.org/google",
  "google one": "https://cdn.simpleicons.org/googleone",
  microsoft: "https://cdn.simpleicons.org/microsoft",
  "microsoft 365": "https://cdn.simpleicons.org/microsoft365",
  canva: "https://cdn.simpleicons.org/canva",
  hbo: "https://cdn.simpleicons.org/hbo",
  max: "https://cdn.simpleicons.org/max",
  crunchyroll: "https://cdn.simpleicons.org/crunchyroll",
  deezer: "https://cdn.simpleicons.org/deezer",
  globoplay: "https://cdn.simpleicons.org/globo",
  paramount: "https://cdn.simpleicons.org/paramountplus",
  "paramount+": "https://cdn.simpleicons.org/paramountplus",
  "playstation plus": "https://cdn.simpleicons.org/playstation",
  "xbox game pass": "https://cdn.simpleicons.org/xbox",
  chatgpt: "https://cdn.simpleicons.org/openai",
};

function subscriptionLogoUrl(name: string) {
  const normalized = name.trim().toLowerCase();
  const exact = SUBSCRIPTION_LOGOS[normalized];
  if (exact) return exact;
  const match = Object.keys(SUBSCRIPTION_LOGOS).find((key) => normalized.includes(key) || key.includes(normalized));
  return match ? SUBSCRIPTION_LOGOS[match] : null;
}

function SubscriptionLogo({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const [failed, setFailed] = useState(false);
  const url = subscriptionLogoUrl(name);
  const box = size === "sm" ? "h-9 w-9 rounded-xl" : "h-12 w-12 rounded-2xl";
  if (!url || failed) {
    return <div className={"flex " + box + " shrink-0 items-center justify-center border border-border bg-background text-xs font-bold text-primary"}>{name.trim().slice(0, 2).toUpperCase()}</div>;
  }
  return <div className={"flex " + box + " shrink-0 items-center justify-center border border-border bg-background p-2 shadow-sm"}><img src={url} alt={"Logo " + name} className="h-full w-full object-contain" onError={() => setFailed(true)} /></div>;
}

const emptyForm = (subscription = false): FormState => ({
  name: "", amount: "", category: subscription ? "ASSINATURAS" : "", day: "5",
  responsible: "AMBAS", paymentId: "", months: Array(12).fill(true),
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="label-caps mb-1.5 block text-[9px] font-semibold tracking-[0.12em] text-muted-foreground">{label}</span>{children}</label>;
}

function FixedCostsPage() {const isDesktop = useIsDesktop();
  const { month, setMonth } = useGlobalMonth("custos-fixos");
  const { rows, insert, update, remove, isLoading } = useHouseholdTable<Row>(
    "fixed_costs",
    "id,name,amount,category,due_day,months,responsible,pay_method,card_name,payment_method_name,payment_method_id,card_id,household_id",
    "name",
  );
  const payments = useHouseholdPaymentMethods();
  const categories = useHouseholdTable<Category>("categories", "id,name,kind,household_id", "name");
  const [tab, setTab] = useState<"CUSTOS" | "ASSINATURAS">("CUSTOS");
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editing, setEditing] = useState<Row | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);

  const paymentOptions = useMemo(() => payments.options, [payments.options]);
  const categoryOptions = useMemo(() => categories.rows.map((c) => c.name.toUpperCase()).filter(Boolean), [categories.rows]);
  const [, monthNumber] = month.split("-").map(Number) as [number, number];
  const subscriptions = rows.filter((r) => r.category.toUpperCase() === "ASSINATURAS");
  const active = rows.filter((r) => Boolean(r.months?.[monthNumber - 1]));
  const regularActive = active.filter((r) => r.category.toUpperCase() !== "ASSINATURAS");
  const subscriptionActive = active.filter((r) => r.category.toUpperCase() === "ASSINATURAS");
  const monthly = regularActive.reduce((s, r) => s + Number(r.amount), 0);
  const subscriptionMonthly = subscriptionActive.reduce((s, r) => s + Number(r.amount), 0);
  const annual = rows.reduce((s, r) => s + Number(r.amount) * (r.months?.filter(Boolean).length ?? 0), 0);

  useEffect(() => {
    if (!form.paymentId && paymentOptions[0]?.id) setForm((v) => ({ ...v, paymentId: paymentOptions[0].id }));
  }, [form.paymentId, paymentOptions]);

  useEffect(() => {
    if (tab === "CUSTOS" && !categoryOptions.includes(form.category)) setForm((v) => ({ ...v, category: categoryOptions[0] ?? "" }));
  }, [categoryOptions, form.category, tab]);

  function openNew(target: "CUSTOS" | "ASSINATURAS" = tab) {
    setTab(target); setEditing(null); setSelected(null); setForm(emptyForm(target === "ASSINATURAS")); setOpen(true);
  }

  function openEdit(row: Row) {
    const payment = paymentOptions.find((p) => p.id === row.payment_method_id)
      ?? paymentOptions.find((p) => p.id === row.card_id)
      ?? paymentOptions.find((p) => p.label === row.payment_method_name?.toUpperCase())
      ?? paymentOptions.find((p) => p.value === row.pay_method);
    setTab(row.category.toUpperCase() === "ASSINATURAS" ? "ASSINATURAS" : "CUSTOS");
    setEditing(row); setSelected(null);
    setForm({
      name: row.name, amount: String(row.amount), category: row.category, day: String(row.due_day),
      responsible: row.responsible, paymentId: payment?.id ?? "", months: [...row.months],
    });
    setOpen(true);
  }

  function closeForm() { setOpen(false); setEditing(null); setForm(emptyForm(tab === "ASSINATURAS")); }

  async function save() {
    const value = Number(form.amount.replace(",", "."));
    const payment = paymentOptions.find((p) => p.id === form.paymentId);
    const dueDay = Math.max(1, Math.min(31, Number(form.day) || 5));
    if (!form.name.trim() || !Number.isFinite(value) || value <= 0) return toast.error("PREENCHA NOME E VALOR");
    if (!payment) return toast.error("SELECIONE UMA FORMA DE PAGAMENTO");
    if (tab === "CUSTOS" && (!form.category || !categoryOptions.includes(form.category))) return toast.error("SELECIONE UMA CATEGORIA CADASTRADA EM AJUSTES");
    if (!form.months.some(Boolean)) return toast.error("SELECIONE PELO MENOS UM MÊS DE COBRANÇA");
    const payload = {
      name: form.name.trim().toUpperCase(), amount: value, category: tab === "ASSINATURAS" ? "ASSINATURAS" : form.category,
      due_day: dueDay, months: form.months, responsible: form.responsible, pay_method: payment.value,
      payment_method_id: payment.id, payment_method_name: payment.label, card_id: payment.cardId ?? null,
      card_name: payment.cardId ? payment.label : null,
    };
    try {
      if (editing) {
        await update(editing.id, payload);
        toast.success(tab === "ASSINATURAS" ? "ASSINATURA ATUALIZADA" : "CUSTO FIXO ATUALIZADO");
      } else {
        await insert(payload);
        toast.success(tab === "ASSINATURAS" ? "ASSINATURA SALVA" : "CUSTO FIXO SALVO");
      }
      closeForm();
    } catch (e) { toast.error(e instanceof Error ? e.message : "NÃO FOI POSSÍVEL SALVAR"); }
  }

  async function toggleMonth(row: Row, index: number) {
    try { const months = [...row.months]; months[index] = !months[index]; await update(row.id, { months }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "NÃO FOI POSSÍVEL ATUALIZAR"); }
  }

  async function del(row: Row) {
    if (!window.confirm(`Excluir ${row.name}?`)) return;
    try { await remove(row.id); setSelected(null); toast.success(row.category.toUpperCase() === "ASSINATURAS" ? "ASSINATURA EXCLUÍDA" : "CUSTO FIXO EXCLUÍDO"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "NÃO FOI POSSÍVEL EXCLUIR"); }
  }

  useEffect(() => {
    const handler = (event: globalThis.Event) => {
      const detail = (event as CustomEvent<{ option?: string }>).detail;
      if (detail?.option === "NOVA ASSINATURA") openNew("ASSINATURAS");
      if (detail?.option === "NOVO CUSTO FIXO") openNew("CUSTOS");
    };
    window.addEventListener("multicap:open-create", handler);
    const pending = sessionStorage.getItem("multicap:pending-create");
    if (pending === "NOVA ASSINATURA" || pending === "NOVO CUSTO FIXO") { sessionStorage.removeItem("multicap:pending-create"); openNew(pending === "NOVA ASSINATURA" ? "ASSINATURAS" : "CUSTOS"); }
    return () => window.removeEventListener("multicap:open-create", handler);
  }, []);

  function renderRow(row: Row) {
    const isSub = row.category.toUpperCase() === "ASSINATURAS";
    return <div key={row.id} className="rounded-xl border border-border bg-secondary/30 p-3">
      <button type="button" onClick={() => setSelected(row)} className="flex w-full flex-wrap items-center justify-between gap-3 text-left">
        <div className="flex min-w-0 items-center gap-3">
          {isSub && <SubscriptionLogo name={row.name} />}
          <div className="min-w-0">
            <p className="label-caps truncate text-[12px]">{row.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2"><Tag>{isSub ? "ASSINATURA" : row.category}</Tag><Tag tone="warning">DIA {row.due_day}</Tag><Tag>{row.payment_method_name ?? row.pay_method}</Tag><PersonDot name={row.responsible}/></div>
          </div>
        </div>
        <p className="ml-auto text-sm font-bold">{formatCurrency(Number(row.amount))}</p>
      </button>
      <div className="mt-3 grid grid-cols-12 gap-1">{MONTHS.map((m, i) => <button key={m} type="button" onClick={() => void toggleMonth(row, i)} className={`label-caps rounded-md py-1 text-center text-[8px] ${row.months?.[i] ? "gradient-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>{m}</button>)}</div>
      <div className="mt-3 flex gap-2"><button type="button" onClick={() => openEdit(row)} className="rounded-lg border px-3 py-1.5 text-[9px] font-semibold">EDITAR</button><button type="button" onClick={() => void del(row)} className="rounded-lg border border-destructive/30 px-3 py-1.5 text-[9px] font-semibold text-destructive">EXCLUIR</button></div>
    </div>;
  }

  return <div className="space-y-5">
    <PageHeader title="CUSTOS FIXOS E ASSINATURAS" subtitle="DESPESAS RECORRENTES E SERVIÇOS POR ASSINATURA." action={<div className="flex items-center gap-2"><button type="button" onClick={()=>setOpen(v=>!v)} className="gradient-primary inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[10px] font-bold text-primary-foreground"><Plus className="h-4 w-4"/>{open?"FECHAR FORMULÁRIO":tab==="ASSINATURAS"?"NOVA ASSINATURA":"NOVO CUSTO FIXO"}</button><MonthSelector month={month} setMonth={setMonth}/></div>}/>
    <div className="rounded-2xl border border-border bg-card p-1.5"><div className="grid grid-cols-2 gap-1"><button type="button" onClick={() => setTab("CUSTOS")} className={`rounded-xl px-4 py-3 text-[10px] font-semibold tracking-[0.08em] ${tab === "CUSTOS" ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>CUSTOS FIXOS</button><button type="button" onClick={() => setTab("ASSINATURAS")} className={`rounded-xl px-4 py-3 text-[10px] font-semibold tracking-[0.08em] ${tab === "ASSINATURAS" ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>ASSINATURAS</button></div></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><StatCard label={tab === "ASSINATURAS" ? "ASSINATURAS DO MÊS" : "CUSTOS DO MÊS"} value={formatCurrency(tab === "ASSINATURAS" ? subscriptionMonthly : monthly)} tone="primary"/><StatCard label="CUSTO ANUAL ESTIMADO" value={formatCurrency(annual)} tone="info"/><StatCard label={tab === "ASSINATURAS" ? "ASSINATURAS ATIVAS" : "CUSTOS ATIVOS"} value={String(tab === "ASSINATURAS" ? subscriptionActive.length : regularActive.length)} tone="success"/></div>
    {tab === "ASSINATURAS" ? <Panel title="ASSINATURAS"><p className="mb-3 text-[10px] text-muted-foreground">Controle mensal das suas assinaturas recorrentes.</p>{subscriptions.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">NENHUMA ASSINATURA CADASTRADA.</p> : <div className="grid gap-3 md:grid-cols-2">{subscriptions.map(renderRow)}</div>}</Panel> : <Panel title={`DESPESAS RECORRENTES — ${month}`}>{isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">CARREGANDO...</p> : regularActive.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">NENHUM CUSTO FIXO NESTE MÊS.</p> : <div className="space-y-3">{regularActive.map(renderRow)}</div>}</Panel>}

    {(open || isDesktop) && <div className="hidden lg:block rounded-2xl border border-border/70 bg-card p-5 shadow-[0_12px_40px_-30px_rgba(0,0,0,0.8)] md:p-6"><div className="mb-4"><p className="label-caps text-[9px] font-semibold tracking-[0.18em] text-primary">CADASTRO NO DESKTOP</p><h2 className="mt-1 text-base font-bold tracking-tight md:text-lg">NOVO CUSTO FIXO / ASSINATURA</h2></div><div className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><Field label={tab === "ASSINATURAS" ? "NOME DA ASSINATURA" : "NOME DO CUSTO"}><div className="flex items-center gap-2">{tab === "ASSINATURAS" && form.name.trim() && <SubscriptionLogo name={form.name} size="sm" />}<input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10" placeholder={tab === "ASSINATURAS" ? "Ex.: NETFLIX" : "Ex.: ALUGUEL"}/></div></Field><Field label="VALOR"><input value={form.amount} onChange={(e) => setForm((v) => ({ ...v, amount: e.target.value }))} inputMode="decimal" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10" placeholder="R$ 0,00"/></Field><Field label="CATEGORIA"><select disabled={tab === "ASSINATURAS"} value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10">{tab === "ASSINATURAS" ? <option value="ASSINATURAS">ASSINATURAS</option> : <><option value="">SELECIONE</option>{categoryOptions.map((c) => <option key={c}>{c}</option>)}</>}</select></Field><Field label="DIA DE VENCIMENTO"><input value={form.day} onChange={(e) => setForm((v) => ({ ...v, day: e.target.value }))} type="number" min="1" max="31" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"/></Field><Field label="FORMA DE PAGAMENTO"><select value={form.paymentId} onChange={(e) => setForm((v) => ({ ...v, paymentId: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"><option value="">SELECIONE</option>{paymentOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></Field><ResponsibleField value={form.responsible} onChange={(responsible) => setForm((v) => ({ ...v, responsible }))} /></div>
      <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4"><div className="mb-3 flex items-center justify-between gap-2"><div><p className="label-caps text-[10px] font-semibold">MESES DE COBRANÇA</p><p className="text-[10px] text-muted-foreground">Defina em quais meses o lançamento recorrente deve existir.</p></div><div className="flex gap-2"><button type="button" onClick={() => setForm((v) => ({ ...v, months: Array(12).fill(true) }))} className="rounded-lg border px-2.5 py-1.5 text-[9px]">TODOS</button><button type="button" onClick={() => setForm((v) => ({ ...v, months: Array(12).fill(false) }))} className="rounded-lg border px-2.5 py-1.5 text-[9px]">LIMPAR</button></div></div><div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">{MONTHS.map((m, i) => <label key={m} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-2.5"><input type="checkbox" checked={form.months[i]} onChange={() => setForm((v) => ({ ...v, months: v.months.map((x, j) => j === i ? !x : x) }))} className="h-4 w-4 accent-primary"/><span className="label-caps text-[9px]">{m}</span></label>)}</div></div>
      <button type="button" onClick={() => void save()} className="gradient-primary inline-flex h-10 w-full items-center justify-center rounded-xl px-4 text-[10px] font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">{editing ? "SALVAR ALTERAÇÕES" : tab === "ASSINATURAS" ? "SALVAR ASSINATURA" : "SALVAR CUSTO FIXO"}</button></div></div>}<Dialog open={open && !isDesktop} onOpenChange={(v) => { if (!v) closeForm(); else setOpen(true); }}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl"><DialogHeader><DialogTitle className="label-caps">{editing ? "EDITAR" : "NOVO"} {tab === "ASSINATURAS" ? "ASSINATURA" : "CUSTO FIXO"}</DialogTitle></DialogHeader><div className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><Field label={tab === "ASSINATURAS" ? "NOME DA ASSINATURA" : "NOME DO CUSTO"}><div className="flex items-center gap-2">{tab === "ASSINATURAS" && form.name.trim() && <SubscriptionLogo name={form.name} size="sm" />}<input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10" placeholder={tab === "ASSINATURAS" ? "Ex.: NETFLIX" : "Ex.: ALUGUEL"}/></div></Field><Field label="VALOR"><input value={form.amount} onChange={(e) => setForm((v) => ({ ...v, amount: e.target.value }))} inputMode="decimal" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10" placeholder="R$ 0,00"/></Field><Field label="CATEGORIA"><select disabled={tab === "ASSINATURAS"} value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10">{tab === "ASSINATURAS" ? <option value="ASSINATURAS">ASSINATURAS</option> : <><option value="">SELECIONE</option>{categoryOptions.map((c) => <option key={c}>{c}</option>)}</>}</select></Field><Field label="DIA DE VENCIMENTO"><input value={form.day} onChange={(e) => setForm((v) => ({ ...v, day: e.target.value }))} type="number" min="1" max="31" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"/></Field><Field label="FORMA DE PAGAMENTO"><select value={form.paymentId} onChange={(e) => setForm((v) => ({ ...v, paymentId: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"><option value="">SELECIONE</option>{paymentOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></Field><ResponsibleField value={form.responsible} onChange={(responsible) => setForm((v) => ({ ...v, responsible }))} /></div>
      <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4"><div className="mb-3 flex items-center justify-between gap-2"><div><p className="label-caps text-[10px] font-semibold">MESES DE COBRANÇA</p><p className="text-[10px] text-muted-foreground">Defina em quais meses o lançamento recorrente deve existir.</p></div><div className="flex gap-2"><button type="button" onClick={() => setForm((v) => ({ ...v, months: Array(12).fill(true) }))} className="rounded-lg border px-2.5 py-1.5 text-[9px]">TODOS</button><button type="button" onClick={() => setForm((v) => ({ ...v, months: Array(12).fill(false) }))} className="rounded-lg border px-2.5 py-1.5 text-[9px]">LIMPAR</button></div></div><div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">{MONTHS.map((m, i) => <label key={m} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-2.5"><input type="checkbox" checked={form.months[i]} onChange={() => setForm((v) => ({ ...v, months: v.months.map((x, j) => j === i ? !x : x) }))} className="h-4 w-4 accent-primary"/><span className="label-caps text-[9px]">{m}</span></label>)}</div></div>
      <button type="button" onClick={() => void save()} className="gradient-primary inline-flex h-10 w-full items-center justify-center rounded-xl px-4 text-[10px] font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">{editing ? "SALVAR ALTERAÇÕES" : tab === "ASSINATURAS" ? "SALVAR ASSINATURA" : "SALVAR CUSTO FIXO"}</button></div></DialogContent></Dialog>

    <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}><DialogContent className="max-w-md rounded-3xl"><DialogHeader><DialogTitle className="label-caps">DETALHES {selected?.category.toUpperCase() === "ASSINATURAS" ? "DA ASSINATURA" : "DO CUSTO FIXO"}</DialogTitle></DialogHeader>{selected && <div className="space-y-3"><div className="rounded-2xl border bg-secondary/30 p-4"><p className="label-caps text-sm font-bold">{selected.name}</p><p className="mt-2 text-2xl font-bold">{formatCurrency(Number(selected.amount))}</p></div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl border p-3"><Field label="CATEGORIA"><span>{selected.category}</span></Field></div><div className="rounded-xl border p-3"><Field label="VENCIMENTO"><span>DIA {selected.due_day}</span></Field></div><div className="rounded-xl border p-3"><Field label="PAGAMENTO"><span>{selected.payment_method_name ?? selected.pay_method}</span></Field></div><div className="rounded-xl border p-3"><Field label="RESPONSÁVEL"><span>{selected.responsible}</span></Field></div></div><div className="flex gap-2"><button type="button" onClick={() => openEdit(selected)} className="inline-flex h-9 min-w-[120px] items-center justify-center rounded-xl border border-border bg-background px-4 text-[10px] font-semibold transition-colors hover:bg-secondary">EDITAR</button><button type="button" onClick={() => void del(selected)} className="inline-flex h-9 min-w-[120px] items-center justify-center rounded-xl border border-destructive/30 bg-background px-4 text-[10px] font-semibold text-destructive transition-colors hover:bg-destructive/5">EXCLUIR</button></div></div>}</DialogContent></Dialog>
  </div>;
}
