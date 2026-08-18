export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const formatPercent = (value: number): string => `${Math.round(value)}%`;

export const calculateBudgetUsage = (spent: number, budget: number): number =>
  budget <= 0 ? 0 : (spent / budget) * 100;

export const calculateGoalProgress = (current: number, target: number): number =>
  target <= 0 ? 0 : (current / target) * 100;

export const calculateInstallmentValue = (total: number, count: number): number =>
  count <= 0 ? 0 : total / count;

export const calculateInvoiceTotal = (
  purchases: number,
  installments: number,
  fixedCosts: number,
): number => purchases + installments + fixedCosts;

export const calculateMarketSubtotal = (quantity: number, unitPrice: number): number =>
  quantity * unitPrice;

/** Evaluates simple arithmetic expressions like "50 + 30" or "1200 / 3". */
export const evaluateAmount = (input: string): number | null => {
  const clean = input.replace(/,/g, ".").replace(/[^0-9+\-*/.() ]/g, "");
  if (!clean.trim()) return null;
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict";return (${clean})`)() as unknown;
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
};

export const requiredMonthlyContribution = (
  target: number,
  initial: number,
  months: number,
  annualRate: number,
): number => {
  const i = Math.pow(1 + annualRate, 1 / 12) - 1;
  const fvInitial = initial * Math.pow(1 + i, months);
  const remaining = target - fvInitial;
  if (remaining <= 0) return 0;
  if (i === 0) return remaining / months;
  return remaining / ((Math.pow(1 + i, months) - 1) / i);
};

export const futureValue = (
  monthly: number,
  initial: number,
  months: number,
  annualRate: number,
): number => {
  const i = Math.pow(1 + annualRate, 1 / 12) - 1;
  if (i === 0) return initial + monthly * months;
  return initial * Math.pow(1 + i, months) + monthly * ((Math.pow(1 + i, months) - 1) / i);
};

export const monthsToTarget = (
  target: number,
  monthly: number,
  initial: number,
  annualRate: number,
): number => {
  let balance = initial;
  const i = Math.pow(1 + annualRate, 1 / 12) - 1;
  let months = 0;
  while (balance < target && months < 1200) {
    balance = balance * (1 + i) + monthly;
    months += 1;
  }
  return months;
};
