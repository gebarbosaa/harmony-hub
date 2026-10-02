import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Building2, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";

type Connection = { id: string; item_id: string; institution_name: string | null; status: string; last_sync_at: string | null };
type Account = { id: string; connection_id: string; name: string | null; balance: number | null; currency: string | null; institution_name: string | null };
type Transaction = { id: string; connection_id: string; transaction_date: string | null; description: string | null; amount: number | null; currency: string | null; transaction_type: string | null };

declare global {
  interface Window {
    PluggyConnect?: new (options: {
      connectToken: string;
      includeSandbox?: boolean;
      language?: string;
      onSuccess?: (data: { item?: { id?: string } }) => void | Promise<void>;
      onError?: (error: { message?: string }) => void;
      onClose?: () => void;
    }) => { init: () => Promise<unknown> };
  }
}

const WIDGET = "https://cdn.pluggy.ai/pluggy-connect/latest/pluggy-connect.js";

async function loadWidget() {
  if (window.PluggyConnect) return window.PluggyConnect;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = WIDGET;
    script.async = true;
    script.dataset.pluggyConnect = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("NÃO FOI POSSÍVEL CARREGAR O WIDGET DO PLUGGY"));
    document.head.appendChild(script);
  });
  if (!window.PluggyConnect) throw new Error("WIDGET DO PLUGGY NÃO FOI DISPONIBILIZADO");
  return window.PluggyConnect;
}

export function OpenFinancePanel() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  async function loadData() {
    setLoading(true);
    const [connectionsResult, accountsResult, transactionsResult] = await Promise.all([
      supabase.from("open_finance_connections").select("id,item_id,institution_name,status,last_sync_at").order("created_at", { ascending: false }),
      supabase.from("open_finance_accounts").select("id,connection_id,name,balance,currency,institution_name").order("created_at", { ascending: false }),
      supabase.from("open_finance_transactions").select("id,connection_id,transaction_date,description,amount,currency,transaction_type").order("transaction_date", { ascending: false }).limit(80),
    ]);
    if (connectionsResult.error) toast.error("NÃO FOI POSSÍVEL CARREGAR AS CONEXÕES OPEN FINANCE");
    else setConnections(connectionsResult.data ?? []);
    if (accountsResult.error) toast.error("NÃO FOI POSSÍVEL CARREGAR OS SALDOS OPEN FINANCE");
    else setAccounts(accountsResult.data ?? []);
    if (transactionsResult.error) toast.error("NÃO FOI POSSÍVEL CARREGAR AS MOVIMENTAÇÕES OPEN FINANCE");
    else setTransactions(transactionsResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, []);

  async function connectBank() {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("open-finance-token", { body: {} });
      if (error) throw error;
      if (!data?.accessToken) throw new Error(data?.error ?? "TOKEN DO PLUGGY NÃO DISPONÍVEL");
      const PluggyConnect = await loadWidget();
      const widget = new PluggyConnect({
        connectToken: data.accessToken,
        includeSandbox: Boolean(import.meta.env.DEV),
        language: "pt",
        onSuccess: async () => {
          toast.success("BANCO CONECTADO. SINCRONIZANDO DADOS...");
          await new Promise((resolve) => window.setTimeout(resolve, 2500));
          await loadData();
          setConnecting(false);
        },
        onError: (error) => { toast.error(error?.message ?? "NÃO FOI POSSÍVEL CONECTAR O BANCO"); setConnecting(false); },
        onClose: () => setConnecting(false),
      });
      await widget.init();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL INICIAR O OPEN FINANCE");
      setConnecting(false);
    }
  }

  async function disconnect(connection: Connection) {
    if (!window.confirm("DESCONECTAR " + (connection.institution_name ?? "ESTE BANCO") + "? OS DADOS IMPORTADOS SERÃO REMOVIDOS.")) return;
    const { error } = await supabase.from("open_finance_connections").delete().eq("id", connection.id);
    if (error) return toast.error("NÃO FOI POSSÍVEL DESCONECTAR O BANCO");
    toast.success("BANCO DESCONECTADO");
    await loadData();
  }

  return (
    <Panel title="OPEN FINANCE" aside={<button type="button" onClick={() => void loadData()} className="rounded-lg p-2 hover:bg-secondary" aria-label="Atualizar Open Finance"><RefreshCw className="h-3.5 w-3.5" /></button>}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-bold">CONSULTA SOMENTE LEITURA</p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Visualize contas, saldos e movimentações. O Harmony Hub não inicia Pix, pagamentos ou transferências pelo Open Finance.</p>
            </div>
          </div>
        </div>

        <button type="button" onClick={() => void connectBank()} disabled={connecting} className="gradient-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[11px] font-bold text-primary-foreground disabled:opacity-60">
          <Building2 className="h-4 w-4" />
          {connecting ? "CONECTANDO..." : "CONECTAR BANCO"}
        </button>

        <p className="text-[10px] font-bold text-muted-foreground">CONTAS CONECTADAS</p>

        {loading ? <p className="py-4 text-center text-xs text-muted-foreground">CARREGANDO...</p> : connections.length === 0 ? (
          <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">NENHUM BANCO CONECTADO.</p>
        ) : (
          <>
            <div className="grid gap-2 md:grid-cols-2">
              {connections.map((connection) => {
                const linked = accounts.filter((account) => account.connection_id === connection.id);
                const total = linked.reduce((sum, account) => sum + Number(account.balance ?? 0), 0);
                return (
                  <div key={connection.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold">{connection.institution_name ?? "INSTITUIÇÃO FINANCEIRA"}</p>
                        <p className="mt-1 text-[9px] text-muted-foreground">{connection.status}</p>
                      </div>
                      <button type="button" onClick={() => void disconnect(connection)} className="rounded-lg p-2 text-danger hover:bg-danger/10" aria-label="Desconectar"><Unplug className="h-3.5 w-3.5" /></button>
                    </div>
                    <p className="mt-3 text-lg font-bold">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-[9px] text-muted-foreground">{linked.length} conta(s) · {connection.last_sync_at ? "sincronizado " + new Date(connection.last_sync_at).toLocaleString("pt-BR") : "aguardando sincronização"}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border">
              <div className="border-b px-4 py-3">
                <p className="text-[10px] font-bold">ÚLTIMAS MOVIMENTAÇÕES</p>
                <p className="mt-1 text-[9px] text-muted-foreground">REGISTROS SOMENTE PARA VISUALIZAÇÃO.</p>
              </div>
              {transactions.length === 0 ? (
                <p className="p-5 text-center text-xs text-muted-foreground">NENHUMA MOVIMENTAÇÃO SINCRONIZADA AINDA.</p>
              ) : (
                <div className="divide-y">
                  {transactions.slice(0, 30).map((transaction) => {
                    const amount = Number(transaction.amount ?? 0);
                    const income = amount >= 0;
                    return (
                      <div key={transaction.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="rounded-lg bg-secondary p-2">{income ? <ArrowDownLeft className="h-3.5 w-3.5 text-success" /> : <ArrowUpRight className="h-3.5 w-3.5 text-danger" />}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold">{transaction.description || "MOVIMENTAÇÃO"}</p>
                          <p className="text-[9px] text-muted-foreground">{transaction.transaction_date ? new Date(transaction.transaction_date + "T12:00:00").toLocaleDateString("pt-BR") : "DATA NÃO INFORMADA"}</p>
                        </div>
                        <p className={"shrink-0 text-[11px] font-bold " + (income ? "text-success" : "text-danger")}>{income ? "+" : "-"}R$ {Math.abs(amount).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}
