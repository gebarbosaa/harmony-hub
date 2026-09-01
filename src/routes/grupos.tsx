import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Crown, LogIn, Pencil, Plus, Shield, Trash2, Users, UserRound, Eye, CheckCircle2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/grupos")({
  head: () => ({ meta: [{ title: "GRUPOS — HARMONY HUB" }, { name: "description", content: "Gerencie seus grupos e permissões." }] }),
  component: GroupsPage,
});

type Role = "OWNER" | "ADMIN" | "EDITOR" | "MEMBER" | "VIEWER";
type Group = { household_id: string; role: Role; status: string; name: string; invite_code: string };
type Member = { id: string; name: string; initials: string | null; color: string; role: Role; status: string };
const db = supabase as any;
const roleLabels: Record<Role, string> = { OWNER: "PROPRIETÁRIO", ADMIN: "ADMINISTRADOR", EDITOR: "EDITOR", MEMBER: "MEMBRO", VIEWER: "VISUALIZADOR" };
const roleIcons: Record<Role, typeof Crown> = { OWNER: Crown, ADMIN: Shield, EDITOR: Pencil, MEMBER: UserRound, VIEWER: Eye };
const buttonClass = "inline-flex h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-semibold tracking-wide transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50";
const primaryButtonClass = "inline-flex h-10 items-center justify-center rounded-xl border border-primary bg-primary px-4 text-xs font-semibold tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const dangerButtonClass = "inline-flex h-10 items-center justify-center rounded-xl border border-danger/50 bg-danger/5 px-4 text-xs font-semibold tracking-wide text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50";
const inputClass = "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary";

function GroupsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const [groupName, setGroupName] = useState("");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [createdCode, setCreatedCode] = useState("");

  const groupsQuery = useQuery({
    queryKey: ["my-groups", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await db.from("group_members").select("household_id,role,status,households(name,invite_code)").eq("user_id", user.id).eq("status", "ACTIVE").order("joined_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ household_id: r.household_id, role: r.role, status: r.status, name: r.households?.name ?? "GRUPO", invite_code: r.households?.invite_code ?? "" })) as Group[];
    },
  });

  const activeGroupId = profile?.household_id ?? null;
  const activeGroup = groupsQuery.data?.find((g) => g.household_id === activeGroupId) ?? groupsQuery.data?.[0] ?? null;
  const canManage = activeGroup?.role === "OWNER" || activeGroup?.role === "ADMIN";
  const canDelete = activeGroup?.role === "OWNER";

  const membersQuery = useQuery({
    queryKey: ["group-members", activeGroupId],
    enabled: Boolean(activeGroupId),
    queryFn: async () => {
      const { data, error } = await db.from("group_members").select("user_id,role,status,profiles(id,name,initials,color)").eq("household_id", activeGroupId).order("joined_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ id: r.user_id, name: r.profiles?.name ?? "USUÁRIO", initials: r.profiles?.initials ?? null, color: r.profiles?.color ?? "#3B9DFF", role: r.role, status: r.status })) as Member[];
    },
  });

  async function createGroup() {
    const name = groupName.trim();
    if (!name) { setMessage("Informe o nome do grupo."); return; }
    if (!user) { setMessage("Usuário não autenticado."); return; }
    setBusy(true); setMessage(""); setCreatedCode("");
    const { data, error } = await db.rpc("create_household", { household_name: name, my_name: profile?.name ?? "USUÁRIO" });
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    // O RPC já devolve o identificador e o código. Não dependemos de um SELECT posterior sujeito a RLS.
    const result = Array.isArray(data) ? data[0] : data;
    const code = String(result?.invite_code ?? result?.v_code ?? result?.code ?? "").trim().toUpperCase();
    setGroupName("");
    setMode(null);
    if (code) {
      setCreatedCode(code);
      setMessage("Grupo criado com sucesso. Este é o código para convidar pessoas.");
    } else {
      // Compatibilidade com versões antigas da função: tenta localizar o grupo recém-criado somente como fallback.
      const householdId = result?.household_id ?? result?.id ?? null;
      if (householdId) {
        const { data: household } = await db.from("households").select("invite_code").eq("id", householdId).maybeSingle();
        const fallbackCode = String(household?.invite_code ?? "").trim().toUpperCase();
        if (fallbackCode) setCreatedCode(fallbackCode);
      }
      setMessage("Grupo criado com sucesso.");
    }
    await refreshProfile();
    await queryClient.invalidateQueries({ queryKey: ["my-groups", user.id] });
    await queryClient.invalidateQueries({ queryKey: ["group-members"] });
    setBusy(false);
  }

  async function joinGroup() {
    const code = invite.trim().toUpperCase();
    if (!code) { setMessage("Informe o código do convite."); return; }
    if (!user) { setMessage("Usuário não autenticado."); return; }
    setBusy(true); setMessage("");
    const { error } = await db.rpc("join_household", { invite: code, my_name: profile?.name ?? "USUÁRIO" });
    if (error) setMessage(error.message);
    else {
      setInvite(""); setMode(null); setMessage("Você entrou no grupo.");
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ["my-groups", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["group-members"] });
    }
    setBusy(false);
  }

  async function switchGroup(groupId: string) {
    if (!user || groupId === profile?.household_id) return;
    const target = groupsQuery.data?.find((g) => g.household_id === groupId);
    if (!target || target.status !== "ACTIVE") { setMessage("Você não tem acesso a este grupo."); return; }
    setBusy(true); setMessage("");
    const { error } = await db.rpc("switch_household", { target_household_id: groupId });
    if (error) setMessage(error.message);
    else { await refreshProfile(); await queryClient.invalidateQueries(); setMessage("Grupo ativo alterado."); }
    setBusy(false);
  }

  async function deleteGroup() {
    if (!canDelete || !activeGroupId || !activeGroup) return;
    if (!window.confirm(`Excluir o grupo “${activeGroup.name}”? Esta ação apagará os dados financeiros e os membros deste grupo e não pode ser desfeita.`)) return;
    setBusy(true); setMessage("");
    const { error } = await db.rpc("delete_household", { p_household_id: activeGroupId });
    if (error) setMessage(error.message);
    else { setCreatedCode(""); await refreshProfile(); await queryClient.invalidateQueries(); setMessage("Grupo excluído com sucesso."); }
    setBusy(false);
  }

  async function changeRole(member: Member, role: Role) {
    if (!canManage || role === "OWNER" || member.role === "OWNER" || !activeGroupId) return;
    setBusy(true); setMessage("");
    const { error } = await db.from("group_members").update({ role, updated_at: new Date().toISOString() }).eq("household_id", activeGroupId).eq("user_id", member.id);
    if (error) setMessage(error.message); else await membersQuery.refetch();
    setBusy(false);
  }

  async function removeMember(member: Member) {
    if (!canManage || !activeGroupId || member.id === user?.id || member.role === "OWNER") return;
    if (!window.confirm(`Remover ${member.name} do grupo?`)) return;
    setBusy(true); setMessage("");
    const { error } = await db.from("group_members").delete().eq("household_id", activeGroupId).eq("user_id", member.id);
    if (error) setMessage(error.message); else await membersQuery.refetch();
    setBusy(false);
  }

  async function copyCode(code?: string) {
    const value = code || activeGroup?.invite_code || createdCode;
    if (!value) return;
    await navigator.clipboard?.writeText(value);
    setMessage("Código copiado.");
  }

  return <div className="space-y-5">
    <PageHeader title="GRUPOS" subtitle="GERENCIE SEUS GRUPOS E QUEM PODE ACESSAR OS DADOS FINANCEIROS." />
    <div className="grid gap-4 md:grid-cols-2">
      <Panel>
        <div className="flex items-center justify-between gap-3"><div><p className="label-caps text-xs">MEUS GRUPOS</p><p className="mt-1 text-xs text-muted-foreground">{groupsQuery.data?.length ?? 0} grupo(s) disponível(is)</p></div><Users className="h-5 w-5 text-primary" /></div>
        <div className="mt-4 space-y-2">{groupsQuery.data?.map((g) => <button key={g.household_id} type="button" disabled={busy} onClick={() => void switchGroup(g.household_id)} className={`w-full rounded-xl border p-3 text-left transition-colors ${g.household_id === activeGroupId ? "border-primary bg-primary/5" : "border-border bg-secondary/20 hover:border-primary/50"}`}><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{g.name}</p><p className="label-caps mt-1 text-[10px] text-muted-foreground">{roleLabels[g.role]}</p></div>{g.household_id === activeGroupId && <span className="label-caps rounded-full bg-primary/10 px-2 py-1 text-[9px] text-primary">ATIVO</span>}</div></button>)}{!groupsQuery.data?.length && <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Nenhum grupo encontrado.</p>}</div>
        <div className="mt-4 grid grid-cols-2 gap-2"><button className={primaryButtonClass} onClick={() => { setMessage(""); setCreatedCode(""); setMode("create"); }}><Plus className="mr-2 h-4 w-4" />CRIAR GRUPO</button><button className={buttonClass} onClick={() => { setMessage(""); setMode("join"); }}><LogIn className="mr-2 h-4 w-4" />ENTRAR</button></div>
      </Panel>
      <Panel>
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users className="h-5 w-5" /></div><div><p className="label-caps text-xs">GRUPO ATIVO</p><p className="text-lg font-semibold">{activeGroup?.name ?? "Nenhum grupo"}</p></div></div>
        {activeGroup?.invite_code && <div className="mt-5 rounded-xl border border-border bg-secondary/20 p-4"><p className="label-caps text-[10px] text-muted-foreground">CÓDIGO DE CONVITE</p><div className="mt-2 flex items-center gap-2"><code className="flex-1 rounded-lg bg-background px-3 py-2 text-lg font-semibold tracking-[0.2em]">{activeGroup.invite_code}</code><button className={buttonClass} onClick={() => void copyCode()} aria-label="Copiar código"><Copy className="h-4 w-4" /></button></div><p className="mt-2 text-xs text-muted-foreground">Compartilhe este código para adicionar pessoas ao grupo.</p></div>}
        {createdCode && <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4"><div className="flex items-center gap-2 text-primary"><CheckCircle2 className="h-5 w-5" /><p className="font-semibold">GRUPO CRIADO!</p></div><p className="mt-2 text-xs text-muted-foreground">Use este código para convidar pessoas:</p><div className="mt-2 flex items-center gap-2"><code className="flex-1 rounded-lg bg-background px-3 py-2 text-lg font-bold tracking-[0.2em]">{createdCode}</code><button className={primaryButtonClass} onClick={() => void copyCode(createdCode)}><Copy className="mr-2 h-4 w-4" />COPIAR</button></div></div>}
        {canDelete && activeGroup && <div className="mt-5 border-t border-border pt-4"><button className={`${dangerButtonClass} w-full`} disabled={busy} onClick={() => void deleteGroup()}><Trash2 className="mr-2 h-4 w-4" />{busy ? "EXCLUINDO GRUPO..." : "EXCLUIR GRUPO"}</button><p className="mt-2 text-center text-[10px] text-muted-foreground">Somente o proprietário pode excluir o grupo.</p></div>}
      </Panel>
    </div>
    {mode && <Panel><div className="flex items-center justify-between"><p className="label-caps text-xs">{mode === "create" ? "CRIAR NOVO GRUPO" : "ENTRAR EM UM GRUPO"}</p><button className="text-xs text-muted-foreground" onClick={() => setMode(null)}>FECHAR</button></div><div className="mt-4 flex flex-col gap-3 sm:flex-row">{mode === "create" ? <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Nome do grupo" className={inputClass} /> : <input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="Código de convite" className={`${inputClass} uppercase`} />}<button className={primaryButtonClass} disabled={busy} onClick={() => void (mode === "create" ? createGroup() : joinGroup())}>{busy ? "AGUARDE..." : mode === "create" ? "CRIAR" : "ENTRAR"}</button></div>{message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}</Panel>}
    <Panel><div className="flex items-center justify-between"><div><p className="label-caps text-xs">MEMBROS</p><p className="mt-1 text-xs text-muted-foreground">Permissões do grupo ativo</p></div><span className="rounded-full bg-secondary px-2 py-1 text-xs">{membersQuery.data?.length ?? 0}</span></div><div className="mt-4 space-y-2">{membersQuery.data?.map((m) => { const Icon = roleIcons[m.role]; return <div key={m.id} className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: `${m.color}22`, color: m.color }}>{m.initials ?? m.name.slice(0, 2).toUpperCase()}</div><div><p className="font-medium">{m.name}</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><Icon className="h-3 w-3" />{roleLabels[m.role]}</p></div></div>{canManage && m.role !== "OWNER" && m.id !== user?.id && <div className="flex items-center gap-2"><select value={m.role} disabled={busy} onChange={(e) => void changeRole(m, e.target.value as Role)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs"><option value="ADMIN">ADMINISTRADOR</option><option value="EDITOR">EDITOR</option><option value="MEMBER">MEMBRO</option><option value="VIEWER">VISUALIZADOR</option></select><button className={buttonClass} disabled={busy} onClick={() => void removeMember(m)} aria-label={`Remover ${m.name}`}><Trash2 className="h-4 w-4" /></button></div>}</div>; })}{!membersQuery.data?.length && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum membro para exibir.</p>}</div></Panel>
    {message && !mode && !createdCode && <p className="text-sm text-muted-foreground">{message}</p>}
  </div>;
}
