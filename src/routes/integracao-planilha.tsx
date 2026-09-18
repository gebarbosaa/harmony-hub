import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, ExternalLink, RefreshCw, Table2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/ui-kit";
import { useHouseholdId } from "@/hooks/use-household-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/integracao-planilha")({
  head: () => ({ meta: [{ title: "PLANILHA — HARMONY HUB" }] }),
  component: SpreadsheetIntegrationPage,
});

function SpreadsheetIntegrationPage() {
  const householdId = useHouseholdId();
  const [webAppUrl, setWebAppUrl] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function connect() {
    const url = webAppUrl.trim();

    if (!householdId) return toast.error("ENTRE NO SEU GRUPO PRIMEIRO");
    if (!url) return toast.error("COLE A URL DO APLICATIVO DA WEB DO APPS SCRIPT");
    if (!url.startsWith("https://script.google.com/")) {
      return toast.error("A URL PRECISA SER DO GOOGLE APPS SCRIPT E COMEÇAR COM https://script.google.com/");
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-spreadsheet-connection", {
        body: {
          household_id: householdId,
          web_app_url: url,
          sheet_name: "Receitas,Despesas,Parcelamentos",
          name: "GOOGLE SHEETS",
        },
      });

      if (error) throw error;
      if (!data?.token) throw new Error("Não foi possível gerar o token de sincronização.");

      setToken(data.token);
      toast.success("PLANILHA CONECTADA");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ERRO AO CONECTAR PLANILHA");
    } finally {
      setLoading(false);
    }
  }

  async function copy(value: string, message: string) {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  }

  const scriptUrl = "https://github.com/gebarbosaa/harmony-hub/blob/main/integrations/google-sheets/Code.gs";

  return (
    <div className="space-y-5">
      <PageHeader
        title="PLANILHA"
        subtitle="GOOGLE SHEETS → SUPABASE → HARMONY HUB."
      />

      <Panel title="ABAS INTEGRADAS">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• <b>Receitas</b> → entradas no Harmony Hub.</p>
          <p>• <b>Despesas</b> → despesas no Harmony Hub.</p>
          <p>• <b>Parcelamentos</b> → parcelamentos do Harmony Hub.</p>
          <p>• O Supabase continua sendo a base principal.</p>
          <p>• Alterações feitas no App/Supabase não precisam ser copiadas de volta para a planilha.</p>
        </div>
      </Panel>

      <Panel title="CONECTAR GOOGLE SHEETS">
        <div className="space-y-3">
          <label className="block text-[10px] font-semibold tracking-[0.08em] text-muted-foreground">
            URL DO APLICATIVO DA WEB — APPS SCRIPT
          </label>

          <input
            value={webAppUrl}
            onChange={(e) => setWebAppUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="w-full rounded-xl border p-3"
          />

          <div className="rounded-xl border bg-secondary/30 p-3 text-xs text-muted-foreground">
            As abas <b>Receitas</b>, <b>Despesas</b> e <b>Parcelamentos</b> serão usadas automaticamente. Não precisa informar nome de aba.
          </div>

          <button
            onClick={() => void connect()}
            disabled={loading}
            className="gradient-primary flex w-full items-center justify-center gap-2 rounded-xl p-3 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
          >
            <Table2 className="h-4 w-4" />
            {loading ? "CONECTANDO..." : "CONECTAR PLANILHA"}
          </button>
        </div>
      </Panel>

      {token && (
        <Panel title="TOKEN DE SINCRONIZAÇÃO">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Copie este token e salve nas propriedades do Apps Script como <b>HARMONY_TOKEN</b>.
            </p>

            <div className="flex gap-2">
              <input
                readOnly
                value={token}
                className="min-w-0 flex-1 rounded-xl border bg-secondary/40 p-3 font-mono text-xs"
              />
              <button
                onClick={() => void copy(token, "TOKEN COPIADO")}
                className="rounded-xl border p-3"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => void copy(scriptUrl, "LINK DO SCRIPT COPIADO")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border p-3 text-[11px] font-semibold"
            >
              <ExternalLink className="h-4 w-4" />
              COPIAR LINK DO SCRIPT
            </button>
          </div>
        </Panel>
      )}

      <Panel title="ATIVAÇÃO">
        <div className="space-y-2 text-sm">
          <p>1. Abra a planilha no Google Sheets.</p>
          <p>2. Vá em <b>Extensões → Apps Script</b>.</p>
          <p>3. Use o conteúdo de <b>integrations/google-sheets/Code.gs</b>.</p>
          <p>4. Depois de conectar aqui, salve o token em <b>Propriedades do script → HARMONY_TOKEN</b>.</p>
          <p>5. Salve e execute <b>installTriggers</b> uma vez, autorizando o script.</p>
          <p>6. Mantenha as três abas com os nomes <b>Receitas</b>, <b>Despesas</b> e <b>Parcelamentos</b>.</p>
        </div>
      </Panel>

      <button
        onClick={() => window.open(scriptUrl, "_blank", "noopener,noreferrer")}
        className="flex w-full items-center justify-center gap-2 rounded-xl border p-3 text-[11px] font-semibold"
      >
        <RefreshCw className="h-4 w-4" />
        ABRIR SCRIPT DO GOOGLE SHEETS
      </button>
    </div>
  );
}
