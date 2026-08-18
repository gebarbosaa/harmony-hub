export type Responsible = "MARIA" | "LUCAS" | "AMBAS";
export type TxType = "RECEITA" | "DESPESA" | "TRANSFERENCIA" | "INVESTIMENTO";

export type Transaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  method: string;
  responsible: Responsible;
  amount: number;
  type: TxType;
  status: "PAGO" | "PENDENTE";
};

export const members = [
  { name: "MARIA", color: "var(--orange-primary)", initials: "MA" },
  { name: "LUCAS", color: "var(--info)", initials: "LU" },
];

export const transactions: Transaction[] = [
  { id: "1", date: "2026-08-01", description: "SALÁRIO MARIA", category: "RENDA", method: "PIX", responsible: "MARIA", amount: 7200, type: "RECEITA", status: "PAGO" },
  { id: "2", date: "2026-08-01", description: "SALÁRIO LUCAS", category: "RENDA", method: "PIX", responsible: "LUCAS", amount: 6100, type: "RECEITA", status: "PAGO" },
  { id: "3", date: "2026-08-03", description: "MERCADO EXTRA", category: "ALIMENTAÇÃO", method: "CARTÃO NUBANK", responsible: "AMBAS", amount: 642.9, type: "DESPESA", status: "PAGO" },
  { id: "4", date: "2026-08-05", description: "ALUGUEL", category: "MORADIA", method: "BOLETO", responsible: "AMBAS", amount: 2400, type: "DESPESA", status: "PAGO" },
  { id: "5", date: "2026-08-07", description: "GASOLINA", category: "TRANSPORTE", method: "CARTÃO INTER", responsible: "LUCAS", amount: 280, type: "DESPESA", status: "PAGO" },
  { id: "6", date: "2026-08-09", description: "JANTAR ANIVERSÁRIO", category: "LAZER", method: "CARTÃO NUBANK", responsible: "AMBAS", amount: 318.4, type: "DESPESA", status: "PAGO" },
  { id: "7", date: "2026-08-12", description: "APORTE TESOURO", category: "INVESTIMENTO", method: "TRANSFERÊNCIA", responsible: "MARIA", amount: 1200, type: "INVESTIMENTO", status: "PAGO" },
  { id: "8", date: "2026-08-14", description: "FARMÁCIA", category: "SAÚDE", method: "PIX", responsible: "MARIA", amount: 128.7, type: "DESPESA", status: "PAGO" },
  { id: "9", date: "2026-08-15", description: "RESERVA CONJUNTA", category: "TRANSFERÊNCIA", method: "TRANSFERÊNCIA", responsible: "AMBAS", amount: 900, type: "TRANSFERENCIA", status: "PAGO" },
  { id: "10", date: "2026-08-18", description: "INTERNET", category: "MORADIA", method: "DÉBITO AUTOMÁTICO", responsible: "AMBAS", amount: 139.9, type: "DESPESA", status: "PENDENTE" },
  { id: "11", date: "2026-08-20", description: "ACADEMIA", category: "SAÚDE", method: "CARTÃO INTER", responsible: "LUCAS", amount: 189, type: "DESPESA", status: "PENDENTE" },
  { id: "12", date: "2026-08-22", description: "MERCADO ASSAÍ", category: "ALIMENTAÇÃO", method: "CARTÃO NUBANK", responsible: "AMBAS", amount: 412.3, type: "DESPESA", status: "PENDENTE" },
];

export const upcomingBills = [
  { id: "b1", name: "INTERNET FIBRA", amount: 139.9, due: "VENCE HOJE", tone: "danger" as const },
  { id: "b2", name: "CARTÃO NUBANK", amount: 1840.2, due: "VENCE AMANHÃ", tone: "warning" as const },
  { id: "b3", name: "ENERGIA", amount: 268.4, due: "EM 3 DIAS", tone: "warning" as const },
  { id: "b4", name: "ESCOLA INFANTIL", amount: 780, due: "EM 5 DIAS", tone: "info" as const },
];

export const monthlyEvolution = [
  { mes: "JAN", gastos: 6100, receitas: 12800 },
  { mes: "FEV", gastos: 6850, receitas: 12800 },
  { mes: "MAR", gastos: 7420, receitas: 13100 },
  { mes: "ABR", gastos: 6320, receitas: 13100 },
  { mes: "MAI", gastos: 7890, receitas: 13300 },
  { mes: "JUN", gastos: 7210, receitas: 13300 },
  { mes: "JUL", gastos: 8040, receitas: 13300 },
  { mes: "AGO", gastos: 6511, receitas: 13300 },
];

export const categoryDistribution = [
  { name: "MORADIA", value: 2679.9, budget: 3000 },
  { name: "ALIMENTAÇÃO", value: 1055.2, budget: 1000 },
  { name: "TRANSPORTE", value: 480, budget: 700 },
  { name: "LAZER", value: 318.4, budget: 500 },
  { name: "SAÚDE", value: 317.7, budget: 600 },
];

export const compositionData = [
  { name: "FIXO", value: 3140 },
  { name: "PARCELADO", value: 1280 },
  { name: "À VISTA", value: 1691 },
  { name: "OUTROS", value: 400 },
];

export const splitData = [
  { name: "MARIA", value: 1528.7 },
  { name: "LUCAS", value: 469 },
  { name: "AMBAS", value: 3873.6 },
];

export const fixedCosts = [
  { id: "f1", name: "ALUGUEL", amount: 2400, day: 5, category: "MORADIA", responsible: "AMBAS", months: Array(12).fill(true) },
  { id: "f2", name: "INTERNET FIBRA", amount: 139.9, day: 18, category: "MORADIA", responsible: "AMBAS", months: Array(12).fill(true) },
  { id: "f3", name: "IPTU", amount: 320, day: 10, category: "IMPOSTOS", responsible: "AMBAS", months: [true, true, true, true, true, true, false, false, false, false, false, false] },
  { id: "f4", name: "SEGURO CARRO", amount: 210, day: 22, category: "TRANSPORTE", responsible: "LUCAS", months: [true, false, true, false, true, false, true, false, true, false, true, false] },
  { id: "f5", name: "ACADEMIA", amount: 189, day: 20, category: "SAÚDE", responsible: "LUCAS", months: Array(12).fill(true) },
];

export const installments = [
  { id: "i1", name: "NOTEBOOK", total: 4200, count: 12, paid: 5, card: "NUBANK", responsible: "MARIA", category: "TECNOLOGIA" },
  { id: "i2", name: "SOFÁ RETRÁTIL", total: 3600, count: 10, paid: 7, card: "INTER", responsible: "AMBAS", category: "CASA" },
  { id: "i3", name: "PASSAGEM AÉREA", total: 2880, count: 6, paid: 2, card: "NUBANK", responsible: "AMBAS", category: "VIAGEM" },
  { id: "i4", name: "CELULAR LUCAS", total: 2400, count: 8, paid: 8, card: "INTER", responsible: "LUCAS", category: "TECNOLOGIA" },
];

export const cards = [
  { id: "c1", name: "NUBANK", brand: "MASTERCARD", last4: "4821", limit: 12000, used: 4820.6, close: 28, due: 5, status: "ABERTA" as const, purchases: 2640.4, installments: 1580.2, fixed: 600 },
  { id: "c2", name: "INTER", brand: "VISA", last4: "9034", limit: 8000, used: 2310.5, close: 24, due: 1, status: "FECHADA" as const, purchases: 1121.5, installments: 900, fixed: 289 },
];

export const shoppingLists = [
  {
    id: "l1",
    name: "PRINCIPAL",
    items: [
      { id: "s1", name: "ARROZ 5KG", category: "MERCEARIA", qty: 2, unit: "PCT", price: 27.9, priority: "ALTA", done: false },
      { id: "s2", name: "PICANHA", category: "AÇOUGUE", qty: 1.2, unit: "KG", price: 89.9, priority: "MÉDIA", done: false },
      { id: "s3", name: "TOMATE", category: "HORTIFRUTI", qty: 1, unit: "KG", price: 8.5, priority: "BAIXA", done: true },
      { id: "s4", name: "DETERGENTE", category: "LIMPEZA", qty: 3, unit: "UN", price: 3.2, priority: "BAIXA", done: false },
      { id: "s5", name: "REFRIGERANTE 2L", category: "BEBIDAS", qty: 2, unit: "UN", price: 9.9, priority: "MÉDIA", done: true },
    ],
  },
  {
    id: "l2",
    name: "CHURRASCO",
    items: [
      { id: "s6", name: "CARVÃO", category: "MERCEARIA", qty: 1, unit: "PCT", price: 24.9, priority: "ALTA", done: false },
      { id: "s7", name: "LINGUIÇA", category: "AÇOUGUE", qty: 2, unit: "KG", price: 32.9, priority: "ALTA", done: false },
    ],
  },
  { id: "l3", name: "FARMÁCIA", items: [{ id: "s8", name: "PROTETOR SOLAR", category: "SAÚDE", qty: 1, unit: "UN", price: 62.9, priority: "MÉDIA", done: false }] },
];

export const appointments = [
  { id: "a1", title: "MERCADO DO MÊS", date: "20 AGO", time: "09:00", category: "MERCADO", responsible: "AMBAS", external: false },
  { id: "a2", title: "PAGAR CARTÃO NUBANK", date: "21 AGO", time: "10:30", category: "CONTAS", responsible: "MARIA", external: false },
  { id: "a3", title: "CONSULTA DENTISTA", date: "23 AGO", time: "14:00", category: "SAÚDE", responsible: "LUCAS", external: true },
  { id: "a4", title: "CINEMA", date: "24 AGO", time: "19:40", category: "LAZER", responsible: "AMBAS", external: true },
  { id: "a5", title: "ALMOÇO EM FAMÍLIA", date: "25 AGO", time: "12:00", category: "FAMÍLIA", responsible: "AMBAS", external: false },
];

export const goals = [
  { id: "g1", name: "VIAGEM CHILE", current: 2500, target: 8000, deadline: "MAR 2027", monthly: 550, responsible: "AMBAS", shared: true },
  { id: "g2", name: "RESERVA DE EMERGÊNCIA", current: 18400, target: 30000, deadline: "DEZ 2027", monthly: 900, responsible: "AMBAS", shared: true },
  { id: "g3", name: "NOVO CARRO", current: 6200, target: 45000, deadline: "JUL 2029", monthly: 800, responsible: "LUCAS", shared: false },
  { id: "g4", name: "CURSO DE DESIGN", current: 1400, target: 3200, deadline: "NOV 2026", monthly: 300, responsible: "MARIA", shared: false },
];

export const investments = [
  { id: "v1", name: "TESOURO SELIC", type: "TESOURO DIRETO", invested: 22000, current: 24380 },
  { id: "v2", name: "CDB LIQUIDEZ", type: "CDB", invested: 15000, current: 16120 },
  { id: "v3", name: "FII XPML11", type: "FIIS", invested: 8000, current: 8640 },
  { id: "v4", name: "ETF IVVB11", type: "ETFS", invested: 10000, current: 12310 },
  { id: "v5", name: "BITCOIN", type: "CRIPTOMOEDAS", invested: 4000, current: 5890 },
];

export const portfolioEvolution = [
  { mes: "MAR", valor: 52000 },
  { mes: "ABR", valor: 54200 },
  { mes: "MAI", valor: 57100 },
  { mes: "JUN", valor: 59400 },
  { mes: "JUL", valor: 63800 },
  { mes: "AGO", valor: 67340 },
];

export const habits = [
  { id: "h1", name: "TREINO", owner: "MARIA", privacy: "COMPARTILHADO", streak: 12, best: 21, monthly: 78 },
  { id: "h2", name: "LEITURA 20 MIN", owner: "MARIA", privacy: "PRIVADO", streak: 5, best: 14, monthly: 52 },
  { id: "h3", name: "SEM DELIVERY", owner: "AMBAS", privacy: "DESAFIO DO CASAL", streak: 8, best: 8, monthly: 64 },
  { id: "h4", name: "CAMINHADA", owner: "LUCAS", privacy: "COMPARTILHADO", streak: 3, best: 17, monthly: 41 },
];

export const tasks = [
  { id: "t1", title: "PAGAR IPTU", quadrant: "FAZER AGORA", responsible: "MARIA", due: "HOJE" },
  { id: "t2", title: "RENEGOCIAR INTERNET", quadrant: "FAZER AGORA", responsible: "LUCAS", due: "AMANHÃ" },
  { id: "t3", title: "PLANEJAR VIAGEM", quadrant: "AGENDAR", responsible: "AMBAS", due: "SET" },
  { id: "t4", title: "REVISAR ORÇAMENTO", quadrant: "AGENDAR", responsible: "MARIA", due: "01 SET" },
  { id: "t5", title: "LEVAR CARRO NA REVISÃO", quadrant: "DELEGAR/DIVIDIR", responsible: "LUCAS", due: "26 AGO" },
  { id: "t6", title: "CANCELAR STREAMING EXTRA", quadrant: "ELIMINAR", responsible: "AMBAS", due: "—" },
];

/** Daily spend heat map for the current month. */
export const dailySpend: Record<number, number> = {
  1: 0, 2: 45, 3: 642.9, 4: 0, 5: 2400, 6: 88, 7: 280, 8: 0, 9: 318.4, 10: 62,
  11: 0, 12: 1200, 13: 34, 14: 128.7, 15: 900, 16: 0, 17: 210, 18: 139.9, 19: 76,
  20: 189, 21: 0, 22: 412.3, 23: 55, 24: 0, 25: 130, 26: 0, 27: 0, 28: 0, 29: 0, 30: 0, 31: 0,
};
