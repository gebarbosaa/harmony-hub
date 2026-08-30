import { LayoutDashboard, ArrowLeftRight, Wallet, Repeat, CreditCard, TrendingUp, Settings, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
export type NavItem = { label: string; to: string; icon: typeof Wallet };
export const navGroups: { group: string; items: NavItem[] }[] = [
{group:"PRINCIPAL",items:[{label:"INÍCIO",to:"/",icon:LayoutDashboard},{label:"PAINEL",to:"/mais",icon:Wallet}]},
{group:"SISTEMA",items:[{label:"AJUSTES",to:"/configuracoes",icon:Settings}]}];
export const quickAddOptions=[{label:"NOVA DESPESA",icon:ArrowDownCircle,kind:"DESPESA"},{label:"NOVA RECEITA",icon:ArrowUpCircle,kind:"RECEITA"},{label:"NOVA PARCELA",icon:CreditCard,kind:"PARCELA"},{label:"NOVA ASSINATURA",icon:Repeat,kind:"ASSINATURA"},{label:"NOVO INVESTIMENTO",icon:TrendingUp,kind:"INVESTIMENTO"},{label:"NOVO RESGATE",icon:TrendingUp,kind:"RESGATE"},{label:"NOVA META",icon:TrendingUp,kind:"META"},{label:"NOVO CUSTO FIXO",icon:Repeat,kind:"CUSTO_FIXO"}] as const;
