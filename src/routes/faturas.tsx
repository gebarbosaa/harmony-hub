import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { MonthSelector, useGlobalMonth } from "@/hooks/use-global-month";
import { supabase } from "@/integrations/supabase/client";
export const Route=createFileRoute("/faturas")({head:()=>({meta:[{title:"FATURAS — HARMONY HUB"}]}),component:InvoicesPage});
type Card={id:string;name:string;brand:string|null;last4:string|null;credit_limit:number;due_day:number;close_day:number;household_id:string};
type Invoice={id:string;card_id:string|null;period:string;total:number;status:string;household_id:string};
type Tx={id:string;date:string;description:string;amount:number;category:string;pay_method:string;responsible:string;type:string;paid:boolean;card_id:string|null;card_name:string|null;source_type:string|null;source_index:number|null;installment_current:number|null;installment_total:number|null;household_id:string};
type Installment={id:string;card_id:string|null;purchase_date:string;installments_count:number;paid_count:number;household_id:string};
function invoicePeriod(card:Card,date:string){const d=new Date(`${date}T12:00:00`);let y=d.getFullYear(),m=d.getMonth()+1;if(d.getDate()>card.close_day){m++;if(m===13){m=1;y++}}return `${y}-${String(m).padStart(2,"0")}`}
function InvoicesPage(){
 const{month,setMonth}=useGlobalMonth("faturas");
 const cards=useHouseholdTable<Card>("cards","id,name,brand,last4,credit_limit,due_day,close_day,household_id","name");
 const invoices=useHouseholdTable<Invoice>("invoices","id,card_id,period,total,status,household_id","period");
 const tx=useHouseholdTable<Tx>("transactions","id,date,description,amount,category,pay_method,responsible,type,paid,card_id,card_name,source_type,source_index,installment_current,installment_total,household_id","date");
 const[name,setName]=useState("");const[limit,setLimit]=useState("");const[due,setDue]=useState("5");const[close,setClose]=useState("28");const[brand,setBrand]=useState("");const[last4,setLast4]=useState("");
 const[selected,setSelected]=useState<Card|null>(null);const[editing,setEditing]=useState<Card|null>(null);const[open,setOpen]=useState(false);
 const monthInvoices=useMemo(()=>invoices.rows.filter(i=>i.period===month),[invoices.rows,month]);
 const cardRows=(card:Card)=>tx.rows.filter(t=>t.card_id===card.id&&t.type==="DESPESA"&&invoicePeriod(card,t.date)===month);
 const cardTotal=(card:Card)=>cardRows(card).reduce((s,t)=>s+Number(t.amount),0);
 const usedLimit=(card:Card)=>tx.rows.filter(t=>t.card_id===card.id&&t.type==="DESPESA"&&!t.paid).reduce((s,t)=>s+Math.max(Number(t.amount),0),0);
 const calculatedInvoiceTotal=useMemo(()=>cards.rows.reduce((s,c)=>s+cardTotal(c),0),[cards.rows,tx.rows,month]);
 function clearForm(){setName("");setLimit("");setDue("5");setClose("28");setBrand("");setLast4("");setEditing(null);setOpen(false)}
 function openEdit(c:Card){setEditing(c);setName(c.name);setLimit(String(c.credit_limit));setDue(String(c.due_day));setClose(String(c.close_day));setBrand(c.brand??"");setLast4(c.last4??"");setOpen(true)}
 async function saveCard(){const value=Number(limit.replace(",","."));const closeDay=Number(close);const dueDay=Number(due);if(!name.trim()||value<=0)return toast.error("PREENCHA NOME E LIMITE");if(closeDay<1||closeDay>31||dueDay<1||dueDay>31)return toast.error("INFORME DIAS VÁLIDOS DE FECHAMENTO E VENCIMENTO");try{const payload={name:name.trim().toUpperCase(),credit_limit:value,due_day:dueDay,close_day:closeDay,brand:brand.trim().toUpperCase()||null,last4:last4.trim()||null};if(editing){await cards.update(editing.id,payload);toast.success("CARTÃO ATUALIZADO")}else{await cards.insert(payload);toast.success("CARTÃO CADASTRADO E SINCRONIZADO")}clearForm()}catch(e){toast.error(e instanceof Error?e.message:"ERRO AO SALVAR CARTÃO")}}
 async function deleteCard(id:string){if(!window.confirm("EXCLUIR ESTE CARTÃO? AS TRANSAÇÕES EXISTENTES SERÃO PRESERVADAS."))return;try{await cards.remove(id);setSelected(null);toast.success("CARTÃO EXCLUÍDO")}catch(e){toast.error(e instanceof Error?e.message:"ERRO AO EXCLUIR CARTÃO")}}
 const installments=useHouseholdTable<Installment>("installments","id,card_id,purchase_date,installments_count,paid_count,household_id","purchase_date");
 async function toggleInvoice(i:Invoice){
   const next=i.status==="PAGA"?"ABERTA":"PAGA";
   try{
     await invoices.update(i.id,{status:next});
     const card=cards.rows.find(c=>c.id===i.card_id);
     if(card){
       const rowsInInvoice=tx.rows.filter(t=>t.card_id===card.id&&t.type==="DESPESA"&&invoicePeriod(card,t.date)===i.period);
       await Promise.all(rowsInInvoice.map(r=>tx.update(r.id,{paid:next==="PAGA"})));
       const cardInstallments=installments.rows.filter(inst=>inst.card_id===card.id);
       for(const inst of cardInstallments){
         const count=Math.max(1,Number(inst.installments_count));
         for(let idx=1;idx<=count;idx++){
           const {data,error}=await supabase.rpc("installment_invoice_period",{p_card_id:card.id,p_purchase_date:inst.purchase_date,p_installment_index:idx});
           if(!error&&String(data)===i.period){
             if(next==="PAGA"&&Number(inst.paid_count)<idx) await installments.update(inst.id,{paid_count:idx});
             else if(next==="ABERTA"&&Number(inst.paid_count)===idx) await installments.update(inst.id,{paid_count:idx-1});
             break;
           }
         }
       }
     }
     toast.success(next==="PAGA"?"FATURA MARCADA COMO PAGA":"FATURA REABERTA");
   }catch(e){toast.error(e instanceof Error?e.message:"ERRO AO ATUALIZAR")}
 }
 return <div className="space-y-5">
 <PageHeader title="FATURAS" subtitle={`CARTÕES E FATURAS DE ${month}.`} action={<div className="flex items-center gap-2"><button type="button" onClick={()=>setOpen(v=>!v)} className="gradient-primary inline-flex h-10 min-w-[120px] items-center justify-center gap-2 rounded-xl px-4 text-[10px] font-semibold text-primary-foreground">{open?"FECHAR FORMULÁRIO":<><Plus className="h-4 w-4"/>NOVO CARTÃO</>}</button><MonthSelector month={month} setMonth={setMonth}/></div>}/>
 <div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><StatCard label="TOTAL DA FATURA" value={formatCurrency(calculatedInvoiceTotal)} tone="primary"/><StatCard label="LIMITE TOTAL" value={formatCurrency(cards.rows.reduce((s,c)=>s+Number(c.credit_limit),0))} tone="success"/><StatCard label="CARTÕES" value={String(cards.rows.length)} tone="info"/></div>
 {open && <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_12px_40px_-30px_rgba(0,0,0,0.8)] md:p-6"><div className="mb-4"><p className="label-caps text-[9px] font-semibold tracking-[0.18em] text-primary">CADASTRO</p><h2 className="mt-1 text-base font-bold tracking-tight md:text-lg">{editing?"EDITAR CARTÃO":"NOVO CARTÃO"}</h2></div><div className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><input value={name} onChange={e=>setName(e.target.value)} placeholder="NOME DO CARTÃO" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm md:col-span-2"/><input value={limit} onChange={e=>setLimit(e.target.value)} placeholder="LIMITE" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"/><input type="number" min="1" max="31" value={close} onChange={e=>setClose(e.target.value)} placeholder="FECHAMENTO" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"/><input type="number" min="1" max="31" value={due} onChange={e=>setDue(e.target.value)} placeholder="VENCIMENTO" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"/><input value={brand} onChange={e=>setBrand(e.target.value)} placeholder="BANDEIRA" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"/><input maxLength={4} value={last4} onChange={e=>setLast4(e.target.value.replace(/\D/g,""))} placeholder="4 ÚLTIMOS" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"/><div className="flex gap-2 md:col-span-2"><button onClick={()=>void saveCard()} className="gradient-primary label-caps inline-flex w-fit items-center justify-center rounded-lg px-3 py-1.5 text-[9px] font-semibold text-primary-foreground">{editing?"SALVAR ALTERAÇÕES":"SALVAR CARTÃO"}</button>{editing&&<button onClick={clearForm} className="rounded-xl border px-4 py-2.5 text-[11px] font-semibold">CANCELAR</button>}</div></div></div></div>}
 <Panel title={`CARTÕES — ${month}`}><div className="grid gap-3 md:grid-cols-2">{cards.rows.map(c=>{const total=cardTotal(c);const used=usedLimit(c);const available=Math.max(Number(c.credit_limit)-used,0);return <div key={c.id} className="rounded-2xl border border-border bg-card p-4"><button type="button" onClick={()=>setSelected(c)} className="w-full text-left"><div className="flex items-start justify-between gap-3"><div><p className="label-caps text-sm">{c.name}</p><p className="text-[11px] text-muted-foreground">{c.brand||"SEM BANDEIRA"} · •••• {c.last4||"----"}</p></div><Tag tone="info">{formatCurrency(available)} DISPONÍVEL</Tag></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div><span className="text-muted-foreground">FATURA</span><p className="font-bold">{formatCurrency(total)}</p></div><div><span className="text-muted-foreground">LIMITE USADO</span><p className="font-bold">{formatCurrency(used)}</p></div></div><p className="mt-2 text-[9px] text-muted-foreground">FECHA DIA {c.close_day} · VENCE DIA {c.due_day}</p></button><div className="mt-3 flex gap-3 border-t pt-3"><button onClick={()=>openEdit(c)} className="text-[10px] font-semibold text-primary">EDITAR CARTÃO</button><button onClick={()=>void deleteCard(c.id)} className="text-[10px] font-semibold text-danger">EXCLUIR</button></div></div>})}</div></Panel>
 <Panel title={`FATURAS — ${month}`}>{cards.rows.length===0?<p className="py-8 text-center text-sm text-muted-foreground">NENHUM CARTÃO CADASTRADO.</p>:<div className="space-y-2">{cards.rows.map(c=>{const total=cardTotal(c);const inv=monthInvoices.find(i=>i.card_id===c.id);return <button type="button" key={c.id} onClick={()=>setSelected(c)} className="group w-full rounded-xl border border-border bg-secondary/30 px-4 py-3 text-left transition hover:border-primary/50 hover:bg-secondary/50"><div className="flex items-center justify-between gap-3"><div><p className="label-caps text-[11px]">{c.name}</p><p className="text-[10px] text-muted-foreground">FATURA {month} · FECHA DIA {c.close_day} · VENCE DIA {c.due_day}</p><p className="mt-1 text-[9px] text-primary opacity-0 transition group-hover:opacity-100">CLIQUE PARA VER DETALHES E LANÇAMENTOS</p></div><div className="flex items-center gap-3"><b>{formatCurrency(total)}</b>{inv&&<span onClick={e=>e.stopPropagation()}><button type="button" onClick={()=>void toggleInvoice(inv)}><Tag tone={inv.status==="PAGA"?"success":"warning"}>{inv.status}</Tag></button></span>}</div></div></button>})}</div>}</Panel>
 {selected&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" onClick={()=>setSelected(null)}><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-background p-5" onClick={e=>e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="label-caps text-lg">{selected.name}</p><p className="text-sm text-muted-foreground">FATURA {month}</p></div><button onClick={()=>setSelected(null)} className="rounded-lg border px-3 py-1.5 text-xs">FECHAR</button></div><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4"><StatCard label="FATURA" value={formatCurrency(cardTotal(selected))} tone="primary"/><StatCard label="LIMITE" value={formatCurrency(Number(selected.credit_limit))} tone="info"/><StatCard label="USADO" value={formatCurrency(usedLimit(selected))} tone="warning"/><StatCard label="DISPONÍVEL" value={formatCurrency(Math.max(Number(selected.credit_limit)-usedLimit(selected),0))} tone="success"/></div><div className="mt-5 divide-y divide-border rounded-xl border border-border">{cardRows(selected).length===0?<p className="py-10 text-center text-sm text-muted-foreground">NENHUM LANÇAMENTO NESTA FATURA.</p>:cardRows(selected).map(r=><div key={r.id} className="flex items-center justify-between px-4 py-3"><div><p className="label-caps text-[11px]">{r.description}</p><p className="text-[10px] text-muted-foreground">{r.date} · {r.installment_current&&r.installment_total?`${r.installment_current}/${r.installment_total}`:"À VISTA"}</p></div><b>{formatCurrency(Number(r.amount))}</b></div>)}</div></div></div>}
 </div>}
