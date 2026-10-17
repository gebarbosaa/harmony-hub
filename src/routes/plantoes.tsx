import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Clock3, Plus, Trash2, LoaderCircle, CheckCircle2, Pencil, X } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";

type Shift = { id: string; date: string; startTime: string; endTime: string; notes: string; createdAt: string };
type Result = { data: { entries: Shift[] } | null; error: { message: string } | null };
type Query = PromiseLike<Result> & {
  select: (columns: string) => Query;
  eq: (column: string, value: string) => Query;
  maybeSingle: () => Promise<Result>;
  upsert: (values: Record<string, unknown>, options: { onConflict: string }) => Promise<Result>;
};
type Client = { from: (table: string) => Query };
const shiftsTable = () => (supabase as unknown as Client).from("personal_module_data");
const cacheKey = "harmony-personal-v1:plantoes:Escala";

function readCache(): Shift[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(cacheKey) || "[]");
    return Array.isArray(value) ? value as Shift[] : [];
  } catch { return []; }
}
function dateLabel(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

function ShiftPlanner() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("19:00");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sync, setSync] = useState<"local" | "syncing" | "synced" | "error">("local");
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [googleSyncMessage, setGoogleSyncMessage] = useState("");
  const loading = useRef(true);

  useEffect(() => {
    let cancelled = false;
    loading.current = true;
    const cached = readCache();
    const load = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          if (!cancelled) { setUserId(null); setShifts(cached); setSync("local"); setLoaded(true); loading.current = false; }
          return;
        }
        const uid = auth.user.id;
        const { data, error } = await shiftsTable().select("entries").eq("user_id", uid).eq("module_key", "plantoes").eq("tab_key", "Escala").maybeSingle();
        if (cancelled) return;
        if (error) {
          setUserId(null); setShifts(cached); setSync("error");
        } else {
          setUserId(uid); setSync("synced");
          const records = Array.isArray(data?.entries) ? data.entries : cached;
          setShifts(records);
          if (!data && cached.length) {
            const saved = await shiftsTable().upsert({ user_id: uid, module_key: "plantoes", tab_key: "Escala", entries: cached, updated_at: new Date().toISOString() }, { onConflict: "user_id,module_key,tab_key" });
            if (saved.error) setSync("error");
          }
        }
        try { localStorage.setItem(cacheKey, JSON.stringify(Array.isArray(data?.entries) ? data.entries : cached)); } catch { /* local cache is optional */ }
        setLoaded(true); loading.current = false;
      } catch {
        if (!cancelled) { setUserId(null); setShifts(cached); setSync("error"); setLoaded(true); loading.current = false; }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded || loading.current) return;
    try { localStorage.setItem(cacheKey, JSON.stringify(shifts)); window.dispatchEvent(new Event("harmony-shifts-updated")); } catch { /* local cache is optional */ }
    if (!userId) return;
    const timer = window.setTimeout(async () => {
      setSync("syncing");
      try {
        const { error } = await shiftsTable().upsert({ user_id: userId, module_key: "plantoes", tab_key: "Escala", entries: shifts, updated_at: new Date().toISOString() }, { onConflict: "user_id,module_key,tab_key" });
        setSync(error ? "error" : "synced");
      } catch { setSync("error"); }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [shifts, loaded, userId]);

  const addShift = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!date || !startTime || !endTime) return;
    if (editingId) {
      setShifts(current => current.map(shift => shift.id === editingId ? { ...shift, date, startTime, endTime, notes: notes.trim() } : shift).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)));
      setEditingId(null);
    } else {
      const shift: Shift = { id: crypto.randomUUID(), date, startTime, endTime, notes: notes.trim(), createdAt: new Date().toISOString() };
      setShifts(current => [...current, shift].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)));
    }
    setNotes("");
  };
  const editShift = (shift: Shift) => {
    setEditingId(shift.id); setDate(shift.date); setStartTime(shift.startTime); setEndTime(shift.endTime); setNotes(shift.notes);
  };
  const cancelEdit = () => { setEditingId(null); setNotes(""); };
  const removeShift = async (id: string) => {
    const shift = shifts.find(item => item.id === id);
    if (!shift) return;
    const confirmed = window.confirm("Excluir este plantão? Se estiver vinculado ao Google Agenda, o evento correspondente também será excluído. Esta ação não pode ser desfeita.");
    if (!confirmed) return;
    if (userId) {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("Sua sessão expirou. Entre novamente.");
        const base = import.meta.env["VITE_SUPABASE_URL"];
        if (!base) throw new Error("A URL do Supabase não está configurada.");
        const response = await fetch(`${base}/functions/v1/google-calendar-shifts-sync`, { method:"POST", headers:{Authorization:`Bearer ${data.session.access_token}`,"Content-Type":"application/json"}, body:JSON.stringify({action:"delete-shift",shiftId:id}) });
        const result = await response.json();
        if (response.ok && result.deleted) {
          setShifts(current => current.filter(item => item.id !== id));
          setGoogleSyncMessage(result.googleEventDeleted ? "Plantão e evento do Google Agenda excluídos." : "Plantão excluído. Não havia evento vinculado no Google Agenda.");
          return;
        }
        // If Google is not connected, allow removing only the local shift after explicit confirmation.
        if (response.status !== 400 || !String(result.error || "").includes("Google Agenda não conectado")) throw new Error(result.error || "Não foi possível excluir o plantão.");
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Não foi possível excluir o plantão.");
        return;
      }
    }
    setShifts(current => current.filter(item => item.id !== id));
  };
  const syncGoogle = async () => {
    setGoogleSyncing(true); setGoogleSyncMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Entre na sua conta para sincronizar com o Google Agenda.");
      const base = import.meta.env["VITE_SUPABASE_URL"];
      if (!base) throw new Error("A URL do Supabase não está configurada.");
      const response = await fetch(`${base}/functions/v1/google-calendar-shifts-sync`, { method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" }, body: "{}" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha na sincronização de plantões.");
      const message = `Google Agenda: ${result.created} criado(s), ${result.updated} atualizado(s), ${result.imported} importado(s), ${result.conflicts} conflito(s), ${result.deleteConfirmationRequired} exclusão(ões) aguardando confirmação, ${result.failed} falha(s).`;
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const { data: latest } = await shiftsTable().select("entries").eq("user_id", auth.user.id).eq("module_key", "plantoes").eq("tab_key", "Escala").maybeSingle();
        if (Array.isArray(latest?.entries)) { setShifts(latest.entries); try { localStorage.setItem(cacheKey, JSON.stringify(latest.entries)); window.dispatchEvent(new Event("harmony-shifts-updated")); } catch { /* optional cache */ } }
      }
      setGoogleSyncMessage(message);
      if (result.deleteConfirmationRequired > 0) window.alert(`${message} Nenhum evento foi excluído do Google automaticamente.`);
      else if (result.conflicts > 0 || result.failed > 0) window.alert(message);
      else window.alert(message);
    } catch (error) { setGoogleSyncMessage(error instanceof Error ? error.message : "Erro ao sincronizar Google Agenda."); window.alert(error instanceof Error ? error.message : "Erro ao sincronizar Google Agenda."); }
    finally { setGoogleSyncing(false); }
  };
  const todayDate = new Date();
  const today = todayDate.getFullYear() + "-" + String(todayDate.getMonth() + 1).padStart(2, "0") + "-" + String(todayDate.getDate()).padStart(2, "0");
  const upcoming = shifts.filter(shift => shift.date >= today);
  const past = shifts.filter(shift => shift.date < today).reverse();
  const visibleShifts = showPast ? [...upcoming, ...past] : upcoming;
  const syncText = sync === "syncing" ? "Sincronizando…" : sync === "synced" ? "Salvo na sua conta" : sync === "error" ? "Falha na sincronização — dados locais preservados" : "Salvo neste dispositivo";

  return <div className="space-y-5">
    <PageHeader title="PLANTÕES" subtitle="Cadastre seus turnos e consulte sua escala sem misturar com hábitos ou tarefas." />
    <Panel>
      <form onSubmit={addShift} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">Data<input required type="date" value={date} onChange={e => setDate(e.target.value)} className="min-w-0 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" /></label>
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">Início<input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="min-w-0 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" /></label>
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">Fim<input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="min-w-0 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" /></label>
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground sm:col-span-2">Observação<input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex.: plantão diurno, setor…" className="min-w-0 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" /></label>
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground lg:col-span-5">{editingId ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{editingId ? "Salvar alterações" : "Adicionar plantão"}</button>
        {editingId && <button type="button" onClick={cancelEdit} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold lg:col-span-5"><X className="h-4 w-4" />Cancelar edição</button>}
      </form>
    </Panel>
    <Panel title={showPast ? "TODOS OS PLANTÕES" : "PRÓXIMOS PLANTÕES"}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{upcoming.length} próximo(s) · {past.length} anterior(es)</p><button type="button" onClick={() => setShowPast(value => !value)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">{showPast ? "Ocultar anteriores" : "Ver plantões anteriores"}</button></div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs text-muted-foreground">{sync === "syncing" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{syncText}</p><button type="button" onClick={() => void syncGoogle()} disabled={googleSyncing} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">{googleSyncing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5" />}{googleSyncing ? "Sincronizando Google…" : "Sincronizar Google Agenda"}</button></div>{googleSyncMessage && <p role="status" className="mb-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">{googleSyncMessage}</p>}
      {!loaded ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando sua escala…</p> : visibleShifts.length === 0 ? <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center"><CalendarClock className="mx-auto mb-2 h-6 w-6 text-muted-foreground" /><p className="text-sm font-semibold">Nenhum plantão cadastrado para hoje ou para os próximos dias.</p><p className="mt-1 text-xs text-muted-foreground">Adicione seus turnos acima para começar sua escala.</p></div> : <div className="space-y-2">{visibleShifts.map(shift => <article key={shift.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Clock3 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{dateLabel(shift.date)}</p><p className="mt-1 text-xs text-muted-foreground">{shift.startTime}–{shift.endTime}{shift.endTime <= shift.startTime ? " (+1 dia)" : ""}{shift.notes ? ` · ${shift.notes}` : ""}</p></div><button type="button" onClick={() => editShift(shift)} aria-label="Editar plantão" className="rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => void removeShift(shift.id)} aria-label="Excluir plantão" className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></article>)}</div>}
    </Panel>
  </div>;
}

export const Route = createFileRoute("/plantoes")({
  component: ShiftPlanner,
  head: () => ({ meta: [{ title: "PLANTÕES — HARMONY HUB" }] }),
});
