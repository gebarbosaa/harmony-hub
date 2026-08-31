import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Share2, CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

type HouseholdResult = { household_id: string; invite_code: string };

function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState(user?.user_metadata?.["full_name"] ?? "");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [created, setCreated] = useState<HouseholdResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createHousehold(): Promise<HouseholdResult> {
    const { data, error: rpcError } = await supabase.rpc("create_household", {
      household_name: householdName.trim(),
      my_name: name.trim(),
    });
    if (rpcError) throw rpcError;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.household_id || !row?.invite_code) {
      throw new Error("A casa foi criada, mas não recebemos o identificador e o código. Tente novamente.");
    }
    return { household_id: row.household_id, invite_code: String(row.invite_code).toUpperCase() };
  }

  async function enterHub() {
    setLoading(true);
    setError(null);
    try {
      await refreshProfile();
      window.location.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar no Hub.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Informe seu nome.");
    setLoading(true);
    try {
      if (mode === "create") {
        if (!householdName.trim()) throw new Error("Informe um nome para a casa/família.");
        const result = await createHousehold();
        await refreshProfile();
        setCreated(result);
        toast.success("Casa criada com sucesso!");
      } else {
        if (!inviteCode.trim()) throw new Error("Informe o código de convite.");
        const { data, error: rpcError } = await supabase.rpc("join_household", {
          invite: inviteCode.trim().toUpperCase(),
          my_name: name.trim(),
        });
        if (rpcError) throw rpcError;
        if (!data) throw new Error("Não recebemos o identificador da casa.");
        await refreshProfile();
        toast.success("Você entrou na casa!");
        window.location.replace("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!created?.invite_code) return;
    await navigator.clipboard?.writeText(created.invite_code);
    toast.success("Código copiado!");
  }

  async function shareCode() {
    if (!created?.invite_code) return;
    const text = `Entre na minha casa no Harmony Hub usando o código: ${created.invite_code}`;
    if (navigator.share) await navigator.share({ text });
    else await copyCode();
  }

  if (created) return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="h-7 w-7" /></div>
        <div><h1 className="label-caps text-xl tracking-[0.2em]">CASA CRIADA!</h1><p className="mt-2 text-sm text-muted-foreground">Compartilhe este código para convidar pessoas para sua casa.</p></div>
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5"><p className="label-caps text-[10px] text-muted-foreground">CÓDIGO DE CONVITE</p><code className="mt-3 block text-3xl font-bold tracking-[0.3em]">{created.invite_code}</code></div>
        <div className="grid grid-cols-2 gap-2"><button type="button" onClick={copyCode} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold tracking-wide hover:border-primary/50"><Copy className="h-4 w-4" /> COPIAR</button><button type="button" onClick={shareCode} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold tracking-wide text-primary-foreground hover:opacity-90"><Share2 className="h-4 w-4" /> COMPARTILHAR</button></div>
        <button type="button" onClick={enterHub} disabled={loading} className="gradient-primary inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">{loading ? "ENTRANDO..." : "ENTRAR NO HUB"}<ArrowRight className="h-4 w-4" /></button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="w-full max-w-sm space-y-6"><div className="text-center"><h1 className="label-caps text-xl tracking-[0.2em]">BEM-VINDO(A)</h1><p className="mt-1 text-sm text-muted-foreground">Crie sua casa no Harmony Hub ou entre em uma existente com um código de convite.</p></div>
      <div className="flex rounded-xl border border-border p-1"><button type="button" onClick={() => setMode("create")} className={`label-caps flex-1 rounded-lg py-2 text-[11px] ${mode === "create" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Criar casa</button><button type="button" onClick={() => setMode("join")} className={`label-caps flex-1 rounded-lg py-2 text-[11px] ${mode === "join" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Entrar com código</button></div>
      <form onSubmit={handleSubmit} className="space-y-3"><div className="space-y-1"><label className="label-caps text-[11px] text-muted-foreground">Seu nome</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Maria" className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary" /></div>{mode === "create" ? <div className="space-y-1"><label className="label-caps text-[11px] text-muted-foreground">Nome da casa/família</label><input value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="Ex: Casa Barbosa" className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary" /></div> : <div className="space-y-1"><label className="label-caps text-[11px] text-muted-foreground">Código de convite</label><input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="Ex: A1B2C3" className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm uppercase text-foreground outline-none focus:border-primary" /></div>}{error && <p className="text-sm text-destructive">{error}</p>}<button type="submit" disabled={loading} className="gradient-primary w-full rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60">{loading ? "SALVANDO..." : mode === "create" ? "CRIAR CASA" : "ENTRAR"}</button></form>
    </div></div>
  );
}
