import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Crown, LogIn, Plus, Shield, Trash2, Users, UserRound, Eye, Pencil } from "lucide-react";
import { PageHeader, Panel, Button, Input } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/grupos")({
  head: () => ({ meta: [{ title: "GRUPOS — MULTICAP" }, { name: "description", content: "Gerencie seus grupos e permissões." }] }),
  component: GroupsPage,
});

type Role = "OWNER" | "ADMIN" | "EDITOR" | "MEMBER" | "VIEWER";
type Group = { household_id: string; role: Role; status: string; name: string; invite_code: string };
type Member = { id: string; name: string; initials: string | null; color: string; role: Role; status: string };

const roleLabels: Record<Role, string> = { OWNER: "PROPRIETÁRIO", ADMIN: "ADMINISTRADOR", EDITOR: "EDITOR", MEMBER: "MEMBRO", VIEWER: "VISUALIZADOR" };
const roleIcons: Record<Role, typeof Crown> = { OWNER: Crown, ADMIN: Shield, EDITOR: Pencil, MEMBER: UserRound, VIEWER: Eye };

const db = supabase as any;

function GroupsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const [groupName, setGroupName] = useState("");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const groupsQuery = useQuery({
    queryKey: ["my-groups", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await db
        .from("group_members")
        .select("household_id,role,status,households(name,invite_code)")
        .eq("user_id", user.id)
        .eq("status", "ACTIVE")
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({ household_id: row.household_id, role: row.role, status: row.status, name: row.households?.name ?? "GRUPO", invite_code: row.households?.invite_code ?? "" })) as Group[];
    },
  });

  const activeGroupId = profile?.household_id ?? null;
  const activeGroup = groupsQuery.data?.find((g) => g.household_id === activeGroupId) ?? groupsQuery.data?.[0] ?? null;
  const canManage = activeGroup?.role === "OWNER" || activeGroup?.role === "ADMIN";

  const membersQuery = useQuery({
    queryKey: ["group-members", activeGroupId],
    enabled: Boolean(activeGroupId),
    queryFn: async () => {
      const { data, error } = await db
        .from("group_members")
        .select("user_id,role,status,profiles(id,name,initials,color)")
        .eq("household_id", activeGroupId)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({ id: row.user_id, name: row.profiles?.name ?? "USUÁRIO", initials: row.profiles?.initials ?? null, color: row.profiles?.color ?? "#3B9DFF", role: row.role, status: row.status })) as Member[];
    },
  });

  async function createGroup() {
    if (!groupName.trim()) return setMessage("Informe o nome do grupo.");
    setBusy(true); setMessage("");
    const { data, error } = await db.rpc("create_household", { household_name: groupName.trim(), my_name: profile?.name ?? "USUÁRIO" });
    if (error) setMessage(error.message);
    else { setGroupName(""); setMode(null); setMessage("Grupo criado com sucesso."); await refreshProfile(); await queryClient.invalidateQueries({ queryKey: ["my-groups", user?.id] }); }
    setBusy(false);
  }

  async function joinGroup() {
    if (!invite.trim()) return setMessage("Informe o código do convite.");
    setBusy(true); setMessage("");
    const { error } = await db.rpc("join_household", { invite: invite.trim().toUpperCase(), my_name: profile?.name ?? "USUÁRIO" });
    if (error) setMessage(error.message);
    else { setInvite(""); setMode(null); setMessage("Você entrou no grupo."); await refreshProfile(); await queryClient.invalidateQueries({ queryKey: ["my-groups", user?.id] }); }
    setBusy(false);
  }

  async function switchGroup(groupId: string) {
    if (groupId === profile?.household_id || !user) return;
    setBusy(true); setMessage("");
    const { error } = await db.from("profiles").update({ household_id: groupId }).eq("id", user.id);
    if (error) setMessage(error.message); else { await refreshProfile(); await queryClient.invalidateQueries(); setMessage("Grupo ativo alterado."); }
    setBusy(false);
  }

  async function changeRole(member: Member, role: Role) {
    if (!canManage || role === "OWNER") return;
    setBusy(true); setMessage("");
    const { error } = await db.from("group_members").update({ role, updated_at: new Date().toISOString() }).eq("household_id", activeGroupId).eq("user_id", member.id);
    if (error) setMessage(error.message); else await membersQuery.refetch();
    setBusy(false);
  }

  async function removeMember(member: Member) {
    if (!canManage || member.id === user?.id || member.role === "OWNER") return;
    if (!window.confirm(`Remover ${member.name} do grupo?`)) return;
    setBusy(true); setMessage("");
    const { error } = await db.from("group_members").delete().eq("household_id", activeGroupId).eq("user_id", member.id);
    if (error) setMessage(error.message); else await membersQuery.refetch();
    setBusy(false);
  }

  async function copyCode() {
    if (!activeGroup?.invite_code) return;
    await navigator.clipboard?.writeText(activeGroup.invite_code);
    setMessage("Código copiado.");
  }

  return <div className="space-y-5">
    <PageHeader title="GRUPOS" subtitle="GERENCIE SEUS GRUPOS E QUEM PODE ACESSAR OS DADOS FINANCEIROS." />

    <div className="grid gap-4 md:grid-cols-2">
      <Panel>
        <div className="flex items-center justify-between gap-3">
          <div><p className="label-caps text-xs">MEUS GRUPOS</p><p className="mt-1 text-xs text-muted-foreground">{groupsQuery.data?.length ?? 0} grupo(s) disponível(is)</p></div>
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-4 space-y-2">
          {groupsQuery.data?.map((group) => <button key={group.household_id} type="button" disabled={busy} onClick={() => switchGroup(group.household_id)} className={`w-full rounded-xl border p-3 text-left transition-colors ${group.household_id === activeGroupId ? "border-primary bg-primary/5" : "border-border bg-secondary/20 hover:border-primary/50"}`}>
            <div className="flex items-center justify-between gap-3"><div><p className="font-medium">{group.name}</p><p className="label-caps mt-1 text-[10px] text-muted-foreground">{roleLabels[group.role]}</p></div>{group.household_id === activeGroupId && <span className="label-caps rounded-full bg-primary/10 px-2 py-1 text-[9px] text-primary">ATIVO</span>}</div>
          </button>)}
          {!groupsQuery.data?.length && <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Nenhum grupo encontrado.</p>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button onClick={() => setMode("create")}><Plus className="mr-2 h-4 w-4" />CRIAR GRUPO</Button><Button variant="outline" onClick={() => setMode("join")}><LogIn className="mr-2 h-4 w-4" />ENTRAR</Button></div>
      </Panel>

      <Panel>
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users className="h-5 w-5" /></div><div><p className="label-caps text-xs">GRUPO ATIVO</p><p className="text-lg font-semibold">{activeGroup?.name ?? "Nenhum grupo"}</p></div></div>
        {activeGroup && <div className="mt-5 rounded-xl border border-border bg-secondary/20 p-4"><p className="label-caps text-[10px] text-muted-foreground">CÓDIGO DE CONVITE</p><div className="mt-2 flex items-center gap-2"><code className="flex-1 rounded-lg bg-background px-3 py-2 text-lg font-semibold tracking-[0.2em]">{activeGroup.invite_code || "—"}</code><Button variant="outline" onClick={copyCode} aria-label="Copiar código"><Copy className="h-4 w-4" /></Button></div><p className="mt-2 text-xs text-muted-foreground">Compartilhe este código para adicionar pessoas ao grupo.</p></div>}
      </Panel>
    </div>

    {mode && <Panel><div className="flex items-center justify-between"><p className="label-caps text-xs">{mode === "create" ? "CRIAR NOVO GRUPO" : "ENTRAR EM UM GRUPO"}</p><button className="text-xs text-muted-foreground" onClick={() => setMode(null)}>FECHAR</button></div><div className="mt-4 flex flex-col gap-3 sm:flex-row">{mode === "create" ? <Input value={groupName} onChange={(e: any) => setGroupName(e.target.value)} placeholder="Nome do grupo" /> : <Input value={invite} onChange={(e: any) => setInvite(e.target.value)} placeholder="Código de convite" className="uppercase" />}<Button disabled={busy} onClick={mode === "create" ? createGroup : joinGroup}>{busy ? "AGUARDE..." : mode === "create" ? "CRIAR" : "ENTRAR"}</Button></div>{message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}</Panel>}

    <Panel>
      <div className="flex items-center justify-between"><div><p className="label-caps text-xs">MEMBROS</p><p className="mt-1 text-xs text-muted-foreground">Permissões do grupo ativo</p></div><span className="rounded-full bg-secondary px-2 py-1 text-xs">{membersQuery.data?.length ?? 0}</span></div>
      <div className="mt-4 space-y-2">
        {membersQuery.data?.map((member) => { const Icon = roleIcons[member.role]; return <div key={member.id} className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: `${member.color}22`, color: member.color }}>{member.initials ?? member.name.slice(0, 2).toUpperCase()}</div><div><p className="font-medium">{member.name}</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><Icon className="h-3 w-3" />{roleLabels[member.role]}</p></div></div>{canManage && member.role !== "OWNER" && member.id !== user?.id && <div className="flex items-center gap-2"><select value={member.role} disabled={busy} onChange={(e) => changeRole(member, e.target.value as Role)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs"><option value="ADMIN">ADMINISTRADOR</option><option value="EDITOR">EDITOR</option><option value="MEMBER">MEMBRO</option><option value="VIEWER">VISUALIZADOR</option></select><Button variant="outline" disabled={busy} onClick={() => removeMember(member)} aria-label={`Remover ${member.name}`}><Trash2 className="h-4 w-4" /></Button></div>}</div>; })}
        {!membersQuery.data?.length && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum membro para exibir.</p>}
      </div>
    </Panel>

    {message && !mode && <p className="text-sm text-muted-foreground">{message}</p>}
  </div>;
}
