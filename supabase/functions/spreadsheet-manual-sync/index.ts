import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const FIELDS = ["date","description","amount","type","category","pay_method","card_name","responsible","installment_current","installment_total","paid","is_fixed"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  try {
    const auth = req.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) return json({ error: "Usuario nao autenticado" }, 401);
    const sb = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY"), { global: { headers: { Authorization: auth } } });
    const { data: userData, error: ue } = await sb.auth.getUser();
    const user = userData && userData.user;
    if (ue || !user) return json({ error: "Sessao expirada" }, 401);

    const body = await req.json().catch(() => ({}));
    const householdId = String(body.household_id || "");
    if (!householdId) return json({ error: "household_id e obrigatorio" }, 400);

    const memberRes = await sb.from("group_members").select("id").eq("household_id", householdId).eq("user_id", user.id).eq("status", "ACTIVE").limit(1).maybeSingle();
    if (!memberRes.data) return json({ error: "Voce nao pertence a este grupo" }, 403);

    // service role para ler/gravar sem restricao de RLS
    const admin = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

    const connRes = await admin.from("spreadsheet_connections").select("id, web_app_url, sync_token").eq("household_id", householdId).eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const conn = connRes.data;
    if (!conn || !conn.web_app_url || !conn.sync_token) return json({ error: "Nenhuma planilha conectada para este grupo" }, 400);

    // 1. busca o estado atual da planilha
    const getUrl = conn.web_app_url + (conn.web_app_url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(conn.sync_token);
    const sheetRes = await fetch(getUrl);
    if (!sheetRes.ok) return json({ error: "Nao foi possivel ler a planilha (HTTP " + sheetRes.status + "). Confira se o Aplicativo da Web foi publicado com acesso 'Qualquer pessoa'." }, 502);
    const sheetData = await sheetRes.json();
    if (sheetData.error) return json({ error: "Planilha respondeu com erro: " + sheetData.error }, 502);
    const sheetRows = Array.isArray(sheetData.rows) ? sheetData.rows : [];

    // 2. busca as transacoes atuais do app
    const txRes = await admin.from("transactions").select("id," + FIELDS.join(",") + ",updated_at").eq("household_id", householdId);
    if (txRes.error) return json({ error: txRes.error.message }, 500);
    const appRows = txRes.data || [];

    const sheetById = new Map();
    for (const r of sheetRows) if (r.id) sheetById.set(String(r.id), r);
    const appById = new Map();
    for (const r of appRows) appById.set(String(r.id), r);

    const toUpsertApp = [];
    const toDeleteAppIds = [];
    const toPushSheet = [];
    const toDeleteSheetIds = [];

    // planilha -> app
    for (const [id, sRow] of sheetById) {
      const aRow = appById.get(id);
      const sTime = sRow.updated_at ? new Date(sRow.updated_at).getTime() : 0;
      if (sRow.deleted) {
        if (aRow) toDeleteAppIds.push(id);
        continue;
      }
      if (!aRow) {
        const row = { id, household_id: householdId, sync_source: "SHEET" };
        for (const f of FIELDS) row[f] = sRow[f];
        toUpsertApp.push(row);
      } else {
        const aTime = aRow.updated_at ? new Date(aRow.updated_at).getTime() : 0;
        if (sTime > aTime) {
          const row = { id, household_id: householdId, sync_source: "SHEET" };
          for (const f of FIELDS) row[f] = sRow[f];
          toUpsertApp.push(row);
        } else if (aTime > sTime) {
          toPushSheet.push(aRow);
        }
      }
    }

    // app -> planilha (linhas que existem no app mas nao na planilha)
    for (const [id, aRow] of appById) {
      if (!sheetById.has(id)) toPushSheet.push(aRow);
    }

    // IDs vindos da planilha não podem sobrescrever registros de outra casa.
    if (toUpsertApp.length) {
      const incomingIds = [...new Set(toUpsertApp.map((row) => String(row.id)))];
      const ownership = await admin.from("transactions").select("id,household_id").in("id", incomingIds);
      if (ownership.error) return json({ error: "Não foi possível validar a propriedade dos lançamentos." }, 500);
      if ((ownership.data || []).some((row) => row.household_id !== householdId)) {
        return json({ error: "A planilha contém IDs pertencentes a outra casa. Nenhum lançamento foi importado." }, 403);
      }
    }

    // aplica no app
    let applied = 0, deletedApp = 0;
    if (toUpsertApp.length) {
      const upRes = await admin.from("transactions").upsert(toUpsertApp, { onConflict: "id" });
      if (upRes.error) return json({ error: "Falha ao gravar no app: " + upRes.error.message }, 500);
      applied = toUpsertApp.length;
    }
    if (toDeleteAppIds.length) {
      const delRes = await admin.from("transactions").delete().in("id", toDeleteAppIds).eq("household_id", householdId);
      if (delRes.error) return json({ error: "Falha ao excluir no app: " + delRes.error.message }, 500);
      deletedApp = toDeleteAppIds.length;
    }

    // aplica na planilha
    let pushed = 0, deletedSheet = 0;
    if (toPushSheet.length || toDeleteSheetIds.length) {
      const postRes = await fetch(conn.web_app_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: conn.sync_token, upserts: toPushSheet, deletes: toDeleteSheetIds }),
      });
      if (!postRes.ok) return json({ error: "Nao foi possivel gravar na planilha (HTTP " + postRes.status + ")" }, 502);
      const postData = await postRes.json().catch(() => ({}));
      if (postData.error) return json({ error: "Planilha respondeu com erro ao gravar: " + postData.error }, 502);
      pushed = toPushSheet.length;
      deletedSheet = toDeleteSheetIds.length;
    }

    return json({
      ok: true,
      importados_da_planilha: applied,
      removidos_no_app: deletedApp,
      enviados_para_planilha: pushed,
      removidos_na_planilha: deletedSheet,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
