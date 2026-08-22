import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/ui-kit";
import { useHouseholdTable } from "@/hooks/use-household-data";

export const Route = createFileRoute("/tarefas-domesticas")({
  head: () => ({ meta: [{ title: "ROTINA DA CASA — HARMONY HUB" }] }),
  component: DomesticTasksPage,
});

type DomesticTask = { id: string; title: string; weekday: number; responsible: string; done: boolean; household_id: string };
const days = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];

function DomesticTasksPage() {
  const tasks = useHouseholdTable<DomesticTask>("domestic_tasks", "id,title,weekday,responsible,done,household_id", "weekday");
  const [title, setTitle] = useState("");
  const [day, setDay] = useState("1");
  const [responsible, setResponsible] = useState("AMBAS");

  async function add() {
    if (!title.trim()) return toast.error("INFORME A TAREFA");
    try { await tasks.insert({ title: title.trim().toUpperCase(), weekday: Number(day), responsible: responsible.trim().toUpperCase() || "AMBAS", done: false }); setTitle(""); toast.success("TAREFA DOMÉSTICA ADICIONADA"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO ADICIONAR"); }
  }
  async function toggle(task: DomesticTask) { try { await tasks.update(task.id, { done: !task.done }); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO ATUALIZAR"); } }
  async function remove(id: string) { try { await tasks.remove(id); toast.success("TAREFA EXCLUÍDA"); } catch (e) { toast.error(e instanceof Error ? e.message : "ERRO AO EXCLUIR"); } }

  return <div className="space-y-5">
    <PageHeader title="ROTINA DA CASA" subtitle="TAREFAS DOMÉSTICAS EDITÁVEIS POR DIA DA SEMANA E RESPONSÁVEL." />
    <Panel title="NOVA TAREFA DOMÉSTICA">
      <div className="grid gap-2 md:grid-cols-[1fr_180px_180px_auto]">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="EX.: LIMPAR BANHEIRO" className="rounded-xl border border-input bg-background px-3 py-3 text-sm" />
        <select value={day} onChange={e => setDay(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-3 text-sm">{days.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
        <input value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="RESPONSÁVEL" className="rounded-xl border border-input bg-background px-3 py-3 text-sm" />
        <button onClick={() => void add()} className="gradient-primary rounded-xl px-4 py-3 text-[11px] text-primary-foreground"><Plus className="mr-1 inline h-4 w-4" />ADICIONAR</button>
      </div>
    </Panel>
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {days.map((dayName, dayIndex) => <Panel key={dayName} title={dayName}>
        <div className="space-y-2">{tasks.rows.filter(t => Number(t.weekday) === dayIndex).map(task => <div key={task.id} className="flex items-center gap-2 rounded-xl border border-border p-3">
          <button onClick={() => void toggle(task)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${task.done ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} aria-label="CONCLUIR"><Check className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1"><p className={`label-caps text-[11px] ${task.done ? "line-through opacity-60" : ""}`}>{task.title}</p><p className="text-[10px] text-muted-foreground">{task.responsible}</p></div>
          <button onClick={() => void remove(task.id)} className="text-muted-foreground hover:text-danger" aria-label="EXCLUIR"><Trash2 className="h-4 w-4" /></button>
        </div>)}{tasks.rows.filter(t => Number(t.weekday) === dayIndex).length === 0 && <p className="py-5 text-center text-xs text-muted-foreground">NENHUMA TAREFA</p>}</div>
      </Panel>)}
    </div>
  </div>;
}
