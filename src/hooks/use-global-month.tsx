import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const START_MONTH = "2026-07";
const END_MONTH = "2027-12";

function currentMonth() { const now = new Date(); const value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; return value < START_MONTH ? START_MONTH : value > END_MONTH ? END_MONTH : value; }
type GlobalMonthContextValue = { month: string; setMonth: (month: string) => void };
const GlobalMonthContext = createContext<GlobalMonthContextValue | null>(null);
export function GlobalMonthProvider({ children }: { children: ReactNode }) { const [month,setMonth]=useState(()=>currentMonth()); return <GlobalMonthContext.Provider value={useMemo(()=>({month,setMonth}),[month])}>{children}</GlobalMonthContext.Provider>; }
export function useGlobalMonth(scope="global") {
 const context=useContext(GlobalMonthContext);
 if(!context) throw new Error("useGlobalMonth must be used inside GlobalMonthProvider");
 const storageKey=`harmony-month-${scope}`;
 const [month,setMonthState]=useState(()=>{if(typeof window==="undefined")return currentMonth();try{const saved=localStorage.getItem(storageKey)||currentMonth();return saved>=START_MONTH&&saved<=END_MONTH?saved:currentMonth();}catch{return currentMonth();}});
 return { month, setMonth:(next:string)=>{if(next<START_MONTH||next>END_MONTH)return;setMonthState(next);try{if(typeof window!=="undefined")localStorage.setItem(storageKey,next);}catch{/* storage may be unavailable */}} };
}
export function formatGlobalMonth(month:string) { const parts=month.split("-"); const year=Number(parts[0]??0); const monthNumber=Number(parts[1]??1); return new Date(year,monthNumber-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}).toUpperCase(); }
export function MonthSelector({ month, setMonth, className }: { month:string; setMonth:(month:string)=>void; className?:string }) {
  const [y,m]=month.split("-");
  const startYear=Number(START_MONTH.split("-")[0]); const startMonthNum=Number(START_MONTH.split("-")[1]);
  const endYear=Number(END_MONTH.split("-")[0]); const endMonthNum=Number(END_MONTH.split("-")[1]);
  const years=Array.from({length:endYear-startYear+1},(_,i)=>startYear+i);
  const monthNames=Array.from({length:12},(_,i)=>new Date(2000,i,1).toLocaleDateString("pt-BR",{month:"long"}).toUpperCase());
  const yearNum=Number(y);
  const minMonth=yearNum===startYear?startMonthNum:1;
  const maxMonth=yearNum===endYear?endMonthNum:12;
  function changeMonth(newMonthNum:number){ setMonth(`${y}-${String(newMonthNum).padStart(2,"0")}`); }
  function changeYear(newYear:number){ let mm=Number(m); const lo=newYear===startYear?startMonthNum:1; const hi=newYear===endYear?endMonthNum:12; if(mm<lo)mm=lo; if(mm>hi)mm=hi; setMonth(`${newYear}-${String(mm).padStart(2,"0")}`); }
  return <div className={cn("flex gap-2",className)}>
    <select aria-label="SELECIONAR MÊS" value={m} onChange={e=>changeMonth(Number(e.target.value))} className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold uppercase">
      {Array.from({length:maxMonth-minMonth+1},(_,i)=>minMonth+i).map(mm=><option key={mm} value={String(mm).padStart(2,"0")}>{monthNames[mm-1]}</option>)}
    </select>
    <select aria-label="SELECIONAR ANO" value={y} onChange={e=>changeYear(Number(e.target.value))} className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold uppercase">
      {years.map(yy=><option key={yy} value={yy}>{yy}</option>)}
    </select>
  </div>;
}
