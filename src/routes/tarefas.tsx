import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronDown, ListChecks, Plus, Trash2 } from "lucide-react";
import { PageHeader, Panel, Tag, PersonDot } from "@/components/ui-kit";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Task = { id: string; household_id: string; user_id: string | null; title: string; quadrant: string; responsible: string | null; due_date: string | null; completed: boolean };
type Member = { id: string; household_id: string; name: string; initials: string | null };

export const Route = createFileRoute("/tarefas")({
  head: () => ({ meta: [{ title: "TAREFAS — MATRIZ DE EISENHOWER — MULTICAP" }, { name: "description", content: "Organize suas tarefas por urgência e importância." }] }),
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
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowKey = tomorrow.toISOString().slice(0, 10);
  if (date === todayKey) return "HOJE";
  if (date === tomorrowKey) return "AMANHÃ";
  return local.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function TasksPage() {
  const { user, profile } = useAuth();
  const tasks = useHouseholdTable<Task>("tasks", "*", "due_date");
  const members = useHouseholdTable<Member>("household_members", "id, household_id, name, initials", "name");
  const [showForm, setShowForm] = useState(true);
  const [title, setTitle] = useState("");
  const [quadrant, setQuadrant] = useState<(typeof QUADRANTS)[number]["name"]>("FAZER AGORA");
  const [dueDate, setDueDate] = useState("");
  const [responsible, setResponsible] = useState("AMBAS");
  const [saving, setSaving] = useState(false);

  const responsibleOptions = useMemo(() => {
    const names = members.rows.map((m) => m.name).filter(Boolean);
    if (profile?.name && !names.includes(profile.name)) names.unshift(profile.name);
    return Array.from(new Set([...names, "AMBAS"]));
  }, [members.rows, profile?.name]);

  async function addTask() {
    const cleanTitle = title.trim();
    if (!cleanTitle) return toast.error("INFORME O NOME DA TAREFA");
    if (!user?.id || !tasks.householdId) return toast.error("SUA CONTA AINDA NÃO ESTÁ VINCULADA A UMA CASA");
    setSaving(true);
    try {
      await tasks.insert({ user_id: user.id, title: cleanTitle.toUpperCase(), quadrant, responsible, due_date: dueDate || null, completed: false });
      setTitle(""); setDueDate(""); setQuadrant("FAZER AGORA");
      toast.success("TAREFA ADICIONADA");
    } catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO ADICIONAR A TAREFA"); }
    finally { setSaving(false); }
  }

  async function toggleTask(task: Task) {
    try { await tasks.update(task.id, { completed: !task.completed }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO ATUALIZAR A TAREFA"); }
  }

  async function removeTask(id: string) {
    if (!window.confirm("Excluir esta tarefa?")) return;
    try { await tasks.remove(id); toast.success("TAREFA EXCLUÍDA"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "ERRO AO EXCLUIR A TAREFA"); }
  }

  return (
    <div className="space-y-5 pb-6">
      <PageHeader title="MATRIZ DE EISENHOWER" subtitle="Prioridades organizadas por urgência e importância." />
      <div className="flex justify-end -mt-2"><button type="button" onClick={() => setShowForm((value) => !value)} className="gradient-primary flex items-center gap-2 rounded-xl px-5 py-3 text-[11px] font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> NOVA TAREFA</button></div>

      {showForm && <Panel title="NOVA TAREFA"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_180px_180px_auto]">
        <input value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addTask(); }} placeholder="Nome da tarefa" className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
        <label className="relative"><span className="pointer-events-none absolute left-4 top-2 text-[9px] text-muted-foreground">QUADRANTE</span><select value={quadrant} onChange={(event) => setQuadrant(event.target.value as (typeof QUADRANTS)[number]["name"])} className="h-full w-full appearance-none rounded-xl border border-input bg-background px-4 pb-2 pt-5 text-sm">{QUADRANTS.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4" /></label>
        <label className="relative"><span className="pointer-events-none absolute left-4 top-2 text-[9px] text-muted-foreground">PRAZO</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-full w-full rounded-xl border border-input bg-background px-4 pb-2 pt-5 text-sm" /></label>
        <label className="relative"><span className="pointer-events-none absolute left-4 top-2 text-[9px] text-muted-foreground">RESPONSÁVEL</span><select value={responsible} onChange={(event) => setResponsible(event.target.value)} className="h-full w-full appearance-none rounded-xl border border-input bg-background px-4 pb-2 pt-5 text-sm">{responsibleOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4" /></label>
        <button type="button" disabled={saving} onClick={() => void addTask()} className="gradient-primary flex min-h-12 items-center justify-center gap-1 rounded-xl px-6 text-[10px] font-semibold text-primary-foreground disabled:opacity-50"><Plus className="h-4 w-4" /> {saving ? "SALVANDO..." : "ADICIONAR"}</button>
      </div></Panel>}

      {tasks.isLoading ? <Panel><div className="flex min-h-52 items-center justify-center text-sm text-muted-foreground">CARREGANDO TAREFAS...</div></Panel> : tasks.rows.length === 0 ? <Panel><div className="py-14 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-primary/5 text-primary"><ListChecks className="h-7 w-7" /></div><p className="font-semibold">NENHUMA TAREFA CADASTRADA</p><p className="mt-1 text-xs text-muted-foreground">Adicione sua primeira tarefa usando o formulário acima.</p></div></Panel> : <div className="grid gap-3 md:grid-cols-2">
        {QUADRANTS.map((q) => { const quadrantTasks = tasks.rows.filter((task) => task.quadrant === q.name); return <Panel key={q.name} className={cn("border-2", q.border)}>
          <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="label-caps text-xs text-foreground">{q.name}</h2><p className="text-[11px] text-muted-foreground">{q.hint}</p></div><span className="rounded-full bg-secondary px-2 py-1 text-[9px] text-muted-foreground">{quadrantTasks.length}</span></div>
          {quadrantTasks.length === 0 ? <div className="rounded-xl border border-dashed border-border px-3 py-7 text-center text-[11px] text-muted-foreground">Nenhuma tarefa aqui.</div> : <ul className="space-y-2">{quadrantTasks.map((task) => <li key={task.id} className={cn("flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-3", task.completed && "opacity-60")}>
            <button type="button" onClick={() => void toggleTask(task)} className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border", task.completed ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent hover:border-primary")} aria-label={task.completed ? "Desmarcar tarefa" : "Concluir tarefa"}><Check className="h-4 w-4" /></button>
            <div className="min-w-0 flex-1"><p className={cn("label-caps truncate text-[11px]", task.completed && "line-through")}>{task.title}</p><PersonDot name={task.responsible || "AMBAS"} /></div>
            <Tag tone={task.due_date && task.due_date === new Date().toISOString().slice(0, 10) ? "danger" : "neutral"}>{formatDueDate(task.due_date)}</Tag>
            <button type="button" onClick={() => void removeTask(task.id)} className="text-red-400/70 hover:text-red-400" title="Excluir tarefa" aria-label="Excluir tarefa"><Trash2 className="h-4 w-4" /></button>
          </li>)}</ul>}
        </Panel>; })}
      </div>}
    </div>
  );
}
