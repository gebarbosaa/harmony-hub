import {
  ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, BookOpen, Building2, Calculator,
  CalendarDays, CheckSquare, CreditCard, Factory, House, LayoutDashboard, Plug,
  ReceiptText, Repeat, Settings, ShoppingCart, Sparkles, Table2, Target,
  Undo2, Upload, Utensils, UserRound, Users, Wallet, TrendingUp,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: typeof Wallet;
  children?: NavItem[];
};
export type ModuleGroup = {
  label: string;
  description: string;
  icon: typeof Wallet;
  context: "BOTH" | "PERSONAL" | "BUSINESS" | "SYSTEM";
  items: NavItem[];
};

/** Navegação principal — usada pela sidebar e pela barra inferior. */
export const primaryNavItems: NavItem[] = [
  { label: "Início", to: "/", icon: LayoutDashboard },
  { label: "Fluxo", to: "/fluxo", icon: ArrowLeftRight },
  { label: "Painel", to: "/painel", icon: Wallet },
  { label: "Ajustes", to: "/ajustes", icon: Settings },
];

/** Catálogo único de módulos, usado pela busca e pelo Painel. */
export const moduleGroups: ModuleGroup[] = [
  {
    label: "Movimentações",
    description: "Entradas, saídas, terceiros e importação de lançamentos.",
    icon: ArrowLeftRight,
    context: "PERSONAL",
    items: [
      { label: "Receitas", to: "/receitas", icon: ArrowUpCircle },
      { label: "Despesas", to: "/despesas", icon: ArrowDownCircle },
      { label: "Terceiros", to: "/terceiros", icon: UserRound },
      { label: "Importar lançamentos", to: "/importacao", icon: Upload },
    ],
  },
  {
    label: "Contas e pagamentos",
    description: "Vencimentos, recorrências, bancos e contas.",
    icon: Wallet,
    context: "PERSONAL",
    items: [
      { label: "Contas a pagar", to: "/contas-a-pagar", icon: Wallet },
      { label: "Custos fixos", to: "/custos-fixos", icon: Repeat },
      { label: "Assinaturas", to: "/assinatura", icon: ReceiptText },
      { label: "Bancos e contas", to: "/bancos", icon: Building2 },
    ],
  },
  {
    label: "Cartões",
    description: "Cartões de crédito, faturas e compras parceladas.",
    icon: CreditCard,
    context: "PERSONAL",
    items: [
      { label: "Cartões e faturas", to: "/faturas", icon: CreditCard },
      { label: "Parcelas", to: "/parcelados", icon: ReceiptText },
    ],
  },
  {
    label: "Planejamento",
    description: "Orçamento, metas e organização dos investimentos.",
    icon: TrendingUp,
    context: "PERSONAL",
    items: [
      { label: "Orçamento", to: "/orcamento", icon: Wallet },
      { label: "Metas financeiras", to: "/metas", icon: Target },
      { label: "Investimentos e resgates", to: "/investimentos", icon: TrendingUp },
      { label: "Calculadora de aportes", to: "/calculadora-aportes", icon: Calculator },
    ],
  },
  {
    label: "Vida pessoal",
    description: "Desenvolvimento pessoal, casa, leitura, alimentação e hábitos.",
    icon: Sparkles,
    context: "PERSONAL",
    items: [
      { label: "Desenvolvimento pessoal", to: "/desenvolvimento-pessoal", icon: Sparkles },
      { label: "Casa", to: "/casa", icon: House },
      { label: "Leitura", to: "/leitura", icon: BookOpen },
      { label: "Alimentação", to: "/alimentacao", icon: Utensils },
      { label: "Hábitos e rotina", to: "/habitos-rotina", icon: CheckSquare },
    ],
  },
  {
    label: "Empresa",
    description: "Operação, compras, vendas, estoque e finanças empresariais.",
    icon: Factory,
    context: "BUSINESS",
    items: [
      { label: "Painel empresarial", to: "/empresarial#DASHBOARD", icon: LayoutDashboard },
      { label: "Cadastro da empresa", to: "/empresarial#EMPRESA", icon: Building2 },
      { label: "Insumos", to: "/empresarial#INSUMOS", icon: Wallet },
      { label: "Estoque de insumos", to: "/empresarial#ESTOQUE_INSUMOS", icon: Wallet },
      { label: "Fornecedores", to: "/empresarial#FORNECEDORES", icon: Users },
      { label: "Produção", to: "/empresarial#PRODUÇÃO", icon: Factory },
      { label: "Compras", to: "/empresarial#COMPRAS", icon: ShoppingCart },
      { label: "Vendas", to: "/empresarial#VENDAS", icon: ShoppingCart },
      { label: "Receitas empresariais", to: "/empresarial#RECEITAS", icon: ArrowUpCircle },
      { label: "Produtos e precificação", to: "/empresarial#PRECIFICAÇÃO", icon: Calculator },
      { label: "Financeiro empresarial", to: "/empresarial#FINANCEIRO", icon: Wallet },
      { label: "Lucro presumido", to: "/empresarial#LUCRO_PRESUMIDO", icon: Calculator },
      { label: "Ajustes empresariais", to: "/empresarial#AJUSTES", icon: Settings },
    ],
  },
  {
    label: "Sistema",
    description: "Grupos, calendário, planilhas e integrações conectadas.",
    icon: Settings,
    context: "SYSTEM",
    items: [
      { label: "Grupos", to: "/grupos", icon: Users },
      { label: "Planilha", to: "/integracao-planilha", icon: Table2 },
      { label: "Calendário", to: "/calendario", icon: CalendarDays },
      { label: "Integrações", to: "/integracoes", icon: Plug },
    ],
  },
];

/** Lista completa de rotas pessoais para busca global e cabeçalhos. */
export const navItems: NavItem[] = [
  ...primaryNavItems,
  ...moduleGroups.filter(group => group.context === "PERSONAL" || group.context === "SYSTEM").flatMap(group => group.items),
];
export const personalNavItems = navItems;

export const businessNavItems: NavItem[] = moduleGroups.find(group => group.context === "BUSINESS")!.items;

export const personalQuickAddOptions = [
  { label: "Nova despesa", icon: ArrowDownCircle, kind: "DESPESA" },
  { label: "Nova receita", icon: ArrowUpCircle, kind: "RECEITA" },
  { label: "Nova conta a pagar", icon: Wallet, kind: "CONTA_A_PAGAR" },
  { label: "Nova parcela", icon: CreditCard, kind: "PARCELA" },
  { label: "Nova assinatura", icon: Repeat, kind: "ASSINATURA" },
  { label: "Novo investimento", icon: TrendingUp, kind: "INVESTIMENTO" },
  { label: "Novo resgate", icon: Undo2, kind: "RESGATE" },
  { label: "Nova meta", icon: Target, kind: "META" },
  { label: "Novo custo fixo", icon: Repeat, kind: "CUSTO_FIXO" },
] as const;

export const businessQuickAddOptions = [
  { label: "Cadastro fácil da empresa", icon: Building2, kind: "EMPRESA" },
  { label: "Novo insumo", icon: Wallet, kind: "INSUMO" },
  { label: "Nova receita", icon: ArrowUpCircle, kind: "RECEITA_EMPRESARIAL" },
  { label: "Novo produto", icon: Calculator, kind: "PRODUTO" },
  { label: "Novo fornecedor", icon: Users, kind: "FORNECEDOR" },
  { label: "Nova produção", icon: Factory, kind: "PRODUCAO" },
  { label: "Nova venda", icon: ShoppingCart, kind: "VENDA" },
  { label: "Novo lançamento", icon: Wallet, kind: "CAIXA" },
] as const;
