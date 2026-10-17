import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Sun, Moon, Plus, Trash2, Check, Play, Pause, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel } from "@/components/ui-kit";

export type PersonalModuleKey = "desenvolvimento-pessoal" | "casa" | "leitura" | "alimentacao" | "habitos-rotina" | "rotina" | "treinos";
type Entry = { id: string; text: string; extra?: string; done?: boolean; createdAt: string };
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
const keyFor = (module: string, tab: string) => "harmony-personal-v1:" + module + ":" + tab;
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
  const [theme,setTheme] = useState<"light"|"dark">("light");
  const [mood,setMood] = useState("🙂");
  const [score,setScore] = useState(7);
  const [seconds,setSeconds] = useState(60);
  const [running,setRunning] = useState(false);
  const [category,setCategory] = useState(MARKET_CATEGORIES[0]);
  const [mealDay,setMealDay] = useState("Segunda");
  const [mealType,setMealType] = useState("Almoço");
  const [page,setPage] = useState("0");
  const [totalPages,setTotalPages] = useState("240");
  const activeKey = module + ":" + tab;
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
    const localEntries = readLocal(module,tab);
    async function load() {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          if (!cancelled) { setUserId(null); setSyncStatus("local"); setEntries(localEntries); loadingRef.current=false; setLoadedKey(activeKey); }
          return;
        }
        const uid = auth.user.id;
        const { data, error } = await personalData().select("entries").eq("user_id",uid).eq("module_key",module).eq("tab_key",tab).maybeSingle();
        if (cancelled) return;
        if (error) {
          if (!cancelled) { setUserId(null); setSyncStatus("error"); setEntries(localEntries); loadingRef.current=false; setLoadedKey(activeKey); }
          return;
        }
        setUserId(uid);
        setSyncStatus("synced");
        if (data && Array.isArray(data.entries)) {
          setEntries(data.entries as Entry[]);
          try {
            localStorage.setItem(keyFor(module, tab), JSON.stringify(data.entries));
          } catch (error) {
            console.warn("[personal-module] local cache could not be updated", error);
          }
        } else {
          setEntries(localEntries);
          if (localEntries.length) {
            const { error: saveError } = await personalData().upsert({user_id:uid,module_key:module,tab_key:tab,entries:localEntries,updated_at:new Date().toISOString()},{onConflict:"user_id,module_key,tab_key"});
            if (saveError) console.error("[personal-module] migration local failed",saveError.message);
          }
        }
        if (!cancelled) { loadingRef.current=false; setLoadedKey(activeKey); }
      } catch (error) {
        console.error("[personal-module] load failed",error);
        if (!cancelled) { setUserId(null); setSyncStatus("error"); setEntries(localEntries); loadingRef.current=false; setLoadedKey(activeKey); }
      }
    }
    void load();
    return () => { cancelled=true; };
  },[module,tab,activeKey]);

  useEffect(() => {
    if (!ready || loadingRef.current) return;
    try {
      localStorage.setItem(keyFor(module, tab), JSON.stringify(entries));
    } catch (error) {
      console.warn("[personal-module] local cache could not be updated", error);
    }
    if (!userId) return;
    const timeout = window.setTimeout(async () => {
      setSyncStatus("syncing");
      try {
        const { error } = await personalData().upsert({user_id:userId,module_key:module,tab_key:tab,entries,updated_at:new Date().toISOString()},{onConflict:"user_id,module_key,tab_key"});
        if (error) { setSyncStatus("error"); console.error("[personal-module] save failed",error.message); }
        else setSyncStatus("synced");
      } catch (error) { setSyncStatus("error"); console.error("[personal-module] save failed",error); }
    },450);
    return () => window.clearTimeout(timeout);
  },[entries,ready,userId,module,tab]);

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
  const toggle = (id:string) => setEntries(old=>old.map(e=>e.id===id?{...e,done:!e.done}:e));
  const addForm = (placeholder:string, button="Adicionar") => <form className="flex flex-col gap-2 sm:flex-row" onSubmit={e=>{e.preventDefault();add();}}><input className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-3 text-sm" value={input} onChange={e=>setInput(e.target.value)} placeholder={placeholder} aria-label={placeholder}/><input className="min-w-0 rounded-xl border border-border bg-background px-3 py-3 text-sm sm:max-w-[200px]" value={extra} onChange={e=>setExtra(e.target.value)} placeholder="Detalhes (opcional)" aria-label="Detalhes opcionais"/><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground" type="submit"><Plus className="h-4 w-4"/>{button}</button></form>;
  const list = (empty:string, checkable=false) => <div className="mt-4 space-y-2">{entries.length===0?<p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">{ready?empty:"Carregando registros…"}</p>:entries.map(e=><div key={e.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">{checkable&&<button type="button" aria-label={e.done?"Desmarcar":"Concluir"} onClick={()=>toggle(e.id)} className={"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border "+(e.done?"border-primary bg-primary text-primary-foreground":"border-border")}>{e.done&&<Check className="h-3 w-3"/>}</button>}<div className="min-w-0 flex-1"><p className={"break-words text-sm "+(e.done?"text-muted-foreground line-through":"text-foreground")}>{e.text}</p>{e.extra&&<p className="mt-1 text-xs text-muted-foreground">{e.extra}</p>}<p className="mt-1 text-[10px] text-muted-foreground">{new Date(e.createdAt).toLocaleDateString("pt-BR")}</p></div><button type="button" onClick={()=>remove(e.id)} aria-label={"Excluir "+e.text} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4"/></button></div>)}</div>;
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
      :module==="habitos-rotina"&&(tab==="Minha semana"||tab==="Meu mês")?<>{addForm("Ex.: beber água, treinar, ler 30 min…","Adicionar hábito")}{list("Adicione seus hábitos e marque cada conclusão.",true)}</>
      :module==="rotina"&&tab==="Hoje"?<>{addForm("Ex.: caminhada às 18h, organizar quarto…","Adicionar atividade")}{list("Sua rotina de hoje está vazia. Adicione a primeira atividade.",true)}</>
      :module==="rotina"&&tab==="Semana"?<>{addForm("Ex.: estudar segunda e quarta às 19h…","Planejar atividade")}{list("Sua semana ainda não tem atividades planejadas.",true)}</>
      :module==="rotina"&&tab==="Planejamento"?<>{addForm("Ex.: acordar às 7h, pausa para almoço…","Adicionar ao planejamento")}{list("Seu planejamento de rotina está vazio.")}
      :module==="treinos"&&tab==="Plano semanal"?<><p className="mb-3 text-sm text-muted-foreground">Registre o exercício e detalhe séries, repetições e carga. Marque o treino quando terminar.</p>{addForm("Ex.: agachamento — 3 séries × 10 reps — 30 kg","Adicionar exercício")}{list("Seu plano semanal está vazio. Adicione o primeiro exercício.",true)}</>
      :module==="treinos"&&tab==="Histórico"?<>{addForm("Ex.: treino de pernas — 45 minutos…","Registrar treino realizado")}{list("Seu histórico de treinos está vazio.")}</>
      :<>{addForm(tab==="Sobre mim"?"Escreva sobre você…":tab==="Gratidão"?"Pelo que você é grata hoje?":tab==="Carta"?"Escreva sua carta…":tab==="Diário"?"Escreva seu registro…":"Adicionar registro…")}{list("Ainda não há registros nesta aba.")}</>}
    </Panel>
    <p className="text-center text-xs text-muted-foreground">{syncStatus==="syncing"?"Sincronizando seus registros…":syncStatus==="synced"?"Dados sincronizados com sua conta.":syncStatus==="error"?"Falha na sincronização. Os dados locais foram preservados; tente recarregar quando a conexão voltar.":"Registros salvos neste dispositivo. Entre na sua conta para sincronizar entre dispositivos."}</p>
  </div>;
}
