import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui-kit";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/habitos")({ head: () => ({ meta: [{ title: "HÁBITOS — MULTICAP" }] }), component: HabitsPage });

type Habit={id:string;household_id:string;user_id:string|null;title:string;frequency:string;shift:string|null;privacy:string|null;created_at:string};
function HabitsPage(){
 const habits=useHouseholdTable<Habit>("habits","*","created_at");
 const [tab,setTab]=useState<"MEUS HÁBITOS"|"HÁBITOS DE PARCEIRO">("MEUS HÁBITOS");
 const [title,setTitle]=useState("");const [frequency,setFrequency]=useState("DIÁRIO");const [privacy,setPrivacy]=useState("PRIVADO");
 async function add(){if(!title.trim())return toast.error("INFORME O NOME DO HÁBITO");try{await habits.insert({title:title.trim().toUpperCase(),frequency,privacy,shift:null});setTitle("");toast.success("HÁBITO ADICIONADO")}catch(e){toast.error(e instanceof Error?e.message:"ERRO AO ADICIONAR")}}
 async function remove(id:string){if(!window.confirm("Excluir este hábito?"))return;try{await habits.remove(id);toast.success("HÁBITO EXCLUÍDO")}catch(e){toast.error(e instanceof Error?e.message:"ERRO AO EXCLUIR")}}
 const list=habits.rows;
 return <div className="space-y-5"><PageHeader title="HÁBITOS" subtitle="Seus hábitos reais. Nenhum dado fictício é carregado."/><Panel title="NOVO HÁBITO"><div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]"><input value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void add()} placeholder="Nome do hábito" className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"/><select value={frequency} onChange={e=>setFrequency(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option>DIÁRIO</option><option>SEMANAL</option><option>MENSAL</option></select><select value={privacy} onChange={e=>setPrivacy(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option>PRIVADO</option><option>COMPARTILHADO</option></select><button onClick={()=>void add()} className="gradient-primary flex items-center justify-center gap-1 rounded-xl px-4 py-2.5 text-[10px] text-primary-foreground"><Plus className="h-4 w-4"/>ADICIONAR</button></div></Panel><div className="flex gap-2">{(["MEUS HÁBITOS","HÁBITOS DE PARCEIRO"] as const).map(t=><button key={t} onClick={()=>setTab(t)} className={cn("label-caps flex-1 rounded-full border px-4 py-2.5 text-[11px]",tab===t?"gradient-primary border-transparent text-primary-foreground":"border-border text-muted-foreground")}>{t}</button>)}</div>{habits.isLoading?<p className="text-sm text-muted-foreground">Carregando hábitos...</p>:list.length===0?<Panel><div className="py-8 text-center text-sm text-muted-foreground">Nenhum hábito cadastrado. Adicione seu primeiro hábito acima.</div></Panel>:<div className="grid gap-3 md:grid-cols-2">{list.map(h=><Panel key={h.id}><div className="flex items-start justify-between gap-3"><div><p className="label-caps text-sm">{h.title}</p><div className="mt-1 flex gap-2 text-[10px] text-muted-foreground"><span>{h.frequency}</span><span>•</span><span>{h.privacy||"PRIVADO"}</span></div></div><button onClick={()=>void remove(h.id)} className="text-danger"><Trash2 className="h-4 w-4"/></button></div><button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-[10px] hover:bg-secondary"><Check className="h-4 w-4"/> MARCAR COMO FEITO HOJE</button></Panel>)}</div>}</div>;
}
