import { LayoutDashboard, ArrowLeftRight, Wallet, Repeat, CreditCard, Settings, ArrowDownCircle, ArrowUpCircle, TrendingUp, Target, Calculator, ReceiptText, Undo2, Table2, Users, Building2 } from "lucide-react";
export type NavItem = { label: string; to: string; icon: typeof Wallet; children?: NavItem[] };
export const navItems: NavItem[] = [
{label:"INÍCIO",to:"/",icon:LayoutDashboard},
{label:"FLUXO",to:"/fluxo",icon:ArrowLeftRight},
{label:"RECEITAS",to:"/receitas",icon:ArrowUpCircle},
{label:"DESPESAS",to:"/despesas",icon:ArrowDownCircle},
{label:"CONTAS A PAGAR",to:"/contas-a-pagar",icon:Wallet},
{label:"CUSTOS FIXOS",to:"/custos-fixos",icon:Repeat},
{label:"ORÇAMENTO",to:"/orcamento",icon:Wallet},
{label:"BANCOS",to:"/bancos",icon:Building2},
{label:"PARCELAS",to:"/parcelados",icon:CreditCard},
{label:"INVESTIMENTOS",to:"/investimentos",icon:TrendingUp},
{label:"METAS",to:"/metas",icon:Target},
{label:"CALCULADORA DE APORTES",to:"/calculadora-aportes",icon:Calculator},
{label:"GRUPOS",to:"/grupos",icon:Users},
{label:"PLANILHA",to:"/integracao-planilha",icon:Table2},
{label:"AJUSTES",to:"/ajustes",icon:Settings}];
export const quickAddOptions=[{label:"NOVA DESPESA",icon:ArrowDownCircle,kind:"DESPESA"},{label:"NOVA RECEITA",icon:ArrowUpCircle,kind:"RECEITA"},{label:"NOVA CONTA A PAGAR",icon:Wallet,kind:"CONTA_A_PAGAR"},{label:"NOVA PARCELA",icon:CreditCard,kind:"PARCELA"},{label:"NOVA ASSINATURA",icon:Repeat,kind:"ASSINATURA"},{label:"NOVO INVESTIMENTO",icon:TrendingUp,kind:"INVESTIMENTO"},{label:"NOVO RESGATE",icon:Undo2,kind:"RESGATE"},{label:"NOVA META",icon:Target,kind:"META"},{label:"NOVO CUSTO FIXO",icon:Repeat,kind:"CUSTO_FIXO"}] as const;
