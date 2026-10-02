import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, CalendarDays, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
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

function vapidKeyToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Erro desconhecido.");
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
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json",
      },
    });
  }

  async function load() {
    try {
      const response = await authFetch(fn("google-calendar-oauth") + "?action=status");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erro ao carregar o Google Calendar.");
      setConnection(data.connection ?? null);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!userData.user) {
        setPush(false);
        return;
      }

      const { data: subscription, error: subscriptionError } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", userData.user.id)
        .eq("enabled", true)
        .limit(1)
        .maybeSingle();

      if (subscriptionError) throw subscriptionError;
      setPush(Boolean(subscription));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();

    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        type === "harmony-google-calendar-connected" ||
        type === "multicap-google-calendar-connected"
      ) {
        toast.success("Google Calendar conectado");
        void load();
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function connect() {
    try {
      const response = await authFetch(fn("google-calendar-start"));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível conectar.");
      window.open(data.url, "google-calendar-oauth", "width=520,height=700");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      const response = await authFetch(fn("google-calendar-sync"), {
        method: "POST",
        body: "{}",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erro na sincronização.");

      if (data.failed) {
        toast.warning(`Sincronizado com ${data.failed} falha(s).`);
      } else {
        toast.success(
          `Lembretes sincronizados: ${data.created} criado(s), ${data.updated} atualizado(s), ${data.removed} removido(s)`,
        );
      }

      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Desconectar o Google Calendar?")) return;

    try {
      const response = await authFetch(
        fn("google-calendar-oauth") + "?action=disconnect",
        { method: "POST", body: "{}" },
      );
      if (!response.ok) throw new Error("Não foi possível desconectar.");
      setConnection(null);
      toast.success("Google Calendar desconectado");
    } catch (error) {
      toast.error(errorMessage(error));
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
        throw new Error("VITE_VAPID_PUBLIC_KEY não está configurada no Vercel.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permissão de notificações não concedida.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKeyToBytes(vapidPublicKey),
        });
      }

      const json = subscription.toJSON();
      const endpoint = json.endpoint;
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;

      if (!endpoint || !p256dh || !auth) {
        throw new Error("O navegador não retornou os dados da assinatura.");
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Faça login novamente.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("household_id")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const { error: saveError } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_id: userData.user.id,
            household_id: profile?.household_id ?? null,
            endpoint,
            p256dh,
            auth,
            user_agent: navigator.userAgent,
            enabled: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "endpoint" },
        );

      if (saveError) throw saveError;

      const { data: saved, error: verifyError } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("endpoint", endpoint)
        .eq("user_id", userData.user.id)
        .eq("enabled", true)
        .maybeSingle();

      if (verifyError) throw verifyError;
      if (!saved) throw new Error("O Supabase não confirmou a assinatura.");

      setPush(true);
      toast.success("Notificações push ativadas e dispositivo registrado.");
    } catch (error) {
      console.error("[Harmony Push]", error);
      toast.error("Push: " + errorMessage(error));
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        const { error } = await supabase
          .from("push_subscriptions")
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq("endpoint", subscription.endpoint);

        if (error) throw error;
        await subscription.unsubscribe();
      }

      setPush(false);
      toast.success("Notificações push desativadas");
    } catch (error) {
      toast.error(errorMessage(error));
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
                    <p className="text-xs font-semibold">
                      {connection.google_email || "CONTA GOOGLE"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {connection.last_synced_at
                        ? "Última sincronização: " +
                          new Date(connection.last_synced_at).toLocaleString("pt-BR")
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
