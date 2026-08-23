import {
  LayoutDashboard, CalendarDays, ArrowLeftRight, Wallet, Repeat, CreditCard, ReceiptText, ShoppingCart, CalendarClock, TrendingUp, Settings, Flame, ListChecks, FileText, KeyRound, LayoutGrid,
} from "lucide-react";

export type NavItem = { label: string; to: string; icon: typeof Wallet };

export const navGroups: { group: string; items: NavItem[] }[] = [
  { group: "PRINCIPAL", items: [{ label: "INÍCIO", to: "/", icon: LayoutDashboard }] },
  { group: "FINANCEIRO", items: [
    { label: "MOVIMENTAÇÕES", to: "/fluxo", icon: ArrowLeftRight },
    { label: "ORÇAMENTO", to: "/orcamento", icon: Wallet },
    { label: "CARTÕES E FATURAS", to: "/faturas", icon: ReceiptText },
    { label: "CUSTOS FIXOS E ASSINATURAS", to: "/custos-fixos", icon: Repeat },
    { label: "PARCELAS", to: "/parcelados", icon: CreditCard },
    { label: "INVESTIMENTOS", to: "/investimentos", icon: TrendingUp },
  ] },
  { group: "CASA", items: [
    { label: "TAREFAS DOMÉSTICAS", to: "/tarefas-domesticas", icon: CalendarClock },
    { label: "MERCADO", to: "/mercado", icon: ShoppingCart },
  ] },
  { group: "ROTINA", items: [{ label: "HÁBITOS", to: "/habitos", icon: Flame }] },
  { group: "ORGANIZAÇÃO", items: [{ label: "CALENDÁRIO", to: "/calendario", icon: CalendarDays }, { label: "ANOTAÇÕES", to: "/anotacoes", icon: FileText }] },
  { group: "SISTEMA", items: [{ label: "MAIS", to: "/mais", icon: LayoutGrid }, { label: "CONFIGURAÇÕES", to: "/configuracoes", icon: Settings }] },
];

export const quickAddOptions = [
  { label: "NOVA DESPESA", icon: ArrowLeftRight, kind: "DESPESA" }, { label: "NOVA RECEITA", icon: TrendingUp, kind: "RECEITA" }, { label: "NOVA PARCELA", icon: CreditCard, kind: "PARCELA" }, { label: "NOVA ASSINATURA", icon: Repeat, kind: "ASSINATURA" }, { label: "NOVO INVESTIMENTO", icon: TrendingUp, kind: "INVESTIMENTO" }, { label: "NOVO RESGATE", icon: TrendingUp, kind: "RESGATE" }, { label: "NOVA TAREFA", icon: ListChecks, kind: "TAREFA" }, { label: "NOVO HÁBITO", icon: Flame, kind: "HABITO" }, { label: "ITEM NO MERCADO", icon: ShoppingCart, kind: "MERCADO" }, { label: "NOVO EVENTO", icon: CalendarDays, kind: "EVENTO" }, { label: "NOVA ANOTAÇÃO", icon: FileText, kind: "ANOTACAO" }, { label: "NOVA CONTA", icon: Wallet, kind: "CONTA" }, { label: "NOVA CHAVE PIX", icon: KeyRound, kind: "PIX" },
] as const;
