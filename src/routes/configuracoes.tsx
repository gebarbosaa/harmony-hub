import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui-kit";
import { useAuth } from "@/hooks/use-auth";
import { useHouseholdTable } from "@/hooks/use-household-data";

type Card = { id: string; name: string; brand: string | null; last4: string | null; credit_limit: number; close_day: number; due_day: number; household_id: string };
type Category = { id: string; name: string; kind: string; household_id: string };
type Payment = { id: string; name: string; description: string | null; household_id: string; kind: string | null; card_id: string | null; account_id: string | null };

const PAYMENT_KINDS = [
  { value: "DEBITO", label: "DÉBITO" },
  { value: "CREDITO", label: "CRÉDITO" },
  { value: "PIX", label: "PIX" },
  { value: "DINHEIRO", label: "DINHEIRO" },
  { value: "ALIMENTACAO", label: "ALIMENTAÇÃO" },
  { value: "TRANSFERENCIA", label: "TRANSFERÊNCIA" },
  { value: "BOLETO", label: "BOLETO" },
];
const paymentKindLabel = (kind: string | null) => PAYMENT_KINDS.find((k) => k.value === kind)?.label ?? "OUTRO";
type Account = { id: string; name: string; institution: string | null; account_type: string; notes: string | null; household_id: string };

export const Route = createFileRoute("/configuracoes")({ head: () => ({ meta: [{ title: "AJUSTES — HARMONY HUB" }] }), component: SettingsPage });

function SettingsPage() {
  const { user, profile, updateProfileName } = useAuth();
  const queryClient = useQueryClient();
  const categories = useHouseholdTable<Category>("categories", "id,name,kind,household_id", "name");
  const payments = useHouseholdTable<Payment>("household_payment_methods", "id,name,description,household_id,kind,card_id,account_id", "name");
  const accounts = useHouseholdTable<Account>("household_accounts", "id,name,institution,account_type,notes,household_id", "name");
  const [name, setName] = useState("");
  const [cat, setCat] = useState("");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryKind, setCategoryKind] = useState<"DESPESA" | "RECEITA">("DESPESA");
  const [catEdit, setCatEdit] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [pay, setPay] = useState("");
  const [payDesc, setPayDesc] = useState("");
  const [payKind, setPayKind] = useState("DEBITO");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payEdit, setPayEdit] = useState<string | null>(null);
  const [payName, setPayName] = useState("");
  const [payDescEdit, setPayDescEdit] = useState("");
  const [payKindEdit, setPayKindEdit] = useState("DEBITO");
  const [payAccountId, setPayAccountId] = useState("");
  const [payAccountIdEdit, setPayAccountIdEdit] = useState("");

  useEffect(() => {
    if (profile?.name) { setName(profile.name); return; }
    const metadataName = String(user?.user_metadata?.["full_name"] ?? user?.user_metadata?.["name"] ?? "");
    if (metadataName) setName(metadataName);
  }, [profile?.name, user?.id]);

  async function saveProfile() {
    const normalized = name.trim().toUpperCase();
    if (!user || !normalized) return toast.error("INFORME SEU NOME");
    try { const saved = await updateProfileName(normalized); setName(saved.name); await queryClient.invalidateQueries({ queryKey: ["profile", user.id] }); toast.success("NOME SALVO COM SUCESSO"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO ATUALIZAR"); }
  }
  async function addCategory(kind: "DESPESA" | "RECEITA") { const value = cat.trim().toUpperCase(); if (!value) return toast.error("INFORME A CATEGORIA"); if (categories.rows.some((item) => item.kind === kind && item.name.toUpperCase() === value)) return toast.error("ESSA CATEGORIA JÁ EXISTE"); try { await categories.insert({ name: value, kind }); setCat(""); toast.success(kind === "RECEITA" ? "CATEGORIA DE RECEITA ADICIONADA" : "CATEGORIA DE DESPESA ADICIONADA"); } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO ADICIONAR"); } }
  async function editCategory(id: string) { const value = catName.trim().toUpperCase(); if (!value) return; try { await categories.update(id, { name: value }); setCatEdit(null); toast.success("CATEGORIA ATUALIZADA"); } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO EDITAR"); } }
  async function deleteCategory(id: string) { if (!window.confirm("EXCLUIR ESTA CATEGORIA? LANÇAMENTOS ANTIGOS SERÃO PRESERVADOS.")) return; try { await categories.remove(id); toast.success("CATEGORIA EXCLUÍDA"); } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO EXCLUIR"); } }
  async function addPayment() { const value = pay.trim().toUpperCase(); if (!value) return toast.error("INFORME A FORMA DE PAGAMENTO"); if (payments.rows.some((item) => item.name.toUpperCase() === value)) return toast.error("ESSA FORMA JÁ EXISTE"); try { await payments.insert({ name: value, description: payDesc.trim().toUpperCase() || null, kind: payKind, account_id: payAccountId || null }); setPay(""); setPayDesc(""); setPayAccountId(""); toast.success("FORMA DE PAGAMENTO ADICIONADA"); } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO ADICIONAR"); } }
  async function editPayment(id: string) { const value = payName.trim().toUpperCase(); if (!value) return; try { await payments.update(id, { name: value, description: payDescEdit.trim().toUpperCase() || null, kind: payKindEdit, account_id: payAccountIdEdit || null }); setPayEdit(null); toast.success("FORMA DE PAGAMENTO ATUALIZADA"); } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO EDITAR"); } }
  async function deletePayment(id: string) { if (!window.confirm("EXCLUIR ESTA FORMA DE PAGAMENTO?")) return; try { await payments.remove(id); toast.success("FORMA DE PAGAMENTO EXCLUÍDA"); } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO EXCLUIR"); } }


  return <div className="space-y-5">
    <PageHeader title="AJUSTES" subtitle="PERFIL, CATEGORIAS, FORMAS DE PAGAMENTO, CONTAS E CARTÕES." />
    <Panel title="PERFIL"><div className="space-y-3"><label className="block text-[10px] font-semibold tracking-[0.08em] text-muted-foreground">NOME DE USUÁRIO</label><input type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="NOME DE USUÁRIO" className="w-full rounded-xl border p-3"/><input value={user?.email ?? ""} readOnly className="w-full rounded-xl border bg-secondary/40 p-3"/><button onClick={() => void saveProfile()} className="gradient-primary w-full rounded-xl p-3 text-[11px] font-semibold text-primary-foreground">SALVAR PERFIL</button></div></Panel>
    <Panel title="CATEGORIAS DE DESPESAS"><div className="space-y-3"><button type="button" onClick={() => { setCat(""); setCatEdit(null); setCategoryKind("DESPESA"); setCategoryModalOpen(true); }} className="gradient-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[11px] font-bold text-primary-foreground"><Plus className="h-4 w-4"/>ADICIONAR CATEGORIA DE DESPESA</button>{categories.rows.filter((item) => item.kind === "DESPESA").length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">NENHUMA CATEGORIA DE DESPESA CADASTRADA.</p> : categories.rows.filter((item) => item.kind === "DESPESA").map((item) => <div key={item.id} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs">{item.name}</span><span className="flex gap-2"><button onClick={() => { setCatEdit(item.id); setCatName(item.name); setCategoryKind("DESPESA"); setCategoryModalOpen(true); }} className="text-[10px] text-primary">EDITAR</button><button onClick={() => void deleteCategory(item.id)} className="text-[10px] text-danger">EXCLUIR</button></span></div></div>)}</div></Panel>
    <Panel title="CATEGORIAS DE RECEITAS"><div className="space-y-3"><button type="button" onClick={() => { setCat(""); setCatEdit(null); setCategoryKind("RECEITA"); setCategoryModalOpen(true); }} className="gradient-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[11px] font-bold text-primary-foreground"><Plus className="h-4 w-4"/>ADICIONAR CATEGORIA DE RECEITA</button>{categories.rows.filter((item) => item.kind === "RECEITA").length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">NENHUMA CATEGORIA DE RECEITA CADASTRADA.</p> : categories.rows.filter((item) => item.kind === "RECEITA").map((item) => <div key={item.id} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs">{item.name}</span><span className="flex gap-2"><button onClick={() => { setCatEdit(item.id); setCatName(item.name); setCategoryKind("RECEITA"); setCategoryModalOpen(true); }} className="text-[10px] text-primary">EDITAR</button><button onClick={() => void deleteCategory(item.id)} className="text-[10px] text-danger">EXCLUIR</button></span></div></div>)}</div></Panel>
    {categoryModalOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={catEdit ? "Editar categoria" : "Adicionar categoria"} onMouseDown={(event) => { if (event.target === event.currentTarget) { setCategoryModalOpen(false); setCatEdit(null); } }}><div className="w-full rounded-t-3xl bg-background p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-bold">{catEdit ? "EDITAR CATEGORIA" : "NOVA CATEGORIA"}</p><p className="mt-1 text-[10px] text-muted-foreground">ORGANIZE SEUS LANÇAMENTOS DE FORMA PRÁTICA.</p></div><button type="button" onClick={() => { setCategoryModalOpen(false); setCatEdit(null); }} className="rounded-full p-2 hover:bg-secondary" aria-label="Fechar"><X className="h-5 w-5"/></button></div><div className="space-y-3"><input autoFocus value={catEdit ? catName : cat} onChange={(event) => catEdit ? setCatName(event.target.value) : setCat(event.target.value)} placeholder={categoryKind === "RECEITA" ? "NOME DA CATEGORIA DE RECEITA" : "NOME DA CATEGORIA DE DESPESA"} className="w-full rounded-xl border p-3"/><div className="grid grid-cols-2 gap-2 pt-2"><button type="button" onClick={() => { setCategoryModalOpen(false); setCatEdit(null); }} className="rounded-xl border px-4 py-3 text-[10px] font-semibold">CANCELAR</button><button type="button" onClick={async () => { if (catEdit) { await editCategory(catEdit); } else { await addCategory(categoryKind); } setCategoryModalOpen(false); setCatEdit(null); }} className="gradient-primary rounded-xl px-4 py-3 text-[10px] font-bold text-primary-foreground">{catEdit ? "SALVAR" : "CADASTRAR"}</button></div></div></div></div>}
    <Panel title="FORMAS DE PAGAMENTO"><div className="space-y-3"><button type="button" onClick={() => { setPay(""); setPayDesc(""); setPayKind("DEBITO"); setPayAccountId(""); setPayEdit(null); setPaymentModalOpen(true); }} className="gradient-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[11px] font-bold text-primary-foreground"><Plus className="h-4 w-4"/>ADICIONAR FORMA DE PAGAMENTO</button>{payments.rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">NENHUMA FORMA CADASTRADA.</p> : payments.rows.map((item) => <div key={item.id} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-2">{payEdit === item.id ? <div className="grid w-full gap-2 sm:grid-cols-2"><input value={payName} onChange={(event) => setPayName(event.target.value)} className="rounded-lg border p-2"/><input value={payDescEdit} onChange={(event) => setPayDescEdit(event.target.value)} className="rounded-lg border p-2"/><select value={payKindEdit} onChange={(event) => setPayKindEdit(event.target.value)} className="rounded-lg border bg-background p-2">{PAYMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select><select value={payAccountIdEdit} onChange={(event) => setPayAccountIdEdit(event.target.value)} className="rounded-lg border bg-background p-2 sm:col-span-2"><option value="">SEM CONTA VINCULADA</option>{accounts.rows.map((a) => <option key={a.id} value={a.id}>{a.name}{a.institution ? ` — ${a.institution}` : ""}</option>)}</select><button onClick={() => void editPayment(item.id)} className="text-left text-[10px] text-primary">SALVAR</button></div> : <><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold">{item.name}</p><span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold">{paymentKindLabel(item.kind)}</span>{item.card_id && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">CARTÃO</span>}{item.account_id && <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold">{accounts.rows.find((a) => a.id === item.account_id)?.name ?? "CONTA"}</span>}</div>{item.description && <p className="text-[10px] text-muted-foreground">{item.description}</p>}</div><span className="flex gap-2"><button onClick={() => { setPayEdit(item.id); setPayName(item.name); setPayDescEdit(item.description ?? ""); setPayKindEdit(item.kind ?? "DEBITO"); setPayAccountIdEdit(item.account_id ?? ""); }} className="text-[10px] text-primary">EDITAR</button><button onClick={() => void deletePayment(item.id)} className="text-[10px] text-danger">EXCLUIR</button></span></>}</div></div>)}</div></Panel>
    {paymentModalOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Adicionar forma de pagamento" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaymentModalOpen(false); }}><div className="w-full rounded-t-3xl bg-background p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-bold">NOVA FORMA DE PAGAMENTO</p><p className="mt-1 text-[10px] text-muted-foreground">CADASTRE E IDENTIFIQUE COMO CRÉDITO OU DÉBITO.</p></div><button type="button" onClick={() => setPaymentModalOpen(false)} className="rounded-full p-2 hover:bg-secondary" aria-label="Fechar"><X className="h-5 w-5"/></button></div><div className="space-y-3"><input autoFocus value={pay} onChange={(event) => setPay(event.target.value)} placeholder="NOME DA FORMA DE PAGAMENTO" className="w-full rounded-xl border p-3"/><input value={payDesc} onChange={(event) => setPayDesc(event.target.value)} placeholder="DESCRIÇÃO (OPCIONAL)" className="w-full rounded-xl border p-3"/><select value={payKind} onChange={(event) => setPayKind(event.target.value)} className="w-full rounded-xl border bg-background p-3">{PAYMENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select><select value={payAccountId} onChange={(event) => setPayAccountId(event.target.value)} className="w-full rounded-xl border bg-background p-3"><option value="">SEM CONTA VINCULADA (OPCIONAL)</option>{accounts.rows.map((a) => <option key={a.id} value={a.id}>{a.name}{a.institution ? ` — ${a.institution}` : ""}</option>)}</select><div className="grid grid-cols-2 gap-2 pt-2"><button type="button" onClick={() => setPaymentModalOpen(false)} className="rounded-xl border px-4 py-3 text-[10px] font-semibold">CANCELAR</button><button type="button" onClick={async () => { await addPayment(); setPaymentModalOpen(false); }} className="gradient-primary rounded-xl px-4 py-3 text-[10px] font-bold text-primary-foreground">CADASTRAR</button></div></div></div></div>}

  </div>;
}