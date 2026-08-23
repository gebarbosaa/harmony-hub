import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/finance";
import { useHouseholdTable } from "@/hooks/use-household-data";
import { useHouseholdPaymentMethods } from "@/hooks/use-household-payment-methods";

export const Route = createFileRoute("/assinatura")({
  head: () => ({ meta: [{ title: "NOVA ASSINATURA — MULTICAP" }] }),
  component: SubscriptionPage,
});

type FixedCost = { id: string; name: string; amount: number; category: string; due_day: number; months: boolean[]; responsible: string; pay_method: string; household_id: string };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="label-caps mb-1.5 block text-[9px] font-semibold tracking-[0.12em] text-muted-foreground">{label}</span>{children}</label>;
}

function SubscriptionPage() {
  const { insert } = useHouseholdTable<FixedCost>("fixed_costs", "id,name,amount,category,due_day,months,responsible,pay_method,household_id");
  const payments = useHouseholdPaymentMethods();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billing, setBilling] = useState<"MENSAL" | "ANUAL">("MENSAL");
  const [day, setDay] = useState("5");
  const [category, setCategory] = useState("ASSINATURAS");
  const [payMethod, setPayMethod] = useState("");
  const [responsible, setResponsible] = useState("AMBAS");

  useEffect(() => {
    if (!payMethod && payments.options[0]) setPayMethod(payments.options[0].value);
  }, [payMethod, payments.options]);

  async function save() {
    const value = Number(amount.replace(",", "."));
    if (!name.trim() || !value || value <= 0) return toast.error("PREENCHA NOME E VALOR");
    if (!payMethod) return toast.error("CADASTRE UMA FORMA DE PAGAMENTO EM CONFIGURAÇÕES");
    const dueDay = Math.max(1, Math.min(31, Number(day) || 5));
    const months = billing === "MENSAL" ? Array(12).fill(true) : Array(12).fill(false);
    try {
      await insert({ name: name.trim().toUpperCase(), amount: value, category, due_day: dueDay, months, responsible, pay_method: payMethod });
      setName(""); setAmount("");
      toast.success("ASSINATURA SALVA");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "NÃO FOI POSSÍVEL SALVAR A ASSINATURA");
    }
  }

  return <div className="space-y-5">
    <PageHeader title="NOVA ASSINATURA" subtitle="CADASTRE UMA ASSINATURA RECORRENTE E MANTENHA O PAGAMENTO ORGANIZADO." />
    <Panel title="FORMULÁRIO DE ASSINATURA">
      <div className="grid gap-4 md:grid-cols-6">
        <Field label="NOME DA ASSINATURA"><input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: NETFLIX" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></Field>
        <Field label="VALOR"><input value={amount} onChange={e => setAmount(e.target.value)} placeholder="R$ 0,00" inputMode="decimal" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></Field>
        <Field label="COBRANÇA"><select value={billing} onChange={e => setBilling(e.target.value as "MENSAL" | "ANUAL")} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option value="MENSAL">MENSAL</option><option value="ANUAL">ANUAL</option></select></Field>
        <Field label="DIA DA COBRANÇA"><input value={day} onChange={e => setDay(e.target.value)} type="number" min="1" max="31" placeholder="Ex.: 10" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></Field>
        <Field label="FORMA DE PAGAMENTO"><select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option value="">SELECIONE</option>{payments.options.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></Field>
        <Field label="RESPONSÁVEL"><select value={responsible} onChange={e => setResponsible(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"><option value="AMBAS">AMBOS / COMPARTILHADO</option><option value="MARIA">MARIA</option><option value="LUCAS">LUCAS</option></select></Field>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">VALOR CADASTRADO: <strong className="text-foreground">{amount ? formatCurrency(Number(amount.replace(",", ".")) || 0) : "R$ 0,00"}</strong></p><button type="button" onClick={() => void save()} className="gradient-primary w-fit rounded-xl px-4 py-2 text-[10px] font-semibold text-primary-foreground">SALVAR ASSINATURA</button></div>
    </Panel>
  </div>;
}
