import { LayoutDashboard, ArrowLeftRight, Wallet, Repeat, CreditCard, ReceiptText, TrendingUp, Target, Settings } from "lucide-react";

export type NavItem = { label: string; to: string; icon: typeof Wallet };

export const navGroups: { group: string; items: NavItem[] }[] = [
  {
    group: "PRINCIPAL",
    items: [{ label: "INÍCIO", to: "/", icon: LayoutDashboard }],
  },
  {
    group: "FINANCEIRO",
    items: [
      { label: "MOVIMENTAÇÕES", to: "/fluxo", icon: ArrowLeftRight },
      { label: "ORÇAMENTO", to: "/orcamento", icon: Wallet },
      { label: "METAS", to: "/metas", icon: Target },
      { label: "CARTÕES E FATURAS", to: "/faturas", icon: ReceiptText },
      { label: "CUSTOS FIXOS E ASSINATURAS", to: "/custos-fixos", icon: Repeat },
      { label: "PARCELAS", to: "/parcelados", icon: CreditCard },
      { label: "INVESTIMENTOS", to: "/investimentos", icon: TrendingUp },
    ],
  },
  {
    group: "SISTEMA",
    items: [{ label: "CONFIGURAÇÕES", to: "/configuracoes", icon: Settings }],
  },
];

export const quickAddOptions = [
  { label: "NOVA DESPESA", icon: ArrowLeftRight, kind: "DESPESA" },
  { label: "NOVA RECEITA", icon: TrendingUp, kind: "RECEITA" },
  { label: "NOVA PARCELA", icon: CreditCard, kind: "PARCELA" },
  { label: "NOVA ASSINATURA", icon: Repeat, kind: "ASSINATURA" },
  { label: "NOVO INVESTIMENTO", icon: TrendingUp, kind: "INVESTIMENTO" },
  { label: "NOVO RESGATE", icon: TrendingUp, kind: "RESGATE" },
  { label: "NOVA META", icon: Target, kind: "META" },
  { label: "NOVO CUSTO FIXO", icon: Repeat, kind: "CUSTO_FIXO" },
] as const;
