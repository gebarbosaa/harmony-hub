import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag, PersonDot } from "@/components/ui-kit";
import { tasks } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tarefas")({
  head: () => ({
    meta: [
      { title: "TAREFAS — MATRIZ DE EISENHOWER — MULTICAP" },
      { name: "description", content: "Organize tarefas do casal por urgência e importância." },
      { property: "og:title", content: "TAREFAS — MATRIZ DE EISENHOWER — MULTICAP" },
      {
        property: "og:description",
        content: "Organize tarefas do casal por urgência e importância.",
      },
    ],
  }),
  component: TasksPage,
});

const QUADRANTS = [
  { name: "FAZER AGORA", border: "border-primary", hint: "Urgente e importante" },
  { name: "AGENDAR", border: "border-info/60", hint: "Importante, sem urgência" },
  { name: "DELEGAR/DIVIDIR", border: "border-warning/60", hint: "Urgente, pode ser dividida" },
  { name: "ELIMINAR", border: "border-border", hint: "Sem urgência nem importância" },
];

function TasksPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="MATRIZ DE EISENHOWER" subtitle="Prioridades do casal em quatro quadrantes." />

      <div className="grid gap-3 md:grid-cols-2">
        {QUADRANTS.map((q) => (
          <Panel key={q.name} className={cn("border-2", q.border)}>
            <div className="mb-3">
              <h2 className="label-caps text-xs text-foreground">{q.name}</h2>
              <p className="text-[11px] text-muted-foreground">{q.hint}</p>
            </div>
            <ul className="space-y-2">
              {tasks
                .filter((t) => t.quadrant === q.name)
                .map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2"
                  >
                    <div>
                      <p className="label-caps text-[11px]">{t.title}</p>
                      <PersonDot name={t.responsible} />
                    </div>
                    <Tag tone={t.due === "HOJE" ? "danger" : "neutral"}>{t.due}</Tag>
                  </li>
                ))}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}
