import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CreditCard, Landmark, Plus, ArrowUpDown } from "lucide-react";
import { PageHeader, Panel, ProgressBar, Tag, PersonDot } from "@/components/ui-kit";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, calculateInstallmentValue } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useHouseholdPaymentMethods } from "@/hooks/use-household-payment-methods";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Row = { id:string; name:string; category:string; total_amount:number; installments_count:number; paid_count:number; purchase_date:string; responsible:string; card_name:string|null; card_id:string|null; pay_method:string; payment_method_name:string|null; payment_method_id:string|null; household_id:string };
type Payment = { id:string; name:string; kind:string; card_id:string|null; household_id:string };
type Invoice = { id:string; card_id:string|null; period:string; status:string; household_id:string };
type Category = { id:string; name:string; kind:string; household_id:string };
type SortKey = "nome" | "valor" | "restantes" | "data";
export const Route = createFileRoute("/parcelados")({ head:()=>({meta:[{title:"PARCELADOS — HARMONY HUB"}]}), component:InstallmentsPage });

const TODAY_MONTH = new Date().toISOString().slice(0,7);

function InstallmentsPage(){
 const {profile}=useAuth();
 const {rows,insert,update,remove,isLoading,householdId}=useHouseholdTable<Row>("installments","id,name,category,total_amount,installments_count,paid_count,purchase_date,responsible,card_name,card_id,pay_method,payment_method_name,payment_method_id,household_id","purchase_date");
 const invoices=useHouseholdTable<Invoice>("invoices","id,card_id,period,status,household_id","period");
 const paymentsQuery=useHouseholdPaymentMethods(); const payments=paymentsQuery.rows as Payment[];
 const categories=useHouseholdTable<Category>("categories","id,name,kind,household_id","name");
 const categoryOptions=useMemo(()=>categories.rows.map(c=>c.name.toUpperCase()).filter(Boolean),[categories.rows]);
 const [formOpen,setFormOpen]=useState(false); const [editing,setEditing]=useState<Row|null>(null); const [name,setName]=useState(""); const [total,setTotal]=useState(""); const [count,setCount]=useState("2"); const [category,setCategory]=useState(""); const [purchaseDate,setPurchaseDate]=useState(new Date().toISOString().slice(0,10)); const [paymentId,setPaymentId]=useState(""); const [responsible,setResponsible]=useState("");
 const selectedPayment=useMemo(()=>payments.find(p=>p.id===paymentId)??null,[payments,paymentId]);
 useEffect(()=>{if(!paymentId&&payments[0])setPaymentId(payments[0].id);if(paymentId&&payments.length&&!payments.some(p=>p.id===paymentId))setPaymentId(payments[0]?.id||"")},[paymentId,payments]);
 useEffect(()=>{if(!categoryOptions.includes(category))setCategory(categoryOptions[0]||"")},[categoryOptions,category]);
 useEffect(()=>{let handled=false;const openFromQuickAdd=()=>{if(handled)return;const pending=sessionStorage.getItem("multicap:pending-create");if(pending==="NOVA PARCELA"){handled=true;sessionStorage.removeItem("multicap:pending-create");openNew()}};openFromQuickAdd();window.addEventListener("multicap:open-create",openFromQuickAdd);const timer=window.setInterval(openFromQuickAdd,100);const stop=window.setTimeout(()=>window.clearInterval(timer),5000);return()=>{window.removeEventListener("multicap:open-create",openFromQuickAdd);window.clearInterval(timer);window.clearTimeout(stop)}},[]);
 function reset(){setEditing(null);setName("");setTotal("");setCount("2");setCategory(categoryOptions[0]||"");setPurchaseDate(new Date().toISOString().slice(0,10));setPaymentId(payments[0]?.id||"");setResponsible("");}
 function openNew(){reset();setFormOpen(true)}
 function openEdit(i:Row){setEditing(i);setName(i.name);setTotal(String(i.total_amount).replace(".",","));setCount(String(i.installments_count));setCategory(i.category||"");setPurchaseDate(i.purchase_date);setPaymentId(i.payment_method_id||payments.find(p=>p.card_id===i.card_id&&p.kind===i.pay_method)?.id||payments.find(p=>p.kind===i.pay_method)?.id||"");setResponsible(i.responsible||"");setFormOpen(true)}

 // Para cada parcelamento, descobre qual e a parcela "atual" agora (comparando com o mes de
 // hoje, nao um mes escolhido manualmente) e em qual fatura ela cai.
 const [currentInfo,setCurrentInfo]=useState<Record<string,{index:number;period:string}>>({});
 useEffect(()=>{let cancelled=false;async function resolve(){const map:Record<string,{index:number;period:string}>={};for(const i of rows){const count=Math.max(1,Number(i.installments_count));let best:{index:number;period:string}|null=null;for(let idx=1;idx<=count;idx++){const {data,error}=await supabase.rpc("installment_invoice_period",{p_card_id:i.card_id??null,p_purchase_date:i.purchase_date,p_installment_index:idx});if(!error&&data){const period=String(data);if(period<=TODAY_MONTH)best={index:idx,period};else if(!best)best={index:idx,period}}}if(best)map[i.id]=best}if(!cancelled)setCurrentInfo(map)}resolve();return()=>{cancelled=true}},[rows]);

 async function save(){const value=Number(total.replace(/\./g,"").replace(",","."));const n=Number(count);if(!householdId){toast.error("SEU GRUPO FAMILIAR NÃO ESTÁ CONFIGURADO.");return}if(!name.trim()){toast.error("INFORME O NOME DA COMPRA");return}if(!Number.isFinite(value)||value<=0){toast.error("INFORME UM VALOR TOTAL VÁLIDO");return}if(!Number.isInteger(n)||n<1){toast.error("INFORME UMA QUANTIDADE DE PARCELAS VÁLIDA");return}if(!purchaseDate){toast.error("INFORME A DATA DA COMPRA");return}if(!category){toast.error("CADASTRE UMA CATEGORIA EM AJUSTES");return}if(!categoryOptions.includes(category)){toast.error("A CATEGORIA SELECIONADA NÃO ESTÁ CADASTRADA EM AJUSTES");return}if(!selectedPayment){toast.error("SELECIONE UMA FORMA DE PAGAMENTO");return}try{const values={name:name.trim().toUpperCase(),total_amount:value,installments_count:n,paid_count:editing?Math.min(Number(editing.paid_count),n):0,purchase_date:purchaseDate,category,responsible:responsible.trim()||profile?.name||"AMBAS",pay_method:selectedPayment.kind,payment_method_name:selectedPayment.name,payment_method_id:selectedPayment.id,card_id:selectedPayment.card_id,card_name:selectedPayment.card_id?selectedPayment.name:null};if(editing)await update(editing.id,values);else await insert(values);setFormOpen(false);reset();toast.success(editing?"PARCELAMENTO ATUALIZADO":"PARCELAMENTO SALVO")}catch(e){toast.error(e instanceof Error?e.message:"NÃO FOI POSSÍVEL SALVAR O PARCELAMENTO")}}
 async function pay(i:Row){try{await update(i.id,{paid_count:Math.min(Number(i.paid_count)+1,Number(i.installments_count))});toast.success("PARCELA MARCADA COMO PAGA")}catch(e){toast.error(e instanceof Error?e.message:"NÃO FOI POSSÍVEL ATUALIZAR")}}
 async function del(i:Row){if(!confirm(`Excluir ${i.name}?`))return;try{await remove(i.id);toast.success("PARCELAMENTO EXCLUÍDO")}catch(e){toast.error(e instanceof Error?e.message:"NÃO FOI POSSÍVEL EXCLUIR")}}

 const [tab,setTab]=useState<"ATIVAS"|"FINALIZADAS">("ATIVAS");
 const [sortKey,setSortKey]=useState<SortKey>("valor");
 const base=rows.filter(i=>tab==="ATIVAS"?Number(i.paid_count)<Number(i.installments_count):Number(i.paid_count)>=Number(i.installments_count));
 const list=[...base].sort((a,b)=>{
   if(sortKey==="nome") return a.name.localeCompare(b.name);
   if(sortKey==="valor") return Number(b.total_amount)-Number(a.total_amount);
   if(sortKey==="data") return b.purchase_date.localeCompare(a.purchase_date);
   const restA=Number(a.installments_count)-Number(a.paid_count); const restB=Number(b.installments_count)-Number(b.paid_count);
   return restA-restB;
 });
 const sortOptions:{key:SortKey;label:string}[]=[{key:"nome",label:"A-Z NOME"},{key:"valor",label:"$ VALOR"},{key:"restantes",label:"RESTANTES"},{key:"data",label:"DATA"}];

 return <div className="space-y-5">
  <PageHeader title="PARCELAS" subtitle={`${rows.length} COMPRA${rows.length===1?"":"S"} PARCELADA${rows.length===1?"":"S"}`} action={<button onClick={openNew} className="gradient-primary inline-flex h-10 w-10 items-center justify-center rounded-full text-primary-foreground shadow-lg" aria-label="NOVO PARCELAMENTO"><Plus className="h-5 w-5"/></button>} />

  <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="max-w-4xl rounded-3xl"><DialogHeader><DialogTitle className="label-caps">{editing?"EDITAR PARCELAMENTO":"NOVO PARCELAMENTO"}</DialogTitle></DialogHeader><div className="grid gap-3 md:grid-cols-6"><label className="md:col-span-2"><span className="label-caps text-[10px] text-muted-foreground">NOME</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: notebook" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"/></label><label><span className="label-caps text-[10px] text-muted-foreground">VALOR TOTAL</span><input value={total} onChange={e=>setTotal(e.target.value)} inputMode="decimal" placeholder="0,00" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"/></label><label><span className="label-caps text-[10px] text-muted-foreground">PARCELAS</span><input type="number" min="1" step="1" value={count} onChange={e=>setCount(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"/></label><label><span className="label-caps text-[10px] text-muted-foreground">DATA DA COMPRA</span><input type="date" value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"/></label><label><span className="label-caps text-[10px] text-muted-foreground">CATEGORIA</span><select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option value="">SELECIONE</option>{categoryOptions.map(c=><option key={c}>{c}</option>)}</select></label><label className="md:col-span-2"><span className="label-caps text-[10px] text-muted-foreground">FORMA DE PAGAMENTO</span><select value={paymentId} onChange={e=>setPaymentId(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option value="">SELECIONE</option>{payments.map(p=><option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}</select>{selectedPayment?.card_id&&<span className="mt-1 block text-[10px] text-muted-foreground">CARTÃO: {selectedPayment.name.toUpperCase()}</span>}</label><label className="md:col-span-2"><span className="label-caps text-[10px] text-muted-foreground">RESPONSÁVEL</span><input value={responsible} onChange={e=>setResponsible(e.target.value)} placeholder={profile?.name||"Seu nome"} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"/></label><div className="md:col-span-6 flex gap-2"><button type="button" onClick={save} disabled={isLoading} className="gradient-primary label-caps inline-flex w-fit items-center justify-center rounded-lg px-3 py-1.5 text-[9px] font-semibold text-primary-foreground">{isLoading?"SALVANDO...":editing?"SALVAR ALTERAÇÕES":"SALVAR PARCELAMENTO"}</button><button type="button" onClick={()=>setFormOpen(false)} className="label-caps rounded-lg border border-border px-3 py-1.5 text-[9px]">CANCELAR</button></div></div></DialogContent></Dialog>

  <div className="flex gap-2">
    <button onClick={()=>setTab("ATIVAS")} className={cn("label-caps rounded-full px-4 py-2 text-[10px] font-semibold",tab==="ATIVAS"?"bg-success text-background":"border border-border text-muted-foreground")}>EM ANDAMENTO</button>
    <button onClick={()=>setTab("FINALIZADAS")} className={cn("label-caps rounded-full px-4 py-2 text-[10px] font-semibold",tab==="FINALIZADAS"?"bg-foreground text-background":"border border-border text-muted-foreground")}>FINALIZADAS</button>
  </div>

  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
    <span className="label-caps inline-flex items-center gap-1"><ArrowUpDown className="h-3 w-3"/>ORDENAR:</span>
    {sortOptions.map(o=><button key={o.key} onClick={()=>setSortKey(o.key)} className={cn("label-caps rounded-full border px-3 py-1.5 text-[10px]",sortKey===o.key?"border-primary text-primary":"border-border")}>{o.label}</button>)}
  </div>

  <Panel>
    {isLoading?<p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>:list.length===0?<p className="py-8 text-center text-sm text-muted-foreground">{tab==="ATIVAS"?"Nenhum parcelamento em andamento.":"Nenhum parcelamento finalizado ainda."}</p>:<div className="space-y-3">
      {list.map(i=>{
        const value=calculateInstallmentValue(Number(i.total_amount),Number(i.installments_count));
        const done=Number(i.paid_count)>=Number(i.installments_count);
        const info=currentInfo[i.id];
        const current=info?.index??Math.min(Number(i.paid_count)+1,Number(i.installments_count));
        const remainingCount=Number(i.installments_count)-current+1;
        const percent=(current/Math.max(1,Number(i.installments_count)))*100;
        const almostDone=!done&&remainingCount<=1;
        const invoice=i.card_id&&info?invoices.rows.find(inv=>inv.card_id===i.card_id&&inv.period===info.period):null;
        return <div key={i.id} className={cn("rounded-2xl border border-border bg-card p-4",done&&"opacity-60")}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary"><CreditCard className="h-4 w-4 text-primary"/></span>
              <div>
                <p className="label-caps text-sm">{i.name}</p>
                <p className="text-[11px] text-muted-foreground">{i.name} · Parcela {Math.min(current,Number(i.installments_count))}/{Number(i.installments_count)}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Landmark className="h-3 w-3"/>{i.card_name||i.payment_method_name||"SEM CARTÃO"}</p>
              </div>
            </div>
            {almostDone?<Tag tone="warning">QUASE LÁ!</Tag>:done?<Tag tone="success">QUITADO</Tag>:null}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2"><div className="flex-1"><ProgressBar percent={percent}/></div><span className="label-caps text-[10px] text-muted-foreground">{Math.min(current,Number(i.installments_count))}/{Number(i.installments_count)}</span></div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <div><p className="label-caps text-muted-foreground">TOTAL DA COMPRA</p><p className="font-semibold">{formatCurrency(Number(i.total_amount))}</p></div>
            <div className="text-right"><p className="label-caps text-muted-foreground">RESTAM {remainingCount}X DE</p><p className="font-semibold text-primary">{formatCurrency(value)}</p></div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Tag>{i.category}</Tag><PersonDot name={i.responsible||"MINHA CONTA"}/>
            {i.card_id?<><Tag tone={invoice?.status==="PAGA"?"success":"warning"}>{invoice?.status==="PAGA"?"PAGO NA FATURA":"AGUARDANDO PAGAR FATURA"}</Tag><a href="/faturas" className="label-caps rounded-lg border border-border px-3 py-1.5 text-[10px]">VER FATURA</a></>:!done&&<button onClick={()=>pay(i)} className="label-caps rounded-lg border border-primary/60 px-3 py-1.5 text-[10px] text-primary">MARCAR PARCELA PAGA</button>}
            <button onClick={()=>openEdit(i)} className="label-caps rounded-lg border border-border px-3 py-1.5 text-[10px]">EDITAR</button>
            <button onClick={()=>del(i)} className="label-caps rounded-lg border border-danger/50 px-3 py-1.5 text-[10px] text-danger">EXCLUIR</button>
          </div>
        </div>;
      })}
    </div>}
  </Panel>
 </div>;
}
