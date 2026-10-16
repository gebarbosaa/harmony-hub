import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!["GET", "DELETE", "POST"].includes(req.method)) {
    return json({ error: "Método não permitido" }, 405);
  }

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Não autenticado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return json({ error: "Configuração indisponível" }, 500);

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Não autenticado" }, 401);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "status";

    // OAuth initiation/callback use the dedicated endpoints. Never accept an
    // unsigned client-provided state user ID through this legacy endpoint.
    if (action === "start" || action === "callback") {
      return json({ error: "Use os endpoints google-calendar-start e google-calendar-callback." }, 410);
    }

    if (action === "status") {
      if (req.method !== "GET") return json({ error: "Método não permitido" }, 405);
      const { data, error } = await supabase
        .from("google_calendar_connections")
        .select("id,google_email,calendar_id,sync_enabled,last_synced_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) return json({ error: "Não foi possível consultar a conexão." }, 500);
      return json({ connection: data });
    }

    if (action === "disconnect") {
      if (req.method !== "POST" && req.method !== "DELETE") {
        return json({ error: "Método não permitido" }, 405);
      }
      const { error } = await supabase
        .from("google_calendar_connections")
        .delete()
        .eq("user_id", user.id);
      if (error) return json({ error: "Não foi possível desconectar a agenda." }, 500);
      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch {
    return json({ error: "Erro interno" }, 500);
  }
});
