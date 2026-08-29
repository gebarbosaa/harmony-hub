import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useHouseholdPaymentMethods } from "@/hooks/use-household-payment-methods";
import { useHouseholdMembers } from "@/hooks/use-household-members";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MonthSelector, useGlobalMonth } from "@/hooks/use-global-month";
export const Route=createFileRoute("/assinatura")({head:()=>({meta:[{title:"ASSINATURAS — MULTICAP"}]}),component:SubscriptionPage});
type Row={id:string;name:string;amount:number;category:string;due_day:number;months:boolean[];responsible:string;pay_method:string;household_id:string};
function SubscriptionPage(){const{month,setMonth}=useGlobalMonth("assinatura");const{rows,isLoading}=useHouseholdTable<Row>("fixed_costs","id,name,amount,category,due_day,months,responsible,pay_method,household_id");const active=rows.filter(r=>r.category.toUpperCase()==="ASSINATURAS");const total=active.filter(r=>r.months[new Date(`${month}-01`).getMonth()]).reduce((s,r)=>s+Number(r.amount),0);return <div className="space-y-5"><PageHeader title="ASSINATURAS" subtitle="ASSINATURAS AGORA SÃO GERENCIADAS EM CUSTOS FIXOS E ASSINATURAS." action={<MonthSelector month={month} setMonth={setMonth}/>}/><Panel title="CUSTOS FIXOS E ASSINATURAS"><p className="py-8 text-center text-sm text-muted-foreground">A área de assinaturas foi integrada à aba CUSTOS FIXOS E ASSINATURAS. Use o Cadastro Rápido ou acesse essa aba para cadastrar e gerenciar assinaturas.</p><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border p-4"><p className="label-caps text-[10px] text-muted-foreground">TOTAL DO MÊS</p><p className="mt-1 text-xl font-bold">{formatCurrency(total)}</p></div><div className="rounded-2xl border p-4"><p className="label-caps text-[10px] text-muted-foreground">ATIVAS</p><p className="mt-1 text-xl font-bold">{isLoading?"—":active.length}</p></div></div></Panel></div>}
