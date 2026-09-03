import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Users, UserPlus, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/ui-kit";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/grupos")({ head: () => ({ meta: [{ title: "GRUPOS — HARMONY HUB" }] }), component: GroupsPage });

type Household = { id: string; name: string; invite_code: string; member_count: number; my_role: string };
type Member = { user_id: string; role: string; status: string; name: string; email?: string };

function GroupsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [groupName, setGroupName] = useState("");
  const [invite, setInvite] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadGroup() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_my_household");
      if (error) throw error;
      const current = (data?.[0] ?? null) as Household | null;
      setHousehold(current);
      setGroupName(current?.name ?? "");
      if (current) {
        const { data: memberRows, error: memberError } = await supabase.from("group_members").select("user_id,role,status").eq("household_id", current.id).eq("status", "ACTIVE").order("joined_at", { ascending: true });
        if (memberError) throw memberError;
        const ids = (memberRows ?? []).map((row) => row.user_id);
        const { data: profiles } = ids.length ? await supabase.from("profiles").select("id,name").in("id", ids) : { data: [] as { id: string; name: string }[] };
        const names = new Map((profiles ?? []).map((item) => [item.id, item.name]));
        setMembers((memberRows ?? []).map((row) => ({ user_id: row.user_id, role: row.role, status: row.status, name: names.get(row.user_id) ?? "USUÁRIO" })));
      } else setMembers([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ERRO AO CARREGAR GRUPO");
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadGroup(); }, [user?.id, profile?.household_id]);

  async function createGroup() {
    if (!user || !groupName.trim()) return toast.error("INFORME O NOME DO GRUPO");
    setSaving(true);
    try { await supabase.rpc("create_household", { household_name: groupName.trim(), my_name: profile?.name ?? user.user_metadata?.["name"] ?? "USUÁRIO" }); await refreshProfile(); await loadGroup(); toast.success("GRUPO CRIADO"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL CRIAR O GRUPO"); }
    finally { setSaving(false); }
  }

  async function joinGroup() {
    if (!user || !invite.trim()) return toast.error("INFORME O CÓDIGO DO GRUPO");
    setSaving(true);
    try { await supabase.rpc("join_household", { invite: invite.trim(), my_name: profile?.name ?? user.user_metadata?.["name"] ?? "USUÁRIO" }); setInvite(""); await refreshProfile(); await loadGroup(); toast.success("VOCÊ ENTROU NO GRUPO"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "CÓDIGO INVÁLIDO"); }
    finally { setSaving(false); }
  }

  async function renameGroup() {
    if (!groupName.trim()) return toast.error("INFORME O NOME DO GRUPO");
    setSaving(true);
    try { await supabase.rpc("rename_my_household", { new_name: groupName.trim() }); await loadGroup(); toast.success("NOME DO GRUPO ATUALIZADO"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "SEM PERMISSÃO PARA ALTERAR"); }
    finally { setSaving(false); }
  }

  async function copyCode() {
    if (!household?.invite_code) return;
    await navigator.clipboard.writeText(household.invite_code);
    toast.success("CÓDIGO COPIADO");
  }

  const canManage = household?.my_role === "OWNER" || household?.my_role === "ADMIN";

  return <div className="space-y-5">
    <PageHeader title="GRUPOS" subtitle="COMPARTILHE OS MESMOS DADOS FINANCEIROS COM PESSOAS AUTORIZADAS." />

    {loading ? <Panel><p className="py-8 text-center text-sm text-muted-foreground">CARREGANDO...</p></Panel> : household ? <>
      <Panel title="SEU GRUPO">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} disabled={!canManage} className="w-full rounded-xl border p-3" placeholder="NOME DO GRUPO" />
            {canManage && <button onClick={() => void renameGroup()} disabled={saving} className="gradient-primary rounded-xl px-4 py-3 text-[10px] font-bold"><Save className="mr-1 inline h-4 w-4"/>SALVAR NOME</button>}
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary"/><p className="label-caps text-[11px] font-bold">CÓDIGO PARA COMPARTILHAR</p></div>
            <div className="mt-3 flex gap-2"><div className="flex min-w-0 flex-1 items-center rounded-xl border bg-background px-4 py-3 font-mono text-lg font-bold tracking-[0.25em]">{household.invite_code}</div><button onClick={() => void copyCode()} className="rounded-xl border px-4" aria-label="Copiar código"><Copy className="h-4 w-4"/></button></div>
            <p className="mt-2 text-xs text-muted-foreground">A outra pessoa entra com o próprio e-mail e informa este código em GRUPOS. Depois disso, os dados financeiros passam a ser compartilhados.</p>
          </div>
        </div>
      </Panel>

      <Panel title="PESSOAS DO GRUPO">
        <div className="space-y-2">
          {members.map((member) => <div key={member.user_id} className="flex items-center justify-between rounded-xl border p-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10"><Users className="h-4 w-4 text-primary"/></div><div><p className="text-sm font-semibold">{member.name}{member.user_id === user?.id ? " (VOCÊ)" : ""}</p><p className="text-[10px] text-muted-foreground">{member.role === "OWNER" ? "ADMINISTRADOR" : "MEMBRO"}</p></div></div><ShieldCheck className="h-4 w-4 text-primary"/></div>)}
        </div>
      </Panel>
    </> : <>
      <Panel title="CRIAR UM GRUPO">
        <div className="space-y-3"><p className="text-sm text-muted-foreground">Crie um grupo para compartilhar seus dados financeiros com sua parceira ou outra pessoa autorizada.</p><input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="NOME DO GRUPO" className="w-full rounded-xl border p-3"/><button onClick={() => void createGroup()} disabled={saving} className="gradient-primary w-full rounded-xl p-3 text-[10px] font-bold">CRIAR GRUPO</button></div>
      </Panel>
      <Panel title="ENTRAR EM UM GRUPO">
        <div className="space-y-3"><p className="text-sm text-muted-foreground">Recebeu um código? Informe abaixo para acessar o mesmo ambiente financeiro.</p><input value={invite} onChange={(e) => setInvite(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} placeholder="CÓDIGO DO GRUPO" className="w-full rounded-xl border p-3 font-mono tracking-[0.2em]"/><button onClick={() => void joinGroup()} disabled={saving} className="gradient-primary w-full rounded-xl p-3 text-[10px] font-bold">ENTRAR NO GRUPO</button></div>
      </Panel>
    </>}
  </div>;
}
