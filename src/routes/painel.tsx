import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, RotateCcw, Eye, EyeOff, Sparkles, ArrowUpRight, CalendarDays, Heart, LayoutGrid, House, Clock3, Utensils } from "lucide-react";
import { Panel, Button, Hero, SegmentedControl, IconBadge } from "@/components/ui-kit";
import { moduleGroups, type ModuleGroup } from "@/components/layout/nav";

export const Route = createFileRoute("/painel")({
  head: () => ({ meta: [{ title: "PAINEL — HARMONY HUB" }] }),
  component: MorePage,
});

function readMode(): "PESSOAL" | "EMPRESARIAL" {
  if (typeof window === "undefined") return "PESSOAL";
  try {
    return localStorage.getItem("harmony:mode") === "EMPRESARIAL" ? "EMPRESARIAL" : "PESSOAL";
  } catch {
    return "PESSOAL";
  }
}

const DASHBOARD_PREFS_KEY = "harmony:dashboard:visible-modules";
function readVisibleModules(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(DASHBOARD_PREFS_KEY);
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every(item => typeof item === "string") ? parsed : null;
  } catch { return null; }
}

export function MorePage() {
  const [mode, setMode] = useState<"PESSOAL" | "EMPRESARIAL">(readMode);
  const [customizing, setCustomizing] = useState(false);
  const [visibleModules, setVisibleModules] = useState<string[] | null>(readVisibleModules);
  const groups: ModuleGroup[] = useMemo(() => {
    const visibleGroups = moduleGroups.filter(group =>
      group.context === "SYSTEM" || (mode === "EMPRESARIAL" ? group.context === "BUSINESS" : group.context === "PERSONAL"),
    );
    if (mode === "EMPRESARIAL") return visibleGroups;

    const groupedPersonalItems = new Set(["/alimentacao", "/rotina", "/casa"]);
    const reorganizedGroups = visibleGroups
      .map(group => ({ ...group, items: group.items.filter(item => !groupedPersonalItems.has(item.to)) }))
      .filter(group => group.items.length > 0);

    reorganizedGroups.push({
      label: "Casa",
      description: "Acesse cada área da organização doméstica diretamente pelas abas.",
      icon: House,
      context: "PERSONAL",
      items: [
        { label: "Cômodos", to: "/casa#tab=Cômodos", icon: House },
        { label: "Mercado", to: "/casa#tab=Mercado", icon: ShoppingCart },
        { label: "Rotina", to: "/casa#tab=Rotina", icon: Clock3 },
        { label: "Despensa", to: "/casa#tab=Despensa", icon: LayoutGrid },
        { label: "Cardápio", to: "/casa#tab=Cardápio", icon: Utensils },
        { label: "Manutenção", to: "/casa#tab=Manutenção", icon: SlidersHorizontal },
        { label: "Co-op", to: "/casa#tab=Co-op", icon: Heart },
        { label: "Segurança", to: "/casa#tab=Segurança", icon: Eye },
        { label: "Utilidades", to: "/casa#tab=Utilidades", icon: Sparkles },
      ],
    });
    return reorganizedGroups;
  }, [mode]);
  const allModuleIds = useMemo(() => groups.flatMap(group => group.items.map(item => item.to)), [groups]);
  const activeModuleIds = visibleModules === null ? allModuleIds : allModuleIds.filter(id => visibleModules.includes(id));
  useEffect(() => {
    if (visibleModules === null) return;
    try { localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(visibleModules)); } catch { /* preferência opcional */ }
  }, [visibleModules]);
  function toggleModule(id: string) {
    setVisibleModules(current => {
      const currentIds = current === null ? allModuleIds : current;
      return currentIds.includes(id) ? currentIds.filter(item => item !== id) : [...currentIds, id];
    });
  }
  function resetDashboard() {
    setVisibleModules(null);
    try { localStorage.removeItem(DASHBOARD_PREFS_KEY); } catch { /* preferência opcional */ }
  }

  return (
    <div className="app-container space-y-6">
      <Hero
        eyebrow={<><Sparkles className="h-3.5 w-3.5" /> SEU ESPAÇO, DO SEU JEITO</>}
        title={mode === "EMPRESARIAL" ? "Seu espaço de trabalho" : "Organize a vida com mais leveza."}
        description={mode === "EMPRESARIAL" ? "Acesse as ferramentas da empresa em um só lugar." : "Rotina, hábitos, casa, treinos e finanças — tudo reunido para facilitar seu dia."}
        actions={<>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><LayoutGrid className="h-4 w-4" /> {groups.reduce((sum, group) => sum + group.items.filter(item => activeModuleIds.includes(item.to)).length, 0)} módulos disponíveis</span>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><Heart className="h-4 w-4" /> Um passo de cada vez</span>
        </>}
        art={<div className="app-hero-art" aria-hidden="true" style={{ top: "50%", right: "4%", width: 255, height: 255, transform: "translateY(-50%)" }}><div style={{ position: "absolute", inset: 35, border: "1px solid color-mix(in oklab, var(--primary) 18%, transparent)", borderRadius: "42% 58% 58% 42% / 42% 42% 58% 58%", background: "linear-gradient(135deg, color-mix(in oklab, var(--primary) 22%, transparent), color-mix(in oklab, #b9b5f5 35%, transparent))", transform: "rotate(-15deg)" }} /><div style={{ position: "absolute", inset: 7, border: "1px solid color-mix(in oklab, var(--primary) 19%, transparent)", borderRadius: "50%", transform: "rotate(27deg) scaleX(.74)" }} /><span style={{ position: "absolute", top: 23, right: 34, color: "var(--primary)", fontSize: 32 }}>✦</span></div>}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 app-card app-card-tight">
        <p className="text-sm text-muted-foreground">Você está em</p>
        <SegmentedControl<"PESSOAL" | "EMPRESARIAL">
          value={mode}
          onChange={(next) => { setMode(next); try { localStorage.setItem("harmony:mode", next); } catch { /* armazenamento opcional */ } }}
          options={[{ value: "PESSOAL", label: "Pessoal" }, { value: "EMPRESARIAL", label: "Empresarial" }]}
          ariaLabel="Contexto do painel"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 app-card app-card-default">
        <div className="flex items-center gap-3">
          <IconBadge icon={<SlidersHorizontal className="h-5 w-5"/>} tone="primary" size="lg"/>
          <div><p className="text-sm font-semibold">Seu painel, do seu jeito</p><p className="mt-1 text-xs text-muted-foreground">Escolha quais módulos aparecem aqui. A preferência fica salva neste navegador.</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={<SlidersHorizontal className="h-4 w-4"/>} onClick={() => setCustomizing(value => !value)} aria-expanded={customizing}>{customizing ? "Concluir" : "Personalizar"}</Button>
          {visibleModules !== null && <Button variant="ghost" size="sm" icon={<RotateCcw className="h-4 w-4"/>} onClick={resetDashboard}>Restaurar padrão</Button>}
        </div>
      </div>
      {customizing && <div className="app-card app-card-default border-primary/20 bg-primary/[0.035]">
        <p className="mb-3 text-sm font-semibold">Mostrar ou ocultar módulos</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {groups.flatMap(group => group.items.map(item => <label key={item.to} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-3 text-sm hover:border-primary/40"><input type="checkbox" checked={activeModuleIds.includes(item.to)} onChange={() => toggleModule(item.to)} className="h-4 w-4 accent-[var(--primary)]" /><item.icon className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1">{item.label}</span>{activeModuleIds.includes(item.to) ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</label>))}
        </div>
      </div>}
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:gap-6">
        {groups.filter(group => group.items.some(item => activeModuleIds.includes(item.to))).map((group, index) => (
          <Panel key={group.label}>
            <section aria-labelledby={`painel-grupo-${index}`}>
              <div className="flex items-start gap-3 border-b border-border/70 pb-4">
                <div className={`core-hub-group-icon core-hub-group-icon-${index % 5} flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl`}>
                  <group.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id={`painel-grupo-${index}`} className="text-sm font-semibold">{group.label}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{group.description}</p>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold tabular-nums text-muted-foreground">{group.items.filter(item => activeModuleIds.includes(item.to)).length}</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.items.filter(item => activeModuleIds.includes(item.to)).map(item => (
                  <Link
                    key={item.to}
                    to={item.to as never}
                    className="core-hub-module group flex min-h-[58px] min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-3 text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm leading-snug">{item.label}</span>
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            </section>
          </Panel>
        ))}
        {activeModuleIds.length === 0 && <Panel><div className="py-8 text-center"><p className="text-sm font-semibold">Seu painel está vazio</p><p className="mt-1 text-xs text-muted-foreground">Use “Personalizar” para escolher os módulos que deseja ver.</p><Button size="sm" onClick={resetDashboard} className="mt-3">Restaurar módulos</Button></div></Panel>}
      </div>
    </div>
  );
}
