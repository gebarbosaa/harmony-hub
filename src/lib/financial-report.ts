type ReportTransaction = {
  date: string;
  description: string;
  category: string;
  amount: number;
  type: string;
  paid?: boolean;
  responsible?: string;
  source_type?: string | null;
};

type ReportProfile = { name?: string | null } | null | undefined;

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const dateBR = (value: string) => {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
};

export function openFinancialReport(params: {
  profile: ReportProfile;
  transactions: ReportTransaction[];
  monthKey: string;
  monthName: string;
}) {
  if (typeof window === "undefined") return;

  const { profile, transactions, monthKey, monthName } = params;
  const monthTransactions = transactions.filter((transaction) => transaction.date?.startsWith(monthKey));
  const income = monthTransactions
    .filter((transaction) => transaction.type === "RECEITA")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const expenses = monthTransactions
    .filter((transaction) => transaction.type === "DESPESA")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const balance = income - expenses;

  const categoryMap = new Map<string, { total: number; count: number }>();
  monthTransactions
    .filter((transaction) => transaction.type === "DESPESA")
    .forEach((transaction) => {
      const category = transaction.category?.trim() || "OUTROS";
      const current = categoryMap.get(category) ?? { total: 0, count: 0 };
      categoryMap.set(category, {
        total: current.total + Number(transaction.amount),
        count: current.count + 1,
      });
    });

  const categories = Array.from(categoryMap.entries()).sort((a, b) => b[1].total - a[1].total);

  const transactionRows = [...monthTransactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (transaction) => `
        <tr>
          <td>${escapeHtml(dateBR(transaction.date))}</td>
          <td>${escapeHtml(transaction.description || "Sem descrição")}</td>
          <td>${escapeHtml(transaction.category || "OUTROS")}</td>
          <td class="${transaction.type === "RECEITA" ? "positive" : "negative"}">${escapeHtml(currency(Number(transaction.amount)))}</td>
        </tr>`,
    )
    .join("");

  const categoryRows = categories
    .map(
      ([category, data]) => `
        <div class="expense-row">
          <span>${escapeHtml(category)}</span>
          <strong>${escapeHtml(currency(data.total))}</strong>
        </div>`,
    )
    .join("");

  const generatedAt = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const reportWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!reportWindow) {
    window.alert("Não foi possível abrir o relatório. Permita pop-ups para o Harmony Hub e tente novamente.");
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Relatório financeiro — Harmony Hub — ${escapeHtml(monthName)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f3f5f4; color: #183c38; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }
  .page { width: min(100%, 820px); margin: 24px auto; background: #fff; padding: 34px 38px; box-shadow: 0 8px 30px rgba(0,0,0,.08); }
  .top { display:flex; justify-content:space-between; gap:20px; align-items:flex-start; border-bottom: 4px solid #174a44; padding-bottom: 18px; }
  .brand { font-size: 22px; font-weight: 900; letter-spacing: .08em; }
  .subtitle { margin-top: 5px; color:#6a7774; font-size:12px; }
  .month { text-align:right; font-size: 12px; font-weight: 800; text-transform: uppercase; }
  .section-title { margin: 25px 0 10px; font-size: 13px; letter-spacing:.07em; font-weight:900; text-transform:uppercase; }
  .profile { color:#596764; font-size:13px; margin-bottom:18px; }
  .income { background:#e9f1ee; border-radius:10px; padding:16px 18px; }
  .income .label { font-size:12px; font-weight:900; letter-spacing:.06em; }
  .income .value { margin-top:7px; font-size:28px; font-weight:900; }
  .expense-list { border-top:1px solid #dce3e1; }
  .expense-row { display:flex; justify-content:space-between; gap:20px; padding:9px 0; border-bottom:1px solid #edf0ef; font-size:13px; }
  .expense-row strong { white-space:nowrap; }
  .totals { margin-top:18px; border-top:2px solid #cfd8d5; padding-top:13px; }
  .total-row { display:flex; justify-content:space-between; font-size:16px; font-weight:900; padding:5px 0; }
  .balance { margin-top:8px; border-radius:10px; padding:16px 18px; background:${balance >= 0 ? "#e9f4ed" : "#f9e8e5"}; color:${balance >= 0 ? "#1d6a42" : "#9d4037"}; }
  .balance .label { font-size:12px; font-weight:900; letter-spacing:.06em; }
  .balance .value { margin-top:5px; font-size:25px; font-weight:900; }
  .table-wrap { overflow:hidden; border:1px solid #dfe6e3; border-radius:10px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th,td { padding:8px 9px; border-bottom:1px solid #edf0ef; text-align:left; }
  th { background:#f3f6f5; font-size:10px; text-transform:uppercase; letter-spacing:.05em; }
  tr:last-child td { border-bottom:0; }
  .positive { color:#1d6a42; font-weight:800; }
  .negative { color:#9d4037; font-weight:800; }
  .empty { padding:22px 0; text-align:center; color:#7b8784; font-size:13px; }
  .footer { margin-top:28px; padding-top:12px; border-top:1px solid #e3e8e6; display:flex; justify-content:space-between; gap:15px; color:#89928f; font-size:10px; }
  .actions { position:sticky; top:0; z-index:5; display:flex; justify-content:flex-end; gap:8px; padding:10px; background:rgba(243,245,244,.95); }
  button { border:0; border-radius:9px; padding:10px 14px; font-weight:800; cursor:pointer; background:#174a44; color:#fff; }
  @media print { body { background:#fff; } .page { width:auto; margin:0; padding:0; box-shadow:none; } .actions { display:none; } }
  @media (max-width:600px) { .page { margin:0; padding:22px 18px; } .top { flex-direction:column; } .month { text-align:left; } .table-wrap { overflow-x:auto; } table { min-width:620px; } }
</style>
</head>
<body>
<div class="actions"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
<main class="page">
  <header class="top">
    <div><div class="brand">HARMONY HUB</div><div class="subtitle">Relatório financeiro mensal</div></div>
    <div class="month">${escapeHtml(monthName)}</div>
  </header>

  <div class="section-title">Perfil</div>
  <div class="profile">${escapeHtml(profile?.name || "Usuário")}</div>

  <div class="section-title">Renda líquida mensal</div>
  <div class="income"><div class="label">RECEITAS REGISTRADAS</div><div class="value">${escapeHtml(currency(income))}</div></div>

  <div class="section-title">Gastos do mês</div>
  <div class="expense-list">
    ${categoryRows || '<div class="empty">Nenhuma despesa registrada neste mês.</div>'}
  </div>

  <div class="totals">
    <div class="total-row"><span>TOTAL DE GASTOS</span><span>${escapeHtml(currency(expenses))}</span></div>
    <div class="balance"><div class="label">SALDO DO MÊS</div><div class="value">${escapeHtml(currency(balance))}</div></div>
  </div>

  <div class="section-title">Movimentações do mês</div>
  <div class="table-wrap">
    ${transactionRows ? `<table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th></tr></thead><tbody>${transactionRows}</tbody></table>` : '<div class="empty">Nenhuma movimentação registrada neste mês.</div>'}
  </div>

  <footer class="footer"><span>${monthTransactions.length} movimentação(ões)</span><span>Gerado em ${escapeHtml(generatedAt)}</span></footer>
</main>
<script>window.addEventListener('load', () => setTimeout(() => window.print(), 250));</script>
</body></html>`);
  reportWindow.document.close();
}
