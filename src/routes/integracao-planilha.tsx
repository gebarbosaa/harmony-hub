import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Save, Trash2, CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/ui-kit";
import { useHouseholdId } from "@/hooks/use-household-data";
import { supabase } from "@/integrations/supabase/client";

type Category = { id: string; name: string; household_id: string };
type Payment = {
  id: string;
  name: string;
  kind: string;
  card_id: string | null;
  household_id: string;
};

type BulkRow = {
  key: string;
  type: "DESPESA" | "RECEITA";
  date: string;
  description: string;
  amount: string;
  category: string;
  paymentMethodId: string;
  responsible: string;
  installments: string;
};

const emptyRow = (): BulkRow => ({
  key: crypto.randomUUID(),
  type: "DESPESA",
  date: new Date().toISOString().slice(0, 10),
  description: "",
  amount: "",
  category: "",
  paymentMethodId: "",
  responsible: "AMBAS",
  installments: "1",
});

export const Route = createFileRoute("/integracao-planilha")({
  head: () => ({ meta: [{ title: "PLANILHA — HARMONY HUB" }] }),
  component: SpreadsheetPage,
});

function SpreadsheetPage() {
  const householdId = useHouseholdId();
  const [rows, setRows] = useState<BulkRow[]>([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function loadOptions() {
    if (!householdId || loaded) return;

    const [{ data: categoryData, error: categoryError }, { data: paymentData, error: paymentError }] =
      await Promise.all([
        supabase.from("categories").select("id,name,household_id").eq("household_id", householdId).order("name"),
        supabase
          .from("household_payment_methods")
          .select("id,name,kind,card_id,household_id")
          .eq("household_id", householdId)
          .order("name"),
      ]);

    if (categoryError) throw categoryError;
    if (paymentError) throw paymentError;

    setCategories((categoryData ?? []) as Category[]);
    setPayments((paymentData ?? []) as Payment[]);
    setLoaded(true);
  }

  useMemo(() => {
    void loadOptions().catch((error) => {
      toast.error(error instanceof Error ? error.message : "ERRO AO CARREGAR OPÇÕES");
    });
  }, [householdId, loaded]);

  function updateRow(key: string, field: keyof BulkRow, value: string) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  function addRows(amount = 5) {
    setRows((current) => [...current, ...Array.from({ length: amount }, emptyRow)]);
  }

  function duplicateRow(key: string) {
    setRows((current) => {
      const index = current.findIndex((row) => row.key === key);
      if (index < 0) return current;
      const copy = { ...current[index], key: crypto.randomUUID() };
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
  }

  function removeRow(key: string) {
    setRows((current) => current.length === 1 ? current : current.filter((row) => row.key !== key));
  }

  function parseAmount(value: string) {
    const text = value.replace(/R\$|\s/g, "").trim();
    if (!text) return 0;
    if (text.includes(",") && text.includes(".")) return Number(text.replace(/\./g, "").replace(",", "."));
    return Number(text.replace(",", "."));
  }

  async function saveRows() {
    if (!householdId) return toast.error("ENTRE NO SEU GRUPO PRIMEIRO");

    const validRows = rows.filter((row) => row.description.trim() && parseAmount(row.amount) > 0 && row.date);

    if (!validRows.length) return toast.error("PREENCHA PELO MENOS UM REGISTRO VÁLIDO");

    const invalid = validRows.find((row) => !row.category || !row.paymentMethodId);
    if (invalid) {
      return toast.error("PREENCHA CATEGORIA E FORMA DE PAGAMENTO EM TODOS OS REGISTROS");
    }

    setSaving(true);

    try {
      const payload = validRows.map((row) => {
        const payment = payments.find((item) => item.id === row.paymentMethodId);
        if (!payment) throw new Error("Forma de pagamento não encontrada.");

        const installmentCount = Math.max(1, Number.parseInt(row.installments || "1", 10) || 1);

        return {
          household_id: householdId,
          date: row.date,
          description: row.description.trim().toUpperCase(),
          amount: Math.abs(parseAmount(row.amount)),
          type: row.type,
          category: row.category,
          pay_method: payment.kind,
          payment_method_id: payment.id,
          payment_method_name: payment.name,
          card_id: payment.card_id,
          card_name: payment.card_id ? payment.name : null,
          responsible: row.responsible || "AMBAS",
          paid: true,
          ...(row.type === "DESPESA" && installmentCount > 1
            ? { installment_current: 1, installment_total: installmentCount }
            : {}),
        };
      });

      const { error } = await supabase.from("transactions").insert(payload);
      if (error) throw error;

      toast.success(validRows.length === 1 ? "REGISTRO SALVO" : `${validRows.length} REGISTROS SALVOS`);
      setRows([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ERRO AO SALVAR REGISTROS");
    } finally {
      setSaving(false);
    }
  }

  const filledCount = rows.filter((row) => row.description.trim() && parseAmount(row.amount) > 0).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="PLANILHA"
        subtitle="REGISTROS EM MASSA DIRETAMENTE NO HARMONY HUB."
      />

      <Panel title="LANÇAMENTOS EM MASSA">
        <div className="space-y-3">
          <div className="rounded-xl border bg-secondary/30 p-3 text-xs text-muted-foreground">
            Preencha várias linhas de uma vez. Nada é enviado para o Google Sheets: os registros são salvos diretamente no Supabase e aparecem normalmente no Harmony Hub.
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-[1250px] w-full text-left text-xs">
              <thead className="border-b bg-secondary/40">
                <tr>
                  <th className="p-3">TIPO</th>
                  <th className="p-3">DATA</th>
                  <th className="p-3 min-w-[220px]">DESCRIÇÃO</th>
                  <th className="p-3">VALOR</th>
                  <th className="p-3 min-w-[180px]">CATEGORIA</th>
                  <th className="p-3 min-w-[190px]">FORMA DE PAGAMENTO</th>
                  <th className="p-3">RESPONSÁVEL</th>
                  <th className="p-3">PARCELAS</th>
                  <th className="p-3">AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b last:border-0">
                    <td className="p-2">
                      <select value={row.type} onChange={(e) => updateRow(row.key, "type", e.target.value)} className="rounded-lg border bg-background p-2">
                        <option value="DESPESA">DESPESA</option>
                        <option value="RECEITA">RECEITA</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input type="date" value={row.date} onChange={(e) => updateRow(row.key, "date", e.target.value)} className="rounded-lg border p-2" />
                    </td>
                    <td className="p-2">
                      <input value={row.description} onChange={(e) => updateRow(row.key, "description", e.target.value)} placeholder="Ex.: MERCADO" className="w-full rounded-lg border p-2 uppercase" />
                    </td>
                    <td className="p-2">
                      <input value={row.amount} onChange={(e) => updateRow(row.key, "amount", e.target.value)} placeholder="0,00" inputMode="decimal" className="w-28 rounded-lg border p-2" />
                    </td>
                    <td className="p-2">
                      <select value={row.category} onChange={(e) => updateRow(row.key, "category", e.target.value)} className="w-full rounded-lg border bg-background p-2">
                        <option value="">SELECIONE</option>
                        {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <select value={row.paymentMethodId} onChange={(e) => updateRow(row.key, "paymentMethodId", e.target.value)} className="w-full rounded-lg border bg-background p-2">
                        <option value="">SELECIONE</option>
                        {payments.map((payment) => <option key={payment.id} value={payment.id}>{payment.name}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <select value={row.responsible} onChange={(e) => updateRow(row.key, "responsible", e.target.value)} className="rounded-lg border bg-background p-2">
                        <option value="AMBAS">AMBAS</option>
                        <option value="EU">EU</option>
                        <option value="OUTRO">OUTRO</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input value={row.installments} onChange={(e) => updateRow(row.key, "installments", e.target.value)} inputMode="numeric" className="w-20 rounded-lg border p-2" />
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => duplicateRow(row.key)} className="rounded-lg border p-2" title="Duplicar linha"><CopyPlus className="h-4 w-4" /></button>
                        <button type="button" onClick={() => removeRow(row.key)} className="rounded-lg border p-2" title="Remover linha"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {filledCount} registro(s) preenchido(s)
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => addRows()} className="flex items-center gap-2 rounded-xl border px-4 py-3 text-[11px] font-bold">
                <Plus className="h-4 w-4" /> ADICIONAR 5 LINHAS
              </button>
              <button type="button" onClick={() => void saveRows()} disabled={saving} className="gradient-primary flex items-center gap-2 rounded-xl px-4 py-3 text-[11px] font-bold text-primary-foreground disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? "SALVANDO..." : "SALVAR REGISTROS"}
              </button>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
