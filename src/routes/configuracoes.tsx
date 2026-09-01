import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Trash2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui-kit";
import { useAuth } from "@/hooks/use-auth";
import { useHouseholdTable } from "@/hooks/use-household-data";

type Card = { id: string; name: string; brand: string | null; last4: string | null; credit_limit: number; close_day: number; due_day: number; household_id: string };
type Category = { id: string; name: string; kind: string; household_id: string };
type Payment = { id: string; name: string; description: string | null; household_id: string };

export const Route = createFileRoute("/configuracoes")({ head: () => ({ meta: [{ title: "AJUSTES — HARMONY HUB" }] }), component: SettingsPage });

function SettingsPage() {
  const { user, profile, updateProfileName } = useAuth();
  const queryClient = useQueryClient();
  const cards = useHouseholdTable<Card>("cards", "id,name,brand,last4,credit_limit,close_day,due_day,household_id");
  const categories = useHouseholdTable<Category>("categories", "id,name,kind,household_id", "name");
  const payments = useHouseholdTable<Payment>("household_payment_methods", "id,name,description,household_id", "name");
  const [name, setName] = useState("");
  const [cat, setCat] = useState("");
  const [catEdit, setCatEdit] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [pay, setPay] = useState("");
  const [payDesc, setPayDesc] = useState("");
  const [payEdit, setPayEdit] = useState<string | null>(null);
  const [payName, setPayName] = useState("");
  const [payDescEdit, setPayDescEdit] = useState("");
  const [cardName, setCardName] = useState("");
  const [brand, setBrand] = useState("");
  const [last4, setLast4] = useState("");
  const [limit, setLimit] = useState("");
  const [close, setClose] = useState("28");
  const [due, setDue] = useState("5");
  const [cardEdit, setCardEdit] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.name) { setName(profile.name); return; }
    const metadataName = String(user?.user_metadata?.["full_name"] ?? user?.user_metadata?.["name"] ?? "");
    if (metadataName && !name) setName(metadataName);
  }, [profile?.name, user?.user_metadata, name]);

  async function saveProfile() {
    const normalized = name.trim().toUpperCase();
    if (!user || !normalized) return toast.error("INFORME SEU NOME");
    try { const saved = await updateProfileName(normalized); setName(saved.name); await queryClient.invalidateQueries({ queryKey: ["profile", user.id] }); toast.success("NOME SALVO COM SUCESSO"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO ATUALIZAR"); }
  }

  async function addCategory() {
    const value = cat.trim().toUpperCase();
    if (!value) return toast.error("INFORME A CATEGORIA");
    if (categories.rows.some((item) => item.name.toUpperCase() === value)) return toast.error("ESSA CATEGORIA JÁ EXISTE");
    try { await categories.insert({ name: value, kind: "DESPESA" }); setCat(""); toast.success("CATEGORIA ADICIONADA"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO ADICIONAR"); }
  }
  async function editCategory(id: string) {
    const value = catName.trim().toUpperCase(); if (!value) return;
    try { await categories.update(id, { name: value }); setCatEdit(null); toast.success("CATEGORIA ATUALIZADA"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO EDITAR"); }
  }
  async function deleteCategory(id: string) {
    if (!window.confirm("EXCLUIR ESTA CATEGORIA? LANÇAMENTOS ANTIGOS SERÃO PRESERVADOS.")) return;
    try { await categories.remove(id); toast.success("CATEGORIA EXCLUÍDA"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO EXCLUIR"); }
  }
  async function addPayment() {
    const value = pay.trim().toUpperCase();
    if (!value) return toast.error("INFORME A FORMA DE PAGAMENTO");
    if (payments.rows.some((item) => item.name.toUpperCase() === value)) return toast.error("ESSA FORMA JÁ EXISTE");
    try { await payments.insert({ name: value, description: payDesc.trim().toUpperCase() || null }); setPay(""); setPayDesc(""); toast.success("FORMA DE PAGAMENTO ADICIONADA"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO ADICIONAR"); }
  }
  async function editPayment(id: string) {
    const value = payName.trim().toUpperCase(); if (!value) return;
    try { await payments.update(id, { name: value, description: payDescEdit.trim().toUpperCase() || null }); setPayEdit(null); toast.success("FORMA DE PAGAMENTO ATUALIZADA"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO EDITAR"); }
  }
  async function deletePayment(id: string) {
    if (!window.confirm("EXCLUIR ESTA FORMA DE PAGAMENTO?")) return;
    try { await payments.remove(id); toast.success("FORMA DE PAGAMENTO EXCLUÍDA"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO EXCLUIR"); }
  }
  function clearCardForm() { setCardEdit(null); setCardName(""); setBrand(""); setLast4(""); setLimit(""); setClose("28"); setDue("5"); }
  function startCardEdit(card: Card) { setCardEdit(card.id); setCardName(card.name); setBrand(card.brand ?? ""); setLast4(card.last4 ?? ""); setLimit(String(card.credit_limit ?? 0)); setClose(String(card.close_day ?? 28)); setDue(String(card.due_day ?? 5)); }
  async function saveCard() {
    const value = Number(limit.replace(",", "."));
    if (!cardName.trim() || value <= 0) return toast.error("PREENCHA O CARTÃO E O LIMITE");
    const payload = { name: cardName.trim().toUpperCase(), brand: brand.trim().toUpperCase() || null, last4: last4.trim() || null, credit_limit: value, close_day: Number(close), due_day: Number(due) };
    try { if (cardEdit) { await cards.update(cardEdit, payload); toast.success("CARTÃO ATUALIZADO"); } else { await cards.insert(payload); toast.success("CARTÃO CADASTRADO"); } clearCardForm(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO SALVAR CARTÃO"); }
  }
  async function deleteCard(id: string) {
    if (!window.confirm("EXCLUIR ESTE CARTÃO?")) return;
    try { await cards.remove(id); toast.success("CARTÃO EXCLUÍDO"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO EXCLUIR CARTÃO"); }
  }

  return <div className="space-y-5">
    <PageHeader title="AJUSTES" subtitle="PERFIL, CATEGORIAS, FORMAS DE PAGAMENTO E CARTÕES." />
    <Panel title="PERFIL"><div className="space-y-3"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="NOME" className="w-full rounded-xl border p-3"/><input value={user?.email ?? ""} readOnly className="w-full rounded-xl border bg-secondary/40 p-3"/><button onClick={() => void saveProfile()} className="gradient-primary w-full rounded-xl p-3 text-[11px] font-semibold text-primary-foreground">SALVAR PERFIL</button></div></Panel>
    <Panel title="CATEGORIAS"><div className="space-y-3"><div className="flex flex-col gap-2 sm:flex-row"><input value={cat} onChange={(event) => setCat(event.target.value)} placeholder="NOVA CATEGORIA" className="min-w-0 flex-1 rounded-xl border p-3"/><button onClick={() => void addCategory()} className="gradient-primary w-full shrink-0 rounded-xl px-4 py-3 text-[10px] sm:w-auto">ADICIONAR</button></div>{categories.rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">NENHUMA CATEGORIA CADASTRADA.</p> : categories.rows.map((item) => <div key={item.id} className="rounded-xl border p-3">{catEdit === item.id ? <div className="flex gap-2"><input value={catName} onChange={(event) => setCatName(event.target.value)} className="min-w-0 flex-1 rounded-lg border p-2"/><button onClick={() => void editCategory(item.id)} className="text-[10px] text-primary">SALVAR</button></div> : <div className="flex items-center justify-between gap-2"><span className="text-xs">{item.name}</span><span className="flex gap-2"><button onClick={() => { setCatEdit(item.id); setCatName(item.name); }} className="text-[10px] text-primary">EDITAR</button><button onClick={() => void deleteCategory(item.id)} className="text-[10px] text-danger">EXCLUIR</button></span></div>}</div>)}</div></Panel>
    <Panel title="FORMAS DE PAGAMENTO"><div className="space-y-3"><div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><input value={pay} onChange={(event) => setPay(event.target.value)} placeholder="NOVA FORMA" className="min-w-0 w-full rounded-xl border p-3"/><input value={payDesc} onChange={(event) => setPayDesc(event.target.value)} placeholder="DESCRIÇÃO" className="min-w-0 w-full rounded-xl border p-3"/><button onClick={() => void addPayment()} className="gradient-primary w-full min-w-0 shrink-0 rounded-xl px-4 py-3 text-[10px] sm:w-auto">ADICIONAR</button></div>{payments.rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">NENHUMA FORMA CADASTRADA.</p> : payments.rows.map((item) => <div key={item.id} className="rounded-xl border p-3">{payEdit === item.id ? <div className="grid gap-2 sm:grid-cols-2"><input value={payName} onChange={(event) => setPayName(event.target.value)} className="rounded-lg border p-2"/><input value={payDescEdit} onChange={(event) => setPayDescEdit(event.target.value)} className="rounded-lg border p-2"/><button onClick={() => void editPayment(item.id)} className="text-left text-[10px] text-primary">SALVAR</button></div> : <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-semibold">{item.name}</p>{item.description && <p className="text-[10px] text-muted-foreground">{item.description}</p>}</div><span className="flex gap-2"><button onClick={() => { setPayEdit(item.id); setPayName(item.name); setPayDescEdit(item.description ?? ""); }} className="text-[10px] text-primary">EDITAR</button><button onClick={() => void deletePayment(item.id)} className="text-[10px] text-danger">EXCLUIR</button></span></div>}</div>)}</div></Panel>
    <Panel title="CARTÕES"><div className="space-y-4"><div className="rounded-2xl border border-border bg-secondary/20 p-4"><div className="mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary"/><p className="label-caps text-[11px] font-bold">{cardEdit ? "EDITAR CARTÃO" : "NOVO CARTÃO"}</p></div><div className="grid gap-2 sm:grid-cols-2"><input value={cardName} onChange={(event) => setCardName(event.target.value)} placeholder="NOME DO CARTÃO" className="rounded-xl border p-3"/><input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="BANDEIRA" className="rounded-xl border p-3"/><input value={last4} onChange={(event) => setLast4(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="4 ÚLTIMOS DÍGITOS" inputMode="numeric" className="rounded-xl border p-3"/><input value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="LIMITE" inputMode="decimal" className="rounded-xl border p-3"/><input value={close} onChange={(event) => setClose(event.target.value)} placeholder="DIA DE FECHAMENTO" inputMode="numeric" className="rounded-xl border p-3"/><input value={due} onChange={(event) => setDue(event.target.value)} placeholder="DIA DE VENCIMENTO" inputMode="numeric" className="rounded-xl border p-3"/></div><div className="mt-3 flex gap-2"><button onClick={() => void saveCard()} className="gradient-primary rounded-xl px-4 py-3 text-[10px] font-bold">{cardEdit ? "SALVAR ALTERAÇÕES" : "CADASTRAR CARTÃO"}</button>{cardEdit && <button onClick={clearCardForm} className="rounded-xl border px-4 py-3 text-[10px]">CANCELAR</button>}</div></div>{cards.rows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">NENHUM CARTÃO CADASTRADO.</p> : <div className="grid gap-2 md:grid-cols-2">{cards.rows.map((card) => <div key={card.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{card.name}</p><p className="text-[10px] text-muted-foreground">{card.brand ?? "CARTÃO"}{card.last4 ? ` •••• ${card.last4}` : ""}</p></div><div className="flex gap-2"><button onClick={() => startCardEdit(card)} className="text-[10px] text-primary">EDITAR</button><button onClick={() => void deleteCard(card.id)} className="text-danger"><Trash2 className="h-3.5 w-3.5"/></button></div></div><div className="mt-3 grid grid-cols-3 gap-2 text-[10px]"><div><p className="text-muted-foreground">LIMITE</p><p className="font-semibold">R$ {Number(card.credit_limit ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div><div><p className="text-muted-foreground">FECHA</p><p className="font-semibold">DIA {card.close_day}</p></div><div><p className="text-muted-foreground">VENCE</p><p className="font-semibold">DIA {card.due_day}</p></div></div></div>)}</div>}</div></Panel>
  </div>;
}
