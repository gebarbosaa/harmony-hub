import {
  LayoutDashboard,
  CalendarDays,
  ArrowLeftRight,
  Wallet,
  Repeat,
  CreditCard,
  ReceiptText,
  ShoppingCart,
  Store,
  CalendarClock,
  Target,
  TrendingUp,
  Settings,
  Flame,
  ListChecks,
  LayoutGrid,
} from "lucide-react";

export type NavItem = { label: string; to: string; icon: typeof Wallet };

export const navGroups: { group: string; items: NavItem[] }[] = [
  {
    group: "PRINCIPAL",
    items: [
      { label: "VISÃO GERAL", to: "/", icon: LayoutDashboard },
      { label: "CALENDÁRIO", to: "/calendario", icon: CalendarDays },
      { label: "FLUXO MENSAL", to: "/fluxo", icon: ArrowLeftRight },
    ],
  },
  {
    group: "FINANÇAS",
    items: [
      { label: "ORÇAMENTO", to: "/orcamento", icon: Wallet },
      { label: "CUSTOS FIXOS", to: "/custos-fixos", icon: Repeat },
      { label: "PARCELADOS", to: "/parcelados", icon: CreditCard },
      { label: "FATURAS", to: "/faturas", icon: ReceiptText },
      { label: "METAS", to: "/metas", icon: Target },
      { label: "INVESTIMENTOS", to: "/investimentos", icon: TrendingUp },
    ],
  },
  {
    group: "ROTINA",
    items: [
      { label: "LISTA DE COMPRAS", to: "/lista", icon: ShoppingCart },
      { label: "MODO MERCADO", to: "/mercado", icon: Store },
      { label: "AGENDA", to: "/agenda", icon: CalendarClock },
      { label: "HÁBITOS", to: "/habitos", icon: Flame },
      { label: "TAREFAS", to: "/tarefas", icon: ListChecks },
    ],
  },
  {
    group: "SISTEMA",
    items: [
      { label: "MAIS", to: "/mais", icon: LayoutGrid },
      { label: "CONFIGURAÇÕES", to: "/configuracoes", icon: Settings },
    ],
  },
];

export const quickAddOptions = [
  "DESPESA",
  "RECEITA",
  "TRANSFERÊNCIA",
  "CONTA",
  "COMPRA PARCELADA",
  "META",
  "COMPROMISSO",
  "LEMBRETE",
  "ITEM DE LISTA",
];
