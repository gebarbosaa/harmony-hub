import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

type GlobalMonthContextValue = {
  month: string;
  setMonth: (month: string) => void;
};

const GlobalMonthContext = createContext<GlobalMonthContextValue | null>(null);

export function GlobalMonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(() => {
    if (typeof window === "undefined") return currentMonth();
    return localStorage.getItem("harmony-global-month") || currentMonth();
  });

  const value = useMemo(() => ({
    month,
    setMonth: (next: string) => {
      setMonth(next);
      if (typeof window !== "undefined") localStorage.setItem("harmony-global-month", next);
    },
  }), [month]);

  return <GlobalMonthContext.Provider value={value}>{children}</GlobalMonthContext.Provider>;
}

export function useGlobalMonth() {
  const context = useContext(GlobalMonthContext);
  if (!context) throw new Error("useGlobalMonth must be used inside GlobalMonthProvider");
  return context;
}

export function formatGlobalMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).toUpperCase();
}
