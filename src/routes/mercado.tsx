import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronDown, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, StatCard, Tag } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mercado")({ head: () => ({ meta: [{ title: "MERCADO — HARMONY HUB" }] }), component: MarketPage });

type List = { id:string; name:string; archived:boolean; household_id:string };
type Item = { id:string; list_id:string; name:string; category:string; qty:number|null; unit:string; price:number|null; priority:string; done:boolean; household_id:string };
type Tab = "mercado" | "modo";

type Sector = { name:string; icon:string; order:number };

const SECTORS: Sector[] = [
  { name:"HORTIFRUTI", icon:"🥬", order:1 },
  { name:"PADARIA", icon:"🥖", order:2 },
  { name:"MERCEARIA", icon:"🥫", order:3 },
  { name:"BEBIDAS", icon:"🥤", order:4 },
  { name:"AÇOUGUE", icon:"🥩", order:5 },
  { name:"PEIXARIA", icon:"🐟", order:6 },
  { name:"LATICÍNIOS & REFRIGERADOS", icon:"🥛", order:7 },
  { name:"CONGELADOS", icon:"🧊", order:8 },
  { name:"LIMPEZA", icon:"🧹", order:9 },
  { name:"HIGIENE & BELEZA", icon:"🧴", order:10 },
  { name:"PAPEL & DESCARTÁVEIS", icon:"🧻", order:11 },
  { name:"PET", icon:"🐶", order:12 },
  { name:"OUTROS", icon:"🛒", order:99 },
];

function normalize(value:string){return value.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();}

function classifyProduct(product:string):string {
  const p=normalize(product);
  const rules:[string,string[]][]=[
    ["HORTIFRUTI",["banana","maca","maca","laranja","limao","mamao","manga","uva","abacaxi","melancia","morango","tomate","cebola","alho","batata","cenoura","alface","couve","brocolis","abobrinha","pepino","pimentao","fruta","verdura","legume"]],
    ["PADARIA",["pao","pães","bolo","torta","croissant","sonho","rosca","baguete","padaria"]],
    ["MERCEARIA",["arroz","feijao","macarrao","massa","farinha","acucar","sal","cafe","achocolatado","aveia","cereal","molho","extrato","milho","ervilha","azeite","oleo","vinagre","biscoito","bolacha","tempero","maionese","ketchup","mostarda","enlatado","conserva","geleia"]],
    ["BEBIDAS",["refrigerante","coca","guarana","pepsi","suco","agua","energetico","cha","isotonico","bebida"]],
    ["AÇOUGUE",["carne","bife","picanha","alcatra","patinho","acém","acem","fraldinha","maminha","costela","contra-file","contrafile","file mignon","frango","peito de frango","coxa","sobrecoxa","asa","linguica","salsicha","hamburguer artesanal"]],
    ["PEIXARIA",["peixe","tilapia","salmao","salmao","sardinha","atum fresco","bacalhau","camarao","lula","polvo","frutos do mar"]],
    ["LATICÍNIOS & REFRIGERADOS",["leite","queijo","mussarela","muçarela","presunto","mortadela","iogurte","yogurt","manteiga","margarina","requeijao","creme de leite","nata","coalhada"]],
    ["CONGELADOS",["pizza congelada","nuggets","batata congelada","lasanha congelada","hamburguer congelado","legumes congelados","sorvete","picolé","picolé"]],
    ["LIMPEZA",["detergente","sabao","sabão","amaciante","desinfetante","agua sanitaria","água sanitária","alvejante","esponja","multiuso","limpa","lustra","vassoura","rodo","balde","saco de lixo","limpeza"]],
    ["HIGIENE & BELEZA",["shampoo","condicionador","sabonete","desodorante","pasta de dente","escova de dente","fio dental","absorvente","fralda","barbeador","lamina","creme corporal","hidratante","protetor solar","cosmetico","maquiagem","higiene"]],
    ["PAPEL & DESCARTÁVEIS",["papel higienico","papel higiênico","papel toalha","guardanapo","lenço","lenco","papel aluminio","papel filme","copos descartaveis","prato descartavel","talher descartavel","descartavel"]],
    ["PET",["racao","ração","petisco","areia para gato","areia gato","tapete higienico","pet","cachorro","gato"]],
  ];
  for(const [sector,keywords] of rules){ if(keywords.some(k=>p.includes(normalize(k)))) return sector; }
  return "OUTROS";
}

function sectorMeta(name:string){return SECTORS.find(s=>s.name===name)||SECTORS[SECTORS.length-1];}

function MarketPage(){
 const lists=useHouseholdTable<List>("shopping_lists","id,name,archived,household_id");
 const items=useHouseholdTable<Item>("shopping_items","id,list_id,name,category,qty,unit,price,priority,done,household_id");
 const [tab,setTab]=useState<Tab>("mercado");
 const [active,setActive]=useState("");
 const [showForm,setShowForm]=useState(false);
 const [name,setName]=useState("");
 const [listName,setListName]=useState("");
 const [price,setPrice]=useState("");
 const [qty,setQty]=useState("");
 const [saving,setSaving]=useState(false);
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const current=active?lists.rows.find(x=>x.id===active):lists.rows[0];
 const currentItems=current?items.rows.filter(i=>i.list_id===current.id):[];
 const totalItems=items.rows.length;
 const doneItems=items.rows.filter(i=>i.done).length;
 const totalEstimated=items.rows.reduce((s,i)=>s+(Number(i.qty)||0)*(Number(i.price)||0),0);
 const estimated=currentItems.reduce((s,i)=>s+(Number(i.qty)||0)*(Number(i.price)||0),0);
 const grouped=useMemo(()=>{
   const map=new Map<string,Item[]>();
   currentItems.forEach(item=>{
     const sector=item.category && item.category!=="OUTROS" ? item.category : classifyProduct(item.name);
     if(!map.has(sector)) map.set(sector,[]);
     map.get(sector)!.push(item);
   });
   return [...map.entries()].sort((a,b)=>sectorMeta(a[0]).order-sectorMeta(b[0]).order);
 },[currentItems]);

 function openAdd(){setName("");setListName("");setPrice("");setQty("");setShowForm(true);}
 function closeAdd(){if(!saving)setShowForm(false);}
 async function addItem(){
   if(saving)return;
   const product=name.trim();
   if(!product)return toast.error("INFORME O PRODUTO");
   const parsedQty=qty.trim()===""?null:Number(qty.replace(",","."));
   const parsedPrice=price.trim()===""?null:Number(price.replace(",","."));
   if(parsedQty!==null&&(!Number.isFinite(parsedQty)||parsedQty<=0))return toast.error("QUANTIDADE INVÁLIDA");
   if(parsedPrice!==null&&(!Number.isFinite(parsedPrice)||parsedPrice<0))return toast.error("PREÇO INVÁLIDO");
   setSaving(true);
   try{
     let target=current;
     if(!target){
       const newName=(listName.trim()||"MINHA LISTA").toUpperCase();
       target=await lists.insert({name:newName,archived:false});
       setActive(target.id);
     }
     const sector=classifyProduct(product);
     await items.insert({list_id:target.id,name:product.toUpperCase(),price:parsedPrice,qty:parsedQty,unit:"UN",category:sector,priority:"MÉDIA",done:false});
     setShowForm(false);setName("");setListName("");setPrice("");setQty("");setTab("modo");
     setExpanded(prev=>({...prev,[sector]:true}));
     await Promise.all([lists.refetch(),items.refetch()]);
     toast.success(`ITEM ADICIONADO EM ${sector}`);
   }catch(e){
     const message=e instanceof Error?e.message:"ERRO DESCONHECIDO";
     toast.error(`NÃO FOI POSSÍVEL ADICIONAR: ${message}`);
   }finally{setSaving(false);}
 }
 async function toggle(i:Item){try{await items.update(i.id,{done:!i.done});}catch(e){toast.error(e instanceof Error?e.message:"NÃO FOI POSSÍVEL ATUALIZAR");}}
 async function changeQty(i:Item,delta:number){try{const base=Number(i.qty)||1;await items.update(i.id,{qty:Math.max(base+delta,1)});}catch(e){toast.error(e instanceof Error?e.message:"NÃO FOI POSSÍVEL ATUALIZAR");}}

 return <div className="space-y-5 pb-8">
  <PageHeader title={tab==="mercado"?"MERCADO":"MODO MERCADO"} subtitle={tab==="mercado"?"LISTAS ORGANIZADAS INTELIGENTEMENTE POR SETOR DO SUPERMERCADO.":"COMPRE SEGUINDO A ORDEM DOS SETORES E ACOMPANHE O TOTAL AO VIVO."} action={tab==="modo"?<button type="button" onClick={openAdd} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="ADICIONAR ITEM"><Plus className="h-4 w-4"/></button>:undefined}/>
  <div className="flex w-fit gap-1 rounded-xl border border-border bg-secondary/30 p-1"><button type="button" onClick={()=>setTab("mercado")} className={cn("label-caps rounded-lg px-4 py-2 text-[11px] transition",tab==="mercado"?"bg-background text-foreground shadow-sm":"text-muted-foreground hover:text-foreground")}>LISTAS</button><button type="button" onClick={()=>setTab("modo")} className={cn("label-caps rounded-lg px-4 py-2 text-[11px] transition",tab==="modo"?"bg-background text-foreground shadow-sm":"text-muted-foreground hover:text-foreground")}>MODO MERCADO</button></div>
  {showForm&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={e=>{if(e.currentTarget===e.target)closeAdd();}}><div className="w-full max-w-lg rounded-2xl border border-border bg-background p-5 shadow-xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="label-caps text-sm font-semibold">ADICIONAR ITEM</h2><p className="mt-1 text-xs text-muted-foreground">O HARMONY VAI IDENTIFICAR AUTOMATICAMENTE O SETOR DO SUPERMERCADO.</p></div><button type="button" onClick={closeAdd} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="FECHAR"><X className="h-4 w-4"/></button></div><div className="grid gap-3 md:grid-cols-2">{!current&&<input autoFocus value={listName} onChange={e=>setListName(e.target.value)} placeholder="NOME DA LISTA (OPCIONAL)" className="rounded-xl border border-input bg-background px-3 py-3 text-sm md:col-span-2"/>}<input autoFocus={Boolean(current)} value={name} onChange={e=>setName(e.target.value)} placeholder="PRODUTO *  EX.: ARROZ, SHAMPOO, FRANGO..." className="rounded-xl border border-input bg-background px-3 py-3 text-sm md:col-span-2"/><input value={qty} onChange={e=>setQty(e.target.value)} type="number" min="0.01" step="0.01" placeholder="QUANTIDADE" className="rounded-xl border border-input bg-background px-3 py-3 text-sm"/><input value={price} onChange={e=>setPrice(e.target.value)} placeholder="PREÇO POR UNIDADE" inputMode="decimal" className="rounded-xl border border-input bg-background px-3 py-3 text-sm"/><button type="button" disabled={saving} onClick={()=>void addItem()} className="gradient-primary rounded-xl px-4 py-3 text-[11px] text-primary-foreground disabled:opacity-60 md:col-span-2">{saving?"SALVANDO...":"ADICIONAR ITEM"}</button></div></div></div>}
  {tab==="mercado"?<><div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><StatCard label="LISTAS" value={String(lists.rows.length)} tone="info"/><StatCard label="ITENS" value={String(totalItems)} tone="primary"/><StatCard label="CONCLUÍDOS" value={String(doneItems)} tone="success"/></div><Panel title="SUAS LISTAS DE COMPRAS"><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{lists.rows.map(list=><button type="button" key={list.id} onClick={()=>{setActive(list.id);setTab("modo");}} className="rounded-2xl border border-border p-4 text-left transition hover:border-primary/50 hover:bg-secondary/30"><p className="label-caps text-sm">{list.name}</p><p className="mt-2 text-xs text-muted-foreground">{items.rows.filter(i=>i.list_id===list.id).length} ITENS · {items.rows.filter(i=>i.list_id===list.id&&i.done).length} CONCLUÍDOS</p></button>)}{!lists.rows.length&&<div className="md:col-span-2 lg:col-span-3 py-10 text-center text-sm text-muted-foreground">NENHUMA LISTA CADASTRADA.</div>}</div></Panel><Panel title="RESUMO DE COMPRAS"><p className="text-xs text-muted-foreground">TOTAL ESTIMADO DAS LISTAS ATIVAS</p><p className="mt-1 text-2xl font-semibold">{formatCurrency(totalEstimated)}</p></Panel></>:
  <><div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><StatCard label="ITENS" value={String(currentItems.length)} tone="info"/><StatCard label="NO CARRINHO" value={String(currentItems.filter(i=>i.done).length)} tone="success"/><StatCard label="TOTAL AO VIVO" value={formatCurrency(estimated)} tone="primary"/></div>{current?<><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-2">{lists.rows.map(l=><button type="button" key={l.id} onClick={()=>setActive(l.id)} className={cn("label-caps rounded-xl border px-4 py-2 text-[11px]",current?.id===l.id?"border-primary bg-primary/15 text-primary":"border-border text-muted-foreground")}>{l.name}</button>)}</div><button type="button" onClick={openAdd} className="gradient-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] text-primary-foreground"><Plus className="h-4 w-4"/> ADICIONAR PRODUTO</button></div><Panel title="ROTA DA COMPRA"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><ShoppingCart className="h-4 w-4"/> SETORES ORGANIZADOS NA ORDEM DO MERCADO</div><div className="space-y-3">{grouped.map(([sector,sectorItems])=>{const meta=sectorMeta(sector);const isOpen=expanded[sector]!==false;const sectorTotal=sectorItems.reduce((s,i)=>s+(Number(i.qty)||0)*(Number(i.price)||0),0);return <div key={sector} className="overflow-hidden rounded-2xl border border-border"><button type="button" onClick={()=>setExpanded(prev=>({...prev,[sector]:!isOpen}))} className="flex w-full items-center gap-3 p-4 text-left hover:bg-secondary/30"><span className="text-xl">{meta.icon}</span><span className="min-w-0 flex-1"><span className="label-caps block text-sm font-semibold">{sector}</span><span className="mt-1 block text-xs text-muted-foreground">{sectorItems.length} {sectorItems.length===1?"ITEM":"ITENS"} {sectorTotal>0?`· ${formatCurrency(sectorTotal)}`:""}</span></span><ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform",isOpen&&"rotate-180")}/></button>{isOpen&&<ul className="divide-y divide-border border-t border-border">{sectorItems.map(i=><li key={i.id} className={cn("p-3",i.done&&"bg-primary/5")}><div className="flex items-center gap-3"><button type="button" onClick={()=>void toggle(i)} aria-label={i.done?"DESMARCAR ITEM":"MARCAR ITEM COMO COMPRADO"} className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",i.done?"gradient-primary border-transparent text-primary-foreground":"border-border text-transparent")}><Check className="h-5 w-5"/></button><div className="min-w-0 flex-1"><p className={cn("label-caps text-sm",i.done&&"line-through opacity-60")}>{i.name}</p><div className="mt-1 flex flex-wrap gap-2"><Tag>{i.qty==null?"QTD. —":`${i.qty} ${i.unit}`}</Tag><Tag>{i.price==null?"SEM PREÇO":`${formatCurrency(Number(i.price))} / ${i.unit}`}</Tag></div></div><span className="text-sm font-semibold">{formatCurrency((Number(i.qty)||0)*(Number(i.price)||0))}</span></div><div className="mt-3 flex items-center justify-between pl-[52px]"><div className="flex items-center gap-2"><button type="button" onClick={()=>void changeQty(i,-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border"><Minus className="h-4 w-4"/></button><span className="w-8 text-center text-sm font-semibold">{i.qty??"—"}</span><button type="button" onClick={()=>void changeQty(i,1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border"><Plus className="h-4 w-4"/></button></div><span className="text-xs text-muted-foreground">TOTAL DO ITEM: {formatCurrency((Number(i.qty)||0)*(Number(i.price)||0))}</span></div></li>)}</ul>}</div>})}{!grouped.length&&<div className="py-10 text-center text-sm text-muted-foreground">NENHUM PRODUTO AINDA. ADICIONE O PRIMEIRO E O HARMONY VAI CLASSIFICÁ-LO AUTOMATICAMENTE.</div>}</div></Panel></>:<Panel title="LISTA DE COMPRAS"><div className="py-8 text-center text-sm text-muted-foreground">NENHUMA LISTA CADASTRADA. USE O + PARA CRIAR SUA LISTA E ADICIONAR O PRIMEIRO ITEM.</div></Panel>}</>}
 </div>;
}
