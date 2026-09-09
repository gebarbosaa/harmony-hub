import { supabase } from "@/integrations/supabase/client";

type ReportProfile = { name?: string | null; household_id?: string | null } | null | undefined;
type AnyRow = Record<string, any>;

const esc = (v: unknown) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);
const num = (v: unknown) => Number(v) || 0;
const dateBR = (v: unknown) => {
  const s = String(v ?? "");
  if (!s) return "—";
  const d = new Date(`${s.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("pt-BR");
};
const rows = (items: AnyRow[], columns: { key: string; label: string; format?: (v: any, r: AnyRow) => string }[]) =>
  items.length
    ? `<table><thead><tr>${columns.map(c => `<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${items.map(r => `<tr>${columns.map(c => `<td>${esc(c.format ? c.format(r[c.key], r) : r[c.key] ?? "—")}</td>`).join("")}</tr>`).join("")}</tbody></table>`
    : `<div class="empty">Nenhum registro no período.</div>`;

export async function openFinancialReport(params: {
  profile: ReportProfile;
  transactions: AnyRow[];
  monthKey: string;
  monthName: string;
}) {
  if (typeof window === "undefined") return;
  const { profile, transactions: fallbackTransactions, monthKey, monthName } = params;
  const householdId = profile?.household_id;
  const start = `${monthKey}-01`;
  const [year, month] = monthKey.split("-").map(Number);
  const next = new Date(year, month, 1);
  const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;

  let transactions = fallbackTransactions.filter(t => String(t.date ?? "").startsWith(monthKey));
  let cards: AnyRow[] = [], invoices: AnyRow[] = [], installments: AnyRow[] = [], fixedCosts: AnyRow[] = [], investments: AnyRow[] = [], goals: AnyRow[] = [];
  if (householdId) {
    const [txQ, cardsQ, invQ, instQ, fixedQ, investmentsQ, goalsQ] = await Promise.all([
      supabase.from("transactions").select("*").eq("household_id", householdId).gte("date", start).lt("date", end).order("date", { ascending: true }),
      supabase.from("cards").select("id,name,brand,last4,credit_limit,close_day,due_day").eq("household_id", householdId).order("name"),
      supabase.from("invoices").select("id,card_id,period,total,status").eq("household_id", householdId).eq("period", monthKey),
      supabase.from("installments").select("id,name,category,total_amount,installments_count,paid_count,purchase_date,responsible,card_name").eq("household_id", householdId).order("purchase_date"),
      supabase.from("fixed_costs").select("id,name,category,amount,due_day,responsible,months").eq("household_id", householdId).order("due_day"),
      supabase.from("investments").select("id,name,type,invested,current_value,created_at").eq("household_id", householdId).order("name"),
      supabase.from("goals").select("id,name,current_amount,target_amount,deadline,monthly,responsible,shared").eq("household_id", householdId).order("name"),
    ]);
    if (!txQ.error && txQ.data) transactions = txQ.data;
    cards = cardsQ.data ?? [];
    invoices = invQ.data ?? [];
    installments = instQ.data ?? [];
    fixedCosts = fixedQ.data ?? [];
    investments = investmentsQ.data ?? [];
    goals = goalsQ.data ?? [];
  }

  const income = transactions.filter(t => t.type === "RECEITA").reduce((s, t) => s + num(t.amount), 0);
  const expenses = transactions.filter(t => t.type === "DESPESA").reduce((s, t) => s + num(t.amount), 0);
  const investmentFlow = transactions.filter(t => t.type === "INVESTIMENTO").reduce((s, t) => s + num(t.amount), 0);
  const balance = income - expenses - investmentFlow;
  const paid = transactions.filter(t => t.type === "DESPESA" && (t.paid === true || String(t.paid).toLowerCase() === "true")).reduce((s, t) => s + num(t.amount), 0);
  const pending = expenses - paid;

  const categoryMap = new Map<string, number>();
  transactions.filter(t => t.type === "DESPESA").forEach(t => categoryMap.set(t.category || "OUTROS", (categoryMap.get(t.category || "OUTROS") || 0) + num(t.amount)));
  const categories = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]);

  const activeFixed = fixedCosts.filter(f => Array.isArray(f.months) ? f.months[month - 1] !== false : true);
  const subscriptions = activeFixed.filter(f => String(f.category || "").toUpperCase() === "ASSINATURAS");
  const fixed = activeFixed.filter(f => String(f.category || "").toUpperCase() !== "ASSINATURAS");
  const totalFixed = fixed.reduce((s, f) => s + num(f.amount), 0);
  const totalSubscriptions = subscriptions.reduce((s, f) => s + num(f.amount), 0);
  const totalInvested = investments.reduce((s, i) => s + num(i.invested), 0);
  const totalCurrent = investments.reduce((s, i) => s + num(i.current_value), 0);
  const investmentResult = totalCurrent - totalInvested;
  const cardRows = cards.map(c => {
    const cardTx = transactions.filter(t => t.card_id === c.id && t.type === "DESPESA");
    const total = cardTx.reduce((s, t) => s + num(t.amount), 0);
    const inv = invoices.find(i => i.card_id === c.id);
    return { ...c, invoice: total || num(inv?.total), status: inv?.status || "—", available: Math.max(num(c.credit_limit) - total, 0) };
  });

  const transactionTable = rows(transactions.sort((a, b) => String(a.date).localeCompare(String(b.date))), [
    { key: "date", label: "Data", format: dateBR },
    { key: "description", label: "Descrição" },
    { key: "category", label: "Categoria", format: v => v || "OUTROS" },
    { key: "type", label: "Tipo" },
    { key: "responsible", label: "Responsável", format: v => v || "—" },
    { key: "amount", label: "Valor", format: (v, r) => `${r.type === "RECEITA" ? "+" : r.type === "DESPESA" ? "−" : ""}${brl(num(v))}` },
  ]);
  const categoryTable = rows(categories.map(([category, total]) => ({ category, total, percent: expenses ? total / expenses * 100 : 0 })), [
    { key: "category", label: "Categoria" },
    { key: "total", label: "Total", format: brl },
    { key: "percent", label: "% dos gastos", format: v => `${num(v).toFixed(1).replace(".", ",")}%` },
  ]);
  const cardTable = rows(cardRows, [
    { key: "name", label: "Cartão" },
    { key: "invoice", label: "Fatura", format: brl },
    { key: "credit_limit", label: "Limite", format: brl },
    { key: "available", label: "Disponível", format: brl },
    { key: "status", label: "Status" },
  ]);
  const installmentTable = rows(installments, [
    { key: "name", label: "Compra" },
    { key: "card_name", label: "Cartão", format: v => v || "—" },
    { key: "category", label: "Categoria", format: v => v || "OUTROS" },
    { key: "total_amount", label: "Total", format: brl },
    { key: "paid_count", label: "Parcela atual", format: (v, r) => `${num(v)}/${num(r.installments_count)}` },
    { key: "purchase_date", label: "Compra", format: dateBR },
  ]);
  const fixedTable = rows(fixed, [
    { key: "name", label: "Conta" }, { key: "category", label: "Categoria" }, { key: "amount", label: "Valor", format: brl }, { key: "due_day", label: "Vencimento", format: v => `Dia ${v}` }, { key: "responsible", label: "Responsável", format: v => v || "—" },
  ]);
  const subscriptionTable = rows(subscriptions, [
    { key: "name", label: "Assinatura" }, { key: "amount", label: "Mensal", format: brl }, { key: "due_day", label: "Cobrança", format: v => `Dia ${v}` }, { key: "responsible", label: "Responsável", format: v => v || "—" },
  ]);
  const investmentTable = rows(investments, [
    { key: "name", label: "Investimento" }, { key: "type", label: "Tipo" }, { key: "invested", label: "Aplicado", format: brl }, { key: "current_value", label: "Atual", format: brl }, { key: "current_value", label: "Resultado", format: (v, r) => brl(num(v) - num(r.invested)) },
  ]);
  const goalTable = rows(goals, [
    { key: "name", label: "Meta" }, { key: "current_amount", label: "Acumulado", format: brl }, { key: "target_amount", label: "Objetivo", format: brl }, { key: "target_amount", label: "Progresso", format: (v, r) => `${(num(v) ? num(r.current_amount) / num(v) * 100 : 0).toFixed(1).replace(".", ",")}%` }, { key: "deadline", label: "Prazo", format: dateBR },
  ]);

  const generatedAt = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const csv = [
    ["DATA", "DESCRIÇÃO", "CATEGORIA", "TIPO", "RESPONSÁVEL", "VALOR"],
    ...transactions.map(t => [t.date, t.description || "", t.category || "OUTROS", t.type || "", t.responsible || "", num(t.amount).toFixed(2).replace(".", ",")]),
  ].map(r => r.map(v => `"${String(v ?? "").replaceAll('"', '""')}"`).join(";")).join("\n");
  const csvUri = `data:text/csv;charset=utf-8,\uFEFF${encodeURIComponent(csv)}`;
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) { window.alert("Não foi possível abrir o relatório. Permita pop-ups para o Harmony Hub e tente novamente."); return; }
  reportWindow.document.open();
  reportWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório financeiro — ${esc(monthName)}</title><style>
@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#f2f5f3;color:#183c38;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}.page{width:min(100%,850px);margin:22px auto;background:#fff;padding:34px 38px;box-shadow:0 8px 30px #00000012}.top{display:flex;justify-content:space-between;gap:20px;border-bottom:4px solid #174a44;padding-bottom:18px}.brand{font-size:22px;font-weight:900;letter-spacing:.08em}.subtitle{margin-top:5px;color:#6a7774;font-size:12px}.month{text-align:right;font-size:12px;font-weight:900;text-transform:uppercase}.section-title{margin:25px 0 10px;font-size:13px;letter-spacing:.07em;font-weight:900;text-transform:uppercase}.profile{color:#596764;font-size:13px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.metric{border:1px solid #dfe7e4;border-radius:10px;padding:12px}.metric .label{font-size:9px;font-weight:900;color:#687672;letter-spacing:.05em}.metric .value{font-size:17px;font-weight:900;margin-top:5px}.positive{color:#1d6a42}.negative{color:#9d4037}.summary{background:#e9f1ee;border-radius:10px;padding:16px 18px}.summary .value{font-size:27px;font-weight:900;margin-top:5px}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #edf0ef;font-size:13px}.row strong{white-space:nowrap}table{width:100%;border-collapse:collapse;font-size:10px}th,td{padding:7px 6px;border-bottom:1px solid #edf0ef;text-align:left}th{background:#f3f6f5;font-size:9px;text-transform:uppercase;letter-spacing:.04em}.table-wrap{overflow:hidden;border:1px solid #dfe6e3;border-radius:9px}.empty{padding:18px;text-align:center;color:#7b8784;font-size:12px}.footer{margin-top:26px;padding-top:11px;border-top:1px solid #e3e8e6;display:flex;justify-content:space-between;color:#89928f;font-size:9px}.actions{position:sticky;top:0;z-index:5;display:flex;justify-content:flex-end;gap:8px;padding:10px;background:#f2f5f3}.actions button,.actions a{border:0;border-radius:9px;padding:10px 14px;font-weight:800;cursor:pointer;background:#174a44;color:#fff;text-decoration:none;font-size:12px}.actions .secondary{background:#fff;color:#174a44;border:1px solid #174a44}@media print{body{background:#fff}.page{width:auto;margin:0;padding:0;box-shadow:none}.actions{display:none}.section-title{break-after:avoid}.table-wrap{break-inside:auto}}@media(max-width:650px){.page{margin:0;padding:20px 16px}.top{flex-direction:column}.month{text-align:left}.cards{grid-template-columns:repeat(2,1fr)}.table-wrap{overflow-x:auto}table{min-width:620px}}
</style></head><body><div class="actions"><button onclick="window.print()">SALVAR / IMPRIMIR PDF</button><a class="secondary" download="harmony-hub-${esc(monthKey)}.csv" href="${csvUri}">BAIXAR CSV</a></div><main class="page">
<header class="top"><div><div class="brand">HARMONY HUB</div><div class="subtitle">Relatório financeiro completo</div></div><div class="month">${esc(monthName)}</div></header>
<div class="section-title">Perfil</div><div class="profile">${esc(profile?.name || "Usuário")}</div>
<div class="section-title">Resumo financeiro</div><div class="cards"><div class="metric"><div class="label">RECEITAS</div><div class="value positive">${esc(brl(income))}</div></div><div class="metric"><div class="label">DESPESAS</div><div class="value negative">${esc(brl(expenses))}</div></div><div class="metric"><div class="label">INVESTIMENTOS</div><div class="value">${esc(brl(investmentFlow))}</div></div><div class="metric"><div class="label">MOVIMENTAÇÕES</div><div class="value">${transactions.length}</div></div></div>
<div class="summary" style="margin-top:10px"><div class="label">SALDO DO PERÍODO</div><div class="value ${balance >= 0 ? "positive" : "negative"}">${esc(brl(balance))}</div></div>
<div class="section-title">Gastos do mês</div><div class="table-wrap">${categoryTable}</div><div class="row"><strong>TOTAL DE GASTOS</strong><strong>${esc(brl(expenses))}</strong></div><div class="row"><span>Pago</span><strong>${esc(brl(paid))}</strong></div><div class="row"><span>Pendente</span><strong>${esc(brl(pending))}</strong></div>
<div class="section-title">Cartões e faturas</div><div class="table-wrap">${cardTable}</div>
<div class="section-title">Compras parceladas</div><div class="table-wrap">${installmentTable}</div>
<div class="section-title">Custos fixos</div><div class="row"><span>Total mensal</span><strong>${esc(brl(totalFixed))}</strong></div><div class="table-wrap">${fixedTable}</div>
<div class="section-title">Assinaturas</div><div class="row"><span>Total mensal</span><strong>${esc(brl(totalSubscriptions))}</strong></div><div class="table-wrap">${subscriptionTable}</div>
<div class="section-title">Investimentos</div><div class="cards"><div class="metric"><div class="label">APLICADO</div><div class="value">${esc(brl(totalInvested))}</div></div><div class="metric"><div class="label">VALOR ATUAL</div><div class="value">${esc(brl(totalCurrent))}</div></div><div class="metric"><div class="label">RESULTADO</div><div class="value ${investmentResult >= 0 ? "positive" : "negative"}">${esc(brl(investmentResult))}</div></div><div class="metric"><div class="label">RESGATES NO MÊS</div><div class="value">${esc(brl(transactions.filter(t => t.source_type === "INVESTMENT_REDEMPTION").reduce((s,t)=>s+num(t.amount),0)))}</div></div></div><div class="table-wrap" style="margin-top:10px">${investmentTable}</div>
<div class="section-title">Metas financeiras</div><div class="table-wrap">${goalTable}</div>
<div class="section-title">Movimentações detalhadas</div><div class="table-wrap">${transactionTable}</div>
<footer class="footer"><span>${transactions.length} movimentação(ões) · Gerado pelo Harmony Hub</span><span>${esc(generatedAt)}</span></footer></main></body></html>`);
  reportWindow.document.close();
}
