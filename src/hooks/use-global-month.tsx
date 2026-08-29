import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const START_MONTH = "2026-07";
const END_MONTH = "2027-12";

function currentMonth() { const now = new Date(); const value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; return value < START_MONTH ? START_MONTH : value > END_MONTH ? END_MONTH : value; }
type GlobalMonthContextValue = { month: string; setMonth: (month: string) => void };
const GlobalMonthContext = createContext<GlobalMonthContextValue | null>(null);
export function GlobalMonthProvider({ children }: { children: ReactNode }) { const [month,setMonth]=useState(()=>currentMonth()); return <GlobalMonthContext.Provider value={useMemo(()=>({month,setMonth}),[month])}>{children}</GlobalMonthContext.Provider>; }
export function useGlobalMonth(scope="global") { const context=useContext(GlobalMonthContext); if(!context) throw new Error("useGlobalMonth must be used inside GlobalMonthProvider"); const storageKey=`harmony-month-${scope}`; const [month,setMonthState]=useState(()=>{if(typeof window==="undefined")return currentMonth();const saved=localStorage.getItem(storageKey)||currentMonth();return saved>=START_MONTH&&saved<=END_MONTH?saved:currentMonth();}); return { month, setMonth:(next:string)=>{if(next<START_MONTH||next>END_MONTH)return;setMonthState(next);if(typeof window!=="undefined")localStorage.setItem(storageKey,next);} }; }
export function formatGlobalMonth(month:string) { const parts=month.split("-"); const year=Number(parts[0]??0); const monthNumber=Number(parts[1]??1); return new Date(year,monthNumber-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}).toUpperCase(); }
export function MonthSelector({ month, setMonth, className }: { month:string; setMonth:(month:string)=>void; className?:string }) { const options=Array.from({length:18},(_,i)=>{const d=new Date(2026,6+i,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;}); return <select aria-label="SELECIONAR MÊS" value={month} onChange={e=>setMonth(e.target.value)} className={cn("rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold uppercase",className)}>{options.map(v=><option key={v} value={v}>{formatGlobalMonth(v)}</option>)}</select>; }
