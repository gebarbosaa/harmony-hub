import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarClock, Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, Tag, PersonDot } from "@/components/ui-kit";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "AGENDA E COMPROMISSOS — MULTICAP" }] }),
  component: AgendaPage,
});

type Row = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  category: string;
  owner_id: string;
  household_id: string;
  privacy: string;
  completed: boolean;
};

const categories = ["OUTROS", "CONTAS", "TRABALHO", "SAÚDE", "LAZER", "FAMÍLIA", "ESTUDOS", "ACADEMIA"];

function AgendaPage() {
  const { user, profile } = useAuth();
  const { rows, insert, update, remove, isLoading } = useHouseholdTable<Row>(
    "reminders",
    "id,title,date,time,category,owner_id,privacy,completed,household_id",
    "date",
  );
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("");
  const [category, setCategory] = useState("OUTROS");
  const [editing, setEditing] = useState<Row | null>(null);
  const [details, setDetails] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  const orderedRows = useMemo(
    () => [...rows].sort((a, b) => `${a.date} ${a.time ?? "99:99"}`.localeCompare(`${b.date} ${b.time ?? "99:99"}`)),
    [rows],
  );

  function resetForm() {
    setTitle("");
    setDate(new Date().toISOString().slice(0, 10));
    setTime("");
    setCategory("OUTROS");
    setEditing(null);
  }

  function startEdit(event: Row) {
    setEditing(event);
    setTitle(event.title);
    setDate(event.date);
    setTime(event.time ?? "");
    setCategory(event.category);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!user || !title.trim()) { toast.error("PREENCHA O COMPROMISSO"); return; }
    if (!date) { toast.error("INFORME A DATA"); return; }
    setSaving(true);
    try {
      const values = { title: title.trim().toUpperCase(), date, time: time || null, category };
      if (editing) {
        await update(editing.id, values);
        toast.success("COMPROMISSO ATUALIZADO");
      } else {
        await insert({ ...values, owner_id: user.id, privacy: "COMPARTILHADO" });
        toast.success("COMPROMISSO SALVO");
      }
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  async function toggleComplete(event: Row) {
    try {
      await update(event.id, { completed: !event.completed });
      setDetails((current) => (current && current.id === event.id ? { ...current, completed: !event.completed } : current));
      toast.success(event.completed ? "COMPROMISSO REABERTO" : "COMPROMISSO CONCLUÍDO");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar");
    }
  }

  async function del(id: string) {
    if (!window.confirm("Tem certeza que deseja excluir este compromisso?")) return;
    try {
      await remove(id);
      if (details?.id === id) setDetails(null);
      if (editing?.id === id) resetForm();
      toast.success("COMPROMISSO EXCLUÍDO");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="AGENDA E COMPROMISSOS"
        subtitle={`Compromissos de ${profile?.name || "sua conta"}.`}
      />

      <Panel title={editing ? "EDITAR COMPROMISSO" : "NOVO COMPROMISSO"}>
        <div className="grid gap-3 md:grid-cols-5">
          <label className="md:col-span-2">
            <span className="label-caps text-[10px] text-muted-foreground">TÍTULO</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: consulta, reunião..." className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          </label>
          <label>
            <span className="label-caps text-[10px] text-muted-foreground">DATA</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          </label>
          <label>
            <span className="label-caps text-[10px] text-muted-foreground">HORÁRIO</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />
          </label>
          <label>
            <span className="label-caps text-[10px] text-muted-foreground">CATEGORIA</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button disabled={saving} onClick={save} className="gradient-primary label-caps flex-1 rounded-xl px-4 py-2.5 text-[11px] text-primary-foreground disabled:opacity-60">
              {saving ? "SALVANDO..." : editing ? "ATUALIZAR COMPROMISSO" : "SALVAR COMPROMISSO"}
            </button>
            {editing && <button onClick={resetForm} aria-label="Cancelar edição" className="rounded-xl border border-border px-4"><X className="h-4 w-4" /></button>}
          </div>
        </div>
      </Panel>

      <Panel title="PRÓXIMOS COMPROMISSOS">
        {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p> : orderedRows.length === 0 ? (
          <div className="py-10 text-center"><p className="text-sm text-muted-foreground">Nenhum compromisso cadastrado.</p><p className="mt-1 text-xs text-muted-foreground">Crie seu primeiro compromisso acima.</p></div>
        ) : (
          <ul className="space-y-3">
            {orderedRows.map((a) => (
              <li key={a.id} className={a.completed ? "flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3 opacity-60" : "flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3"}>
                <button onClick={() => setDetails(a)} className="gradient-soft flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-primary/30 text-[10px] text-primary" aria-label={`Ver ${a.title}`}>
                  <CalendarClock className="h-4 w-4" />{a.time || "--:--"}
                </button>
                <button onClick={() => setDetails(a)} className="min-w-0 flex-1 text-left">
                  <p className={a.completed ? "label-caps text-[12px] line-through" : "label-caps text-[12px]"}>{a.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2"><Tag tone="primary">{a.category}</Tag>{a.completed && <Tag tone="success">CONCLUÍDO</Tag>}<PersonDot name={profile?.name || "MINHA CONTA"}/><span className="text-[10px] text-muted-foreground">{a.date}</span></div>
                </button>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(a)} aria-label="Editar compromisso" className="rounded-lg p-2 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => del(a.id)} aria-label="Excluir compromisso" className="rounded-lg p-2 hover:bg-secondary"><Trash2 className="h-4 w-4 text-danger" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {details && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Detalhes do compromisso">
          <div className="w-full max-w-lg rounded-t-2xl border border-border bg-background p-5 shadow-xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">DETALHES DO COMPROMISSO</p><h2 className="mt-1 text-xl font-semibold">{details.title}</h2></div><button onClick={() => setDetails(null)} aria-label="Fechar"><X className="h-5 w-5" /></button></div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><span className="text-xs text-muted-foreground">DATA</span><p>{details.date}</p></div><div><span className="text-xs text-muted-foreground">HORÁRIO</span><p>{details.time || "Não informado"}</p></div><div><span className="text-xs text-muted-foreground">CATEGORIA</span><p>{details.category}</p></div><div><span className="text-xs text-muted-foreground">RESPONSÁVEL</span><p>{profile?.name || "Minha conta"}</p></div></div>
            <div className="mt-5 flex gap-2"><button onClick={() => { startEdit(details); setDetails(null); }} className="flex-1 rounded-xl border border-border px-4 py-3 text-sm"><Pencil className="mr-2 inline h-4 w-4"/>Editar</button><button onClick={() => void del(details.id)} className="rounded-xl border border-danger/30 px-4 py-3 text-sm text-danger"><Trash2 className="mr-2 inline h-4 w-4"/>Excluir</button><button onClick={() => void toggleComplete(details)} className={details.completed ? "rounded-xl border border-success/30 px-4 py-3 text-sm text-success" : "rounded-xl border border-border px-4 py-3 text-sm"}><Check className="mr-2 inline h-4 w-4"/>{details.completed ? "Reabrir" : "Concluir"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
