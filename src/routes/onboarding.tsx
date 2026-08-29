import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState(user?.user_metadata?.["full_name"] ?? "");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Informe seu nome.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "create") {
        if (!householdName.trim()) throw new Error("Informe um nome para a casa/família.");
        const { error: rpcError } = await supabase.rpc("create_household", {
          household_name: householdName.trim(),
          my_name: name.trim(),
        });
        if (rpcError) throw rpcError;
        toast.success("Casa criada com sucesso!");
      } else {
        if (!inviteCode.trim()) throw new Error("Informe o código de convite.");
        const { error: rpcError } = await supabase.rpc("join_household", {
          invite: inviteCode.trim(),
          my_name: name.trim(),
        });
        if (rpcError) throw rpcError;
        toast.success("Você entrou na casa!");
      }
      await refreshProfile();
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="label-caps text-xl tracking-[0.2em]">BEM-VINDO(A)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie sua casa no MULTICAP ou entre em uma existente com um código de convite.
          </p>
        </div>

        <div className="flex rounded-xl border border-border p-1">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`label-caps flex-1 rounded-lg py-2 text-[11px] transition-colors ${
              mode === "create" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Criar casa
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`label-caps flex-1 rounded-lg py-2 text-[11px] transition-colors ${
              mode === "join" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Entrar com código
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="label-caps text-[11px] text-muted-foreground">Seu nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maria"
              className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          {mode === "create" ? (
            <div className="space-y-1">
              <label className="label-caps text-[11px] text-muted-foreground">
                Nome da casa/família
              </label>
              <input
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="Ex: Casa Barbosa"
                className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="label-caps text-[11px] text-muted-foreground">
                Código de convite
              </label>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Ex: A1B2C3"
                className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm uppercase text-foreground outline-none focus:border-primary"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="gradient-primary w-full rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {loading ? "Salvando..." : mode === "create" ? "Criar casa" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
