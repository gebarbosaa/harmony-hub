import { LayoutDashboard, ArrowLeftRight, Wallet, Repeat, CreditCard, TrendingUp, Settings } from "lucide-react";
export type NavItem = { label: string; to: string; icon: typeof Wallet };
export const navGroups: { group: string; items: NavItem[] }[] = [
{group:"PRINCIPAL",items:[{label:"INÍCIO",to:"/",icon:LayoutDashboard}]},
{group:"FINANCEIRO",items:[{label:"MOVIMENTAÇÕES",to:"/movimentacoes",icon:ArrowLeftRight},{label:"ORÇAMENTO",to:"/orcamento",icon:Wallet},{label:"CARTÕES E FATURAS",to:"/faturas",icon:CreditCard},{label:"CUSTOS FIXOS E ASSINATURAS",to:"/custos-fixos",icon:Repeat},{label:"PARCELAS",to:"/parcelados",icon:CreditCard},{label:"INVESTIMENTOS",to:"/investimentos",icon:TrendingUp}]},
{group:"SISTEMA",items:[{label:"AJUSTES",to:"/configuracoes",icon:Settings}]}];
export const quickAddOptions=[{label:"NOVA DESPESA",icon:ArrowLeftRight,kind:"DESPESA"},{label:"NOVA RECEITA",icon:TrendingUp,kind:"RECEITA"},{label:"NOVA PARCELA",icon:CreditCard,kind:"PARCELA"},{label:"NOVA ASSINATURA",icon:Repeat,kind:"ASSINATURA"},{label:"NOVO INVESTIMENTO",icon:TrendingUp,kind:"INVESTIMENTO"},{label:"NOVO RESGATE",icon:TrendingUp,kind:"RESGATE"},{label:"NOVA META",icon:TrendingUp,kind:"META"},{label:"NOVO CUSTO FIXO",icon:Repeat,kind:"CUSTO_FIXO"}] as const;
