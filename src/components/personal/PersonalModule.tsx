import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Sun, Moon, Plus, Trash2, Check, Play, Pause, RotateCcw, List, Table2, CalendarDays, ChartNoAxesColumn, Search, ArrowUpDown, ChevronLeft, ChevronRight, Clock3, CalendarPlus, LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel } from "@/components/ui-kit";

export type PersonalModuleKey = "desenvolvimento-pessoal" | "casa" | "leitura" | "alimentacao" | "habitos-rotina" | "rotina" | "treinos";
type Entry = { id: string; text: string; extra?: string; done?: boolean; createdAt: string; date?: string; time?: string; completions?: string[] };
const CONFIG: Record<PersonalModuleKey, { title: string; emoji: string; description: string; tabs: string[] }> = {
  "desenvolvimento-pessoal": { title: "Desenvolvimento Pessoal", emoji: "🌱", description: "Um espaço para se conhecer, cuidar de si e acompanhar seu crescimento.", tabs: ["Sobre mim","Metas","Diário","Humor & Score","Respiração","Gratidão","Carta","30 Dias"] },
  casa: { title: "Casa", emoji: "🏠", description: "Organize compras, cômodos, tarefas e cuidados da casa.", tabs: ["Cômodos","Mercado","Rotina","Despensa","Cardápio","Manutenção","Co-op","Segurança","Utilidades"] },
  leitura: { title: "Leitura", emoji: "📖", description: "Acompanhe suas leituras, sua estante e seu ritmo.", tabs: ["Lendo agora","Estante","Insights","Emprestados","Desafio"] },
  alimentacao: { title: "Alimentação", emoji: "🍽️", description: "Planeje refeições e acompanhe seus registros alimentares.", tabs: ["Cardápio","Jejum","Receitas","Lista","Diário"] },
  "habitos-rotina": { title: "Hábitos", emoji: "✅", description: "Acompanhe hábitos, frequência e consistência ao longo do tempo.", tabs: ["Minha semana","Meu mês","Diário","Revisão","Foco"] },
  rotina: { title: "Rotina", emoji: "🕒", description: "Organize atividades do dia, planeje sua semana e distribua melhor seu tempo.", tabs: ["Hoje","Semana","Planejamento"] },
  treinos: { title: "Treinos", emoji: "💪", description: "Planeje seus treinos, registre exercícios, séries, repetições e cargas.", tabs: ["Plano semanal","Histórico"] },
};
const QUOTES = ["Pequenos passos também levam longe.","Você não precisa fazer tudo hoje.","Consistência é construída um dia de cada vez.","Cuide de você como cuidaria de alguém que ama."];
const MARKET_CATEGORIES = ["Hortifrúti","Açougue","Laticínios","Mercearia","Padaria","Congelados","Limpeza","Higiene","Bebidas"];
const MEALS = ["Café da manhã","Almoço","Lanche","Janta","Ceia","Pós-treino"];
const MOODS = ["😞","😕","😐","🙂","😄"];
const WORKOUT_DAYS = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"] as const;
type WorkoutDay = (typeof WORKOUT_DAYS)[number];

/* ---------- Treinos: block-based rich data model (scoped to this module) ---------- */
type WorkoutExercise = { id: string; name: string; sets: number; reps: string; load: string; done: boolean };
type WorkoutBlock = { id: string; name: string; day: string; exercises: WorkoutExercise[]; done: boolean; createdAt: string };
type WorkoutEntry = Entry & { exercises?: string };

function parseWorkoutExercises(json: string | undefined): WorkoutExercise[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is WorkoutExercise => {
      return !!item && typeof item === "object" && typeof item.id === "string" && typeof item.name === "string" && typeof item.sets === "number" && typeof item.reps === "string" && typeof item.load === "string" && typeof item.done === "boolean";
    });
  } catch {
    return [];
  }
}
function entryToWorkoutBlock(entry: WorkoutEntry): WorkoutBlock {
  return {
    id: entry.id,
    name: entry.text || "Treino",
    day: entry.extra && (WORKOUT_DAYS as readonly string[]).includes(entry.extra) ? entry.extra : "Segunda",
    exercises: parseWorkoutExercises(entry.exercises),
    done: !!entry.done,
    createdAt: entry.createdAt,
  };
}
function workoutBlockToEntry(block: WorkoutBlock): WorkoutEntry {
  return {
    id: block.id,
    text: block.name,
    extra: block.day,
    exercises: JSON.stringify(block.exercises),
    done: block.done,
    createdAt: block.createdAt,
  };
}
function makeWorkoutExercise(partial: Partial<WorkoutExercise> = {}): WorkoutExercise {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    name: "",
    sets: 3,
    reps: "10–12",
    load: "",
    done: false,
    ...partial,
  };
}
function makeWorkoutBlock(partial: Partial<WorkoutBlock> = {}): WorkoutBlock {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    name: "Novo treino",
    day: "Segunda",
    exercises: [],
    done: false,
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

function localDateKey(date = new Date()): string {
  return String(date.getFullYear()) + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
const keyFor = (module: string, tab: string) => "harmony-personal-v1:" + module + ":" + tab;
function sharedTabFor(module: PersonalModuleKey, tab: string): string {
  if (module === "habitos-rotina" && (tab === "Minha semana" || tab === "Meu mês")) return "Hábitos";
  if (module === "rotina" && (tab === "Hoje" || tab === "Semana" || tab === "Planejamento")) return "Atividades";
  if (module === "casa" && tab === "Rotina") return "Tarefas domésticas";
  return tab;
}
function legacyTabsFor(module: PersonalModuleKey, tab: string): string[] {
  if (module === "habitos-rotina" && (tab === "Minha semana" || tab === "Meu mês")) return ["Minha semana", "Meu mês"];
  if (module === "rotina" && (tab === "Hoje" || tab === "Semana" || tab === "Planejamento")) return ["Hoje", "Semana", "Planejamento"];
  if (module === "casa" && tab === "Rotina") return ["Rotina"];
  return [];
}
function mergeEntries(...groups: Entry[][]): Entry[] {
  const byId = new Map<string, Entry>();
  for (const group of groups) for (const entry of group) byId.set(entry.id, { ...byId.get(entry.id), ...entry });
  return [...byId.values()];
}
function readLocal(module: string, tab: string): Entry[] {
  try {
    const raw = localStorage.getItem(keyFor(module, tab));
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? (value as Entry[]) : [];
  } catch (error) {
    console.warn("[personal-module] local cache could not be read", error);
    return [];
  }
}

type PersonalModuleRow = { entries: Entry[] };
type PersonalModuleResult = { data: PersonalModuleRow | null; error: { message: string } | null };
type PersonalModuleQuery = PromiseLike<PersonalModuleResult> & {
  select: (columns: string) => PersonalModuleQuery;
  eq: (column: string, value: string) => PersonalModuleQuery;
  maybeSingle: () => Promise<PersonalModuleResult>;
  upsert: (values: Record<string, unknown>, options: { onConflict: string }) => Promise<PersonalModuleResult>;
};
type PersonalModuleClient = { from: (table: string) => PersonalModuleQuery };
const personalData = () => (supabase as unknown as PersonalModuleClient).from("personal_module_data");

export function PersonalModule({ module }: { module: PersonalModuleKey }) {
  const config = CONFIG[module];
  const [tab,setTab] = useState(config.tabs[0]);
  const [entries,setEntries] = useState<Entry[]>([]);
  const [loadedKey,setLoadedKey] = useState("");
  const [userId,setUserId] = useState<string|null>(null);
  const [syncStatus,setSyncStatus] = useState<"local"|"syncing"|"synced"|"error">("local");
  const loadingRef = useRef(true);
  const [input,setInput] = useState("");
  const [extra,setExtra] = useState("");
  const [routineDate,setRoutineDate] = useState(() => localDateKey());
  const [routineTime,setRoutineTime] = useState("09:00");
  const [routineModalOpen,setRoutineModalOpen] = useState(false);
  const [plannerDate,setPlannerDate] = useState(() => localDateKey());
  const [plannerView,setPlannerView] = useState<"dia"|"semana"|"mes"|"lista">("semana");
  const [theme,setTheme] = useState<"light"|"dark">("light");
  const [mood,setMood] = useState("🙂");
  const [score,setScore] = useState(7);
  const [seconds,setSeconds] = useState(60);
  const [running,setRunning] = useState(false);
  const [category,setCategory] = useState(MARKET_CATEGORIES[0]);
  const [mealDay,setMealDay] = useState("Segunda");
  const [mealType,setMealType] = useState("Almoço");
  const [habitsView,setHabitsView] = useState<"lista"|"tabela"|"semana"|"calendario"|"progresso">("semana");
  const [habitsSearch,setHabitsSearch] = useState("");
  const [habitsSort,setHabitsSort] = useState<"recentes"|"nome"|"conclusoes">("nome");
  const [habitsGroup,setHabitsGroup] = useState<"nenhum"|"status">("nenhum");
  const [page,setPage] = useState("0");
  const [totalPages,setTotalPages] = useState("240");
  const activeKey = module + ":" + tab;
  const storageTab = sharedTabFor(module, tab);
  const ready = loadedKey === activeKey;
  const now = new Date();
  const month = now.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  const quote = QUOTES[now.getDate() % QUOTES.length];

  useEffect(() => {
    try {
      setTheme(localStorage.getItem("harmony-personal-theme") === "dark" ? "dark" : "light");
    } catch (error) {
      console.warn("[personal-module] theme preference could not be read", error);
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    loadingRef.current = true;
    setUserId(null);
    setLoadedKey("");
    const legacyTabs = legacyTabsFor(module, tab);
    const localEntries = mergeEntries(...legacyTabs.map(legacyTab => readLocal(module, legacyTab)), readLocal(module, storageTab));
    const writeLocalCache = (records: Entry[]) => {
      try {
        localStorage.setItem(keyFor(module, storageTab), JSON.stringify(records));
        for (const legacyTab of legacyTabs) localStorage.removeItem(keyFor(module, legacyTab));
      } catch (error) {
        console.warn("[personal-module] local cache migration could not be completed", error);
      }
    };
    async function load() {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          if (!cancelled) {
            setUserId(null); setSyncStatus("local"); setEntries(localEntries);
            writeLocalCache(localEntries); loadingRef.current = false; setLoadedKey(activeKey);
          }
          return;
        }
        const uid = auth.user.id;
        const primary = await personalData().select("entries").eq("user_id", uid).eq("module_key", module).eq("tab_key", storageTab).maybeSingle();
        if (cancelled) return;
        if (primary.error) {
          setUserId(null); setSyncStatus("error"); setEntries(localEntries);
          writeLocalCache(localEntries); loadingRef.current = false; setLoadedKey(activeKey);
          return;
        }
        const legacyResults = await Promise.all(legacyTabs.map(legacyTab =>
          personalData().select("entries").eq("user_id", uid).eq("module_key", module).eq("tab_key", legacyTab).maybeSingle()
        ));
        if (cancelled) return;
        const remoteLegacy = legacyResults.flatMap(result => !result.error && Array.isArray(result.data?.entries) ? result.data.entries : []);
        const remotePrimary = Array.isArray(primary.data?.entries) ? primary.data.entries : [];
        const combined = mergeEntries(localEntries, remoteLegacy, remotePrimary);
        setUserId(uid);
        setSyncStatus("synced");
        setEntries(combined);
        writeLocalCache(combined);
        const primaryIds = new Set(remotePrimary.map(entry => entry.id));
        const needsMigration = !primary.data || combined.some(entry => !primaryIds.has(entry.id));
        if (needsMigration) {
          const { error: saveError } = await personalData().upsert({
            user_id: uid, module_key: module, tab_key: storageTab,
            entries: module === "treinos" ? (combined as WorkoutEntry[]).map(e => workoutBlockToEntry(entryToWorkoutBlock(e))) : combined,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,module_key,tab_key" });
          if (saveError) setSyncStatus("error");
        }
        if (!cancelled) { loadingRef.current = false; setLoadedKey(activeKey); }
      } catch (error) {
        console.error("[personal-module] load failed", error);
        if (!cancelled) {
          setUserId(null); setSyncStatus("error"); setEntries(localEntries);
          writeLocalCache(localEntries); loadingRef.current = false; setLoadedKey(activeKey);
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [module, tab, activeKey, storageTab]);

  useEffect(() => {
    if (!ready || loadingRef.current) return;
    try {
      localStorage.setItem(keyFor(module, storageTab), JSON.stringify(entries));
    } catch (error) {
      console.warn("[personal-module] local cache could not be updated", error);
    }
    if (!userId) return;
    const timeout = window.setTimeout(async () => {
      setSyncStatus("syncing");
      try {
        const payload: Entry[] = module === "treinos"
          ? (entries as WorkoutEntry[]).map((e) => workoutBlockToEntry(entryToWorkoutBlock(e)))
          : entries;
        const { error } = await personalData().upsert({ user_id: userId, module_key: module, tab_key: storageTab, entries: payload, updated_at: new Date().toISOString() }, { onConflict: "user_id,module_key,tab_key" });
        if (error) { setSyncStatus("error"); console.error("[personal-module] save failed", error.message); }
        else setSyncStatus("synced");
      } catch (error) { setSyncStatus("error"); console.error("[personal-module] save failed", error); }
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [entries, ready, userId, module, tab, storageTab]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds(s => { if (s <= 1) { setRunning(false); return 0; } return s-1; }),1000);
    return () => window.clearInterval(id);
  },[running]);

  const add = (text=input, note=extra) => {
    if (!text.trim()) return;
    const item: Entry = { id: crypto.randomUUID(), text: text.trim(), extra: note.trim(), createdAt: new Date().toISOString() };
    setEntries(old => [item,...old]); setInput(""); setExtra("");
  };
  const remove = (id:string) => setEntries(old=>old.filter(e=>e.id!==id));
  const recordWorkoutSession = async (block: WorkoutBlock) => {
    const createdAt = new Date().toISOString();
    const session = makeWorkoutBlock({ ...block, id: crypto.randomUUID(), day: todayKey, done: true, createdAt, exercises: block.exercises.map(ex=>({ ...ex, done: true })) });
    const cached = readLocal("treinos", "Histórico") as WorkoutEntry[];
    let history = cached;
    let canSync = !!userId;
    if (userId) {
      try {
        const result = await personalData().select("entries").eq("user_id", userId).eq("module_key", "treinos").eq("tab_key", "Histórico").maybeSingle();
        if (result.error) { canSync = false; setSyncStatus("error"); }
        else if (Array.isArray(result.data?.entries)) history = result.data.entries as WorkoutEntry[];
      } catch { canSync = false; setSyncStatus("error"); }
    }
    const next = [...history, workoutBlockToEntry(session)];
    try { localStorage.setItem(keyFor("treinos", "Histórico"), JSON.stringify(next)); } catch { /* local history is optional */ }
    if (userId && canSync) {
      setSyncStatus("syncing");
      try {
        const result = await personalData().upsert({ user_id: userId, module_key: "treinos", tab_key: "Histórico", entries: next, updated_at: new Date().toISOString() }, { onConflict: "user_id,module_key,tab_key" });
        setSyncStatus(result.error ? "error" : "synced");
      } catch { setSyncStatus("error"); }
    }
  };
  const todayKey = localDateKey();
  const toggle = (id:string) => setEntries(old=>old.map(e=>{
    if (e.id !== id) return e;
    if (module === "habitos-rotina") {
      const completions = e.completions ?? (e.done ? [todayKey] : []);
      return { ...e, done: !completions.includes(todayKey), completions: completions.includes(todayKey) ? completions.filter(d=>d!==todayKey) : [...completions, todayKey] };
    }
    return { ...e, done: !e.done };
  }));
  const addRoutine = () => {
    if (!input.trim() || !routineDate) return;
    const item: Entry = { id: crypto.randomUUID(), text: input.trim(), extra: extra.trim(), date: routineDate, time: routineTime, createdAt: new Date().toISOString() };
    setEntries(old => [...old, item].sort((a,b)=>(a.date||"9999-99-99").localeCompare(b.date||"9999-99-99")||(a.time||"").localeCompare(b.time||"")));
    setInput(""); setExtra("");
  };
  const routineEntries = entries.filter(e => {
    if (module !== "rotina" || !e.date) return true;
    if (tab === "Planejamento") return true;
    if (tab === "Hoje") return e.date === todayKey;
    const today = new Date();
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return e.date >= localDateKey(monday) && e.date <= localDateKey(sunday);
  });
  const plannerAnchor = new Date(plannerDate + "T12:00:00");
  const plannerWeekStart = new Date(plannerAnchor);
  plannerWeekStart.setDate(plannerWeekStart.getDate() - ((plannerWeekStart.getDay() + 6) % 7));
  const plannerWeek = Array.from({length:7}, (_,i) => { const d = new Date(plannerWeekStart); d.setDate(d.getDate()+i); return d; });
  const plannerMonthStart = new Date(plannerAnchor.getFullYear(), plannerAnchor.getMonth(), 1);
  const plannerMonthDays = Array.from({length:new Date(plannerAnchor.getFullYear(), plannerAnchor.getMonth()+1, 0).getDate()},(_,i)=>new Date(plannerAnchor.getFullYear(),plannerAnchor.getMonth(),i+1));
  const plannerItemsFor = (date: Date) => entries.filter(e=>e.date===localDateKey(date)).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  const shiftPlanner = (amount:number) => { const d = new Date(plannerAnchor); if(plannerView==="mes") d.setMonth(d.getMonth()+amount); else d.setDate(d.getDate()+amount*(plannerView==="semana"?7:1)); setPlannerDate(localDateKey(d)); };
  const routineForm = <form className="grid gap-3 rounded-2xl border border-border/70 bg-background/70 p-4 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();addRoutine();setRoutineModalOpen(false);}}>
    <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground sm:col-span-2">Atividade<input className="min-w-0 rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-foreground" value={input} onChange={e=>setInput(e.target.value)} placeholder="Ex.: academia, estudar, organizar a casa…" aria-label="Atividade da rotina" required /></label>
    <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">Data<input type="date" className="rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-foreground" value={routineDate} onChange={e=>setRoutineDate(e.target.value)} required /></label>
    <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">Horário<input type="time" className="rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-foreground" value={routineTime} onChange={e=>setRoutineTime(e.target.value)} required /></label>
    <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground sm:col-span-2">Observações (opcional)<input className="min-w-0 rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-foreground" value={extra} onChange={e=>setExtra(e.target.value)} placeholder="Detalhes ou preparação necessária" aria-label="Detalhes da atividade" /></label>
    <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground sm:col-span-2" type="submit"><CalendarPlus className="h-4 w-4"/>Adicionar ao planner</button>
  </form>;
  const routinePlanner = <div className="space-y-4">
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{[{label:"Atividades",value:entries.length},{label:"Hoje",value:entries.filter(e=>e.date===todayKey).length},{label:"Concluídas",value:entries.filter(e=>e.done).length}].map(item=><div key={item.label} className="rounded-2xl border border-border/70 bg-card p-3 sm:p-4"><p className="text-[11px] font-medium text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{item.value}</p></div>)}<button type="button" onClick={()=>{setRoutineDate(plannerDate);setRoutineModalOpen(true)}} className="hidden items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3 text-xs font-semibold text-primary sm:flex"><Plus className="h-4 w-4"/>Planejar atividade</button></div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3">
      <div className="flex items-center gap-1"><button type="button" aria-label="Período anterior" onClick={()=>shiftPlanner(-1)} className="rounded-lg p-2 hover:bg-secondary"><ChevronLeft className="h-4 w-4"/></button><button type="button" aria-label="Próximo período" onClick={()=>shiftPlanner(1)} className="rounded-lg p-2 hover:bg-secondary"><ChevronRight className="h-4 w-4"/></button><div className="ml-1"><p className="text-sm font-semibold capitalize">{plannerView==="mes"?plannerAnchor.toLocaleDateString("pt-BR",{month:"long",year:"numeric"}):plannerView==="dia"?plannerAnchor.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"}):`${plannerWeek[0].toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})} – ${plannerWeek[6].toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})}`}</p><button type="button" className="text-xs text-primary" onClick={()=>setPlannerDate(todayKey)}>Ir para hoje</button></div></div>
      <div className="flex flex-wrap gap-1 rounded-xl bg-secondary/70 p-1">{([{id:"dia",label:"Dia",icon:Clock3},{id:"semana",label:"Semana",icon:CalendarDays},{id:"mes",label:"Mês",icon:LayoutGrid},{id:"lista",label:"Lista",icon:List}] as const).map(v=><button key={v.id} type="button" onClick={()=>setPlannerView(v.id)} className={"inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold "+(plannerView===v.id?"bg-card text-foreground shadow-sm":"text-muted-foreground hover:text-foreground")}><v.icon className="h-3.5 w-3.5"/>{v.label}</button>)}</div>
    </div>
    {plannerView==="semana"&&<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">{plannerWeek.map(day=>{const key=localDateKey(day),items=plannerItemsFor(day),isToday=key===todayKey;return <button type="button" key={key} onClick={()=>{setPlannerDate(key);setRoutineDate(key);setPlannerView("dia")}} className={"min-h-40 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm "+(isToday?"border-primary/50 bg-primary/[.055]":"border-border/70 bg-card") }><div className="flex items-center justify-between"><span className="text-xs font-semibold capitalize text-muted-foreground">{day.toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","")}</span><span className={"flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold "+(isToday?"bg-primary text-primary-foreground":"bg-secondary")}>{day.getDate()}</span></div><div className="mt-3 space-y-1.5">{items.slice(0,3).map(item=><div key={item.id} className={"rounded-lg border-l-[3px] px-2 py-1.5 "+(item.done?"border-emerald-500 bg-emerald-500/10":"border-primary bg-primary/10")}><p className="text-[10px] font-semibold text-muted-foreground">{item.time||"Sem horário"}</p><p className={"line-clamp-2 text-xs font-medium "+(item.done?"line-through opacity-60":"")}>{item.text}</p></div>)}{items.length>3&&<p className="text-[10px] text-muted-foreground">+{items.length-3} atividades</p>}{items.length===0&&<p className="pt-2 text-[11px] text-muted-foreground/80">+ Planejar</p>}</div></button>})}</div>}
    {plannerView==="dia"&&<div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold capitalize">{plannerAnchor.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</h3><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{plannerItemsFor(plannerAnchor).length} atividades</span></div><div className="space-y-2">{Array.from({length:15},(_,i)=>i+7).map(hour=>{const items=plannerItemsFor(plannerAnchor).filter(item=>Number((item.time||"09:00").split(":")[0])===hour);return <div key={hour} className="grid min-h-12 grid-cols-[55px_1fr] gap-3 border-t border-border/60 pt-2"><span className="pt-1 text-xs tabular-nums text-muted-foreground">{String(hour).padStart(2,"0")}:00</span><div className="space-y-1">{items.map(item=><div key={item.id} className={"flex items-start justify-between gap-2 rounded-xl border-l-4 p-3 "+(item.done?"border-emerald-500 bg-emerald-500/10":"border-primary bg-primary/10")}><div><p className={"text-sm font-semibold "+(item.done?"line-through opacity-60":"")}>{item.text}</p>{item.extra&&<p className="mt-1 text-xs text-muted-foreground">{item.extra}</p>}<p className="mt-1 text-xs text-muted-foreground">{item.time}</p></div><button type="button" onClick={()=>toggle(item.id)} aria-label={item.done?"Desmarcar atividade":"Concluir atividade"} className="rounded-lg border border-border bg-card p-2">{item.done?<Check className="h-4 w-4 text-emerald-600"/>:<Check className="h-4 w-4 text-muted-foreground"/>}</button></div>)}</div></div>})}</div></div>}
    {plannerView==="mes"&&<div className="rounded-2xl border border-border/70 bg-card p-3 sm:p-5"><div className="mb-2 grid grid-cols-7 gap-1">{["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(d=><div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground">{d}</div>)}</div><div className="grid grid-cols-7 gap-1">{Array.from({length:(plannerMonthStart.getDay()+6)%7},(_,i)=><div key={"blank"+i}/>)}{plannerMonthDays.map(day=>{const key=localDateKey(day),items=plannerItemsFor(day);return <button type="button" key={key} onClick={()=>{setPlannerDate(key);setRoutineDate(key);setPlannerView("dia")}} className={"min-h-16 rounded-xl border p-1.5 text-left sm:min-h-24 sm:p-2 "+(key===todayKey?"border-primary bg-primary/5":"border-border/60 hover:bg-secondary/50") }><span className={"text-xs font-semibold "+(key===todayKey?"text-primary":"")}>{day.getDate()}</span>{items.length>0&&<div className="mt-1 space-y-1"><span className="block rounded bg-primary/10 px-1 py-0.5 text-[9px] font-semibold text-primary">{items.length} atv.</span><span className="hidden truncate text-[10px] sm:block">{items[0].text}</span></div>}</button>})}</div></div>}
    {plannerView==="lista"&&<div className="space-y-2">{entries.filter(e=>e.date).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.time||"").localeCompare(b.time||"")).map(item=><div key={item.id} className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-3"><button type="button" onClick={()=>toggle(item.id)} aria-label={item.done?"Desmarcar atividade":"Concluir atividade"} className={"mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border "+(item.done?"border-emerald-600 bg-emerald-600 text-white":"border-border")}>{item.done&&<Check className="h-3 w-3"/>}</button><div className="min-w-0 flex-1"><p className={"text-sm font-semibold "+(item.done?"line-through opacity-60":"")}>{item.text}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{item.date?new Date(item.date+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short",year:"numeric"}):""} · {item.time||"Sem horário"}</p>{item.extra&&<p className="mt-1 text-xs text-muted-foreground">{item.extra}</p>}</div><button type="button" onClick={()=>remove(item.id)} aria-label={"Excluir "+item.text} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10"><Trash2 className="h-4 w-4"/></button></div>)}{entries.filter(e=>e.date).length===0&&<p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Seu planner está vazio. Adicione a primeira atividade abaixo.</p>}</div>}
    <div className="flex justify-center"><button type="button" onClick={()=>{setRoutineDate(plannerDate);setRoutineModalOpen(true)}} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"><Plus className="h-4 w-4"/>Adicionar atividade</button></div>
    {routineModalOpen&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget)setRoutineModalOpen(false)}}><section role="dialog" aria-modal="true" aria-labelledby="routine-modal-title" className="w-full max-w-xl rounded-3xl border border-border bg-card p-5 text-foreground shadow-2xl sm:p-7"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-primary">Planner pessoal</p><h2 id="routine-modal-title" className="mt-1 text-xl font-bold">Adicionar atividade</h2><p className="mt-1 text-sm text-muted-foreground">Escolha quando e como ela entra na sua rotina.</p></div><button type="button" onClick={()=>setRoutineModalOpen(false)} aria-label="Fechar formulário" className="rounded-xl border border-border px-3 py-2 text-sm hover:bg-secondary">✕</button></div>{routineForm}</section></div>}
  </div>;
  const addForm = (placeholder:string, button="Adicionar") => <form className="flex flex-col gap-2 sm:flex-row" onSubmit={e=>{e.preventDefault();add();}}><input className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-3 text-sm" value={input} onChange={e=>setInput(e.target.value)} placeholder={placeholder} aria-label={placeholder}/><input className="min-w-0 rounded-xl border border-border bg-background px-3 py-3 text-sm sm:max-w-[200px]" value={extra} onChange={e=>setExtra(e.target.value)} placeholder="Detalhes (opcional)" aria-label="Detalhes opcionais"/><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground" type="submit"><Plus className="h-4 w-4"/>{button}</button></form>;
  const list = (empty:string, checkable=false) => {
    const visibleEntries = module === "rotina" ? routineEntries : entries;
    const isDone = (e: Entry) => module === "habitos-rotina" ? (e.completions?.includes(todayKey) ?? !!e.done) : !!e.done;
    return <div className="mt-4 space-y-2">{visibleEntries.length===0?<p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">{ready?empty:"Carregando registros…"}</p>:visibleEntries.map(e=><div key={e.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">{checkable&&<button type="button" aria-label={isDone(e)?"Desmarcar":"Concluir"} onClick={()=>toggle(e.id)} className={"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border "+(isDone(e)?"border-primary bg-primary text-primary-foreground":"border-border")}>{isDone(e)&&<Check className="h-3 w-3"/>}</button>}<div className="min-w-0 flex-1"><p className={"break-words text-sm "+(isDone(e)?"text-muted-foreground line-through":"text-foreground")}>{e.text}</p>{(e.date||e.time)&&<p className="mt-1 text-xs font-medium text-primary">{e.date?new Date(e.date+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"}):""}{e.time?" · "+e.time:""}</p>}{e.extra&&<p className="mt-1 text-xs text-muted-foreground">{e.extra}</p>}<p className="mt-1 text-[10px] text-muted-foreground">{new Date(e.createdAt).toLocaleDateString("pt-BR")}{module==="habitos-rotina"&&e.completions?.length?" · "+e.completions.length+" dia(s) concluído(s)":""}</p></div><button type="button" onClick={()=>remove(e.id)} aria-label={"Excluir "+e.text} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4"/></button></div>)}</div>;
  };
  const titles:Record<string,string>={"Sobre mim":"Conheça sua história","Metas":"Metas pessoais","Diário":"Seu espaço de escrita","Humor & Score":"Como você está hoje?","Respiração":"Pausa para respirar","Gratidão":"Três coisas boas do dia","Carta":"Carta para o eu do futuro","30 Dias":"Desafio de 30 dias","Cômodos":"Organize seus espaços","Mercado":"Lista do mercado","Rotina":"Rotina da casa","Despensa":"Estoque da despensa","Cardápio":"Cardápio da casa","Manutenção":"Manutenção e reparos","Co-op":"Organização compartilhada","Segurança":"Segurança da casa","Utilidades":"Contas e utilidades","Lendo agora":"Leitura atual","Estante":"Minha estante","Insights":"Seu ritmo de leitura","Emprestados":"Livros emprestados","Desafio":"Desafio de leitura","Jejum":"Timer de jejum","Receitas":"Minhas receitas","Lista":"Lista de compras","Minha semana":"Hábitos da semana","Meu mês":"Consistência mensal","Revisão":"Revisão semanal","Foco":"Sessão de foco","Hoje":"Minha rotina de hoje","Semana":"Organização da semana","Planejamento":"Planeje sua rotina","Plano semanal":"Treino planejado para a semana","Histórico":"Histórico de treinos"};
  const card = "rounded-2xl border border-border bg-card p-4 sm:p-5";
  const pill = (active:boolean) => "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition "+(active?"border-foreground bg-foreground text-background":"border-border bg-background text-muted-foreground hover:text-foreground");
  const progress = module==="leitura" ? Math.min(100,Math.max(0,Number(page||0)/Math.max(1,Number(totalPages||1))*100)) : 0;

  return <div className={theme==="dark"?"space-y-5 rounded-3xl bg-slate-950 p-3 text-slate-100 sm:p-6":"space-y-5"}>
    <div className="flex items-center justify-between gap-3"><Link to="/painel" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm"><ArrowLeft className="h-4 w-4"/> Voltar ao Painel</Link><button type="button" onClick={()=>setTheme(t=>{const next=t==="dark"?"light":"dark";try { localStorage.setItem("harmony-personal-theme", next); } catch (error) { console.warn("[personal-module] theme preference could not be saved", error); } return next})} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">{theme==="dark"?<Sun className="h-4 w-4"/>:<Moon className="h-4 w-4"/>}{theme==="dark"?"Tema claro":"Tema escuro"}</button></div>
    <header className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-transparent p-5 sm:p-7"><div className="flex items-start gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl">{config.emoji}</span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">HARMONY HUB · ORGANIZAÇÃO PESSOAL</p><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{config.title}</h1><p className="mt-2 text-sm text-muted-foreground">{config.description}</p></div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold capitalize text-muted-foreground">{month}</p>{module==="desenvolvimento-pessoal"&&<p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm">✨ {quote}</p>}</div></header>
    <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label={"Abas de "+config.title}>{config.tabs.map(t=><button key={t} role="tab" aria-selected={tab===t} className={pill(tab===t)} onClick={()=>{setTab(t);setInput("");setExtra("");}}>{t}</button>)}</div>
    <Panel title={titles[tab]||tab}>
      {module==="desenvolvimento-pessoal"&&tab==="Humor & Score"?<><p className="mb-3 text-sm text-muted-foreground">Registre como você está hoje e acompanhe seu histórico.</p><div className="flex flex-wrap gap-2">{MOODS.map(m=><button type="button" key={m} onClick={()=>setMood(m)} className={"rounded-xl border p-3 text-2xl "+(mood===m?"border-primary bg-primary/10":"border-border")}>{m}</button>)}</div><label className="mt-4 block text-sm font-semibold">Nota do dia: {score}/10<input className="mt-2 w-full accent-current" type="range" min="0" max="10" value={score} onChange={e=>setScore(Number(e.target.value))}/></label><button className="mt-3 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground" onClick={()=>add("Humor "+mood+" · "+score+"/10",new Date().toLocaleDateString("pt-BR"))}>Salvar registro de hoje</button>{list("Seu histórico de humor aparecerá aqui.")}</>
      :module==="desenvolvimento-pessoal"&&tab==="Respiração"||module==="alimentacao"&&tab==="Jejum"||module==="habitos-rotina"&&tab==="Foco"?<div className="mx-auto max-w-sm py-4 text-center"><div className="mb-3 text-5xl font-extrabold tabular-nums">{module==="habitos-rotina"&&tab==="Foco"?String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0"):seconds+"s"}</div><p className="text-sm text-muted-foreground">{module==="desenvolvimento-pessoal"?(seconds>40?"Inspire devagar":seconds>20?"Segure o ar":"Expire lentamente"):module==="alimentacao"?"Timer de jejum":"Sessão de foco"}</p><div className="mt-4 flex justify-center gap-2"><button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground" onClick={()=>{if(module==="habitos-rotina"&&tab==="Foco"&&seconds===60)setSeconds(25*60);setRunning(v=>!v)}}>{running?<Pause className="h-4 w-4"/>:<Play className="h-4 w-4"/>}{running?"Pausar":"Iniciar"}</button><button className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm" onClick={()=>{setRunning(false);setSeconds(module==="habitos-rotina"&&tab==="Foco"?25*60:60)}}><RotateCcw className="h-4 w-4"/>Reiniciar</button></div></div>
      :module==="casa"&&tab==="Mercado"?<><div className="mb-3 flex flex-wrap gap-2">{MARKET_CATEGORIES.map(c=><button type="button" key={c} className={pill(category===c)} onClick={()=>setCategory(c)}>{c}</button>)}</div><form className="flex flex-col gap-2 sm:flex-row" onSubmit={e=>{e.preventDefault();add(input,category);}}><input className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-3 text-sm" value={input} onChange={e=>setInput(e.target.value)} placeholder={"Adicionar item em "+category}/><button className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground" type="submit">+ Adicionar item</button></form><p className="mt-3 text-xs text-muted-foreground">{entries.filter(e=>e.done).length} de {entries.length} itens comprados</p>{list("Sua lista do mercado está vazia.",true)}</>
      :module==="alimentacao"&&tab==="Cardápio"?<><div className="mb-3 flex flex-wrap gap-2">{["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"].map(d=><button key={d} className={pill(mealDay===d)} onClick={()=>setMealDay(d)}>{d}</button>)}</div><div className="mb-3 flex flex-wrap gap-2">{MEALS.map(m=><button key={m} className={pill(mealType===m)} onClick={()=>setMealType(m)}>{m}</button>)}</div><form className="flex flex-col gap-2 sm:flex-row" onSubmit={e=>{e.preventDefault();add(input,mealDay+" · "+mealType);}}><input className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-3 text-sm" value={input} onChange={e=>setInput(e.target.value)} placeholder="Refeição planejada"/><button className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">+ Adicionar refeição</button></form>{list("Nenhuma refeição planejada.")}</>
      :module==="leitura"&&tab==="Lendo agora"?<><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Página atual<input className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3" type="number" min="0" value={page} onChange={e=>setPage(e.target.value)}/></label><label className="text-sm">Total de páginas<input className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3" type="number" min="1" value={totalPages} onChange={e=>setTotalPages(e.target.value)}/></label></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{width:progress+"%"}}/></div><p className="mt-1 text-xs text-muted-foreground">{progress.toFixed(0)}% concluído</p>{addForm("Título do livro atual","Salvar livro")}{list("Cadastre o livro que está lendo.")}</>
      :module==="habitos-rotina"&&(tab==="Minha semana"||tab==="Meu mês")?<><div className="mb-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Concluídos hoje</p><p className="mt-1 text-2xl font-bold tabular-nums">{entries.filter(e=>(e.completions?.includes(todayKey)??!!e.done)).length}<span className="text-sm font-medium text-muted-foreground">/{entries.length}</span></p></div><div className="rounded-xl border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{tab==="Minha semana"?"Conclusões nos últimos 7 dias":"Conclusões nos últimos 30 dias"}</p><p className="mt-1 text-2xl font-bold tabular-nums">{entries.reduce((total,e)=>total+(e.completions??(e.done?[todayKey]:[])).filter(d=>{const age=(new Date(todayKey+"T12:00:00").getTime()-new Date(d+"T12:00:00").getTime())/86400000;return age>=0&&age<(tab==="Minha semana"?7:30)}).length,0)}</p></div></div>{addForm("Ex.: beber água, treinar, ler 30 min…","Adicionar hábito")}<HabitOrganizer entries={entries} todayKey={todayKey} view={habitsView} setView={setHabitsView} search={habitsSearch} setSearch={setHabitsSearch} sort={habitsSort} setSort={setHabitsSort} group={habitsGroup} setGroup={setHabitsGroup} onToggle={toggle} onRemove={remove}/><p className="mt-3 text-xs text-muted-foreground">Marcar um hábito registra a conclusão da data selecionada. O histórico permanece guardado ao trocar de visualização.</p></>
      :module==="rotina"&&(tab==="Hoje"||tab==="Semana"||tab==="Planejamento")?routinePlanner
      :module==="casa"&&tab==="Rotina"?<>{routineForm}{list("Sua lista de tarefas domésticas está vazia.",true)}<p className="mt-3 text-xs text-muted-foreground">As tarefas ficam salvas com data e horário. Marque cada tarefa quando terminar.</p></>
      :module==="treinos"&&tab==="Plano semanal"?<TreinosPlano entries={entries} setEntries={setEntries} empty={!ready} onRecordSession={recordWorkoutSession}/>
      :module==="treinos"&&tab==="Histórico"?<TreinosHistorico entries={entries} setEntries={setEntries} empty={!ready}/>
      :<>{addForm(tab==="Sobre mim"?"Escreva sobre você…":tab==="Gratidão"?"Pelo que você é grata hoje?":tab==="Carta"?"Escreva sua carta…":tab==="Diário"?"Escreva seu registro…":"Adicionar registro…")}{list("Ainda não há registros nesta aba.")}</>}
    </Panel>
    <p className="text-center text-xs text-muted-foreground">{syncStatus==="syncing"?"Sincronizando seus registros…":syncStatus==="synced"?"Dados sincronizados com sua conta.":syncStatus==="error"?"Falha na sincronização. Os dados locais foram preservados; tente recarregar quando a conexão voltar.":"Registros salvos neste dispositivo. Entre na sua conta para sincronizar entre dispositivos."}</p>
  </div>;
}


type HabitView = "lista" | "tabela" | "semana" | "calendario" | "progresso";
function HabitOrganizer({ entries, todayKey, view, setView, search, setSearch, sort, setSort, group, setGroup, onToggle, onRemove }: {
  entries: Entry[]; todayKey: string; view: HabitView; setView: (view: HabitView) => void;
  search: string; setSearch: (value: string) => void; sort: "recentes"|"nome"|"conclusoes"; setSort: (value: "recentes"|"nome"|"conclusoes") => void;
  group: "nenhum"|"status"; setGroup: (value: "nenhum"|"status") => void; onToggle: (id: string) => void; onRemove: (id: string) => void;
}) {
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(todayKey + "T12:00:00"));
  const filtered = entries.filter(e => e.text.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")) || (e.extra ?? "").toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const ordered = [...filtered].sort((a,b) => sort === "nome" ? a.text.localeCompare(b.text,"pt-BR") : sort === "conclusoes" ? (b.completions?.length ?? 0) - (a.completions?.length ?? 0) : b.createdAt.localeCompare(a.createdAt));
  const isDone = (e: Entry, date = todayKey) => e.completions?.includes(date) ?? (!!e.done && date === todayKey);
  const viewOptions: {id: HabitView; label: string; icon: typeof List}[] = [{id:"semana",label:"Semana",icon:CalendarDays},{id:"lista",label:"Lista",icon:List},{id:"tabela",label:"Tabela",icon:Table2},{id:"calendario",label:"Calendário",icon:CalendarDays},{id:"progresso",label:"Progresso",icon:ChartNoAxesColumn}];
  const weekDates = Array.from({length:7},(_,i)=>{const d=new Date(todayKey+"T12:00:00");d.setDate(d.getDate()-6+i);return {key:localDateKey(d),label:d.toLocaleDateString("pt-BR",{weekday:"short"}),day:d.getDate()};});
  const monthStart = new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1,12);
  const offset = (monthStart.getDay()+6)%7;
  const calendarDates = Array.from({length:42},(_,i)=>{const d=new Date(monthStart);d.setDate(1-offset+i);return {key:localDateKey(d),day:d.getDate(),inMonth:d.getMonth()===calendarMonth.getMonth()};});
  const controlClass = "inline-flex min-h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-medium";
  return <section className="mt-5 space-y-3" aria-label="Organização e visualizações de hábitos">
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/70 p-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Modo de visualização dos hábitos">{viewOptions.map(option=>{const Icon=option.icon;return <button key={option.id} type="button" role="tab" aria-selected={view===option.id} onClick={()=>setView(option.id)} className={"inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition "+(view===option.id?"border-primary bg-primary text-primary-foreground":"border-border bg-card text-muted-foreground hover:text-foreground")}><Icon className="h-3.5 w-3.5"/>{option.label}</button>})}</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_auto_auto]">
        <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><input className="min-h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar hábitos…" aria-label="Pesquisar hábitos"/></label>
        <label className={controlClass}><ArrowUpDown className="h-3.5 w-3.5"/><span>Ordenar</span><select className="min-w-0 bg-transparent text-xs outline-none" value={sort} onChange={e=>setSort(e.target.value as typeof sort)} aria-label="Ordenar hábitos"><option value="nome">Nome A–Z</option><option value="recentes">Mais recentes</option><option value="conclusoes">Mais consistentes</option></select></label>
        <label className={controlClass}><span>Agrupar</span><select className="min-w-0 bg-transparent text-xs outline-none" value={group} onChange={e=>setGroup(e.target.value as typeof group)} aria-label="Agrupar hábitos"><option value="nenhum">Sem grupos</option><option value="status">Feitos / pendentes</option></select></label>
      </div>
    </div>
    {ordered.length===0 ? <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{entries.length===0?"Adicione seu primeiro hábito para começar.":"Nenhum hábito corresponde à pesquisa."}</p> : null}
    {view==="tabela" && ordered.length>0 ? <div className="overflow-x-auto rounded-2xl border border-border"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-semibold">Hábito</th><th className="px-4 py-3 font-semibold">Hoje</th><th className="px-4 py-3 font-semibold">Conclusões</th><th className="px-4 py-3 font-semibold">Último registro</th><th className="px-4 py-3 text-right font-semibold">Ações</th></tr></thead><tbody>{(group==="status"?[...ordered].sort((a,b)=>Number(isDone(a))-Number(isDone(b))):ordered).map(e=><tr key={e.id} className="border-t border-border hover:bg-muted/20"><td className="px-4 py-3 font-medium">{e.text}{e.extra?<p className="mt-1 text-xs font-normal text-muted-foreground">{e.extra}</p>:null}</td><td className="px-4 py-3"><button type="button" onClick={()=>onToggle(e.id)} className={"rounded-full px-3 py-1.5 text-xs font-semibold "+(isDone(e)?"bg-emerald-500/10 text-emerald-700 dark:text-emerald-300":"bg-muted text-muted-foreground")}>{isDone(e)?"Concluído":"Pendente"}</button></td><td className="px-4 py-3 tabular-nums">{e.completions?.length ?? (e.done?1:0)} dias</td><td className="px-4 py-3 text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleDateString("pt-BR")}</td><td className="px-4 py-3 text-right"><button type="button" onClick={()=>onRemove(e.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={"Excluir "+e.text}><Trash2 className="h-4 w-4"/></button></td></tr>)}</tbody></table></div>:null}
    {view==="lista" && ordered.length>0 ? <div className="space-y-2">{(group==="status"?[...ordered].sort((a,b)=>Number(isDone(a))-Number(isDone(b))):ordered).map(e=><div key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"><button type="button" onClick={()=>onToggle(e.id)} aria-label={isDone(e)?"Desmarcar "+e.text:"Concluir "+e.text} className={"flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border "+(isDone(e)?"border-primary bg-primary text-primary-foreground":"border-border")}>{isDone(e)?<Check className="h-4 w-4"/>:null}</button><div className="min-w-0 flex-1"><p className={"text-sm font-medium "+(isDone(e)?"text-muted-foreground line-through":"")}>{e.text}</p>{e.extra?<p className="mt-0.5 text-xs text-muted-foreground">{e.extra}</p>:null}</div><span className="text-xs text-muted-foreground">{e.completions?.length??(e.done?1:0)} dias</span><button type="button" onClick={()=>onRemove(e.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={"Excluir "+e.text}><Trash2 className="h-4 w-4"/></button></div>)}</div>:null}
    {view==="semana" && ordered.length>0 ? <div className="space-y-3">{ordered.map(e=><div key={e.id} className="rounded-2xl border border-border bg-card p-4"><div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{e.text}</p><p className="mt-1 text-xs text-muted-foreground">{e.completions?.length??(e.done?1:0)} conclusões registradas</p></div><button type="button" onClick={()=>onRemove(e.id)} aria-label={"Excluir "+e.text} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4"/></button></div><div className="grid grid-cols-7 gap-1.5">{weekDates.map(d=><button key={d.key} type="button" onClick={()=>{if(d.key===todayKey)onToggle(e.id);}} title={d.key===todayKey?"Marcar conclusão de hoje":d.key} className={"flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 "+(isDone(e,d.key)?"border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300":"border-border bg-background text-muted-foreground")+(d.key===todayKey?" ring-1 ring-primary/50":"")}><span className="text-[10px] capitalize">{d.label}</span><span className="text-xs font-bold">{d.day}</span><span className={"h-1.5 w-1.5 rounded-full "+(isDone(e,d.key)?"bg-emerald-500":"bg-transparent")}/></button>)}</div></div>)}</div>:null}
    {view==="calendario" && ordered.length>0 ? <div className="rounded-2xl border border-border bg-card p-3 sm:p-4"><div className="mb-4 flex items-center justify-between gap-2"><button type="button" onClick={()=>setCalendarMonth(d=>new Date(d.getFullYear(),d.getMonth()-1,1,12))} className="rounded-xl border border-border px-3 py-2 text-sm" aria-label="Mês anterior">←</button><h3 className="font-semibold capitalize">{calendarMonth.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</h3><button type="button" onClick={()=>setCalendarMonth(d=>new Date(d.getFullYear(),d.getMonth()+1,1,12))} className="rounded-xl border border-border px-3 py-2 text-sm" aria-label="Próximo mês">→</button></div><div className="grid grid-cols-7 gap-1">{["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(d=><span key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</span>)}{calendarDates.map(d=>{const completed=ordered.filter(e=>isDone(e,d.key)).length;return <div key={d.key} className={"min-h-[58px] rounded-lg border p-1.5 text-center sm:min-h-[70px] "+(d.inMonth?"border-border":"border-transparent text-muted-foreground/40")+(d.key===todayKey?" ring-1 ring-primary":"")+(completed?" bg-emerald-500/10":"")}><span className="text-xs">{d.day}</span>{completed>0?<span className="mt-1 block text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">{completed} feito(s)</span>:null}</div>})}</div><p className="mt-3 text-xs text-muted-foreground">O calendário mostra quantos hábitos foram concluídos em cada dia.</p></div>:null}
    {view==="progresso" && ordered.length>0 ? <div className="grid gap-3 sm:grid-cols-2">{ordered.map(e=>{const days=(e.completions??(e.done?[todayKey]:[])).filter(d=>{const age=(new Date(todayKey+"T12:00:00").getTime()-new Date(d+"T12:00:00").getTime())/86400000;return age>=0&&age<30}).length;const pct=Math.min(100,Math.round(days/30*100));return <div key={e.id} className="rounded-2xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{e.text}</h3><p className="mt-1 text-xs text-muted-foreground">{days} conclusões nos últimos 30 dias</p></div><span className="text-lg font-bold tabular-nums">{pct}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{width:pct+"%"}}/></div><button type="button" onClick={()=>onToggle(e.id)} className="mt-3 rounded-lg border border-border px-3 py-2 text-xs font-semibold">{isDone(e)?"Desmarcar hoje":"Marcar hoje"}</button></div>})}</div>:null}
  </section>;
}

/* ---------- Treinos: Plano semanal (block-based) ---------- */
function TreinosPlano({ entries, setEntries, empty, onRecordSession }: { entries: Entry[]; setEntries: (updater: (prev: Entry[]) => Entry[]) => void; empty: boolean; onRecordSession: (block: WorkoutBlock) => void | Promise<void> }) {
  const blocks: WorkoutBlock[] = useMemo(() => (entries as WorkoutEntry[]).map(entryToWorkoutBlock), [entries]);
  const ordered = useMemo(() => {
    const dayRank = new Map<string, number>(WORKOUT_DAYS.map((d, i) => [d, i] as const));
    return [...blocks].sort((a, b) => {
      const ra = dayRank.get(a.day) ?? 99;
      const rb = dayRank.get(b.day) ?? 99;
      if (ra !== rb) return ra - rb;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [blocks]);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingFocusId) return;
    const el = cardRefs.current[pendingFocusId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = el.querySelector<HTMLInputElement>("input.block-name-input");
      input?.focus();
      input?.select();
      setPendingFocusId(null);
    }
  }, [pendingFocusId, ordered]);

  const writeBlocks = (next: WorkoutBlock[]) => {
    setEntries(() => next.map(workoutBlockToEntry));
  };
  const addBlock = () => {
    const created = makeWorkoutBlock({ name: "Novo treino", day: "Segunda" });
    writeBlocks([...blocks, created]);
    setPendingFocusId(created.id);
  };
  const updateBlock = (id: string, patch: Partial<WorkoutBlock>) => {
    writeBlocks(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };
  const deleteBlock = (id: string) => writeBlocks(blocks.filter((b) => b.id !== id));
  const addExercise = (blockId: string) => {
    writeBlocks(blocks.map((b) => b.id === blockId ? { ...b, exercises: [...b.exercises, makeWorkoutExercise()] } : b));
  };
  const updateExercise = (blockId: string, exerciseId: string, patch: Partial<WorkoutExercise>) => {
    writeBlocks(blocks.map((b) => b.id === blockId ? { ...b, exercises: b.exercises.map((ex) => (ex.id === exerciseId ? { ...ex, ...patch } : ex)) } : b));
  };
  const deleteExercise = (blockId: string, exerciseId: string) => {
    writeBlocks(blocks.map((b) => b.id === blockId ? { ...b, exercises: b.exercises.filter((ex) => ex.id !== exerciseId) } : b));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Planeje cada sessão da semana, marque séries concluídas e acompanhe a evolução.</p>
      {empty ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">Carregando registros…</p>
      ) : ordered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">Seu plano semanal está vazio. Adicione o primeiro bloco para começar.</p>
      ) : (
        <div className="space-y-4">
          {ordered.map((block) => (
            <div
              key={block.id}
              ref={(el) => { cardRefs.current[block.id] = el; }}
              className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[0_12px_40px_-30px_rgba(0,0,0,0.8)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <button
                    type="button"
                    aria-label={block.done ? "Desmarcar bloco" : "Concluir bloco"}
                    onClick={() => updateBlock(block.id, { done: !block.done })}
                    className={"flex h-5 w-5 shrink-0 items-center justify-center rounded border " + (block.done ? "border-primary bg-primary text-primary-foreground" : "border-border")}
                  >
                    {block.done ? <Check className="h-3 w-3" /> : null}
                  </button>
                  <input
                    className="block-name-input min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold"
                    value={block.name}
                    onChange={(e) => updateBlock(block.id, { name: e.target.value })}
                    placeholder="Nome do treino"
                    aria-label="Nome do treino"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => deleteBlock(block.id)}
                  aria-label={"Excluir bloco " + block.name}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Dia da semana">
                {WORKOUT_DAYS.map((d) => {
                  const active = block.day === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => updateBlock(block.id, { day: d })}
                      className={"shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition " + (active ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:text-foreground")}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-2">
                {block.exercises.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">Sem exercícios ainda — adicione o primeiro abaixo.</p>
                ) : (
                  block.exercises.map((ex) => (
                    <div key={ex.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-2">
                      <button
                        type="button"
                        aria-label={ex.done ? "Desmarcar exercício" : "Concluir exercício"}
                        onClick={() => updateExercise(block.id, ex.id, { done: !ex.done })}
                        className={"flex h-5 w-5 shrink-0 items-center justify-center rounded border " + (ex.done ? "border-primary bg-primary text-primary-foreground" : "border-border")}
                      >
                        {ex.done ? <Check className="h-3 w-3" /> : null}
                      </button>
                      <input
                        className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                        value={ex.name}
                        onChange={(e) => updateExercise(block.id, ex.id, { name: e.target.value })}
                        placeholder="Exercício"
                        aria-label="Nome do exercício"
                      />
                      <label className="flex items-center gap-1 text-xs text-muted-foreground">
                        Séries
                        <input
                          className="w-14 rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                          type="number"
                          min="0"
                          value={ex.sets}
                          onChange={(e) => updateExercise(block.id, ex.id, { sets: Number(e.target.value) })}
                          aria-label="Séries"
                        />
                      </label>
                      <input
                        className="w-20 rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                        value={ex.reps}
                        onChange={(e) => updateExercise(block.id, ex.id, { reps: e.target.value })}
                        placeholder="10–12"
                        aria-label="Repetições"
                      />
                      <input
                        className="w-20 rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                        value={ex.load}
                        onChange={(e) => updateExercise(block.id, ex.id, { load: e.target.value })}
                        placeholder="30 kg"
                        aria-label="Carga"
                      />
                      <button
                        type="button"
                        onClick={() => deleteExercise(block.id, ex.id)}
                        aria-label={"Excluir exercício " + (ex.name || "sem nome")}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => { void onRecordSession(block); }}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                <Check className="h-3.5 w-3.5" /> Registrar sessão no histórico
              </button>

              <form
                className="mt-3 flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addExercise(block.id);
                }}
              >
                <span className="text-xs font-semibold text-muted-foreground">Adicionar exercício</span>
                <input
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  name="name"
                  placeholder="Nome do exercício"
                  aria-label="Nome do novo exercício"
                />
                <input
                  className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  name="sets"
                  type="number"
                  min="0"
                  defaultValue={3}
                  aria-label="Séries"
                />
                <input
                  className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  name="reps"
                  defaultValue="10–12"
                  placeholder="Reps"
                  aria-label="Repetições"
                />
                <input
                  className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  name="load"
                  placeholder="Carga"
                  aria-label="Carga"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={addBlock}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
      >
        <Plus className="h-4 w-4" /> Adicionar bloco de treino
      </button>
    </div>
  );
}

/* ---------- Treinos: Histórico (block-based, date-stamped, DESC) ---------- */
function TreinosHistorico({ entries, setEntries, empty }: { entries: Entry[]; setEntries: (updater: (prev: Entry[]) => Entry[]) => void; empty: boolean }) {
  const blocks: WorkoutBlock[] = useMemo(() => (entries as WorkoutEntry[]).map(entryToWorkoutBlock), [entries]);
  const ordered = useMemo(
    () => [...blocks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [blocks]
  );
  const writeBlocks = (next: WorkoutBlock[]) => setEntries(() => next.map(workoutBlockToEntry));
  const updateBlock = (id: string, patch: Partial<WorkoutBlock>) => writeBlocks(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const deleteBlock = (id: string) => writeBlocks(blocks.filter((b) => b.id !== id));
  const updateExercise = (blockId: string, exerciseId: string, patch: Partial<WorkoutExercise>) =>
    writeBlocks(blocks.map((b) => b.id === blockId ? { ...b, exercises: b.exercises.map((ex) => (ex.id === exerciseId ? { ...ex, ...patch } : ex)) } : b));
  const deleteExercise = (blockId: string, exerciseId: string) =>
    writeBlocks(blocks.map((b) => b.id === blockId ? { ...b, exercises: b.exercises.filter((ex) => ex.id !== exerciseId) } : b));
  const addBlock = () => {
    const today = new Date().toLocaleDateString("pt-BR");
    writeBlocks([...blocks, makeWorkoutBlock({ name: "Treino realizado", day: today, done: true })]);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Registre cada sessão realizada e reveja o que foi treinado.</p>
      {empty ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">Carregando registros…</p>
      ) : ordered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">Seu histórico de treinos está vazio.</p>
      ) : (
        <div className="space-y-4">
          {ordered.map((block) => {
            const sessionDate = new Date(block.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
            return (
              <div
                key={block.id}
                className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[0_12px_40px_-30px_rgba(0,0,0,0.8)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-primary bg-primary text-primary-foreground" aria-label="Sessão concluída">
                      <Check className="h-3 w-3" />
                    </span>
                    <input
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold"
                      value={block.name}
                      onChange={(e) => updateBlock(block.id, { name: e.target.value })}
                      placeholder="Nome da sessão"
                      aria-label="Nome da sessão"
                    />
                    <span className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground" aria-label="Data da sessão">
                      {block.day && (WORKOUT_DAYS as readonly string[]).includes(block.day) ? block.day : sessionDate}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteBlock(block.id)}
                    aria-label={"Excluir sessão " + block.name}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-2 text-[10px] text-muted-foreground">Sessão de {sessionDate}</p>

                <div className="mt-4 space-y-2">
                  {block.exercises.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">Sem exercícios registrados para esta sessão.</p>
                  ) : (
                    block.exercises.map((ex) => (
                      <div key={ex.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-primary bg-primary text-primary-foreground" aria-label="Exercício concluído">
                          <Check className="h-3 w-3" />
                        </span>
                        <input
                          className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
                          value={ex.name}
                          onChange={(e) => updateExercise(block.id, ex.id, { name: e.target.value })}
                          placeholder="Exercício"
                          aria-label="Nome do exercício"
                        />
                        <span className="text-xs text-muted-foreground">Séries: {ex.sets}</span>
                        <span className="text-xs text-muted-foreground">Reps: {ex.reps || "—"}</span>
                        <span className="text-xs text-muted-foreground">Carga: {ex.load || "—"}</span>
                        <button
                          type="button"
                          onClick={() => deleteExercise(block.id, ex.id)}
                          aria-label={"Excluir exercício " + (ex.name || "sem nome")}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={addBlock}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
      >
        <Plus className="h-4 w-4" /> Adicionar bloco de treino
      </button>
    </div>
  );
}