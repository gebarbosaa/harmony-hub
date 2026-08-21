import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, Tag } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useHouseholdMembers } from "@/hooks/use-household-members";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "CONFIGURAÇÕES — MULTICAP" },
      { name: "description", content: "Perfil, membros, categorias, backup e gestão de dados." },
    ],
  }),
  component: SettingsPage,
});

const CATEGORIES = ["MORADIA", "ALIMENTAÇÃO", "TRANSPORTE", "LAZER", "SAÚDE", "IMPOSTOS", "RENDA"];
const METHODS = ["PIX", "DÉBITO", "CARTÃO", "BOLETO", "DINHEIRO"];

function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { data: members = [], isLoading: membersLoading } = useHouseholdMembers();
  const [name, setName] = useState(profile?.name ?? user?.user_metadata?.full_name ?? "");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [dangerAction, setDangerAction] = useState<string | null>(null);

  async function saveProfile() {
    if (!user || !name.trim()) return toast.error("INFORME SEU NOME");
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ name: name.trim() }).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("PERFIL ATUALIZADO");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o perfil");
    } finally {
      setSaving(false);
    }
  }

  async function runDangerAction(action: string) {
    if (confirm !== "EXCLUIR") return;
    if (dangerAction) return;

    const actionMap: Record<string, string> = {
      "LIMPAR LANÇAMENTOS": "clear_transactions",
      "EXCLUIR TODOS OS DADOS": "delete_all_data",
      "RESTAURAR FÁBRICA": "factory_reset",
    };
    const backendAction = actionMap[action];

    if (!backendAction) {
      toast.info("ENCERRAMENTO DA CONTA AINDA NÃO ESTÁ DISPONÍVEL NESTA ETAPA");
      return;
    }

    setDangerAction(action);
    try {
      const { data, error } = await supabase.rpc("manage_household_data", {
        p_action: backendAction,
        p_confirmation: confirm,
      });
      if (error) throw error;

      const messages: Record<string, string> = {
        TRANSACTIONS_CLEARED: "LANÇAMENTOS EXCLUÍDOS COM SUCESSO",
        ALL_DATA_DELETED: "TODOS OS DADOS DA CASA FORAM EXCLUÍDOS",
        FACTORY_RESET: "DADOS EXCLUÍDOS E CONFIGURAÇÃO DE FÁBRICA RESTAURADA",
      };
      toast.success(messages[data as string] ?? "AÇÃO CONCLUÍDA");
      setConfirm("");
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "NÃO FOI POSSÍVEL EXECUTAR A AÇÃO");
    } finally {
      setDangerAction(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="CONFIGURAÇÕES" subtitle="Perfil, membros e gestão de dados da casa." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="PERFIL">
          <div className="space-y-3">
            <label className="block">
              <span className="label-caps text-[10px] text-muted-foreground">NOME</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="label-caps text-[10px] text-muted-foreground">E-MAIL</span>
              <input
                value={user?.email ?? ""}
                readOnly
                className="mt-1 w-full rounded-xl border border-input bg-secondary/40 px-3 py-2.5 text-sm text-muted-foreground outline-none"
              />
            </label>
            <label className="block">
              <span className="label-caps text-[10px] text-muted-foreground">MOEDA</span>
              <input value="BRL — Real" readOnly className="mt-1 w-full rounded-xl border border-input bg-secondary/40 px-3 py-2.5 text-sm text-muted-foreground outline-none" />
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveProfile()}
              className="gradient-primary label-caps w-full rounded-xl px-4 py-2.5 text-[11px] text-primary-foreground disabled:opacity-60"
            >
              {saving ? "SALVANDO..." : "SALVAR PERFIL"}
            </button>
          </div>
        </Panel>

        <Panel title="MEMBROS DA CASA">
          <div className="space-y-3">
            {membersLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Carregando membros...</p>
            ) : members.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
            ) : (
              members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-primary-foreground" style={{ background: m.color }}>
                      {m.initials ?? m.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="label-caps text-[11px]">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">Membro da casa</p>
                    </div>
                  </div>
                  <Tag tone="primary">ATIVO</Tag>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="GERENCIADOR GLOBAL">
          <p className="label-caps mb-2 text-[10px] text-muted-foreground">CATEGORIAS</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => <span key={c} className="label-caps rounded-lg border border-primary/50 bg-background px-3 py-1.5 text-[10px]">{c}</span>)}
          </div>
          <p className="label-caps mb-2 mt-4 text-[10px] text-muted-foreground">FORMAS DE PAGAMENTO</p>
          <div className="flex flex-wrap gap-2">
            {METHODS.map((c) => <span key={c} className="label-caps rounded-lg border border-border bg-background px-3 py-1.5 text-[10px] text-muted-foreground">{c}</span>)}
          </div>
        </Panel>

        <Panel title="BACKUP E EXPORTAÇÃO">
          <p className="text-xs text-muted-foreground">As exportações serão ligadas aos dados reais da casa na próxima etapa. Nenhum dado fictício é exibido aqui.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {["EXCEL", "CSV", "JSON", "PDF"].map((f) => (
              <button key={f} type="button" onClick={() => toast.info(`EXPORTAÇÃO ${f} SERÁ CONECTADA AO BACKEND`)} className="label-caps rounded-xl border border-border px-3 py-2.5 text-[10px] transition-colors hover:border-primary hover:text-primary">
                EXPORTAR {f}
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="ZONA DE PERIGO" className="border-danger/50">
        <p className="text-xs text-muted-foreground">Estas ações são irreversíveis. Digite <strong className="text-danger">EXCLUIR</strong> para liberar.</p>
        <input value={confirm} onChange={(e) => setConfirm(e.target.value.toUpperCase())} placeholder="Digite EXCLUIR" className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-danger md:w-64" />
        <div className="mt-3 flex flex-wrap gap-2">
          {["LIMPAR LANÇAMENTOS", "EXCLUIR TODOS OS DADOS", "RESTAURAR FÁBRICA", "ENCERRAR CONTA"].map((action) => (
            <button
              key={action}
              type="button"
              disabled={confirm !== "EXCLUIR" || dangerAction !== null}
              onClick={() => void runDangerAction(action)}
              className={cn("label-caps rounded-xl border px-3 py-2 text-[10px] transition-colors", confirm === "EXCLUIR" ? "border-danger text-danger hover:bg-danger/10" : "border-border text-muted-foreground opacity-50")}
            >
              {dangerAction === action ? "PROCESSANDO..." : action}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
