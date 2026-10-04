import { LayoutDashboard, ArrowLeftRight, Wallet, Repeat, CreditCard, Settings, ArrowDownCircle, ArrowUpCircle, TrendingUp, Target, Calculator, ReceiptText, Undo2, Table2, Users, UserRound, Building2, Upload, Factory, ShoppingCart } from "lucide-react";
export type NavItem = { label: string; to: string; icon: typeof Wallet; children?: NavItem[] };
export const navItems: NavItem[] = [
{label:"INÍCIO",to:"/",icon:LayoutDashboard},
{label:"FLUXO",to:"/fluxo",icon:ArrowLeftRight},
{label:"RECEITAS",to:"/receitas",icon:ArrowUpCircle},
{label:"DESPESAS",to:"/despesas",icon:ArrowDownCircle},
{label:"TERCEIROS",to:"/terceiros",icon:UserRound},
{label:"TERCEIROS",to:"/terceiros",icon:UserRound},
{label:"IMPORTAÇÃO",to:"/importacao",icon:Upload},
{label:"CONTAS A PAGAR",to:"/contas-a-pagar",icon:Wallet},
{label:"CUSTOS FIXOS",to:"/custos-fixos",icon:Repeat},
{label:"ORÇAMENTO",to:"/orcamento",icon:Wallet},
{label:"BANCOS",to:"/bancos",icon:Building2},
{label:"PARCELAS",to:"/parcelados",icon:CreditCard},
{label:"FATURAS",to:"/faturas",icon:ReceiptText},
{label:"INVESTIMENTOS",to:"/investimentos",icon:TrendingUp},
{label:"METAS",to:"/metas",icon:Target},
{label:"CALCULADORA DE APORTES",to:"/calculadora-aportes",icon:Calculator},
{label:"GRUPOS",to:"/grupos",icon:Users},
{label:"PLANILHA",to:"/integracao-planilha",icon:Table2},
{label:"AJUSTES",to:"/ajustes",icon:Settings}];
export const personalNavItems = navItems;
export const businessNavItems: NavItem[] = [
{label:"DASHBOARD",to:"/empresarial#DASHBOARD",icon:LayoutDashboard},
{label:"EMPRESA",to:"/empresarial#EMPRESA",icon:Factory},
{label:"INSUMOS / NECESSIDADES",to:"/empresarial#INSUMOS",icon:Wallet},
{label:"ESTOQUE DE INSUMOS",to:"/empresarial#ESTOQUE_INSUMOS",icon:Wallet},
{label:"COMPRAS",to:"/empresarial#COMPRAS",icon:ShoppingCart},
{label:"RECEITAS",to:"/empresarial#RECEITAS",icon:ArrowUpCircle},
{label:"PRECIFICAÇÃO",to:"/empresarial#PRECIFICAÇÃO",icon:Calculator},
{label:"FORNECEDORES",to:"/empresarial#FORNECEDORES",icon:Users},
{label:"PRODUÇÃO / ESTOQUE",to:"/empresarial#PRODUÇÃO",icon:Factory},
{label:"VENDAS",to:"/empresarial#VENDAS",icon:ShoppingCart},
{label:"FINANCEIRO",to:"/empresarial#FINANCEIRO",icon:Wallet},
{label:"LUCRO PRESUMIDO",to:"/empresarial#LUCRO_PRESUMIDO",icon:Calculator},
];
export const personalQuickAddOptions=[{label:"NOVA DESPESA",icon:ArrowDownCircle,kind:"DESPESA"},{label:"NOVA RECEITA",icon:ArrowUpCircle,kind:"RECEITA"},{label:"NOVA CONTA A PAGAR",icon:Wallet,kind:"CONTA_A_PAGAR"},{label:"NOVA PARCELA",icon:CreditCard,kind:"PARCELA"},{label:"NOVA ASSINATURA",icon:Repeat,kind:"ASSINATURA"},{label:"NOVO INVESTIMENTO",icon:TrendingUp,kind:"INVESTIMENTO"},{label:"NOVO RESGATE",icon:Undo2,kind:"RESGATE"},{label:"NOVA META",icon:Target,kind:"META"},{label:"NOVO CUSTO FIXO",icon:Repeat,kind:"CUSTO_FIXO"}] as const;
export const businessQuickAddOptions=[
{label:"CADASTRO FÁCIL",icon:Building2,kind:"EMPRESA"},
{label:"NOVO INSUMO",icon:Wallet,kind:"INSUMO"},
{label:"NOVA RECEITA",icon:ArrowUpCircle,kind:"RECEITA_EMPRESARIAL"},
{label:"NOVO PRODUTO",icon:Calculator,kind:"PRODUTO"},
{label:"NOVO FORNECEDOR",icon:Users,kind:"FORNECEDOR"},
{label:"NOVA PRODUÇÃO",icon:Factory,kind:"PRODUCAO"},
{label:"NOVA VENDA",icon:ShoppingCart,kind:"VENDA"},
{label:"NOVO LANÇAMENTO",icon:Wallet,kind:"CAIXA"}
] as const;
