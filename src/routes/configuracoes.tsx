import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, Tag } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useHouseholdMembers } from "@/hooks/use-household-members";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "CONFIGURAÇÕES — MULTICAP" }, { name: "description", content: "Perfil, membros, cartões, categorias, formas de pagamento e gestão de dados." }] }),
  component: SettingsPage,
});

const CATEGORIES = ["MORADIA", "ALIMENTAÇÃO", "TRANSPORTE", "LAZER", "SAÚDE", "IMPOSTOS", "RENDA"];
const PAYMENT_TYPES = [
  { value: "PIX", label: "PIX", description: "Pagamento instantâneo" },
  { value: "DEBITO", label: "DÉBITO", description: "Conta corrente" },
  { value: "CREDITO", label: "CRÉDITO", description: "Cartão de crédito" },
  { value: "ALIMENTACAO", label: "REFEIÇÃO / ALIMENTAÇÃO", description: "Vale-refeição ou alimentação" },
  { value: "DINHEIRO", label: "DINHEIRO", description: "Pagamento em espécie" },
  { value: "BOLETO", label: "BOLETO", description: "Cobrança bancária" },
  { value: "TRANSFERENCIA", label: "TRANSFERÊNCIA", description: "Transferência bancária" },
];

type CardRow = { id: string; name: string; brand: string | null; last4: string | null; credit_limit: number; close_day: number; due_day: number; household_id: string };

function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { data: members = [], isLoading: membersLoading } = useHouseholdMembers();
  const cards = useHouseholdTable<CardRow>("cards", "*", "created_at");
  const [name, setName] = useState(profile?.name ?? user?.user_metadata?.full_name ?? "");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [dangerAction, setDangerAction] = useState<string | null>(null);
  const [cardName, setCardName] = useState("");
  const [cardBrand, setCardBrand] = useState("");
  const [last4, setLast4] = useState("");
  const [limit, setLimit] = useState("");
  const [closeDay, setCloseDay] = useState("28");
  const [dueDay, setDueDay] = useState("5");
  const [showCardForm, setShowCardForm] = useState(false);

  async function saveProfile() {
    if (!user || !name.trim()) return toast.error("INFORME SEU NOME");
    setSaving(true);
    try { const { error } = await supabase.from("profiles").update({ name: name.trim() }).eq("id", user.id); if (error) throw error; await refreshProfile(); toast.success("PERFIL ATUALIZADO"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o perfil"); }
    finally { setSaving(false); }
  }

  async function addCard() {
    if (!cardName.trim()) return toast.error("INFORME O NOME DO CARTÃO");
    if (last4 && !/^\d{4}$/.test(last4)) return toast.error("OS ÚLTIMOS 4 DÍGITOS DEVEM TER 4 NÚMEROS");
    try {
      await cards.insert({ name: cardName.trim(), brand: cardBrand.trim() || null, last4: last4 || null, credit_limit: Number(limit.replace(",", ".")) || 0, close_day: Number(closeDay), due_day: Number(dueDay) });
      setCardName(""); setCardBrand(""); setLast4(""); setLimit(""); setCloseDay("28"); setDueDay("5"); setShowCardForm(false); toast.success("CARTÃO CADASTRADO");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível cadastrar o cartão"); }
  }

  async function runDangerAction(action: string) {
    if (confirm !== "EXCLUIR" || dangerAction) return;
    const actionMap: Record<string, string> = { "LIMPAR LANÇAMENTOS": "clear_transactions", "EXCLUIR TODOS OS DADOS": "delete_all_data", "RESTAURAR FÁBRICA": "factory_reset" };
    const backendAction = actionMap[action]; if (!backendAction) return toast.info("ENCERRAMENTO DA CONTA AINDA NÃO ESTÁ DISPONÍVEL NESTA ETAPA");
    setDangerAction(action);
    try { const { data, error } = await supabase.rpc("manage_household_data", { p_action: backendAction, p_confirmation: confirm }); if (error) throw error; const messages: Record<string,string> = { TRANSACTIONS_CLEARED: "LANÇAMENTOS EXCLUÍDOS COM SUCESSO", ALL_DATA_DELETED: "TODOS OS DADOS DA CASA FORAM EXCLUÍDOS", FACTORY_RESET: "DADOS EXCLUÍDOS E CONFIGURAÇÃO DE FÁBRICA RESTAURADA" }; toast.success(messages[data as string] ?? "AÇÃO CONCLUÍDA"); setConfirm(""); window.location.reload(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "NÃO FOI POSSÍVEL EXECUTAR A AÇÃO"); }
    finally { setDangerAction(null); }
  }

  return <div className="space-y-5">
    <PageHeader title="CONFIGURAÇÕES" subtitle="Perfil, membros, cartões e regras de pagamento da casa." />
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="PERFIL"><div className="space-y-3">
        <label className="block"><span className="label-caps text-[10px] text-muted-foreground">NOME</span><input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" /></label>
        <label className="block"><span className="label-caps text-[10px] text-muted-foreground">E-MAIL</span><input value={user?.email ?? ""} readOnly className="mt-1 w-full rounded-xl border border-input bg-secondary/40 px-3 py-2.5 text-sm text-muted-foreground outline-none" /></label>
        <label className="block"><span className="label-caps text-[10px] text-muted-foreground">MOEDA</span><input value="BRL — Real" readOnly className="mt-1 w-full rounded-xl border border-input bg-secondary/40 px-3 py-2.5 text-sm text-muted-foreground outline-none" /></label>
        <button type="button" disabled={saving} onClick={()=>void saveProfile()} className="gradient-primary label-caps w-full rounded-xl px-4 py-2.5 text-[11px] text-primary-foreground disabled:opacity-60">{saving ? "SALVANDO..." : "SALVAR PERFIL"}</button>
      </div></Panel>

      <Panel title="MEMBROS DA CASA"><div className="space-y-3">{membersLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Carregando membros...</p> : members.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhum membro cadastrado.</p> : members.map(m=><div key={m.id} className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-primary-foreground" style={{background:m.color}}>{m.initials ?? m.name.slice(0,2).toUpperCase()}</span><div><p className="label-caps text-[11px]">{m.name}</p><p className="text-[10px] text-muted-foreground">Membro da casa</p></div></div><Tag tone="primary">ATIVO</Tag></div>)}</div></Panel>

      <Panel title="CARTÕES"><div className="space-y-3">
        <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">Cadastre seus cartões para que lançamentos em CRÉDITO sejam vinculados ao cartão correto.</p><button type="button" onClick={()=>setShowCardForm(v=>!v)} className="gradient-primary label-caps shrink-0 rounded-xl px-3 py-2 text-[10px] text-primary-foreground">{showCardForm ? "FECHAR" : "+ ADICIONAR"}</button></div>
        {showCardForm && <div className="rounded-xl border border-border bg-secondary/20 p-3"><div className="grid gap-2 sm:grid-cols-2">
          <input placeholder="Nome do cartão*" value={cardName} onChange={e=>setCardName(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          <input placeholder="Bandeira (Visa, Mastercard...)" value={cardBrand} onChange={e=>setCardBrand(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          <input inputMode="numeric" maxLength={4} placeholder="Últimos 4 dígitos" value={last4} onChange={e=>setLast4(e.target.value.replace(/\D/g,""))} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          <input inputMode="decimal" placeholder="Limite (R$)" value={limit} onChange={e=>setLimit(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          <input type="number" min="1" max="31" placeholder="Dia de fechamento" value={closeDay} onChange={e=>setCloseDay(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          <input type="number" min="1" max="31" placeholder="Dia de vencimento" value={dueDay} onChange={e=>setDueDay(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
        </div><button type="button" onClick={()=>void addCard()} className="mt-2 gradient-primary label-caps w-full rounded-xl px-4 py-2.5 text-[10px] text-primary-foreground">SALVAR CARTÃO</button></div>}
        {cards.isLoading ? <p className="py-4 text-center text-xs text-muted-foreground">Carregando cartões...</p> : cards.rows.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">Nenhum cartão cadastrado.</p> : cards.rows.map(c=><div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-3"><div><p className="label-caps text-[11px]">{c.name}{c.last4 ? ` •••• ${c.last4}` : ""}</p><p className="text-[10px] text-muted-foreground">{c.brand || "Sem bandeira"} · Fecha dia {c.close_day} · Vence dia {c.due_day}</p></div><button type="button" onClick={()=>void cards.remove(c.id).then(()=>toast.success("CARTÃO EXCLUÍDO")).catch(e=>toast.error(e instanceof Error?e.message:"Erro ao excluir"))} className="label-caps text-[10px] text-danger">EXCLUIR</button></div>)}
      </div></Panel>

      <Panel title="GERENCIADOR GLOBAL"><p className="label-caps mb-2 text-[10px] text-muted-foreground">CATEGORIAS</p><div className="flex flex-wrap gap-2">{CATEGORIES.map(c=><span key={c} className="label-caps rounded-lg border border-primary/50 bg-background px-3 py-1.5 text-[10px]">{c}</span>)}</div><p className="label-caps mb-2 mt-4 text-[10px] text-muted-foreground">FORMAS DE PAGAMENTO</p><div className="space-y-2">{PAYMENT_TYPES.map(p=><div key={p.value} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5"><div><p className="label-caps text-[10px]">{p.label}</p><p className="text-[10px] text-muted-foreground">{p.description}</p></div><Tag tone={p.value === "CREDITO" || p.value === "ALIMENTACAO" ? "primary" : "neutral"}>{p.value}</Tag></div>)}</div></Panel>

      <Panel title="BACKUP E EXPORTAÇÃO"><p className="text-xs text-muted-foreground">As exportações serão ligadas aos dados reais da casa na próxima etapa.</p><div className="mt-4 grid grid-cols-2 gap-2">{["EXCEL","CSV","JSON","PDF"].map(f=><button key={f} type="button" onClick={()=>toast.info(`EXPORTAÇÃO ${f} SERÁ CONECTADA AO BACKEND`)} className="label-caps rounded-xl border border-border px-3 py-2.5 text-[10px] transition-colors hover:border-primary hover:text-primary">EXPORTAR {f}</button>)}</div></Panel>
    </div>
    <Panel title="ZONA DE PERIGO" className="border-danger/50"><p className="text-xs text-muted-foreground">Estas ações são irreversíveis. Digite <strong className="text-danger">EXCLUIR</strong> para liberar.</p><input value={confirm} onChange={e=>setConfirm(e.target.value.toUpperCase())} placeholder="Digite EXCLUIR" className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-danger md:w-64" /><div className="mt-3 flex flex-wrap gap-2">{["LIMPAR LANÇAMENTOS","EXCLUIR TODOS OS DADOS","RESTAURAR FÁBRICA","ENCERRAR CONTA"].map(action=><button key={action} type="button" disabled={confirm!=="EXCLUIR"||dangerAction!==null} onClick={()=>void runDangerAction(action)} className={cn("label-caps rounded-xl border px-3 py-2 text-[10px] transition-colors",confirm==="EXCLUIR"?"border-danger text-danger hover:bg-danger/10":"border-border text-muted-foreground opacity-50")}>{dangerAction===action?"PROCESSANDO...":action}</button>)}</div></Panel>
  </div>;
}
