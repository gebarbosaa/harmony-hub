import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, ExternalLink, RefreshCw, Table2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/ui-kit";
import { useHouseholdId } from "@/hooks/use-household-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/integracao-planilha")({ head: () => ({ meta: [{ title: "PLANILHA — HARMONY HUB" }] }), component: SpreadsheetIntegrationPage });

function SpreadsheetIntegrationPage() {
  const householdId = useHouseholdId();
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("Lançamentos");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function connect() {
    const id = spreadsheetId.trim();
    if (!householdId) return toast.error("ENTRE NO SEU GRUPO PRIMEIRO");
    if (!id) return toast.error("COLE O ID DA PLANILHA");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-spreadsheet-connection", { body: { household_id: householdId, spreadsheet_id: id, sheet_name: sheetName.trim() || "Lançamentos" } });
      if (error) throw error;
      if (!data?.token) throw new Error("Não foi possível gerar o token de sincronização.");
      setToken(data.token);
      toast.success("PLANILHA CONECTADA");
    } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO CONECTAR PLANILHA"); }
    finally { setLoading(false); }
  }

  async function copy(value: string, message: string) { await navigator.clipboard.writeText(value); toast.success(message); }

  const scriptUrl = "https://github.com/gebarbosaa/harmony-hub/blob/main/integrations/google-sheets/Code.gs";

  return <div className="space-y-5">
    <PageHeader title="PLANILHA" subtitle="SUPABASE E GOOGLE SHEETS COMO ESPELHOS BIDIRECIONAIS DOS LANÇAMENTOS." />
    <Panel title="COMO FUNCIONA"><div className="space-y-2 text-sm text-muted-foreground"><p>• Alterou um lançamento no Harmony Hub → a planilha recebe automaticamente.</p><p>• Alterou uma linha na planilha → o Harmony Hub recebe automaticamente.</p><p>• Exclusões podem ser feitas pelo site ou marcando a coluna <b>deleted</b> como SIM.</p><p>• O Supabase continua sendo a base principal; a planilha funciona como cópia editável e sincronizada.</p></div></Panel>
    <Panel title="CONECTAR GOOGLE SHEETS"><div className="space-y-3"><label className="block text-[10px] font-semibold tracking-[0.08em] text-muted-foreground">ID DA PLANILHA</label><input value={spreadsheetId} onChange={e => setSpreadsheetId(e.target.value)} placeholder="Ex.: 1AbC...xyz" className="w-full rounded-xl border p-3"/><label className="block text-[10px] font-semibold tracking-[0.08em] text-muted-foreground">NOME DA ABA</label><input value={sheetName} onChange={e => setSheetName(e.target.value)} className="w-full rounded-xl border p-3"/><button onClick={() => void connect()} disabled={loading} className="gradient-primary flex w-full items-center justify-center gap-2 rounded-xl p-3 text-[11px] font-bold text-primary-foreground disabled:opacity-50"><Table2 className="h-4 w-4"/>{loading ? "CONECTANDO..." : "CONECTAR PLANILHA"}</button></div></Panel>
    {token && <Panel title="TOKEN DE SINCRONIZAÇÃO"><div className="space-y-3"><p className="text-xs text-muted-foreground">Copie este token apenas uma vez e guarde-o no Apps Script. Ele não é exibido novamente nesta tela.</p><div className="flex gap-2"><input readOnly value={token} className="min-w-0 flex-1 rounded-xl border bg-secondary/40 p-3 font-mono text-xs"/><button onClick={() => void copy(token, "TOKEN COPIADO")} className="rounded-xl border p-3"><Copy className="h-4 w-4"/></button></div><button onClick={() => void copy(scriptUrl, "LINK DO SCRIPT COPIADO")} className="flex w-full items-center justify-center gap-2 rounded-xl border p-3 text-[11px] font-semibold"><ExternalLink className="h-4 w-4"/>COPIAR LINK DO SCRIPT</button></div></Panel>}
    <Panel title="ATIVAÇÃO"><div className="space-y-2 text-sm"><p>1. Abra a planilha no Google Sheets.</p><p>2. Vá em <b>Extensões → Apps Script</b>.</p><p>3. Cole o conteúdo de <b>integrations/google-sheets/Code.gs</b>.</p><p>4. Coloque o token gerado acima em <b>CONFIG.TOKEN</b>.</p><p>5. Salve e execute <b>installTriggers</b> uma vez, autorizando o script.</p><p>6. Crie a aba <b>Lançamentos</b> (ou use o nome informado acima).</p><p className="pt-2 text-xs text-muted-foreground">A sincronização do site para a planilha é verificada a cada minuto; alterações feitas na planilha usam gatilho instalável.</p></div></Panel>
    <button onClick={() => window.open(scriptUrl, "_blank", "noopener,noreferrer")} className="flex w-full items-center justify-center gap-2 rounded-xl border p-3 text-[11px] font-semibold"><RefreshCw className="h-4 w-4"/>ABRIR SCRIPT DO GOOGLE SHEETS</button>
  </div>;
}
