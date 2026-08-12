import type { PropertyProfitability, PropertySummary, PropertyCashFlowRisk } from "@/lib/types";

/** Amounts at or below this (absolute) are treated as zero for “show this property” rules. */
export const FINANCIAL_DISPLAY_EPS = 1e-6;

/** Excel-agent / EL `properties[]` row — hide when income, expenses, and outstanding are all ~zero. */
export function isActiveElApiProperty(p: {
  income?: number;
  expenses?: number;
  outstanding?: number;
  netProfit?: number;
}): boolean {
  const income = Number(p.income ?? 0);
  const expenses = Number(p.expenses ?? 0);
  const outstanding = Number(p.outstanding ?? 0);
  const netProfit = Number(p.netProfit ?? 0);
  return (
    Math.abs(income) > FINANCIAL_DISPLAY_EPS ||
    Math.abs(expenses) > FINANCIAL_DISPLAY_EPS ||
    Math.abs(outstanding) > FINANCIAL_DISPLAY_EPS ||
    Math.abs(netProfit) > FINANCIAL_DISPLAY_EPS
  );
}

export function isActivePropertyProfitability(
  p: Pick<PropertyProfitability, "totalIncome" | "totalExpenses" | "netProfit">
): boolean {
  return (
    Math.abs(p.totalIncome) > FINANCIAL_DISPLAY_EPS ||
    Math.abs(p.totalExpenses) > FINANCIAL_DISPLAY_EPS ||
    Math.abs(p.netProfit) > FINANCIAL_DISPLAY_EPS
  );
}

export function isActivePropertySummary(
  s: Pick<PropertySummary, "totalIncome" | "totalExpenses" | "netIncome" | "uncollectedAmount">
): boolean {
  return (
    Math.abs(s.totalIncome) > FINANCIAL_DISPLAY_EPS ||
    Math.abs(s.totalExpenses) > FINANCIAL_DISPLAY_EPS ||
    Math.abs(s.netIncome) > FINANCIAL_DISPLAY_EPS ||
    Math.abs(s.uncollectedAmount) > FINANCIAL_DISPLAY_EPS
  );
}

/** Sample / analytics-engine cash-flow row — hide when all monetary fields are ~zero. */
export function isActivePropertyCashFlowRisk(p: PropertyCashFlowRisk): boolean {
  return (
    Math.abs(p.totalIncome) > FINANCIAL_DISPLAY_EPS ||
    Math.abs(p.incomeReceivable) > FINANCIAL_DISPLAY_EPS ||
    Math.abs(p.outstandingIncome) > FINANCIAL_DISPLAY_EPS ||
    Math.abs(p.deferredIncome) > FINANCIAL_DISPLAY_EPS ||
    Math.abs(p.overdueExpenses) > FINANCIAL_DISPLAY_EPS ||
    Math.abs(p.pendingExpenses) > FINANCIAL_DISPLAY_EPS ||
    Math.abs(p.netCashPosition) > FINANCIAL_DISPLAY_EPS
  );
}
