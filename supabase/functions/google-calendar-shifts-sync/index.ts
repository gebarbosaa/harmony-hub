import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Shift = { id: string; date: string; startTime: string; endTime: string; notes?: string; createdAt?: string };
type Connection = { id: string; user_id: string; access_token: string; refresh_token: string; token_expires_at: string | null; calendar_id: string; household_id: string | null };
type Link = { id: string; source_id: string; google_event_id: string; google_etag: string | null };
type GoogleEvent = { id: string; status?: string; etag?: string; summary?: string; description?: string; start?: { dateTime?: string; date?: string; timeZone?: string }; end?: { dateTime?: string; date?: string; timeZone?: string }; extendedProperties?: { private?: Record<string, string> } };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const TZ = "America/Sao_Paulo";
const cacheKey = "harmony-personal-v1:plantoes:Escala";
const validDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T12:00:00Z"));
const validTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
function endDate(date: string, start: string, end: string) { if (end > start) return date; const [y,m,d] = date.split("-").map(Number); const n = new Date(Date.UTC(y,m-1,d+1)); return `${n.getUTCFullYear()}-${String(n.getUTCMonth()+1).padStart(2,"0")}-${String(n.getUTCDate()).padStart(2,"0")}`; }
function eventDateTime(date: string, time: string) { return `${date}T${time}:00`; }
function parseGoogleDate(value?: string) { if (!value) return null; const d = new Date(value); if (Number.isNaN(d.getTime())) return null; const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).formatToParts(d); const p = Object.fromEntries(parts.map(x => [x.type,x.value])); return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }; }
async function getAccessToken(c: Connection, db: ReturnType<typeof createClient>) {
  if (c.token_expires_at && new Date(c.token_expires_at).getTime() > Date.now() + 60_000) return c.access_token;
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID"), clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("A integração Google não está configurada no servidor.");
  const response = await fetch("https://oauth2.googleapis.com/token", { method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:c.refresh_token,grant_type:"refresh_token"}) });
  const result = await response.json(); if (!response.ok || !result.access_token) throw new Error("Não foi possível renovar o acesso ao Google. Reconecte sua conta em Integrações.");
  await db.from("google_calendar_connections").update({ access_token:result.access_token, token_expires_at:new Date(Date.now()+Number(result.expires_in||3600)*1000).toISOString(), updated_at:new Date().toISOString() }).eq("id",c.id);
  return result.access_token as string;
}
async function googleRequest(url: string, access: string, init: RequestInit = {}) { return fetch(url, { ...init, headers: { Authorization:`Bearer ${access}`, "Content-Type":"application/json", ...(init.headers||{}) } }); }
function toGoogleEvent(s: Shift): GoogleEvent { const finishDate = endDate(s.date,s.startTime,s.endTime); return { summary:"Plantão", description:s.notes || "Plantão cadastrado no Harmony Hub", start:{dateTime:eventDateTime(s.date,s.startTime),timeZone:TZ}, end:{dateTime:eventDateTime(finishDate,s.endTime),timeZone:TZ}, extendedProperties:{private:{harmonyHubType:"shift",harmonyHubShiftId:s.id}} }; }
function fromGoogleEvent(e: GoogleEvent, existing?: Shift): Shift | null {
  const start = e.start?.dateTime ? parseGoogleDate(e.start.dateTime) : e.start?.date ? {date:e.start.date,time:"00:00"} : null;
  const end = e.end?.dateTime ? parseGoogleDate(e.end.dateTime) : e.end?.date ? {date:e.end.date,time:"23:59"} : null;
  if (!start || !end || !validDate(start.date) || !validTime(start.time) || !validTime(end.time)) return null;
  const id = e.extendedProperties?.private?.harmonyHubShiftId || existing?.id || crypto.randomUUID();
  const description = (e.description || "").replace(/\s*\n?\s*Criado pelo Harmony Hub\.?/g, "").trim();
  return { id, date:start.date, startTime:start.time, endTime:end.time, notes:description === "Plantão cadastrado no Harmony Hub" ? "" : description, createdAt:existing?.createdAt || new Date().toISOString() };
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers:cors });
  if (req.method !== "POST") return json({error:"Método não permitido"},405);
  try {
    const auth = req.headers.get("Authorization"); if (!auth) return json({error:"Não autenticado"},401);
    const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return json({error:"Configuração do Supabase incompleta."},500);
    const userClient = createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:{user}} = await userClient.auth.getUser(); if (!user) return json({error:"Não autenticado"},401);
    const db = createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:connection,error:connectionError} = await db.from("google_calendar_connections").select("*").eq("user_id",user.id).eq("sync_enabled",true).eq("calendar_id","primary").maybeSingle();
    if (connectionError) throw new Error("Não foi possível consultar a conexão do Google.");
    if (!connection) return json({error:"Google Agenda não conectado. Abra Ajustes → Integrações e conecte sua conta Google."},400);
    const c = connection as Connection; const access = await getAccessToken(c,db); const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.calendar_id)}/events`;
    let requestBody: { action?: string; shiftId?: string } = {};
    try { requestBody = await req.json(); } catch { /* empty request is a normal sync */ }
    const {data:row,error:rowError} = await db.from("personal_module_data").select("entries").eq("user_id",user.id).eq("module_key","plantoes").eq("tab_key","Escala").maybeSingle();
    if (rowError) throw new Error("Não foi possível carregar sua escala do Harmony Hub.");
    let shifts: Shift[] = Array.isArray(row?.entries) ? row.entries.filter((x: unknown): x is Shift => !!x && typeof x === "object" && typeof (x as Shift).id === "string" && validDate((x as Shift).date) && validTime((x as Shift).startTime) && validTime((x as Shift).endTime)) : [];
    if (requestBody.action === "delete-shift") {
      if (typeof requestBody.shiftId !== "string" || !shifts.some(s => s.id === requestBody.shiftId)) return json({error:"Plantão não encontrado."},404);
      const {data:linked,error:linkedError} = await db.from("google_calendar_event_links").select("id,google_event_id").eq("connection_id",c.id).eq("source_type","shift").eq("source_id",requestBody.shiftId).maybeSingle();
      if (linkedError) throw new Error("Não foi possível verificar o vínculo com o Google Agenda.");
      if (linked) {
        const deleted = await googleRequest(`${base}/${encodeURIComponent(linked.google_event_id)}`,access,{method:"DELETE"});
        if (!deleted.ok && deleted.status !== 404) return json({error:"O Google não confirmou a exclusão. O plantão foi mantido no Harmony Hub."},502);
        const {error:unlinkError} = await db.from("google_calendar_event_links").delete().eq("id",linked.id);
        if (unlinkError) throw new Error("O evento foi excluído do Google, mas não foi possível remover o vínculo. Execute a sincronização novamente.");
      }
      const remaining = shifts.filter(s=>s.id!==requestBody.shiftId);
      const {error:deleteSaveError} = await db.from("personal_module_data").upsert({user_id:user.id,module_key:"plantoes",tab_key:"Escala",entries:remaining,updated_at:new Date().toISOString()},{onConflict:"user_id,module_key,tab_key"});
      if (deleteSaveError) throw new Error("Não foi possível salvar a exclusão da escala.");
      return json({ok:true,deleted:true,googleEventDeleted:!!linked});
    }
    const {data:existingLinks,error:linkError} = await db.from("google_calendar_event_links").select("id,source_id,google_event_id,google_etag").eq("connection_id",c.id).eq("source_type","shift");
    if (linkError) throw new Error("Não foi possível consultar os vínculos de eventos.");
    const links = (existingLinks || []) as Link[]; const linkedByShift = new Map(links.map(l=>[l.source_id,l])); const linkedByEvent = new Map(links.map(l=>[l.google_event_id,l]));
    let created=0,updated=0,imported=0,conflicts=0,deleteConfirmationRequired=0,failed=0,removed=0;
    // Pull only linked events plus events explicitly tagged by this app. Never import unrelated personal events.
    const timeMin = new Date(Date.now()-370*86400000).toISOString(), timeMax = new Date(Date.now()+730*86400000).toISOString();
    let pageToken: string | undefined; const events: GoogleEvent[] = [];
    do { const query = new URLSearchParams({showDeleted:"true",singleEvents:"true",maxResults:"2500",timeMin,timeMax}); if(pageToken)query.set("pageToken",pageToken); const response=await googleRequest(`${base}?${query}`,access); const payload=await response.json(); if(!response.ok)throw new Error("O Google recusou a leitura da agenda. Reconecte a integração se necessário."); events.push(...(payload.items||[])); pageToken=payload.nextPageToken; } while(pageToken);
    for(const link of links){
      const event=events.find(e=>e.id===link.google_event_id); const local=shifts.find(s=>s.id===link.source_id);
      if(event?.status==="cancelled") { if(local) { shifts=shifts.filter(s=>s.id!==local.id); removed++; } await db.from("google_calendar_event_links").delete().eq("id",link.id); continue; }
      // An event absent from this bounded listing may have moved outside the window; do not infer deletion.
      if(!event) continue;
      if(!local) { deleteConfirmationRequired++; continue; }
      const googleShift=fromGoogleEvent(event,local); if(!googleShift) { failed++; continue; }
      const googleChanged=!!event.etag && event.etag!==link.google_etag;
      if(googleChanged) { shifts=shifts.map(s=>s.id===local.id?googleShift:s); await db.from("google_calendar_event_links").update({google_etag:event.etag||null,due_date:googleShift.date,last_local_updated_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",link.id); updated++; }
    }
    // Import explicitly tagged Harmony events from Google, preserving their stable IDs.
    for(const event of events){ if(!event.id || event.status==="cancelled" || linkedByEvent.has(event.id) || (event.extendedProperties?.private?.harmonyHubType!=="shift" && event.summary?.trim().toLocaleLowerCase("pt-BR")!=="plantão"))continue; const shift=fromGoogleEvent(event); if(!shift)continue; if(shifts.some(s=>s.id===shift.id)){ conflicts++; continue; } shifts.push(shift); const {error}=await db.from("google_calendar_event_links").insert({connection_id:c.id,household_id:c.household_id,source_type:"shift",source_id:shift.id,source_period:"shift",google_event_id:event.id,google_etag:event.etag||null,due_date:shift.date,last_local_updated_at:new Date().toISOString()}); if(error){failed++;shifts=shifts.filter(s=>s.id!==shift.id)}else imported++; }
    // Push local additions and changes. Include mappings imported earlier in this same pass.
    const {data:refreshedLinks} = await db.from("google_calendar_event_links").select("id,source_id,google_event_id,google_etag").eq("connection_id",c.id).eq("source_type","shift");
    const currentLinks = (refreshedLinks || []) as Link[];
    const currentLinkByShift = new Map(currentLinks.map(l=>[l.source_id,l]));
    for(const shift of shifts){ const link=currentLinkByShift.get(shift.id); if(!link){ const response=await googleRequest(base,access,{method:"POST",body:JSON.stringify(toGoogleEvent(shift))}); const event=await response.json(); if(!response.ok){failed++;continue;} const {error}=await db.from("google_calendar_event_links").insert({connection_id:c.id,household_id:c.household_id,source_type:"shift",source_id:shift.id,source_period:"shift",google_event_id:event.id,google_etag:event.etag||null,due_date:shift.date,last_local_updated_at:new Date().toISOString()}); if(error)failed++;else created++; continue; }
      const current=events.find(e=>e.id===link.google_event_id); if(!current || current.status==="cancelled")continue;
      const desired=toGoogleEvent(shift); const parsed=fromGoogleEvent(current,shift); if(parsed && parsed.date===shift.date && parsed.startTime===shift.startTime && parsed.endTime===shift.endTime && (parsed.notes||"")===(shift.notes||""))continue;
      // If the Google event changed since last sync, the pull above takes precedence to avoid overwriting Google edits.
      if(current.etag && link.google_etag && current.etag!==link.google_etag)continue;
      const response=await googleRequest(`${base}/${encodeURIComponent(link.google_event_id)}`,access,{method:"PUT",body:JSON.stringify(desired)}); const event=await response.json(); if(response.ok){await db.from("google_calendar_event_links").update({google_etag:event.etag||null,due_date:shift.date,last_local_updated_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",link.id);updated++;}else if(response.status===404){failed++;}else failed++;
    }
    shifts.sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime));
    const {error:saveError}=await db.from("personal_module_data").upsert({user_id:user.id,module_key:"plantoes",tab_key:"Escala",entries:shifts,updated_at:new Date().toISOString()},{onConflict:"user_id,module_key,tab_key"}); if(saveError)throw new Error("A agenda foi consultada, mas não foi possível salvar a escala sincronizada.");
    await db.from("google_calendar_connections").update({last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",c.id);
    return json({ok:failed===0,created,updated,imported,conflicts,deleteConfirmationRequired,failed,removed,synced_at:new Date().toISOString()});
  } catch(error) { console.error("Google shift sync failed",error instanceof Error?error.message:"unknown error"); return json({error:error instanceof Error?error.message:"Erro interno na sincronização"},500); }
});
