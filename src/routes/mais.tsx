import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet, Repeat, CreditCard, ReceiptText, TrendingUp, Settings, ArrowLeftRight, Target, ArrowDownCircle, ArrowUpCircle, Calculator, CalendarDays, Users } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui-kit";

export const Route = createFileRoute("/mais")({ head: () => ({ meta: [{ title: "PAINEL — HARMONY HUB" }, { name: "description", content: "Central das áreas financeiras do HARMONY HUB." }] }), component: MorePage });
type Module = { label: string; to: string; icon: typeof Wallet };
type ModuleGroup = { label: string; icon: typeof Wallet; items: Module[] };
const moduleGroups: ModuleGroup[] = [
  { label: "PRINCIPAL", icon: Wallet, items: [{ label: "INÍCIO", to: "/", icon: Wallet }, { label: "MOVIMENTAÇÕES", to: "/movimentacoes", icon: ArrowLeftRight }, { label: "CALENDÁRIO", to: "/calendario", icon: CalendarDays }] },
  { label: "FINANCEIRO", icon: Wallet, items: [{ label: "RECEITAS", to: "/receitas", icon: ArrowUpCircle }, { label: "DESPESAS", to: "/despesas", icon: ArrowDownCircle }, { label: "CUSTOS FIXOS", to: "/custos-fixos", icon: Repeat }, { label: "ORÇAMENTO", to: "/orcamento", icon: Wallet }, { label: "CARTÕES E FATURAS", to: "/faturas", icon: ReceiptText }, { label: "PARCELAS", to: "/parcelados", icon: CreditCard }] },
  { label: "INVESTIMENTOS", icon: TrendingUp, items: [{ label: "INVESTIMENTOS", to: "/investimentos", icon: TrendingUp }, { label: "METAS", to: "/metas", icon: Target }, { label: "CALCULADORA DE APORTES", to: "/calculadora-aportes", icon: Calculator }] },
  { label: "SISTEMA", icon: Settings, items: [{ label: "GRUPOS", to: "/grupos", icon: Users }, { label: "AJUSTES", to: "/configuracoes", icon: Settings }] },
];

function MorePage() {
  return <div className="space-y-5"><PageHeader title="PAINEL" subtitle="CENTRAL DAS ÁREAS FINANCEIRAS DO HARMONY HUB."/><div className="grid gap-4 md:grid-cols-2">{moduleGroups.map((group) => <Panel key={group.label}><div className="flex items-center gap-3 border-b border-border pb-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><group.icon className="h-4 w-4"/></div><div><p className="label-caps text-xs">{group.label}</p><p className="text-[11px] text-muted-foreground">{group.items.length} OPÇÕES</p></div></div><div className="mt-3 grid grid-cols-2 gap-2">{group.items.map((item) => <Link key={item.to} to={item.to as never} className="flex min-h-16 items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-3 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"><item.icon className="h-4 w-4 shrink-0 text-primary"/><span className="label-caps text-[10px] leading-tight">{item.label}</span></Link>)}</div></Panel>)}</div></div>;
}
