import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Wallet, Repeat, CreditCard, ReceiptText, TrendingUp, Settings, ArrowLeftRight, Target, ArrowDownCircle, ArrowUpCircle, Calculator, Users, Table2, Factory, BookOpen, House, Utensils, Sparkles, CheckSquare, UserRound, Upload, Building2, LayoutDashboard } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui-kit";

export const Route = createFileRoute("/mais")({
  beforeLoad: () => { throw redirect({ to: "/painel", replace: true }); },
});

type Module = { label: string; to: string; icon: typeof Wallet };
type ModuleGroup = { label: string; description: string; icon: typeof Wallet; items: Module[] };

const moduleGroups: ModuleGroup[] = [
  {
    label: "VISÃO GERAL",
    description: "Acesse o resumo e acompanhe todos os lançamentos.",
    icon: LayoutDashboard,
    items: [
      { label: "INÍCIO", to: "/", icon: LayoutDashboard },
      { label: "FLUXO FINANCEIRO", to: "/fluxo", icon: ArrowLeftRight },
      { label: "ÁREA EMPRESARIAL", to: "/empresarial", icon: Factory },
    ],
  },
  {
    label: "MOVIMENTAÇÕES",
    description: "Entradas, saídas e movimentações de outras pessoas.",
    icon: ArrowLeftRight,
    items: [
      { label: "RECEITAS", to: "/receitas", icon: ArrowUpCircle },
      { label: "DESPESAS", to: "/despesas", icon: ArrowDownCircle },
      { label: "TERCEIROS", to: "/terceiros", icon: UserRound },
      { label: "IMPORTAR LANÇAMENTOS", to: "/importacao", icon: Upload },
    ],
  },
  {
    label: "CONTAS E PAGAMENTOS",
    description: "Organize vencimentos, cartões, parcelas e despesas recorrentes.",
    icon: Wallet,
    items: [
      { label: "CONTAS A PAGAR", to: "/contas-a-pagar", icon: Wallet },
      { label: "CUSTOS FIXOS", to: "/custos-fixos", icon: Repeat },
      { label: "ASSINATURAS", to: "/assinatura", icon: ReceiptText },
      { label: "BANCOS E CONTAS", to: "/bancos", icon: Building2 },
      { label: "CARTÕES E FATURAS", to: "/faturas", icon: CreditCard },
      { label: "COMPRAS PARCELADAS", to: "/parcelados", icon: ReceiptText },
    ],
  },
  {
    label: "PLANEJAMENTO FINANCEIRO",
    description: "Defina objetivos e acompanhe seu planejamento e investimentos.",
    icon: TrendingUp,
    items: [
      { label: "ORÇAMENTO", to: "/orcamento", icon: Wallet },
      { label: "INVESTIMENTOS E RESGATES", to: "/investimentos", icon: TrendingUp },
      { label: "METAS", to: "/metas", icon: Target },
      { label: "CALCULADORA DE APORTES", to: "/calculadora-aportes", icon: Calculator },
    ],
  },
  {
    label: "VIDA PESSOAL",
    description: "Reúna seus espaços de desenvolvimento e organização da rotina.",
    icon: Sparkles,
    items: [
      { label: "DESENVOLVIMENTO PESSOAL", to: "/desenvolvimento-pessoal", icon: Sparkles },
      { label: "CASA", to: "/casa", icon: House },
      { label: "LEITURA", to: "/leitura", icon: BookOpen },
      { label: "ALIMENTAÇÃO", to: "/alimentacao", icon: Utensils },
      { label: "HÁBITOS E ROTINA", to: "/habitos-rotina", icon: CheckSquare },
    ],
  },
  {
    label: "GRUPOS E SISTEMA",
    description: "Gerencie espaços compartilhados, planilhas e preferências.",
    icon: Settings,
    items: [
      { label: "GRUPOS", to: "/grupos", icon: Users },
      { label: "INTEGRAÇÃO COM PLANILHA", to: "/integracao-planilha", icon: Table2 },
      { label: "AJUSTES", to: "/ajustes", icon: Settings },
    ],
  },
];

export function MorePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="PAINEL" subtitle="TODAS AS ÁREAS DO HARMONY HUB, ORGANIZADAS POR ASSUNTO." />
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:gap-5">
        {moduleGroups.map((group, index) => (
          <Panel key={group.label}>
            <section aria-labelledby={`painel-grupo-${index}`}>
              <div className="flex items-start gap-3 border-b border-border/70 pb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <group.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id={`painel-grupo-${index}`} className="label-caps text-xs font-bold tracking-wide">{group.label}</h2>
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
                    <span className="min-w-0 flex-1 text-xs font-semibold leading-snug">{item.label}</span>
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
