import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, RotateCcw, Eye, EyeOff, Sparkles, ArrowUpRight, CalendarDays, Heart, LayoutGrid, ArrowUp, ArrowDown } from "lucide-react";
import { Panel } from "@/components/ui-kit";
import { moduleGroups, type ModuleGroup } from "@/components/layout/nav";

export const Route = createFileRoute("/painel")({
  head: () => ({ meta: [{ title: "PAINEL — HARMONY HUB" }] }),
  component: MorePage,
});

const DASHBOARD_PREFS_KEY = "harmony:dashboard:visible-modules";
const DASHBOARD_ORDER_KEY = "harmony:dashboard:group-order";

type GroupOrders = Record<string, string[]>;

function readGroupOrders(): GroupOrders {
  if (typeof window === "undefined") return {};
  try {
    const value = localStorage.getItem(DASHBOARD_ORDER_KEY);
    if (!value) return {};
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string[]] =>
        Array.isArray(entry[1]) && entry[1].every(item => typeof item === "string"),
      ));
    }
    return {};
  } catch { return {}; }
}
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
  const mode = "PESSOAL" as const;
  const [customizing, setCustomizing] = useState(false);
  const [visibleModules, setVisibleModules] = useState<string[] | null>(readVisibleModules);
  const [groupOrders, setGroupOrders] = useState<GroupOrders>(readGroupOrders);
  const groups: ModuleGroup[] = useMemo(() => moduleGroups.filter(group =>
    group.context === "SYSTEM" || group.context === "PERSONAL",
  ), [mode]);
  const orderedGroups = useMemo(() => {
    const order = groupOrders[mode] ?? [];
    return [...groups].sort((a, b) => {
      const aIndex = order.indexOf(a.label);
      const bIndex = order.indexOf(b.label);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [groups, groupOrders, mode]);
  const allModuleIds = useMemo(() => groups.flatMap(group => group.items.map(item => item.to)), [groups]);
  const activeModuleIds = visibleModules === null ? allModuleIds : allModuleIds.filter(id => visibleModules.includes(id));
  useEffect(() => {
    if (visibleModules === null) return;
    try { localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(visibleModules)); } catch { /* preferência opcional */ }
  }, [visibleModules]);
  useEffect(() => {
    try { localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(groupOrders)); } catch { /* preferência opcional */ }
  }, [groupOrders]);
  function moveGroup(label: string, direction: -1 | 1) {
    setGroupOrders(current => {
      const currentOrder = orderedGroups.map(group => group.label);
      const index = currentOrder.indexOf(label);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= currentOrder.length) return current;
      [currentOrder[index], currentOrder[targetIndex]] = [currentOrder[targetIndex], currentOrder[index]];
      return { ...current, [mode]: currentOrder };
    });
  }
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
  function resetGroupOrder() {
    setGroupOrders(current => {
      const next = { ...current };
      delete next[mode];
      return next;
    });
  }

  return (
    <div className="core-module-hub space-y-7">
      <section className="core-hub-hero">
        <div className="core-hub-hero-copy">
          <span className="core-hub-kicker"><Sparkles className="h-3.5 w-3.5" /> SEU ESPAÇO, DO SEU JEITO</span>
          <h1>Organize a vida com mais leveza.</h1>
          <p>Rotina, hábitos, casa, treinos e finanças — tudo reunido para facilitar seu dia.</p>
          <div className="core-hub-hero-meta"><span><LayoutGrid className="h-4 w-4" /> {groups.reduce((sum, group) => sum + group.items.filter(item => activeModuleIds.includes(item.to)).length, 0)} módulos disponíveis</span><span><Heart className="h-4 w-4" /> Um passo de cada vez</span></div>
        </div>
        <div className="core-hub-hero-art" aria-hidden="true"><div className="core-hub-blob"/><div className="core-hub-orbit"/><span>✦</span></div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><SlidersHorizontal className="h-5 w-5" /></span>
          <div><p className="text-sm font-semibold">Seu painel, do seu jeito</p><p className="mt-1 text-xs text-muted-foreground">Escolha quais módulos aparecem aqui. A preferência fica salva neste navegador.</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setCustomizing(value => !value)} aria-expanded={customizing} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold hover:border-primary/50"><SlidersHorizontal className="h-4 w-4" />{customizing ? "Concluir" : "Personalizar"}</button>
          {visibleModules !== null && <button type="button" onClick={resetDashboard} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><RotateCcw className="h-4 w-4" />Restaurar padrão</button>}
        </div>
      </div>
      {customizing && <div className="rounded-2xl border border-primary/20 bg-primary/[0.035] p-4">
        <div className="mb-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Ordem dos menus</p>
              <p className="mt-1 text-xs text-muted-foreground">Use as setas para definir a ordem dos blocos no painel.</p>
            </div>
            {(groupOrders[mode]?.length ?? 0) > 0 && <button type="button" onClick={resetGroupOrder} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><RotateCcw className="h-3.5 w-3.5" />Restaurar ordem</button>}
          </div>
          <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {orderedGroups.map((group, index) => (
              <li key={group.label} className="flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-muted-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1 text-sm font-medium">{group.label}</span>
                <button type="button" aria-label={`Mover ${group.label} para cima`} title="Mover para cima" disabled={index === 0} onClick={() => moveGroup(group.label, -1)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border disabled:cursor-not-allowed disabled:opacity-35 hover:bg-secondary"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" aria-label={`Mover ${group.label} para baixo`} title="Mover para baixo" disabled={index === orderedGroups.length - 1} onClick={() => moveGroup(group.label, 1)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border disabled:cursor-not-allowed disabled:opacity-35 hover:bg-secondary"><ArrowDown className="h-4 w-4" /></button>
              </li>
            ))}
          </ol>
        </div>
        <div className="mb-3 border-t border-border/70 pt-4">
          <p className="text-sm font-semibold">Mostrar ou ocultar módulos</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {groups.flatMap(group => group.items.map(item => <label key={item.to} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-3 text-sm hover:border-primary/40"><input type="checkbox" checked={activeModuleIds.includes(item.to)} onChange={() => toggleModule(item.to)} className="h-4 w-4 accent-[var(--primary)]" /><item.icon className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1">{item.label}</span>{activeModuleIds.includes(item.to) ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</label>))}
        </div>
      </div>}
      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5 xl:gap-6">
        {orderedGroups.filter(group => group.items.some(item => activeModuleIds.includes(item.to))).map((group, index) => (
          <Panel key={group.label} className="core-hub-group min-w-0 w-full">
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
        {activeModuleIds.length === 0 && <Panel><div className="py-8 text-center"><p className="text-sm font-semibold">Seu painel está vazio</p><p className="mt-1 text-xs text-muted-foreground">Use “Personalizar” para escolher os módulos que deseja ver.</p><button type="button" onClick={resetDashboard} className="mt-3 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Restaurar módulos</button></div></Panel>}
      </div>
    </div>
  );
}
