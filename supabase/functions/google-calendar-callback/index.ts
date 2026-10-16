import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const html = (body: string, status = 200) => new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
const text = (body: string, status = 400) => new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(normalized + "=".repeat((4 - normalized.length % 4) % 4))));
};
function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
async function verifyState(payload: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const normalized = signature.replace(/-/g, "+").replace(/_/g, "/");
  const raw = Uint8Array.from(atob(normalized + "=".repeat((4 - normalized.length % 4) % 4)), (c) => c.charCodeAt(0));
  return crypto.subtle.verify("HMAC", key, raw, new TextEncoder().encode(payload));
}
Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return text("Método não permitido", 405);
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (url.searchParams.has("error")) return text("A autorização do Google foi cancelada ou recusada.", 400);
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const redirectUri = "https://cyopbtfcnyetoolgwqyt.supabase.co/functions/v1/google-calendar-callback";
    if (!code || !state || !clientId || !clientSecret || !supabaseUrl || !serviceRoleKey) return text("Autorização incompleta. Volte ao Harmony Hub e tente novamente.", 400);
    const separator = state.lastIndexOf(".");
    if (separator < 1) return text("Estado OAuth inválido.", 400);
    const payload = state.slice(0, separator);
    const signature = state.slice(separator + 1);
    if (!signature || !(await verifyState(payload, signature, clientSecret))) return text("Estado OAuth inválido.", 400);
    let parsed: { u?: unknown; t?: unknown };
    try { parsed = JSON.parse(decodeBase64Url(payload)); } catch { return text("Estado OAuth inválido.", 400); }
    const issuedAt = Number(parsed.t), now = Date.now();
    if (!isUuid(parsed.u) || !Number.isFinite(issuedAt) || issuedAt > now + 30_000 || now - issuedAt > 600_000) return text("A autorização expirou. Volte ao Harmony Hub e conecte novamente.", 400);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || typeof tokens.access_token !== "string") return text("O Google não concluiu a autorização. Volte ao Harmony Hub e tente novamente.", 400);
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const userInfo = await userInfoResponse.json();
    if (!userInfoResponse.ok || typeof userInfo.email !== "string") return text("Não foi possível confirmar a conta Google autorizada.", 400);
    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: profileError } = await db.from("profiles").select("household_id").eq("id", parsed.u).maybeSingle();
    if (profileError || !profile) { console.error("Google Calendar callback profile lookup failed", profileError?.message); return text("Não foi possível associar a agenda ao seu perfil. Tente novamente.", 500); }
    const { data: existing, error: existingError } = await db.from("google_calendar_connections").select("refresh_token").eq("user_id", parsed.u).eq("calendar_id", "primary").maybeSingle();
    if (existingError) { console.error("Google Calendar callback existing connection lookup failed", existingError.message); return text("Não foi possível concluir a conexão. Tente novamente.", 500); }
    const refreshToken = typeof tokens.refresh_token === "string" && tokens.refresh_token ? tokens.refresh_token : existing?.refresh_token;
    if (!refreshToken) return text("O Google não forneceu um token de renovação. Remova o acesso do Harmony Hub nas permissões da sua conta Google e tente conectar novamente.", 400);
    const { error: saveError } = await db.from("google_calendar_connections").upsert({
      user_id: parsed.u, household_id: profile.household_id ?? null, google_email: userInfo.email,
      access_token: tokens.access_token, refresh_token: refreshToken,
      token_expires_at: new Date(Date.now() + Math.max(60, Number(tokens.expires_in) || 3600) * 1000).toISOString(),
      calendar_id: "primary", sync_enabled: true, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,calendar_id" });
    if (saveError) { console.error("Google Calendar callback connection save failed", saveError.message); return text("Não foi possível salvar a conexão. Tente novamente.", 500); }
    return html(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google Calendar conectado</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:40px"><h2>Google Calendar conectado</h2><p>Você pode fechar esta janela e voltar ao Harmony Hub.</p><script>if(window.opener){window.opener.postMessage({type:"harmony-google-calendar-connected"},"*")}setTimeout(()=>window.close(),900)</script></body></html>`);
  } catch (error) {
    console.error("Google Calendar callback failed", error instanceof Error ? error.message : "unknown error");
    return text("Ocorreu um erro ao conectar o Google Calendar. Tente novamente.", 500);
  }
});