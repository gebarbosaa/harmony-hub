import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Clock3, Plus, Trash2, LoaderCircle, CheckCircle2 } from "lucide-react";
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
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sync, setSync] = useState<"local" | "syncing" | "synced" | "error">("local");
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
    try { localStorage.setItem(cacheKey, JSON.stringify(shifts)); } catch { /* local cache is optional */ }
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
    const shift: Shift = { id: crypto.randomUUID(), date, startTime, endTime, notes: notes.trim(), createdAt: new Date().toISOString() };
    setShifts(current => [...current, shift].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)));
    setNotes("");
  };
  const removeShift = (id: string) => setShifts(current => current.filter(shift => shift.id !== id));
  const todayDate = new Date();
  const today = todayDate.getFullYear() + "-" + String(todayDate.getMonth() + 1).padStart(2, "0") + "-" + String(todayDate.getDate()).padStart(2, "0");
  const upcoming = shifts.filter(shift => shift.date >= today);
  const syncText = sync === "syncing" ? "Sincronizando…" : sync === "synced" ? "Salvo na sua conta" : sync === "error" ? "Falha na sincronização — dados locais preservados" : "Salvo neste dispositivo";

  return <div className="space-y-5">
    <PageHeader title="PLANTÕES" subtitle="Cadastre seus turnos e consulte sua escala sem misturar com hábitos ou tarefas." />
    <Panel>
      <form onSubmit={addShift} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">Data<input required type="date" value={date} onChange={e => setDate(e.target.value)} className="min-w-0 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" /></label>
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">Início<input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="min-w-0 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" /></label>
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">Fim<input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="min-w-0 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" /></label>
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground sm:col-span-2">Observação<input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex.: plantão diurno, setor…" className="min-w-0 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground" /></label>
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground lg:col-span-5"><Plus className="h-4 w-4" />Adicionar plantão</button>
      </form>
    </Panel>
    <Panel title="PRÓXIMOS PLANTÕES">
      <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">{sync === "syncing" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{syncText}</p>
      {!loaded ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando sua escala…</p> : upcoming.length === 0 ? <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center"><CalendarClock className="mx-auto mb-2 h-6 w-6 text-muted-foreground" /><p className="text-sm font-semibold">Nenhum plantão cadastrado para hoje ou para os próximos dias.</p><p className="mt-1 text-xs text-muted-foreground">Adicione seus turnos acima para começar sua escala.</p></div> : <div className="space-y-2">{upcoming.map(shift => <article key={shift.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Clock3 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{dateLabel(shift.date)}</p><p className="mt-1 text-xs text-muted-foreground">{shift.startTime}–{shift.endTime}{shift.endTime <= shift.startTime ? " (+1 dia)" : ""}{shift.notes ? ` · ${shift.notes}` : ""}</p></div><button type="button" onClick={() => removeShift(shift.id)} aria-label="Excluir plantão" className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></article>)}</div>}
    </Panel>
  </div>;
}

export const Route = createFileRoute("/plantoes")({
  component: ShiftPlanner,
  head: () => ({ meta: [{ title: "PLANTÕES — HARMONY HUB" }] }),
});
