import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronDown, ListChecks, Plus, Trash2 } from "lucide-react";
import { PageHeader, Panel, Tag, PersonDot } from "@/components/ui-kit";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Task = { id: string; household_id: string; user_id: string | null; title: string; quadrant: string; responsible: string | null; due_date: string | null; completed: boolean };
type Member = { id: string; household_id: string; name: string; initials: string | null };

export const Route = createFileRoute("/tarefas")({
  head: () => ({ meta: [{ title: "TAREFAS — MULTICAP" }, { name: "description", content: "Organize suas tarefas." }] }),
  component: TasksPage,
});

const QUADRANTS = [
  { name: "FAZER AGORA", border: "border-primary", hint: "Urgente e importante" },
  { name: "AGENDAR", border: "border-info/60", hint: "Importante, sem urgência" },
  { name: "DELEGAR/DIVIDIR", border: "border-warning/60", hint: "Urgente, pode ser dividida" },
  { name: "ELIMINAR", border: "border-border", hint: "Sem urgência nem importância" },
] as const;

function formatDueDate(date: string | null) {
  if (!date) return "SEM PRAZO";
  const today = new Date();
  const local = new Date(`${date}T12:00:00`);
  const todayKey = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const tomorrowKey = tomorrow.toISOString().slice(0, 10);
  if (date === todayKey) return "HOJE";
  if (date === tomorrowKey) return "AMANHÃ";
  return local.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function TasksPage() {
  const { user, profile } = useAuth();
  const tasks = useHouseholdTable<Task>("tasks", "*", "due_date");
  const members = useHouseholdTable<Member>("household_members", "id, household_id, name, initials", "name");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [quadrant, setQuadrant] = useState<(typeof QUADRANTS)[number]["name"]>("FAZER AGORA");
  const [dueDate, setDueDate] = useState("");
  const [responsible, setResponsible] = useState("AMBAS");
  const [saving, setSaving] = useState(false);

  const responsibleOptions = useMemo(() => {
    const names = members.rows.map(m => m.name).filter(Boolean);
    if (profile?.name && !names.includes(profile.name)) names.unshift(profile.name);
    return Array.from(new Set([...names, "AMBAS"]));
  }, [members.rows, profile?.name]);

  async function addTask() {
    const clean = title.trim();
    if (!clean) return toast.error("INFORME O NOME DA TAREFA");
    if (!user?.id || !tasks.householdId) return toast.error("SUA CONTA AINDA NÃO ESTÁ VINCULADA A UMA CASA");
    setSaving(true);
    try {
      await tasks.insert({ user_id: user.id, title: clean.toUpperCase(), quadrant, responsible, due_date: dueDate || null, completed: false });
      setTitle(""); setDueDate(""); setShowForm(false);
      toast.success("TAREFA ADICIONADA");
    } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO ADICIONAR"); }
    finally { setSaving(false); }
  }

  async function toggleTask(task: Task) {
    try { await tasks.update(task.id, { completed: !task.completed }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO ATUALIZAR"); }
  }

  async function removeTask(id: string) {
    if (!window.confirm("Excluir esta tarefa?")) return;
    try { await tasks.remove(id); toast.success("TAREFA EXCLUÍDA"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO EXCLUIR"); }
  }

  return <div className="space-y-5 pb-6">
    <PageHeader title="TAREFAS" subtitle="Organize suas tarefas e divida as responsabilidades da casa." action={<button type="button" aria-label="NOVA TAREFA" onClick={() => setShowForm(true)} className="group flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary active:scale-95"><Plus className="h-5 w-5 transition-transform group-hover:rotate-90" strokeWidth={2} /></button>} />
    <div>
      <p className="label-caps text-[10px] text-muted-foreground">LISTA DE TAREFAS</p>
      <p className="text-xs text-muted-foreground">Organize por prioridade.</p>
    </div>
    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
      <div role="dialog" aria-modal="true" aria-label="NOVA TAREFA" className="w-full max-w-3xl rounded-3xl border border-border bg-background p-5 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between"><div><p className="label-caps text-sm font-semibold">NOVA TAREFA</p><p className="mt-1 text-xs text-muted-foreground">Cadastre uma nova tarefa.</p></div><button type="button" aria-label="FECHAR" onClick={() => setShowForm(false)} className="rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground">×</button></div>
        <div className="grid gap-3 md:grid-cols-2">
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && void addTask()} placeholder="Nome da tarefa" className="rounded-xl border border-input bg-background px-4 py-3 text-sm md:col-span-2" />
          <label className="relative"><span className="pointer-events-none absolute left-4 top-2 text-[9px] text-muted-foreground">QUADRANTE</span><select value={quadrant} onChange={e => setQuadrant(e.target.value as (typeof QUADRANTS)[number]["name"])} className="h-full w-full appearance-none rounded-xl border border-input bg-background px-4 pb-2 pt-5 text-sm">{QUADRANTS.map(q => <option key={q.name}>{q.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4" /></label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="rounded-xl border border-input bg-background px-4 py-3 text-sm" />
          <select value={responsible} onChange={e => setResponsible(e.target.value)} className="rounded-xl border border-input bg-background px-4 py-3 text-sm md:col-span-2">{responsibleOptions.map(n => <option key={n}>{n}</option>)}</select>
        </div>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border px-5 py-3 text-[10px] font-semibold text-muted-foreground">CANCELAR</button><button disabled={saving} type="button" onClick={() => void addTask()} className="gradient-primary rounded-xl px-6 py-3 text-[10px] font-semibold text-primary-foreground">{saving ? "SALVANDO..." : "ADICIONAR TAREFA"}</button></div>
      </div>
    </div>}
    {tasks.isLoading ? <Panel><div className="py-14 text-center text-sm text-muted-foreground">CARREGANDO TAREFAS...</div></Panel> : tasks.rows.length === 0 ? <Panel><div className="py-14 text-center"><ListChecks className="mx-auto mb-3 h-10 w-10 text-primary"/><p className="font-semibold">NENHUMA TAREFA CADASTRADA</p><p className="mt-1 text-xs text-muted-foreground">Toque no + para adicionar sua primeira tarefa.</p></div></Panel> : <div className="grid gap-3 md:grid-cols-2">{QUADRANTS.map(q => { const rows = tasks.rows.filter(t => t.quadrant === q.name); return <Panel key={q.name} className={`border-2 ${q.border}`}><div className="mb-3 flex justify-between"><div><h2 className="label-caps text-xs">{q.name}</h2><p className="text-[11px] text-muted-foreground">{q.hint}</p></div><Tag tone="neutral">{rows.length}</Tag></div>{rows.length === 0 ? <div className="rounded-xl border border-dashed border-border px-3 py-7 text-center text-[11px] text-muted-foreground">Nenhuma tarefa aqui.</div> : <ul className="space-y-2">{rows.map(task => <li key={task.id} className={`flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-3 ${task.completed ? "opacity-60" : ""}`}><button onClick={() => void toggleTask(task)} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${task.completed ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"}`}><Check className="h-4 w-4"/></button><div className="min-w-0 flex-1"><p className={`label-caps truncate text-[11px] ${task.completed ? "line-through" : ""}`}>{task.title}</p><PersonDot name={task.responsible || "AMBAS"}/></div><Tag tone={task.due_date === new Date().toISOString().slice(0,10) ? "danger" : "neutral"}>{formatDueDate(task.due_date)}</Tag><button onClick={() => void removeTask(task.id)} className="text-red-400"><Trash2 className="h-4 w-4"/></button></li>)}</ul>}</Panel>; })}</div>}
  </div>;
}
