import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, MapPin } from "lucide-react";
import { PageHeader, Panel, Tag, PersonDot } from "@/components/ui-kit";
import { appointments } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "AGENDA E COMPROMISSOS — MULTICAP" },
      { name: "description", content: "Compromissos do casal por categoria, responsável e sincronização." },
      { property: "og:title", content: "AGENDA E COMPROMISSOS — MULTICAP" },
      {
        property: "og:description",
        content: "Compromissos do casal por categoria, responsável e sincronização.",
      },
    ],
  }),
  component: AgendaPage,
});

const CATEGORIES = [
  "TODAS",
  "MERCADO",
  "CONTAS",
  "FOLGA",
  "LAZER",
  "TRABALHO",
  "SAÚDE",
  "FAMÍLIA",
  "OUTROS",
];

function AgendaPage() {
  const [category, setCategory] = useState("TODAS");
  const list = appointments.filter((a) => category === "TODAS" || a.category === category);

  return (
    <div className="space-y-5">
      <PageHeader title="AGENDA E COMPROMISSOS" subtitle="Próximos eventos do casal." />

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "label-caps rounded-lg border px-3 py-1.5 text-[10px]",
              c === category
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <Panel title="CRONOLOGIA">
        <ul className="space-y-3">
          {list.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3"
            >
              <span className="gradient-soft flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-primary/30 text-[10px] text-primary">
                <CalendarClock className="h-4 w-4" />
                {a.time}
              </span>
              <div className="min-w-0 flex-1">
                <p className="label-caps text-[12px]">{a.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Tag tone="primary">{a.category}</Tag>
                  <PersonDot name={a.responsible} />
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {a.date}
                  </span>
                </div>
              </div>
              {a.external ? <Tag tone="info">GOOGLE CALENDAR</Tag> : <Tag>INTERNO</Tag>}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
