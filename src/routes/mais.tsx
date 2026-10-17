import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel } from "@/components/ui-kit";
import { moduleGroups, type ModuleGroup } from "@/components/layout/nav";

export const Route = createFileRoute("/mais")({
  beforeLoad: () => import("@tanstack/react-router").then(({ redirect }) => {
    throw redirect({ to: "/painel", replace: true });
  }),
});

function readMode(): "PESSOAL" | "EMPRESARIAL" {
  if (typeof window === "undefined") return "PESSOAL";
  try {
    return localStorage.getItem("harmony:mode") === "EMPRESARIAL" ? "EMPRESARIAL" : "PESSOAL";
  } catch {
    return "PESSOAL";
  }
}

export function MorePage() {
  const [mode, setMode] = useState<"PESSOAL" | "EMPRESARIAL">(readMode);
  const groups: ModuleGroup[] = moduleGroups.filter(group =>
    group.context === "SYSTEM" || (mode === "EMPRESARIAL" ? group.context === "BUSINESS" : group.context === "PERSONAL"),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel"
        subtitle={mode === "EMPRESARIAL"
          ? "Módulos da empresa e ferramentas do sistema."
          : "Todos os módulos, organizados por assunto."}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3">
        <p className="text-sm text-muted-foreground">Você está em</p>
        <div className="inline-flex rounded-xl border border-border bg-secondary/60 p-1" role="group" aria-label="Contexto do painel">
          <button
            type="button"
            aria-pressed={mode === "PESSOAL"}
            onClick={() => { setMode("PESSOAL"); try { localStorage.setItem("harmony:mode", "PESSOAL"); } catch { /* armazenamento opcional */ } }}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${mode === "PESSOAL" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >Pessoal</button>
          <button
            type="button"
            aria-pressed={mode === "EMPRESARIAL"}
            onClick={() => { setMode("EMPRESARIAL"); try { localStorage.setItem("harmony:mode", "EMPRESARIAL"); } catch { /* armazenamento opcional */ } }}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${mode === "EMPRESARIAL" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >Empresarial</button>
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:gap-5">
        {groups.map((group, index) => (
          <Panel key={group.label}>
            <section aria-labelledby={`painel-grupo-${index}`}>
              <div className="flex items-start gap-3 border-b border-border/70 pb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <group.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id={`painel-grupo-${index}`} className="text-sm font-semibold">{group.label}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{group.description}</p>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold tabular-nums text-muted-foreground">{group.items.length}</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.items.map(item => (
                  <Link
                    key={item.to}
                    to={item.to as never}
                    className="group flex min-h-12 min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-3 text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm leading-snug">{item.label}</span>
                    <span aria-hidden="true" className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary">›</span>
                  </Link>
                ))}
              </div>
            </section>
          </Panel>
        ))}
      </div>
    </div>
  );
}
