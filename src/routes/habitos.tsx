import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Flame, Plus, Trash2 } from "lucide-react";
import { PageHeader, Panel, ProgressBar } from "@/components/ui-kit";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/habitos")({ head: () => ({ meta: [{ title: "HÁBITOS — MULTICAP" }] }), component: HabitsPage });

type Habit = { id:string; name:string; owner:string; privacy:string|null; streak:number; best:number; monthly:number; household_id:string };

function HabitsPage(){
 const habits=useHouseholdTable<Habit>("habits","*","created_at");
 const [tab,setTab]=useState<"MEUS HÁBITOS"|"HÁBITOS DE PARCEIRO">("MEUS HÁBITOS");
 const [newHabit,setNewHabit]=useState("");
 async function addHabit(){const name=newHabit.trim().toUpperCase();if(!name)return toast.error("INFORME O NOME DO HÁBITO");try{await habits.insert({name,owner:"EU",privacy:"PRIVADO",streak:0,best:0,monthly:0});setNewHabit("");toast.success("HÁBITO ADICIONADO")}catch(e){toast.error(e instanceof Error?e.message:"NÃO FOI POSSÍVEL ADICIONAR")}}
 async function toggleHabit(h:Habit){const streak=h.streak+1;try{await habits.update(h.id,{streak,best:Math.max(h.best,streak),monthly:Math.min(100,h.monthly+3)});toast.success("HÁBITO MARCADO HOJE")}catch(e){toast.error(e instanceof Error?e.message:"NÃO FOI POSSÍVEL ATUALIZAR")}}
 async function deleteHabit(id:string){if(!window.confirm("Excluir este hábito?"))return;try{await habits.remove(id);toast.success("HÁBITO EXCLUÍDO")}catch(e){toast.error(e instanceof Error?e.message:"NÃO FOI POSSÍVEL EXCLUIR")}}
 const list=habits.rows.filter(h=>tab==="MEUS HÁBITOS"||h.owner!=="EU");
 return <div className="space-y-5"><PageHeader title="HÁBITOS" subtitle="Seus hábitos reais. Nenhum dado fictício é carregado."/><Panel title="NOVO HÁBITO"><div className="flex gap-2"><input value={newHabit} onChange={e=>setNewHabit(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void addHabit()} placeholder="Ex.: TREINAR 4X POR SEMANA" className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm"/><button onClick={()=>void addHabit()} className="gradient-primary flex items-center gap-1 rounded-xl px-4 py-2.5 text-[10px] text-primary-foreground"><Plus className="h-4 w-4"/>ADICIONAR</button></div></Panel><div className="flex gap-2">{(["MEUS HÁBITOS","HÁBITOS DE PARCEIRO"] as const).map(t=><button key={t} onClick={()=>setTab(t)} className={cn("label-caps flex-1 rounded-full border px-4 py-2.5 text-[11px]",tab===t?"gradient-primary border-transparent text-primary-foreground":"border-border text-muted-foreground")}>{t}</button>)}</div>{habits.isLoading?<p className="text-sm text-muted-foreground">Carregando hábitos...</p>:list.length===0?<Panel><div className="py-8 text-center text-sm text-muted-foreground">Você ainda não possui hábitos cadastrados.</div></Panel>:<div className="grid gap-3 md:grid-cols-2">{list.map(h=><Panel key={h.id}><div className="flex items-start justify-between gap-2"><div><p className="label-caps text-sm">{h.name}</p><p className="mt-1 text-xs text-muted-foreground">{h.privacy||"PRIVADO"}</p></div><div className="flex items-center gap-2"><span className="flex items-center gap-1 text-primary"><Flame className="h-4 w-4"/><span className="text-sm font-bold">{h.streak}</span></span><button onClick={()=>void deleteHabit(h.id)} className="text-danger"><Trash2 className="h-4 w-4"/></button></div></div><div className="mt-4"><ProgressBar percent={h.monthly} tone="primary"/><div className="mt-2 flex justify-between text-[11px] text-muted-foreground"><span>{h.monthly}% no mês</span><span>Melhor: {h.best} dias</span></div></div><button onClick={()=>void toggleHabit(h)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-[10px]"><Check className="h-4 w-4"/> MARCAR COMO FEITO HOJE</button></Panel>)}</div>}</div>;
}
