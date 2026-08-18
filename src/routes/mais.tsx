import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wallet,
  Repeat,
  CreditCard,
  ReceiptText,
  ShoppingCart,
  Store,
  CalendarClock,
  Target,
  TrendingUp,
  Flame,
  ListChecks,
  Settings,
} from "lucide-react";
import { PageHeader, Panel } from "@/components/ui-kit";

export const Route = createFileRoute("/mais")({
  head: () => ({
    meta: [
      { title: "MAIS — MULTICAP" },
      { name: "description", content: "Todos os módulos do MULTICAP em um só lugar." },
      { property: "og:title", content: "MAIS — MULTICAP" },
      { property: "og:description", content: "Todos os módulos do MULTICAP em um só lugar." },
    ],
  }),
  component: MorePage,
});

const modules = [
  { label: "ORÇAMENTO", to: "/orcamento", icon: Wallet },
  { label: "CUSTOS FIXOS", to: "/custos-fixos", icon: Repeat },
  { label: "PARCELADOS", to: "/parcelados", icon: CreditCard },
  { label: "FATURAS", to: "/faturas", icon: ReceiptText },
  { label: "LISTA DE COMPRAS", to: "/lista", icon: ShoppingCart },
  { label: "MODO MERCADO", to: "/mercado", icon: Store },
  { label: "AGENDA", to: "/agenda", icon: CalendarClock },
  { label: "METAS", to: "/metas", icon: Target },
  { label: "INVESTIMENTOS", to: "/investimentos", icon: TrendingUp },
  { label: "HÁBITOS", to: "/habitos", icon: Flame },
  { label: "TAREFAS", to: "/tarefas", icon: ListChecks },
  { label: "CONFIGURAÇÕES", to: "/configuracoes", icon: Settings },
] as const;

function MorePage() {
  return (
    <div className="space-y-5">
      <PageHeader title="MAIS" subtitle="Acesse todos os módulos do aplicativo." />
      <Panel>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {modules.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/30 p-4 text-center transition-colors hover:border-primary hover:text-primary"
            >
              <m.icon className="h-5 w-5 text-primary" />
              <span className="label-caps text-[10px]">{m.label}</span>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
