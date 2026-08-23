import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useGlobalMonth, MonthSelector } from "@/hooks/use-global-month";

export const Route=createFileRoute("/resgate")({head:()=>({meta:[{title:"NOVO RESGATE — MULTICAP"}]}),component:RedemptionPage});
type Investment={id:string;name:string;type:string;invested:number;current_value:number;created_at:string;household_id:string};
type Transaction={id:string;date:string;description:string;category:string;pay_method:string;responsible:string;amount:number;type:string;paid:boolean;household_id:string};
function RedemptionPage(){
 const {month,setMonth}=useGlobalMonth("resgate");
 const investments=useHouseholdTable<Investment>("investments","id,name,type,invested,current_value,created_at,household_id");
 const transactions=useHouseholdTable<Transaction>("transactions","id,date,description,category,pay_method,responsible,amount,type,paid,household_id");
 const [investmentId,setInvestmentId]=useState("");const [amount,setAmount]=useState("");const [responsible,setResponsible]=useState("AMBAS");const [description,setDescription]=useState("");
 const selected=useMemo(()=>investments.rows.find(i=>i.id===investmentId),[investments.rows,investmentId]);
 const available=selected?Number(selected.current_value):0;const value=Number(amount.replace(",","."))||0;
 async function redeem(){
  if(!selected)return toast.error("SELECIONE O INVESTIMENTO");
  if(value<=0)return toast.error("INFORME O VALOR DO RESGATE");
  if(value>available)return toast.error(`O VALOR MÁXIMO DISPONÍVEL É ${formatCurrency(available)}`);
  try{
   const newValue=available-value;
   await investments.update(selected.id,{current_value:newValue});
   await transactions.insert({date:`${month}-01`,description:(description.trim()||`RESGATE — ${selected.name}`).toUpperCase(),amount:value,type:"RECEITA",category:"RESGATE DE INVESTIMENTO",pay_method:"TRANSFERÊNCIA",responsible,paid:true});
   setAmount("");setDescription("");toast.success("RESGATE REALIZADO E LANÇADO COMO RECEITA");
  }catch(e){toast.error(e instanceof Error?e.message:"NÃO FOI POSSÍVEL REALIZAR O RESGATE")}
 }
 const total=investments.rows.reduce((s,i)=>s+Number(i.current_value),0);
 return <div className="space-y-5"><PageHeader title="NOVO RESGATE" subtitle="RETIRE PARTE OU TODO O VALOR DE UM INVESTIMENTO E REGISTRE O VALOR RESGATADO NO FLUXO." action={<MonthSelector month={month} setMonth={setMonth}/>} /><div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><StatCard label="CARTEIRA ATUAL" value={formatCurrency(total)} tone="primary"/><StatCard label="DISPONÍVEL PARA RESGATE" value={formatCurrency(available)} tone="info"/><StatCard label="VALOR DO RESGATE" value={formatCurrency(value)} tone="success"/></div><Panel title="FORMULÁRIO DE RESGATE"><div className="grid gap-3 md:grid-cols-5"><label className="md:col-span-2"><span className="label-caps mb-1 block text-[9px] text-muted-foreground">INVESTIMENTO</span><select value={investmentId} onChange={e=>{setInvestmentId(e.target.value);setAmount("")}} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option value="">SELECIONE O INVESTIMENTO</option>{investments.rows.map(i=><option key={i.id} value={i.id}>{i.name} — {formatCurrency(Number(i.current_value))}</option>)}</select></label><label><span className="label-caps mb-1 block text-[9px] text-muted-foreground">VALOR DO RESGATE</span><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"/></label><label><span className="label-caps mb-1 block text-[9px] text-muted-foreground">RESPONSÁVEL</span><select value={responsible} onChange={e=>setResponsible(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option value="AMBAS">AMBOS / COMPARTILHADO</option>{Array.from(new Set(investments.rows.map(i=>i.name))).slice(0,0).map(n=><option key={n}>{n}</option>)}</select></label><label><span className="label-caps mb-1 block text-[9px] text-muted-foreground">DESCRIÇÃO</span><input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ex.: RESGATE PARCIAL" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"/></label><button type="button" onClick={()=>void redeem()} className="gradient-primary w-fit rounded-xl px-4 py-2 text-[10px] font-semibold text-primary-foreground">REALIZAR RESGATE</button></div>{selected&&<div className="mt-4 rounded-xl border border-border bg-secondary/30 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span><strong>{selected.name}</strong> <Tag>{selected.type}</Tag></span><span>Saldo após resgate: <strong>{formatCurrency(Math.max(0,available-value))}</strong></span></div></div>}</Panel><Panel title="COMO FUNCIONA"><p className="text-sm text-muted-foreground">O resgate reduz o <strong>valor atual</strong> do investimento selecionado. O valor retirado é lançado automaticamente no <strong>Fluxo Mensal como RECEITA</strong>, mantendo patrimônio e caixa separados.</p></Panel></div>
}
