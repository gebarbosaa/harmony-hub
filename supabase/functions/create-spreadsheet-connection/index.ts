import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Não autenticado." }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Configuração indisponível." }, 500);

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Sessão expirada. Entre novamente." }, 401);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Corpo JSON inválido." }, 400); }
    const householdId = typeof body.household_id === "string" ? body.household_id.trim() : "";
    const webAppUrl = typeof body.web_app_url === "string" ? body.web_app_url.trim() : "";
    const sheetName = typeof body.sheet_name === "string" ? body.sheet_name.trim() : "Lancamentos";
    const name = typeof body.name === "string" ? body.name.trim() : "GOOGLE SHEETS";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(householdId)) {
      return json({ error: "Grupo inválido." }, 400);
    }
    if (!webAppUrl || webAppUrl.length > 2048 || !sheetName || sheetName.length > 100 || !name || name.length > 100) {
      return json({ error: "Informe nome, aba e URL válidos." }, 400);
    }
    let parsedUrl: URL;
    try { parsedUrl = new URL(webAppUrl); } catch { return json({ error: "URL do Google Apps Script inválida." }, 400); }
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "script.google.com" || !parsedUrl.pathname.startsWith("/macros/s/")) {
      return json({ error: "Use a URL publicada do Google Apps Script (https://script.google.com/macros/s/...)." }, 400);
    }

    const { data: membership, error: membershipError } = await userClient
      .from("group_members").select("id").eq("household_id", householdId)
      .eq("user_id", user.id).eq("status", "ACTIVE").limit(1).maybeSingle();
    if (membershipError) return json({ error: "Não foi possível validar sua participação no grupo." }, 500);
    if (!membership) return json({ error: "Você não pertence a este grupo." }, 403);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: deactivateError } = await admin.from("spreadsheet_connections")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("household_id", householdId).eq("active", true);
    if (deactivateError) {
      console.error("Spreadsheet connection deactivation failed", deactivateError.message);
      return json({ error: "Não foi possível atualizar a conexão anterior." }, 500);
    }

    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const tokenHash = await sha256(token);
    const { data: connection, error: insertError } = await admin.from("spreadsheet_connections").insert({
      household_id: householdId, name, sheet_name: sheetName, web_app_url: webAppUrl,
      token_hash: tokenHash, sync_token: token, active: true,
    }).select("id,name,web_app_url,sheet_name,active,created_at").single();
    if (insertError || !connection) {
      console.error("Spreadsheet connection insert failed", insertError?.message);
      return json({ error: "Não foi possível criar a conexão." }, 500);
    }
    return json({ connection, token });
  } catch (error) {
    console.error("Spreadsheet connection request failed", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Erro interno ao criar a conexão." }, 500);
  }
});