import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wallet,
  Repeat,
  CreditCard,
  ReceiptText,
  ShoppingCart,
  Store,
  CalendarClock,
  CalendarDays,
  TrendingUp,
  Flame,
  ListChecks,
  FileText,
  Settings,
  ArrowLeftRight,
} from "lucide-react";
import { PageHeader, Panel } from "@/components/ui-kit";

export const Route = createFileRoute("/mais")({
  head: () => ({
    meta: [
      { title: "MAIS — MULTICAP" },
      { name: "description", content: "Acesse os módulos do MULTICAP organizados por grupo." },
      { property: "og:title", content: "MAIS — MULTICAP" },
      { property: "og:description", content: "Acesse os módulos do MULTICAP organizados por grupo." },
    ],
  }),
  component: MorePage,
});

type Module = { label: string; to: string; icon: typeof Wallet };
type ModuleGroup = { label: string; icon: typeof Wallet; items: Module[] };

const moduleGroups: ModuleGroup[] = [
  {
    label: "FINANCEIRO",
    icon: Wallet,
    items: [
      { label: "MOVIMENTAÇÕES", to: "/fluxo", icon: ArrowLeftRight },
      { label: "ORÇAMENTO", to: "/orcamento", icon: Wallet },
      { label: "CARTÕES E FATURAS", to: "/faturas", icon: ReceiptText },
      { label: "CUSTOS FIXOS E ASSINATURAS", to: "/custos-fixos", icon: Repeat },
      { label: "PARCELAS", to: "/parcelados", icon: CreditCard },
      { label: "INVESTIMENTOS", to: "/investimentos", icon: TrendingUp },
    ],
  },
  {
    label: "CASA",
    icon: Store,
    items: [
      { label: "TAREFAS", to: "/tarefas", icon: ListChecks },
      { label: "ROTINA DA CASA", to: "/tarefas-domesticas", icon: CalendarClock },
      { label: "MERCADO", to: "/mercado", icon: ShoppingCart },
    ],
  },
  {
    label: "ROTINA",
    icon: Flame,
    items: [
      { label: "HÁBITOS", to: "/habitos", icon: Flame },
    ],
  },
  {
    label: "ORGANIZAÇÃO",
    icon: CalendarDays,
    items: [
      { label: "CALENDÁRIO", to: "/calendario", icon: CalendarDays },
      { label: "ANOTAÇÕES", to: "/anotacoes", icon: FileText },
    ],
  },
  {
    label: "SISTEMA",
    icon: Settings,
    items: [
      { label: "CONFIGURAÇÕES", to: "/configuracoes", icon: Settings },
    ],
  },
];

function MorePage() {
  return (
    <div className="space-y-5">
      <PageHeader title="MAIS" subtitle="ACESSO RÁPIDO AOS MÓDULOS ORGANIZADOS POR GRUPO." />
      <div className="grid gap-4 md:grid-cols-2">
        {moduleGroups.map((group) => (
          <Panel key={group.label}>
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <group.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="label-caps text-xs">{group.label}</p>
                <p className="text-[11px] text-muted-foreground">{group.items.length} OPÇÕES</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to as never}
                  className="flex min-h-16 items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-3 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="label-caps text-[10px] leading-tight">{item.label}</span>
                </Link>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
