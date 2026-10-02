import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Bell, RefreshCw, CheckCircle2 } from "lucide-react";
import { PageHeader, Panel, Tag } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/integracoes")({
  head: () => ({ meta: [{ title: "INTEGRAÇÕES — HARMONY HUB" }] }),
  component: IntegracoesPage,
});

type Connection = {
  id: string;
  google_email: string | null;
  calendar_id: string;
  sync_enabled: boolean;
  last_synced_at: string | null;
};

const fn = (name: string) =>
  `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1/${name}`;

function vapidKeyToUint8Array(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown };
    return [candidate.message, candidate.details, candidate.hint]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" — ") || "Erro desconhecido.";
  }
  return String(error);
}

function IntegracoesPage() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [push, setPush] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  async function authFetch(url: string, init?: RequestInit) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error("Faça login novamente.");
    return fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json",
      },
    });
  }

  async function load() {
    try {
      const r = await authFetch(fn("google-calendar-oauth") + "?action=status");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setConnection(d.connection ?? null);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setPush(false);
      } else {
        const { data: subscriptions, error } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("enabled", true)
          .limit(1);
        if (error) throw error;
        setPush((subscriptions?.length ?? 0) > 0);
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const on = (e: MessageEvent) => {
      if (
        e.data?.type === "harmony-google-calendar-connected" ||
        e.data?.type === "multicap-google-calendar-connected"
      ) {
        toast.success("Google Calendar conectado");
        void load();
      }
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);

  async function connect() {
    try {
      const r = await authFetch(fn("google-calendar-start"));
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      window.open(d.url, "google-calendar-oauth", "width=520,height=700");
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      const r = await authFetch(fn("google-calendar-sync"), {
        method: "POST",
        body: "{}",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.failed)
        toast.warning(`Sincronizado com ${d.failed} falha(s).`);
      else
        toast.success(
          `Lembretes sincronizados: ${d.created} criado(s), ${d.updated} atualizado(s), ${d.removed} removido(s)`,
        );
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Desconectar o Google Calendar?")) return;
    try {
      const r = await authFetch(fn("google-calendar-oauth") + "?action=disconnect", {
        method: "POST",
        body: "{}",
      });
      if (!r.ok) throw new Error("Não foi possível desconectar");
      setConnection(null);
      toast.success("Google Calendar desconectado");
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  async function enablePush() {
    setPushBusy(true);
    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        throw new Error("Seu navegador não suporta notificações push.");
      }

      const vapidPublicKey = import.meta.env["VITE_VAPID_PUBLIC_KEY"];
      if (!vapidPublicKey) {
        throw new Error("VITE_VAPID_PUBLIC_KEY ainda não foi configurada no Vercel.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(`Permissão de notificações: ${permission}.`);
      }

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;

      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKeyToUint8Array(vapidPublicKey),
        });
      }

      const json = sub.toJSON();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const user = userData.user;
      if (!user || !json.endpoint || !json.keys?.["p256dh"] || !json.keys["auth"]) {
        throw new Error("O navegador criou a assinatura, mas os dados necessários não foram retornados.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("household_id")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw new Error(`Falha ao carregar perfil: ${profileError.message}`);

      const { error: upsertError } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_id: user.id,
            household_id: profile?.household_id ?? null,
            endpoint: json.endpoint,
            p256dh: json.keys["p256dh"],
            auth: json.keys["auth"],
            user_agent: navigator.userAgent,
            enabled: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "endpoint" },
        );

      if (upsertError) {
        throw new Error(`Falha ao salvar no Supabase: ${upsertError.message}${upsertError.details ? ` — ${upsertError.details}` : ""}`);
      }

      const { data: saved, error: verifyError } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("endpoint", json.endpoint)
        .eq("enabled", true)
        .maybeSingle();

      if (verifyError) throw new Error(`Registro salvo, mas a verificação falhou: ${verifyError.message}`);
      if (!saved) throw new Error("O Supabase não confirmou o registro da assinatura.");

      setPush(true);
      toast.success("Notificações push ativadas e dispositivo registrado.");
    } catch (e) {
      console.error("[Harmony Push]", e);
      toast.error(`Push não ativado: ${getErrorMessage(e)}`);
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const { error } = await supabase
          .from("push_subscriptions")
          .update({ enabled: false })
          .eq("endpoint", sub.endpoint);
        if (error) throw error;
        await sub.unsubscribe();
      }
      setPush(false);
      toast.success("Notificações push desativadas");
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="INTEGRAÇÕES"
        subtitle="LEMBRETES DE VENCIMENTOS E NOTIFICAÇÕES DO HARMONY HUB."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="GOOGLE CALENDAR">
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border bg-secondary/30 p-4">
              <CalendarDays className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">LEMBRETES DE PAGAMENTOS</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Conecte sua agenda para criar lembretes automáticos de contas, custos fixos e faturas que tenham vencimento.
                </p>
              </div>
            </div>
            {loading ? (
              <p className="text-xs text-muted-foreground">CARREGANDO...</p>
            ) : connection ? (
              <>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <p className="text-xs font-semibold">{connection.google_email || "CONTA GOOGLE"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {connection.last_synced_at
                        ? `Última sincronização: ${new Date(connection.last_synced_at).toLocaleString("pt-BR")}`
                        : "Ainda não sincronizado"}
                    </p>
                  </div>
                  <Tag tone="success">CONECTADO</Tag>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void sync()}
                    disabled={syncing}
                    className="gradient-primary flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] text-primary-foreground"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "SINCRONIZANDO..." : "SINCRONIZAR LEMBRETES"}
                  </button>
                  <button
                    onClick={() => void disconnect()}
                    className="rounded-xl border px-4 py-2 text-[10px] text-danger"
                  >
                    DESCONECTAR
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => void connect()}
                className="gradient-primary w-full rounded-xl p-3 text-[10px] text-primary-foreground"
              >
                CONECTAR GOOGLE CALENDAR
              </button>
            )}
          </div>
        </Panel>

        <Panel title="NOTIFICAÇÕES PUSH">
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border bg-secondary/30 p-4">
              <Bell className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">AVISOS MESMO COM O APP FECHADO</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Receba alertas de vencimentos neste dispositivo quando o recurso estiver ativado.
                </p>
              </div>
            </div>

            {push ? (
              <>
                <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 p-3 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  NOTIFICAÇÕES ATIVADAS
                </div>
                <button
                  onClick={() => void disablePush()}
                  className="rounded-xl border px-4 py-2 text-[10px]"
                >
                  DESATIVAR NESTE DISPOSITIVO
                </button>
              </>
            ) : (
              <button
                onClick={() => void enablePush()}
                disabled={pushBusy}
                className="gradient-primary w-full rounded-xl p-3 text-[10px] text-primary-foreground"
              >
                {pushBusy ? "ATIVANDO..." : "ATIVAR NOTIFICAÇÕES PUSH"}
              </button>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
