import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Upload, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui-kit";
import { toast } from "sonner";

export const Route = createFileRoute("/importacao")({ component: ImportacaoPage });

type Row = { date: string; description: string; amount: number; type: "DESPESA" | "RECEITA"; category: string; payment: string; installment?: string };

const normalize = (value: unknown) => String(value ?? "").trim();
const money = (value: unknown) => {
  const raw = normalize(value).replace(/R\$\s?/gi, "").replace(/\./g, "").replace(",", ".");
  const n = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? Math.abs(n) : 0;
};

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const separator = lines[0].includes(";") ? ";" : ",";
  const cells = (line: string) => line.split(separator).map(v => v.replace(/^\"|\"$/g, "").trim());
  const headers = cells(lines[0]).map(v => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  const find = (...names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));
  const date = find("data", "date");
  const description = find("descricao", "descri", "estabelecimento", "merchant", "historico");
  const amount = find("valor", "amount", "value", "preco");
  const type = find("tipo", "type", "natureza");
  const payment = find("pagamento", "forma", "metodo", "cartao", "payment");
  const installment = find("parcela", "installment");
  return lines.slice(1).map(line => {
    const c = cells(line);
    const rawAmount = normalize(c[amount]);
    const negative = rawAmount.includes("-");
    const rawType = normalize(c[type]).toLowerCase();
    return {
      date: normalize(c[date]), description: normalize(c[description]), amount: money(rawAmount),
      type: negative || rawType.includes("desp") || rawType.includes("debit") ? "DESPESA" : "RECEITA",
      category: "OUTROS", payment: normalize(c[payment]) || "A DEFINIR", installment: normalize(c[installment]) || undefined,
    };
  }).filter(r => r.description || r.amount);
}

function ImportacaoPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [saved, setSaved] = useState(false);

  const total = useMemo(() => rows.reduce((sum, r) => sum + (r.type === "DESPESA" ? -r.amount : r.amount), 0), [rows]);

  async function handleFile(file?: File) {
    if (!file) return;
    setSaved(false); setProcessing(true); setFileName(file.name);
    try {
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext === "csv" || file.type.includes("csv") || file.type.startsWith("text/")) {
        setRows(parseCsv(await file.text()));
      } else {
        // XLS/XLSX/PDF are intentionally identified here; parsing them belongs to the import worker.
        // Keeping the upload flow explicit prevents silently creating wrong financial records.
        setRows([]);
        toast.info(`${ext?.toUpperCase()} selecionado. O arquivo foi recebido; faça a conferência antes de importar.`);
      }
    } catch {
      toast.error("Não foi possível ler o arquivo."); setRows([]);
    } finally { setProcessing(false); }
  }

  function downloadTemplate() {
    const csv = "Data;Descrição;Valor;Tipo;Categoria;Forma de pagamento;Parcela\n08/09/2026;Exemplo;25,90;DESPESA;ALIMENTAÇÃO;CARTÃO;01/01\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "modelo-importacao-harmony-hub.csv"; a.click(); URL.revokeObjectURL(url);
  }

  function confirmImport() {
    if (!rows.length) return toast.error("Nenhum lançamento válido para importar.");
    // The preview is deliberately separate from persistence. This is the safe point where
    // the financial ledger should be connected to the existing transaction creation service.
    setSaved(true);
    toast.success(`${rows.length} lançamento(s) conferido(s).`);
  }

  return <div className="space-y-5">
    <PageHeader title="IMPORTAÇÃO" subtitle="ADICIONE LANÇAMENTOS A PARTIR DE ARQUIVOS E CONFIRA ANTES DE SALVAR." />

    <Panel>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/20 p-8 text-center hover:border-primary">
          <Upload className="h-7 w-7 text-primary" />
          <div><p className="label-caps text-xs">SELECIONAR ARQUIVO</p><p className="mt-1 text-xs text-muted-foreground">PDF, XLS, XLSX ou CSV</p></div>
          <input className="hidden" type="file" accept=".pdf,.xls,.xlsx,.csv" onChange={e => handleFile(e.target.files?.[0])} />
        </label>
        <button type="button" onClick={downloadTemplate} className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-secondary/20 p-8 text-left hover:border-primary">
          <Download className="h-6 w-6 text-primary" /><span><span className="label-caps block text-xs">BAIXAR MODELO</span><span className="text-xs text-muted-foreground">Planilha CSV compatível com a importação</span></span>
        </button>
      </div>
    </Panel>

    {fileName && <Panel>
      <div className="flex items-center gap-3"><FileSpreadsheet className="h-5 w-5 text-primary"/><div><p className="label-caps text-xs">ARQUIVO</p><p className="text-sm">{fileName}</p></div>{processing && <span className="ml-auto text-xs text-muted-foreground">LENDO...</span>}</div>
    </Panel>}

    {rows.length > 0 && <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div><p className="label-caps text-xs">PRÉVIA DOS LANÇAMENTOS</p><p className="text-xs text-muted-foreground">{rows.length} registros · saldo líquido R$ {total.toFixed(2).replace(".", ",")}</p></div>
        <button type="button" onClick={confirmImport} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"><CheckCircle2 className="h-4 w-4"/>CONFIRMAR IMPORTAÇÃO</button>
      </div>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-border text-muted-foreground"><th className="p-2">DATA</th><th className="p-2">DESCRIÇÃO</th><th className="p-2">VALOR</th><th className="p-2">TIPO</th><th className="p-2">PARCELA</th></tr></thead><tbody>{rows.slice(0, 100).map((r, i) => <tr key={`${r.date}-${i}`} className="border-b border-border/50"><td className="p-2">{r.date}</td><td className="p-2">{r.description || "—"}</td><td className="p-2">R$ {r.amount.toFixed(2).replace(".", ",")}</td><td className="p-2">{r.type}</td><td className="p-2">{r.installment || "—"}</td></tr>)}</tbody></table></div>
      {rows.length > 100 && <p className="mt-2 text-[11px] text-muted-foreground">Mostrando os primeiros 100 registros na prévia. Todos os {rows.length} foram lidos.</p>}
      {saved && <p className="mt-3 flex items-center gap-2 text-xs text-primary"><CheckCircle2 className="h-4 w-4"/>Prévia confirmada. A persistência deve ser conectada ao ledger financeiro antes de gravar no banco.</p>}
    </Panel>}

    {!rows.length && fileName && !processing && <Panel><div className="flex gap-3"><AlertCircle className="h-5 w-5 shrink-0 text-primary"/><div><p className="label-caps text-xs">CONFERÊNCIA NECESSÁRIA</p><p className="mt-1 text-xs text-muted-foreground">PDF/XLS/XLSX foi selecionado, mas esta etapa não grava nada automaticamente. Isso evita lançar valores errados no financeiro. O próximo passo é conectar o parser ao serviço de lançamentos do Harmony Hub.</p></div></div></Panel>}
    <p className="flex items-center gap-2 text-[11px] text-muted-foreground"><FileText className="h-4 w-4"/>Importação nunca deve duplicar lançamentos existentes; a confirmação deve ocorrer somente após a conferência.</p>
  </div>;
}
