import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Upload, Download, Search, CheckCircle2, RefreshCw, Copy, X, FileText } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui-kit";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/importacao")({ component: ImportacaoPage });

type Row = {
  date: string;
  description: string;
  amount: number;
  totalAmount: number;
  category: string;
  payment: string;
  installmentCurrent: number;
  installmentTotal: number;
};
type Decision = "keep" | "replace" | "import";

const text = (v: unknown) => String(v ?? "").trim();
const normalize = (v: unknown) => text(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function dateValue(v: unknown) {
  const s = text(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})[/.\-](\d{2})[/.\-](\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

function money(v: unknown) {
  let s = text(v).replace(/R\$\s?/gi, "").replace(/\s/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function parseInstallment(v: unknown) {
  const s = text(v).replace(/\s/g, "");
  const match = s.match(/^(\d+)(?:[/xX](\d+))?$/);
  if (!match) return { current: 1, total: 1 };
  const first = Number(match[1]);
  const second = match[2] ? Number(match[2]) : null;
  if (second !== null) return { current: Math.min(Math.max(first, 1), Math.max(second, 1)), total: Math.max(second, 1) };
  return { current: 1, total: Math.max(first, 1) };
}

function parseCsv(textValue: string): Row[] {
  const input = textValue.replace(/^\uFEFF/, "");
  const lines: string[] = [];
  let line = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') { line += '"'; i++; }
      else quoted = !quoted;
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && input[i + 1] === "\n") i++;
      if (line.trim()) lines.push(line);
      line = "";
    } else line += c;
  }
  if (line.trim()) lines.push(line);
  if (!lines.length) return [];

  const delimiter = lines[0].split(";").length >= lines[0].split(",").length ? ";" : ",";
  const cells = (value: string) => {
    const out: string[] = [];
    let cell = "";
    let q = false;
    for (let i = 0; i < value.length; i++) {
      const c = value[i];
      if (c === '"') {
        if (q && value[i + 1] === '"') { cell += '"'; i++; }
        else q = !q;
      } else if (c === delimiter && !q) { out.push(cell.trim()); cell = ""; }
      else cell += c;
    }
    out.push(cell.trim());
    return out;
  };

  const headers = cells(lines[0]).map(normalize);
  const index = (...names: string[]) => headers.findIndex(h => names.some(n => h === n || h.includes(n)));
  const d = index("data", "date");
  const desc = index("descricao", "estabelecimento", "merchant", "historico");
  const total = index("valor total", "total");
  const value = index("valor", "amount", "value", "preco");
  const inst = index("parcelas", "parcela", "installment");
  const cat = index("categoria", "category");
  const pay = index("pagamento", "forma de pagamento", "metodo", "cartao", "payment");
  if (d < 0 || desc < 0 || (total < 0 && value < 0) || inst < 0) {
    throw new Error("CSV inválido. Use as colunas: Data, Descrição, Valor Total e Parcelas.");
  }

  return lines.slice(1).map((lineValue) => {
    const c = cells(lineValue);
    const totalAmount = money(c[total >= 0 ? total : value]);
    const installment = parseInstallment(c[inst]);
    const amount = installment.total > 0 ? Number((totalAmount / installment.total).toFixed(2)) : totalAmount;
    return {
      date: dateValue(c[d]),
      description: text(c[desc]),
      amount,
      totalAmount,
      category: cat >= 0 ? text(c[cat]) || "OUTROS" : "OUTROS",
      payment: pay >= 0 ? text(c[pay]) || "PIX" : "PIX",
      installmentCurrent: installment.current,
      installmentTotal: installment.total,
    };
  }).filter(r => r.date && r.description && r.totalAmount > 0 && r.installmentTotal >= 1);
}

const key = (r: Row) => `${r.date}|${normalize(r.description)}|${r.totalAmount.toFixed(2)}|${r.installmentCurrent}/${r.installmentTotal}`;

// Mesma lógica de reconhecimento usada no backend (import-transactions-v3), para não perder
// débito/dinheiro/alimentação/transferência/boleto — antes isso tudo virava "PIX".
function payMethodKind(v: string): "DEBITO" | "PIX" | "DINHEIRO" | "CREDITO" | "ALIMENTACAO" | "TRANSFERENCIA" | "BOLETO" {
  const s = normalize(v);
  if (s.includes("cred") || s.includes("cartao")) return "CREDITO";
  if (s.includes("deb")) return "DEBITO";
  if (s.includes("pix")) return "PIX";
  if (s.includes("dinheiro") || s.includes("especie")) return "DINHEIRO";
  if (s.includes("aliment") || s.includes("refeic")) return "ALIMENTACAO";
  if (s.includes("transfer")) return "TRANSFERENCIA";
  if (s.includes("boleto")) return "BOLETO";
  return "PIX";
}

// PDFs de banco não podem ser lidos como arquivo binário no navegador sem uma lib pesada de PDF.
// Em vez disso, o usuário abre o PDF, seleciona todo o texto do extrato (Ctrl+A/Cmd+A) e cola aqui.
// Cada linha de lançamento normalmente vem como "DD/MM/AAAA  DESCRIÇÃO  VALOR" (extrato) ou
// "DESCRIÇÃO  DD/MM  VALOR" (fatura de cartão) — tentamos os dois formatos.
function parsePastedStatement(raw: string): Row[] {
  const currentYear = new Date().getFullYear();
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: Row[] = [];

  const fullDateAtStart = /^(\d{2})[/.](\d{2})[/.](\d{4})\s+(.+?)\s+(-?R?\$?\s?-?[\d.,]+)\s*$/;
  const fullDateAtEnd = /^(.+?)\s+(\d{2})[/.](\d{2})[/.](\d{4})\s+(-?R?\$?\s?-?[\d.,]+)\s*$/;
  const shortDateAtEnd = /^(.+?)\s+(\d{2})[/.](\d{2})\s+(-?R?\$?\s?-?[\d.,]+)\s*$/;
  // Parcela dentro da própria descrição: "03/06", "3/6", "PARC 3/6", "(3/6)"
  const installmentInLine = /(?:parc(?:ela)?s?\.?\s*)?\b(\d{1,2})\s*[\/xX]\s*(\d{1,2})\b/;

  // A partir da descrição bruta e do valor lido na linha, monta o Row já com parcela e
  // forma de pagamento reconhecidas — antes isso vinha sempre fixo como PIX 1/1.
  function buildRow(date: string, rawDescription: string, rawAmount: string): Row {
    let description = rawDescription.trim();
    let installmentCurrent = 1;
    let installmentTotal = 1;
    const instMatch = description.match(installmentInLine);
    if (instMatch) {
      const current = Number(instMatch[1]);
      const totalInst = Number(instMatch[2]);
      if (totalInst >= 1 && current >= 1 && current <= totalInst) {
        installmentCurrent = current;
        installmentTotal = totalInst;
        description = description.replace(instMatch[0], "").replace(/\s{2,}/g, " ").trim();
      }
    }
    const lineAmount = money(rawAmount);
    // O valor lido na linha é o da parcela (é o que aparece em fatura/extrato); o total da
    // compra é esse valor vezes o número de parcelas.
    const amount = lineAmount;
    const totalAmount = installmentTotal > 1 ? Number((lineAmount * installmentTotal).toFixed(2)) : lineAmount;
    // Compra parcelada quase sempre é no cartão de crédito; senão, tenta reconhecer a forma
    // de pagamento pelo texto da linha (PIX, débito, boleto...), com PIX como último recurso.
    const payment = installmentTotal > 1 ? "CRÉDITO" : (payMethodKind(description) !== "PIX" ? description : "PIX");
    return { date, description, amount, totalAmount, category: "OUTROS", payment, installmentCurrent, installmentTotal };
  }

  for (const line of lines) {
    let m = line.match(fullDateAtStart);
    if (m) { out.push(buildRow(`${m[3]}-${m[2]}-${m[1]}`, m[4], m[5])); continue; }
    m = line.match(fullDateAtEnd);
    if (m) { out.push(buildRow(`${m[4]}-${m[3]}-${m[2]}`, m[1], m[5])); continue; }
    m = line.match(shortDateAtEnd);
    if (m) { out.push(buildRow(`${currentYear}-${m[3]}-${m[2]}`, m[1], m[4])); continue; }
  }
  return out.filter((r) => r.date && r.description && r.totalAmount > 0);
}

function ImportacaoPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [analysisDone, setAnalysisDone] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [duplicates, setDuplicates] = useState<number[]>([]);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [existingIds, setExistingIds] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [pasteMode, setPasteMode] = useState(false);

  function processPastedText() {
    reset();
    try {
      const parsed = parsePastedStatement(pastedText);
      if (!parsed.length) throw new Error("Não encontrei lançamentos reconhecíveis no texto colado. Confira se cada linha tem data e valor.");
      setFileName("TEXTO COLADO (PDF)");
      setRows(parsed);
      toast.success(`${parsed.length} lançamento(s) reconhecido(s) no texto colado. Confira a revisão antes de confirmar.`);
      void analyze(parsed);
    } catch (e) {
      setRows([]);
      toast.error(e instanceof Error ? e.message : "Não foi possível interpretar o texto colado.");
    }
  }

  const total = useMemo(() => rows.reduce((sum, r) => sum + r.totalAmount, 0), [rows]);
  const totalInstallments = useMemo(() => rows.filter(r => r.installmentTotal > 1).reduce((sum, r) => sum + r.installmentTotal, 0), [rows]);
  const reset = () => {
    setAnalysisDone(false);
    setAnalysisError("");
    setDuplicates([]);
    setDecisions({});
    setExistingIds({});
    setImported(false);
  };

  async function selectFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    reset();
    try {
      if (file.name.toLowerCase().split(".").pop() !== "csv") {
        setRows([]);
        toast.info("Este importador aceita CSV no formato Data;Descrição;Valor Total;Parcelas.");
        return;
      }
      const parsed = parseCsv(await file.text());
      if (!parsed.length) throw new Error("Nenhum lançamento válido foi encontrado no arquivo.");
      setRows(parsed);
      toast.success(`${parsed.length} lançamento(s) carregado(s). A revisão já está disponível.`);
      void analyze(parsed);
    } catch (e) {
      setRows([]);
      toast.error(e instanceof Error ? e.message : "Não foi possível ler o CSV.");
    }
  }

  async function analyze(sourceRows = rows) {
    if (!sourceRows.length) return;
    setAnalysisError("");
    setBusy(true);
    try {
      const groups = new Map<string, number[]>();
      sourceRows.forEach((r, i) => groups.set(key(r), [...(groups.get(key(r)) ?? []), i]));
      const found = Array.from(groups.values()).filter(g => g.length > 1).flat();
      const decisionsNext: Record<number, Decision> = {};
      found.forEach(i => decisionsNext[i] = "keep");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Faça login novamente para verificar duplicidades existentes.");
      const { data: profile, error: profileError } = await supabase.from("profiles").select("household_id").eq("id", user.id).maybeSingle();
      if (profileError) throw profileError;
      const householdId = profile?.household_id;
      if (!householdId) throw new Error("Não foi possível identificar seu grupo.");

      const dates = sourceRows.map(r => r.date).sort();
      const existing: Record<number, string> = {};
      const { data, error } = await supabase.from("transactions")
        .select("id,date,description,amount,installment_current,installment_total")
        .eq("household_id", householdId)
        .gte("date", dates[0])
        .lte("date", dates[dates.length - 1])
        .limit(5000);
      if (error) throw error;

      const map = new Map<string, string>();
      (data ?? []).forEach((r: any) => {
        const count = Number(r.installment_total ?? 1) || 1;
        const current = Number(r.installment_current ?? 1) || 1;
        // amount aqui já é o valor da parcela; o valor total é amount * installment_total (mesma regra usada ao montar as linhas importadas)
        const totalAmount = Math.abs(Number(r.amount)) * count;
        map.set(key({ date: r.date, description: r.description ?? "", amount: Math.abs(Number(r.amount)), totalAmount, category: "", payment: "", installmentCurrent: current, installmentTotal: count }), r.id);
      });
      sourceRows.forEach((r, i) => {
        const id = map.get(key(r));
        if (id) { existing[i] = id; decisionsNext[i] = "keep"; }
      });

      setDuplicates(Array.from(new Set([...found, ...Object.keys(existing).map(Number)])).sort((a, b) => a - b));
      setDecisions(decisionsNext);
      setExistingIds(existing);
      setAnalysisDone(true);
      toast.success(found.length || Object.keys(existing).length ? "Revisão concluída: há possíveis duplicidades." : "Revisão concluída: nenhuma duplicidade encontrada.");
    } catch (e) {
      setAnalysisDone(false);
      setAnalysisError(e instanceof Error ? e.message : "Não foi possível consultar duplicidades.");
      toast.info("A prévia continua disponível. A importação pode ser confirmada mesmo sem a consulta de duplicidades.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!rows.length) return toast.error("Nenhum lançamento para importar.");
    if (duplicates.some(i => !decisions[i])) return toast.error("Escolha uma ação para cada duplicidade.");
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Faça login novamente.");
      const { data: profile, error } = await supabase.from("profiles").select("household_id").eq("id", user.id).maybeSingle();
      if (error) throw error;
      const householdId = profile?.household_id;
      if (!householdId) throw new Error("Não foi possível identificar seu grupo.");

      const batchId = crypto.randomUUID();
      const payload = rows.map((r, i) => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        total_amount: r.totalAmount,
        type: "DESPESA",
        category: r.category,
        pay_method: payMethodKind(r.payment),
        payment_method_name: r.payment || "PIX",
        responsible: "AMBAS",
        installment_current: r.installmentCurrent,
        installment_total: r.installmentTotal,
        paid: false,
        source_type: "IMPORT",
        source_index: i + 1,
        source_total: rows.length,
        source_period: null,
        batch_id: batchId,
        household_id: householdId,
        action: decisions[i] ?? "import",
        existing_id: existingIds[i] ?? null,
      })).filter((_, i) => !duplicates.includes(i) || decisions[i] !== "keep");

      if (!payload.length) {
        setImported(true);
        toast.success("Nada novo para importar: todos os itens foram mantidos como existentes.");
        return;
      }

      const { data, error: invokeError } = await supabase.functions.invoke("import-transactions-v3", {
        body: { household_id: householdId, batch_id: batchId, rows: payload },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      setImported(true);
      const importedCount = Number(data?.imported ?? 0);
      const createdInstallments = Number(data?.installmentsCreated ?? 0);
      toast.success(`${importedCount || payload.length} lançamento(s) processado(s)${createdInstallments ? ` · ${createdInstallments} parcelamento(s) sincronizado(s)` : ""}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível confirmar a importação.");
    } finally {
      setBusy(false);
    }
  }

  function template() {
    const csv = "Data;Descrição;Valor Total;Parcelas;Pagamento\n20/08/2026;Exemplo de compra parcelada;607,86;1/6;Cartão\n20/08/2026;Exemplo de compra à vista;49,90;1;PIX\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "modelo-importacao-harmony-hub.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="space-y-5">
    <PageHeader title="IMPORTAÇÃO" subtitle="CARREGUE, REVISE E SÓ ENTÃO CONFIRME OS LANÇAMENTOS." />

    <Panel>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/20 p-8 text-center hover:border-primary">
          <Upload className="h-7 w-7 text-primary" />
          <p className="label-caps text-xs">SELECIONAR CSV</p>
          <p className="text-xs text-muted-foreground">Data · Descrição · Valor Total · Parcelas · Pagamento</p>
          <input className="hidden" type="file" accept=".csv,text/csv" onChange={e => selectFile(e.target.files?.[0])} />
        </label>
        <button type="button" onClick={() => setPasteMode((v) => !v)} className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center hover:border-primary ${pasteMode ? "border-primary bg-secondary/30" : "border-border bg-secondary/20"}`}>
          <FileText className="h-7 w-7 text-primary" />
          <p className="label-caps text-xs">COLAR PDF (EXTRATO/FATURA)</p>
          <p className="text-xs text-muted-foreground">Abra o PDF, selecione tudo (Ctrl+A) e cole o texto aqui</p>
        </button>
        <button type="button" onClick={template} className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-secondary/20 p-8 text-left hover:border-primary">
          <Download className="h-6 w-6 text-primary" />
          <span><span className="label-caps block text-xs">BAIXAR MODELO</span><span className="text-xs text-muted-foreground">Parcelados e compras à vista</span></span>
        </button>
      </div>
      {pasteMode && <div className="mt-4 space-y-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">Cole abaixo o texto copiado do PDF (extrato bancário ou fatura de cartão). Reconhecemos linhas no formato <b>DD/MM/AAAA descrição valor</b> ou <b>descrição DD/MM valor</b>.</p>
        <textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)} rows={8} placeholder="Cole aqui o texto do PDF..." className="w-full rounded-xl border p-3 font-mono text-xs" />
        <button type="button" disabled={!pastedText.trim()} onClick={processPastedText} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground disabled:opacity-50">
          <Search className="h-4 w-4" />PROCESSAR TEXTO COLADO
        </button>
      </div>}
    </Panel>

    {fileName && <Panel>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{fileName}</span>
        <button type="button" aria-label="Remover arquivo" onClick={() => { setRows([]); setFileName(""); reset(); }}><X className="h-4 w-4" /></button>
      </div>
    </Panel>}

    {rows.length > 0 && !imported && <Panel>
      <div className="flex flex-col gap-4 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-caps text-xs">1. REVISÃO DA IMPORTAÇÃO</p>
            <p className="mt-1 text-sm text-muted-foreground">Confira os dados abaixo antes de gravar qualquer lançamento.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => analyze()} className="flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold">
              <Search className="h-4 w-4" />{busy ? "ANALISANDO..." : "REANALISAR DUPLICIDADES"}
            </button>
            <button type="button" disabled={busy} onClick={confirm} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              <CheckCircle2 className="h-4 w-4" />{busy ? "PROCESSANDO..." : "2. CONFIRMAR IMPORTAÇÃO"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border p-3"><p className="text-[10px] text-muted-foreground">LANÇAMENTOS</p><p className="mt-1 text-lg font-bold">{rows.length}</p></div>
          <div className="rounded-xl border p-3"><p className="text-[10px] text-muted-foreground">VALOR TOTAL</p><p className="mt-1 text-lg font-bold">{brl(total)}</p></div>
          <div className="rounded-xl border p-3"><p className="text-[10px] text-muted-foreground">PARCELAS</p><p className="mt-1 text-lg font-bold">{totalInstallments || "—"}</p></div>
          <div className="rounded-xl border p-3"><p className="text-[10px] text-muted-foreground">STATUS</p><p className="mt-1 text-sm font-bold">{analysisDone ? (duplicates.length ? `${duplicates.length} DUPLICADOS` : "SEM DUPLICADOS") : "REVISÃO DISPONÍVEL"}</p></div>
        </div>

        {analysisError && <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs">{analysisError}<br /><span className="text-muted-foreground">Você ainda pode revisar e confirmar a importação.</span></div>}

        {analysisDone && duplicates.length > 0 && <div className="rounded-xl border p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{duplicates.length} lançamento(s) com possível duplicidade.</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setDecisions(d => ({ ...d, ...Object.fromEntries(duplicates.map(i => [i, "keep"])) }))} className="rounded border px-2 py-1">MANTER</button>
              <button type="button" onClick={() => setDecisions(d => ({ ...d, ...Object.fromEntries(duplicates.filter(i => existingIds[i]).map(i => [i, "replace"])) }))} className="rounded border px-2 py-1"><RefreshCw className="mr-1 inline h-3 w-3" />ATUALIZAR</button>
              <button type="button" onClick={() => setDecisions(d => ({ ...d, ...Object.fromEntries(duplicates.map(i => [i, "import"])) }))} className="rounded border px-2 py-1"><Copy className="mr-1 inline h-3 w-3" />IMPORTAR</button>
            </div>
          </div>
        </div>}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b text-left"><th className="p-2">Data</th><th className="p-2">Descrição</th><th className="p-2">Valor total</th><th className="p-2">Parcela</th><th className="p-2">Valor da parcela</th><th className="p-2">Ação</th></tr></thead>
          <tbody>{rows.map((r, i) => {
            const isDuplicate = duplicates.includes(i);
            return <tr key={`${r.date}-${r.description}-${i}`} className={`border-b ${isDuplicate ? "bg-primary/5" : ""}`}>
              <td className="p-2 whitespace-nowrap">{r.date.split("-").reverse().join("/")}</td>
              <td className="p-2 min-w-[220px]">{r.description}</td>
              <td className="p-2 whitespace-nowrap">{brl(r.totalAmount)}</td>
              <td className="p-2">{r.installmentTotal > 1 ? `${r.installmentCurrent}/${r.installmentTotal}` : "À VISTA"}</td>
              <td className="p-2 whitespace-nowrap">{brl(r.amount)}</td>
              <td className="p-2">{isDuplicate ? <select value={decisions[i] ?? "keep"} onChange={e => setDecisions(d => ({ ...d, [i]: e.target.value as Decision }))} className="rounded-lg border bg-background px-2 py-1"><option value="keep">Manter existente</option><option value="replace" disabled={!existingIds[i]}>Atualizar</option><option value="import">Importar também</option></select> : <span className="text-muted-foreground">Importar</span>}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </Panel>}

    {imported && <Panel>
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary" />
        <p className="label-caps text-sm">IMPORTAÇÃO CONFIRMADA</p>
        <p className="text-sm text-muted-foreground">Os lançamentos foram enviados para o Harmony Hub e os parcelamentos foram sincronizados quando aplicável.</p>
        <button type="button" onClick={() => { setRows([]); setFileName(""); reset(); }} className="rounded-xl border px-4 py-2 text-xs font-semibold">IMPORTAR OUTRO ARQUIVO</button>
      </div>
    </Panel>}
  </div>;
}
