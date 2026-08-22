import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronDown, ListChecks, Plus, Trash2, Pencil, X } from "lucide-react";
import { PageHeader, Panel, Tag, PersonDot } from "@/components/ui-kit";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Task = { id: string; household_id: string; user_id: string | null; title: string; quadrant: string; responsible: string | null; due_date: string | null; completed: boolean };
type Member = { id: string; household_id: string; name: string; initials: string | null };
type Chore = { id: string; household_id: string; user_id: string | null; title: string; day: string; responsible: string; completed: boolean };

export const Route = createFileRoute("/tarefas")({
  head: () => ({ meta: [{ title: "TAREFAS — MULTICAP" }, { name: "description", content: "Organize tarefas e tarefas domésticas da casa." }] }),
  component: TasksPage,
});

const QUADRANTS = [
  { name: "FAZER AGORA", border: "border-primary", hint: "Urgente e importante" },
  { name: "AGENDAR", border: "border-info/60", hint: "Importante, sem urgência" },
  { name: "DELEGAR/DIVIDIR", border: "border-warning/60", hint: "Urgente, pode ser dividida" },
  { name: "ELIMINAR", border: "border-border", hint: "Sem urgência nem importância" },
] as const;
const DAYS = ["SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO", "DOMINGO"];

function formatDueDate(date: string | null) {
  if (!date) return "SEM PRAZO";
  const today = new Date(); const local = new Date(`${date}T12:00:00`);
  const todayKey = today.toISOString().slice(0, 10); const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const tomorrowKey = tomorrow.toISOString().slice(0, 10);
  if (date === todayKey) return "HOJE"; if (date === tomorrowKey) return "AMANHÃ";
  return local.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function TasksPage() {
  const { user, profile } = useAuth();
  const tasks = useHouseholdTable<Task>("tasks", "*", "due_date");
  const chores = useHouseholdTable<Chore>("household_chores", "*", "created_at");
  const members = useHouseholdTable<Member>("household_members", "id, household_id, name, initials", "name");
  const [tab, setTab] = useState<"tarefas" | "domesticas">("tarefas");
  const [showForm, setShowForm] = useState(true); const [title, setTitle] = useState(""); const [quadrant, setQuadrant] = useState<(typeof QUADRANTS)[number]["name"]>("FAZER AGORA"); const [dueDate, setDueDate] = useState(""); const [responsible, setResponsible] = useState("AMBAS"); const [saving, setSaving] = useState(false);
  const [choreTitle, setChoreTitle] = useState(""); const [choreDay, setChoreDay] = useState(DAYS[0]); const [choreResponsible, setChoreResponsible] = useState("AMBAS"); const [editingChore, setEditingChore] = useState<string | null>(null);
  const responsibleOptions = useMemo(() => { const names = members.rows.map(m => m.name).filter(Boolean); if (profile?.name && !names.includes(profile.name)) names.unshift(profile.name); return Array.from(new Set([...names, "AMBAS"])); }, [members.rows, profile?.name]);

  async function addTask() { const clean = title.trim(); if (!clean) return toast.error("INFORME O NOME DA TAREFA"); if (!user?.id || !tasks.householdId) return toast.error("SUA CONTA AINDA NÃO ESTÁ VINCULADA A UMA CASA"); setSaving(true); try { await tasks.insert({ user_id: user.id, title: clean.toUpperCase(), quadrant, responsible, due_date: dueDate || null, completed: false }); setTitle(""); setDueDate(""); toast.success("TAREFA ADICIONADA"); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO ADICIONAR"); } finally { setSaving(false); } }
  async function toggleTask(task: Task) { try { await tasks.update(task.id, { completed: !task.completed }); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO ATUALIZAR"); } }
  async function removeTask(id: string) { if (!window.confirm("Excluir esta tarefa?")) return; try { await tasks.remove(id); toast.success("TAREFA EXCLUÍDA"); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO EXCLUIR"); } }
  async function saveChore() { const clean = choreTitle.trim(); if (!clean) return toast.error("INFORME A TAREFA DOMÉSTICA"); if (!user?.id || !chores.householdId) return toast.error("SUA CONTA AINDA NÃO ESTÁ VINCULADA A UMA CASA"); try { if (editingChore) await chores.update(editingChore, { title: clean.toUpperCase(), day: choreDay, responsible: choreResponsible }); else await chores.insert({ user_id: user.id, title: clean.toUpperCase(), day: choreDay, responsible: choreResponsible, completed: false }); setChoreTitle(""); setEditingChore(null); toast.success(editingChore ? "TAREFA ATUALIZADA" : "TAREFA DOMÉSTICA ADICIONADA"); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO SALVAR"); } }
  async function toggleChore(chore: Chore) { try { await chores.update(chore.id, { completed: !chore.completed }); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO ATUALIZAR"); } }
  async function removeChore(id: string) { if (!window.confirm("Excluir esta tarefa doméstica?")) return; try { await chores.remove(id); toast.success("TAREFA EXCLUÍDA"); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO EXCLUIR"); } }
  function editChore(chore: Chore) { setEditingChore(chore.id); setChoreTitle(chore.title); setChoreDay(chore.day); setChoreResponsible(chore.responsible); setTab("domesticas"); setShowForm(true); }

  return <div className="space-y-5 pb-6">
    <PageHeader title="TAREFAS" subtitle="Organize suas tarefas e divida as responsabilidades da casa." />
    <div className="flex gap-2 border-b border-border pb-2"><button onClick={() => setTab("tarefas")} className={cn("rounded-xl px-5 py-3 text-[10px] font-semibold", tab === "tarefas" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>TAREFAS</button><button onClick={() => setTab("domesticas")} className={cn("rounded-xl px-5 py-3 text-[10px] font-semibold", tab === "domesticas" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>TAREFAS DOMÉSTICAS</button></div>

    {tab === "tarefas" ? <>
      <div className="flex justify-end -mt-2"><button onClick={() => setShowForm(v => !v)} className="gradient-primary flex items-center gap-2 rounded-xl px-5 py-3 text-[11px] font-semibold text-primary-foreground"><Plus className="h-4 w-4"/> NOVA TAREFA</button></div>
      {showForm && <Panel title="NOVA TAREFA"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_180px_180px_auto]"><input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && void addTask()} placeholder="Nome da tarefa" className="rounded-xl border border-input bg-background px-4 py-3 text-sm"/><label className="relative"><span className="pointer-events-none absolute left-4 top-2 text-[9px] text-muted-foreground">QUADRANTE</span><select value={quadrant} onChange={e => setQuadrant(e.target.value as (typeof QUADRANTS)[number]["name"])} className="h-full w-full appearance-none rounded-xl border border-input bg-background px-4 pb-2 pt-5 text-sm">{QUADRANTS.map(q => <option key={q.name}>{q.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4"/></label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="rounded-xl border border-input bg-background px-4 py-3 text-sm"/><select value={responsible} onChange={e => setResponsible(e.target.value)} className="rounded-xl border border-input bg-background px-4 py-3 text-sm">{responsibleOptions.map(n => <option key={n}>{n}</option>)}</select><button disabled={saving} onClick={() => void addTask()} className="gradient-primary flex min-h-12 items-center justify-center gap-1 rounded-xl px-6 text-[10px] font-semibold text-primary-foreground"><Plus className="h-4 w-4"/>{saving ? "SALVANDO..." : "ADICIONAR"}</button></div></Panel>}
      {tasks.isLoading ? <Panel><div className="py-14 text-center text-sm text-muted-foreground">CARREGANDO TAREFAS...</div></Panel> : tasks.rows.length === 0 ? <Panel><div className="py-14 text-center"><ListChecks className="mx-auto mb-3 h-10 w-10 text-primary"/><p className="font-semibold">NENHUMA TAREFA CADASTRADA</p><p className="mt-1 text-xs text-muted-foreground">Adicione sua primeira tarefa acima.</p></div></Panel> : <div className="grid gap-3 md:grid-cols-2">{QUADRANTS.map(q => { const rows = tasks.rows.filter(t => t.quadrant === q.name); return <Panel key={q.name} className={cn("border-2", q.border)}><div className="mb-3 flex justify-between"><div><h2 className="label-caps text-xs">{q.name}</h2><p className="text-[11px] text-muted-foreground">{q.hint}</p></div><Tag tone="neutral">{rows.length}</Tag></div>{rows.length === 0 ? <div className="rounded-xl border border-dashed border-border px-3 py-7 text-center text-[11px] text-muted-foreground">Nenhuma tarefa aqui.</div> : <ul className="space-y-2">{rows.map(task => <li key={task.id} className={cn("flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-3", task.completed && "opacity-60")}><button onClick={() => void toggleTask(task)} className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border", task.completed ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent")}><Check className="h-4 w-4"/></button><div className="min-w-0 flex-1"><p className={cn("label-caps truncate text-[11px]", task.completed && "line-through")}>{task.title}</p><PersonDot name={task.responsible || "AMBAS"}/></div><Tag tone={task.due_date === new Date().toISOString().slice(0,10) ? "danger" : "neutral"}>{formatDueDate(task.due_date)}</Tag><button onClick={() => void removeTask(task.id)} className="text-red-400"><Trash2 className="h-4 w-4"/></button></li>)}</ul>}</Panel>; })}</div>}
    </> : <>
      <div className="flex justify-end"><button onClick={() => { setEditingChore(null); setChoreTitle(""); setChoreDay(DAYS[0]); setChoreResponsible("AMBAS"); setShowForm(true); }} className="gradient-primary flex items-center gap-2 rounded-xl px-5 py-3 text-[11px] font-semibold text-primary-foreground"><Plus className="h-4 w-4"/> NOVA TAREFA DOMÉSTICA</button></div>
      {showForm && <Panel title={editingChore ? "EDITAR TAREFA DOMÉSTICA" : "NOVA TAREFA DOMÉSTICA"}><div className="grid gap-3 md:grid-cols-[1fr_200px_200px_auto]"><input value={choreTitle} onChange={e => setChoreTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && void saveChore()} placeholder="Ex.: Lavar louça, limpar banheiro..." className="rounded-xl border border-input bg-background px-4 py-3 text-sm"/><select value={choreDay} onChange={e => setChoreDay(e.target.value)} className="rounded-xl border border-input bg-background px-4 py-3 text-sm">{DAYS.map(d => <option key={d}>{d}</option>)}</select><select value={choreResponsible} onChange={e => setChoreResponsible(e.target.value)} className="rounded-xl border border-input bg-background px-4 py-3 text-sm">{responsibleOptions.map(n => <option key={n}>{n}</option>)}</select><div className="flex gap-2"><button onClick={() => void saveChore()} className="gradient-primary flex flex-1 items-center justify-center gap-1 rounded-xl px-5 text-[10px] font-semibold text-primary-foreground">{editingChore ? <Pencil className="h-4 w-4"/> : <Plus className="h-4 w-4"/>}{editingChore ? "SALVAR" : "ADICIONAR"}</button>{editingChore && <button onClick={() => { setEditingChore(null); setChoreTitle(""); }} className="rounded-xl border border-border px-3"><X className="h-4 w-4"/></button>}</div></div></Panel>}
      {chores.isLoading ? <Panel><div className="py-14 text-center text-sm text-muted-foreground">CARREGANDO TAREFAS DOMÉSTICAS...</div></Panel> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{DAYS.map(day => { const rows = chores.rows.filter(c => c.day === day); return <Panel key={day} className="min-h-48"><div className="mb-3 flex items-center justify-between"><h2 className="label-caps text-xs">{day}</h2><span className="rounded-full bg-secondary px-2 py-1 text-[9px] text-muted-foreground">{rows.length}</span></div>{rows.length === 0 ? <p className="py-6 text-center text-[10px] text-muted-foreground">Nenhuma tarefa</p> : <div className="space-y-2">{rows.map(chore => <div key={chore.id} className={cn("rounded-xl border border-border bg-secondary/30 p-3", chore.completed && "opacity-60")}><div className="flex items-start gap-2"><button onClick={() => void toggleChore(chore)} className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", chore.completed ? "border-primary bg-primary text-primary-foreground" : "border-border")}><Check className="h-3 w-3"/></button><div className="min-w-0 flex-1"><p className={cn("text-[11px] font-semibold", chore.completed && "line-through")}>{chore.title}</p><p className="mt-1 text-[9px] text-muted-foreground">Responsável: {chore.responsible}</p></div></div><div className="mt-3 flex justify-end gap-3"><button onClick={() => editChore(chore)} className="text-[9px] text-primary"><Pencil className="mr-1 inline h-3 w-3"/>EDITAR</button><button onClick={() => void removeChore(chore.id)} className="text-[9px] text-red-400"><Trash2 className="mr-1 inline h-3 w-3"/>EXCLUIR</button></div></div>)}</div>}</Panel>; })}</div>}
    </>}
  </div>;
}
