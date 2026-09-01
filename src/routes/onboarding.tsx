import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Share2, CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });
type HouseholdResult = { household_id: string; invite_code: string; name?: string };

function OnboardingPage() {
  const { user, profile, setActiveHousehold } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState(user?.user_metadata?.["full_name"] ?? profile?.name ?? "");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [created, setCreated] = useState<HouseholdResult | null>(null);
  const [existing, setExisting] = useState<HouseholdResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadExistingHousehold() {
      if (!user) { setLoading(false); return; }
      try {
        const { data, error: e } = await (supabase as any)
          .from("group_members")
          .select("household_id, role, status, households(name, invite_code)")
          .eq("user_id", user.id)
          .eq("status", "ACTIVE")
          .order("joined_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (e) throw e;
        const row = data as any;
        if (!cancelled && row?.household_id) {
          const household: HouseholdResult = {
            household_id: String(row.household_id),
            invite_code: String(row.households?.invite_code ?? "").toUpperCase(),
            name: row.households?.name ?? "Minha casa",
          };
          setExisting(household);
          setActiveHousehold(household.household_id);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Não foi possível verificar sua casa.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadExistingHousehold();
    return () => { cancelled = true; };
  }, [user, setActiveHousehold]);

  async function createHousehold(): Promise<HouseholdResult> {
    const { data, error: e } = await supabase.rpc("create_household", { household_name: householdName.trim(), my_name: name.trim() });
    if (e) throw e;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.household_id || !row?.invite_code) throw new Error("A casa foi criada, mas o sistema não recebeu o identificador e o código.");
    return { household_id: String(row.household_id), invite_code: String(row.invite_code).toUpperCase(), name: householdName.trim() };
  }

  async function joinHousehold() {
    const code = inviteCode.trim().toUpperCase();
    if (!code) throw new Error("Informe o código de convite.");
    const { data, error: e } = await supabase.rpc("join_household", { invite: code, my_name: name.trim() });
    if (e) throw e;
    const householdId = typeof data === "string" ? data : data?.household_id ?? data?.id ?? data?.householdId;
    if (!householdId) throw new Error("O código foi aceito, mas o sistema não recebeu a casa de destino.");
    return String(householdId);
  }

  async function enterDashboard(householdId: string) {
    setActiveHousehold(householdId);
    await navigate({ to: "/", replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!name.trim()) return setError("Informe seu nome.");
    setLoading(true);
    try {
      if (existing) return await enterDashboard(existing.household_id);
      if (mode === "create") {
        if (!householdName.trim()) throw new Error("Informe um nome para a casa/família.");
        const result = await createHousehold();
        setActiveHousehold(result.household_id); setCreated(result); toast.success("Casa criada com sucesso!");
      } else {
        const householdId = await joinHousehold(); await enterDashboard(householdId);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Algo deu errado. Tente novamente."); setLoading(false); }
  }

  async function enterHub() { if (!created && !existing) return; const householdId = created?.household_id ?? existing!.household_id; setError(null); setLoading(true); try { await enterDashboard(householdId); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível abrir o início do Hub."); setLoading(false); } }
  async function copyCode() { const code = created?.invite_code ?? existing?.invite_code; if (code) { await navigator.clipboard?.writeText(code); toast.success("Código copiado!"); } }
  async function shareCode() { const code = created?.invite_code ?? existing?.invite_code; if (!code) return; const text = `Entre na minha casa no Harmony Hub usando o código: ${code}`; if (navigator.share) await navigator.share({ text }); else await copyCode(); }

  if (loading && !existing && !created) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">VERIFICANDO SUA CASA...</div>;

  if (existing) return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="w-full max-w-sm space-y-5 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="h-7 w-7"/></div><div><h1 className="label-caps text-xl tracking-[0.2em]">VOCÊ JÁ PERTENCE A UMA CASA</h1><p className="mt-2 text-sm text-muted-foreground">{existing.name}</p></div><div className="rounded-2xl border border-primary/30 bg-primary/5 p-5"><p className="label-caps text-[10px] text-muted-foreground">CÓDIGO DA CASA</p><code className="mt-3 block text-3xl font-bold tracking-[0.3em]">{existing.invite_code || "—"}</code></div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={copyCode} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold"><Copy className="h-4 w-4"/>COPIAR</button><button type="button" onClick={shareCode} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"><Share2 className="h-4 w-4"/>COMPARTILHAR</button></div><button type="button" onClick={enterHub} disabled={loading} className="gradient-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{loading?"ABRINDO O HUB...":"ENTRAR NO HUB"}<ArrowRight className="h-4 w-4"/></button>{error&&<p className="text-sm text-destructive">{error}</p>}</div></div>;

  if (created) return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="w-full max-w-sm space-y-5 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="h-7 w-7"/></div><div><h1 className="label-caps text-xl tracking-[0.2em]">CASA CRIADA!</h1><p className="mt-2 text-sm text-muted-foreground">Compartilhe este código para convidar pessoas para sua casa.</p></div><div className="rounded-2xl border border-primary/30 bg-primary/5 p-5"><p className="label-caps text-[10px] text-muted-foreground">CÓDIGO DE CONVITE</p><code className="mt-3 block text-3xl font-bold tracking-[0.3em]">{created.invite_code}</code></div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={copyCode} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold"><Copy className="h-4 w-4"/>COPIAR</button><button type="button" onClick={shareCode} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"><Share2 className="h-4 w-4"/>COMPARTILHAR</button></div><button type="button" onClick={enterHub} disabled={loading} className="gradient-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{loading?"ABRINDO O INÍCIO...":"ENTRAR NO HUB"}<ArrowRight className="h-4 w-4"/></button>{error&&<p className="text-sm text-destructive">{error}</p>}</div></div>;

  return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="w-full max-w-sm space-y-6"><div className="text-center"><h1 className="label-caps text-xl tracking-[0.2em]">BEM-VINDO(A)</h1><p className="mt-1 text-sm text-muted-foreground">Crie sua casa no Harmony Hub ou entre em uma existente com um código de convite.</p></div><div className="flex rounded-xl border border-border p-1"><button type="button" onClick={()=>setMode("create")} className={`label-caps flex-1 rounded-lg py-2 text-[11px] ${mode==="create"?"bg-primary text-primary-foreground":"text-muted-foreground"}`}>Criar casa</button><button type="button" onClick={()=>setMode("join")} className={`label-caps flex-1 rounded-lg py-2 text-[11px] ${mode==="join"?"bg-primary text-primary-foreground":"text-muted-foreground"}`}>Entrar com código</button></div><form onSubmit={handleSubmit} className="space-y-3"><div className="space-y-1"><label className="label-caps text-[11px] text-muted-foreground">Seu nome</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Maria" className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"/></div>{mode==="create"?<div className="space-y-1"><label className="label-caps text-[11px] text-muted-foreground">Nome da casa/família</label><input value={householdName} onChange={e=>setHouseholdName(e.target.value)} placeholder="Ex: Casa Barbosa" className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"/></div>:<div className="space-y-1"><label className="label-caps text-[11px] text-muted-foreground">Código de convite</label><input value={inviteCode} onChange={e=>setInviteCode(e.target.value.toUpperCase())} placeholder="Ex: A1B2C3" className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm uppercase text-foreground outline-none focus:border-primary"/></div>}{error&&<p className="text-sm text-destructive">{error}</p>}<button type="submit" disabled={loading} className="gradient-primary w-full rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">{loading?"SALVANDO...":mode==="create"?"CRIAR CASA":"ENTRAR"}</button></form></div></div>;
}
