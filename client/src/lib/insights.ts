// ============================================================
// Insights Engine — Automated observation generation
// Analyzes the full dataset and produces short, actionable findings
// ============================================================

import type { IncomeRecord, ExpenseRecord, Insight } from './types';
import { formatCurrency, formatPercent } from './analytics';

let insightCounter = 0;
function nextId(): string {
  return `insight-${++insightCounter}`;
}

export function generateInsights(
  incomeData: IncomeRecord[],
  expenseData: ExpenseRecord[],
  selectedMonth: string | 'all'
): Insight[] {
  insightCounter = 0;
  const insights: Insight[] = [];

  // Filter data by month if needed
  const income = selectedMonth === 'all' ? incomeData : incomeData.filter(r => r.month === selectedMonth);
  const expenses = selectedMonth === 'all' ? expenseData : expenseData.filter(r => r.month === selectedMonth);

  if (income.length === 0 && expenses.length === 0) return insights;

  // ── Vendor Concentration ──────────────────────────────────
  generateVendorInsights(expenses, insights);

  // ── Cost-to-Income Ratio ──────────────────────────────────
  generateCostEfficiencyInsights(income, expenses, insights);

  // ── Outstanding Receivables ───────────────────────────────
  generateReceivableInsights(income, insights);

  // ── Income Changes (MoM) ──────────────────────────────────
  generateIncomeChangeInsights(incomeData, selectedMonth, insights);

  // ── Expense Changes (MoM) ─────────────────────────────────
  generateExpenseChangeInsights(expenseData, selectedMonth, insights);

  // ── Profitability ─────────────────────────────────────────
  generateProfitabilityInsights(income, expenses, insights);

  // ── Risk Alerts ───────────────────────────────────────────
  generateRiskInsights(income, expenses, insights);

  // ── Opportunities ─────────────────────────────────────────
  generateOpportunityInsights(income, expenses, insights);

  // Sort by priority (lower number = higher priority)
  insights.sort((a, b) => a.priority - b.priority);

  return insights;
}

// ── Vendor Concentration ──────────────────────────────────────
function generateVendorInsights(expenses: ExpenseRecord[], insights: Insight[]) {
  if (expenses.length === 0) return;

  const vendorSpend = new Map<string, number>();
  expenses.forEach(e => vendorSpend.set(e.supplierName, (vendorSpend.get(e.supplierName) || 0) + e.amount));

  const totalExpenses = Array.from(vendorSpend.values()).reduce((a, b) => a + b, 0);
  if (totalExpenses === 0) return;

  const sorted = Array.from(vendorSpend.entries()).sort((a, b) => b[1] - a[1]);
  const vendorCount = sorted.length;

  // Top 3 vendor concentration
  if (sorted.length >= 3) {
    const top3Spend = sorted.slice(0, 3).reduce((s, [, v]) => s + v, 0);
    const top3Pct = (top3Spend / totalExpenses) * 100;
    const severity = top3Pct > 60 ? 'critical' : top3Pct > 45 ? 'warning' : 'info';
    insights.push({
      id: nextId(),
      category: 'vendor',
      severity,
      title: `Top 3 vendors account for ${top3Pct.toFixed(1)}% of total expenses`,
      description: `${sorted[0][0]}, ${sorted[1][0]}, and ${sorted[2][0]} collectively represent ${formatCurrency(top3Spend)} out of ${formatCurrency(totalExpenses)} in total spend. ${top3Pct > 50 ? 'Consider diversifying vendor relationships to reduce dependency risk.' : 'Vendor spend is reasonably distributed.'}`,
      metric: `${top3Pct.toFixed(1)}%`,
      metricLabel: 'of total spend',
      entityType: 'portfolio',
      priority: severity === 'critical' ? 1 : severity === 'warning' ? 3 : 6,
    });
  }

  // Highest spending vendor
  if (sorted.length > 0) {
    const [topVendor, topSpend] = sorted[0];
    const topPct = (topSpend / totalExpenses) * 100;
    insights.push({
      id: nextId(),
      category: 'vendor',
      severity: topPct > 25 ? 'warning' : 'info',
      title: `${topVendor} is the highest-spend vendor at ${formatCurrency(topSpend)}`,
      description: `This vendor accounts for ${topPct.toFixed(1)}% of total expenses across ${vendorCount} vendors. ${topPct > 25 ? 'High single-vendor dependency detected — review contract terms and explore alternatives.' : 'Spend level is within normal range.'}`,
      metric: formatCurrency(topSpend),
      metricLabel: `${topPct.toFixed(1)}% of total`,
      entity: topVendor,
      entityType: 'vendor',
      priority: topPct > 25 ? 2 : 7,
    });
  }

  // Vendors with disproportionate costs (above 2x average)
  const avgSpend = totalExpenses / vendorCount;
  const disproportionate = sorted.filter(([, v]) => v > avgSpend * 2);
  if (disproportionate.length > 0) {
    insights.push({
      id: nextId(),
      category: 'vendor',
      severity: 'warning',
      title: `${disproportionate.length} vendor${disproportionate.length > 1 ? 's' : ''} with disproportionately high costs`,
      description: `${disproportionate.map(([n]) => n).join(', ')} ${disproportionate.length > 1 ? 'each spend' : 'spends'} more than 2× the average vendor cost of ${formatCurrency(avgSpend)}. Review pricing and contract terms for potential savings.`,
      metric: `${disproportionate.length}`,
      metricLabel: `vendor${disproportionate.length > 1 ? 's' : ''} above 2× avg`,
      entityType: 'portfolio',
      priority: 4,
    });
  }

  // Overdue invoices
  const overdueExpenses = expenses.filter(e => e.status === 'overdue');
  if (overdueExpenses.length > 0) {
    const overdueTotal = overdueExpenses.reduce((s, e) => s + e.amount, 0);
    const overdueVendors = new Set(overdueExpenses.map(e => e.supplierName));
    insights.push({
      id: nextId(),
      category: 'vendor',
      severity: overdueTotal > 500000 ? 'critical' : 'warning',
      title: `${formatCurrency(overdueTotal)} in overdue vendor invoices`,
      description: `${overdueExpenses.length} invoices from ${overdueVendors.size} vendor${overdueVendors.size > 1 ? 's' : ''} are overdue. Delayed payments may damage vendor relationships and incur penalties.`,
      metric: formatCurrency(overdueTotal),
      metricLabel: `${overdueExpenses.length} overdue invoices`,
      entityType: 'portfolio',
      priority: 2,
    });
  }
}

// ── Cost-to-Income Ratio ──────────────────────────────────────
function generateCostEfficiencyInsights(income: IncomeRecord[], expenses: ExpenseRecord[], insights: Insight[]) {
  if (income.length === 0 || expenses.length === 0) return;

  // Aggregate by property
  const propIncome = new Map<string, { name: string; income: number }>();
  income.forEach(r => {
    const existing = propIncome.get(r.staNo) || { name: r.propertyName, income: 0 };
    existing.income += r.propertyIncome;
    propIncome.set(r.staNo, existing);
  });

  const propExpense = new Map<string, number>();
  expenses.forEach(r => propExpense.set(r.staNo, (propExpense.get(r.staNo) || 0) + r.amount));

  const properties = Array.from(propIncome.entries()).map(([staNo, { name, income: inc }]) => {
    const exp = propExpense.get(staNo) || 0;
    const cir = inc > 0 ? exp / inc : 0;
    return { staNo, name, income: inc, expenses: exp, cir };
  });

  // Highest CIR property
  const sorted = [...properties].sort((a, b) => b.cir - a.cir);
  if (sorted.length > 0 && sorted[0].cir > 0) {
    const worst = sorted[0];
    const severity = worst.cir > 1 ? 'critical' : worst.cir > 0.7 ? 'warning' : 'info';
    insights.push({
      id: nextId(),
      category: 'cost-efficiency',
      severity,
      title: `${worst.name} has the highest cost-to-income ratio at ${(worst.cir * 100).toFixed(1)}%`,
      description: `Expenses of ${formatCurrency(worst.expenses)} against income of ${formatCurrency(worst.income)}. ${worst.cir > 1 ? 'This property is operating at a loss — immediate cost review recommended.' : worst.cir > 0.7 ? 'High cost ratio — investigate expense drivers.' : 'Cost ratio is within acceptable range.'}`,
      metric: `${(worst.cir * 100).toFixed(1)}%`,
      metricLabel: 'cost-to-income',
      entity: worst.name,
      entityType: 'property',
      priority: severity === 'critical' ? 1 : severity === 'warning' ? 3 : 8,
    });
  }

  // Properties exceeding 80% CIR
  const highCIR = properties.filter(p => p.cir > 0.8);
  if (highCIR.length > 1) {
    insights.push({
      id: nextId(),
      category: 'cost-efficiency',
      severity: 'warning',
      title: `${highCIR.length} properties have cost-to-income ratios above 80%`,
      description: `${highCIR.map(p => p.name).join(', ')} are spending more than 80% of their income on expenses. These properties need cost optimization or revenue growth strategies.`,
      metric: `${highCIR.length}`,
      metricLabel: 'properties above 80% CIR',
      entityType: 'portfolio',
      priority: 3,
    });
  }

  // Portfolio average CIR
  const totalIncome = properties.reduce((s, p) => s + p.income, 0);
  const totalExpenses = properties.reduce((s, p) => s + p.expenses, 0);
  if (totalIncome > 0) {
    const avgCIR = totalExpenses / totalIncome;
    insights.push({
      id: nextId(),
      category: 'cost-efficiency',
      severity: avgCIR > 0.6 ? 'warning' : 'info',
      title: `Portfolio average cost-to-income ratio is ${(avgCIR * 100).toFixed(1)}%`,
      description: `Total expenses of ${formatCurrency(totalExpenses)} against total income of ${formatCurrency(totalIncome)}. ${avgCIR < 0.45 ? 'Excellent cost efficiency across the portfolio.' : avgCIR < 0.6 ? 'Cost efficiency is acceptable but has room for improvement.' : 'Portfolio costs are elevated — review expense categories for savings.'}`,
      metric: `${(avgCIR * 100).toFixed(1)}%`,
      metricLabel: 'portfolio CIR',
      entityType: 'portfolio',
      priority: 9,
    });
  }
}

// ── Outstanding Receivables ───────────────────────────────────
function generateReceivableInsights(income: IncomeRecord[], insights: Insight[]) {
  if (income.length === 0) return;

  const propReceivables = new Map<string, { name: string; receivable: number; collected: number; outstanding: number }>();
  income.forEach(r => {
    const existing = propReceivables.get(r.staNo) || { name: r.propertyName, receivable: 0, collected: 0, outstanding: 0 };
    existing.receivable += r.incomeReceivable;
    existing.collected += r.propertyIncome;
    existing.outstanding += (r.incomeReceivable - r.propertyIncome);
    propReceivables.set(r.staNo, existing);
  });

  const properties = Array.from(propReceivables.values());
  const totalReceivable = properties.reduce((s, p) => s + p.receivable, 0);
  const totalOutstanding = properties.reduce((s, p) => s + p.outstanding, 0);
  const totalCollected = properties.reduce((s, p) => s + p.collected, 0);

  // Total outstanding receivables
  if (totalOutstanding > 0) {
    const outstandingPct = (totalOutstanding / totalReceivable) * 100;
    insights.push({
      id: nextId(),
      category: 'receivables',
      severity: outstandingPct > 15 ? 'critical' : outstandingPct > 8 ? 'warning' : 'info',
      title: `${formatCurrency(totalOutstanding)} in outstanding receivables (${outstandingPct.toFixed(1)}% of total)`,
      description: `Out of ${formatCurrency(totalReceivable)} total receivable, ${formatCurrency(totalCollected)} has been collected. ${outstandingPct > 15 ? 'Outstanding amount is critically high — escalate collection efforts.' : outstandingPct > 8 ? 'Outstanding amount needs attention — review collection processes.' : 'Outstanding amount is within acceptable range.'}`,
      metric: formatCurrency(totalOutstanding),
      metricLabel: `${outstandingPct.toFixed(1)}% outstanding`,
      entityType: 'portfolio',
      priority: outstandingPct > 15 ? 1 : outstandingPct > 8 ? 3 : 7,
    });
  }

  // Property with highest outstanding
  const sortedByOutstanding = [...properties].sort((a, b) => b.outstanding - a.outstanding);
  if (sortedByOutstanding.length > 0 && sortedByOutstanding[0].outstanding > 0) {
    const worst = sortedByOutstanding[0];
    const pct = worst.receivable > 0 ? (worst.outstanding / worst.receivable) * 100 : 0;
    insights.push({
      id: nextId(),
      category: 'receivables',
      severity: pct > 20 ? 'critical' : 'warning',
      title: `${worst.name} has the highest outstanding receivables at ${formatCurrency(worst.outstanding)}`,
      description: `${pct.toFixed(1)}% of this property's receivable income remains uncollected. ${pct > 20 ? 'Critical collection issue — review tenant payment status and escalate.' : 'Monitor collection progress closely.'}`,
      metric: formatCurrency(worst.outstanding),
      metricLabel: `${pct.toFixed(1)}% uncollected`,
      entity: worst.name,
      entityType: 'property',
      priority: pct > 20 ? 2 : 4,
    });
  }

  // Properties with low collection rates (<85%)
  const lowCollection = properties.filter(p => p.receivable > 0 && (p.collected / p.receivable) < 0.85);
  if (lowCollection.length > 0) {
    const sorted = lowCollection.sort((a, b) => (a.collected / a.receivable) - (b.collected / b.receivable));
    insights.push({
      id: nextId(),
      category: 'receivables',
      severity: 'warning',
      title: `${lowCollection.length} propert${lowCollection.length > 1 ? 'ies' : 'y'} with collection rates below 85%`,
      description: `${sorted.map(p => `${p.name} (${formatPercent(p.collected / p.receivable)})`).join(', ')}. Low collection rates indicate potential cash flow issues — investigate tenant payment patterns.`,
      metric: `${lowCollection.length}`,
      metricLabel: 'below 85% collection',
      entityType: 'portfolio',
      priority: 3,
    });
  }
}

// ── Income Changes (MoM) ─────────────────────────────────────
function generateIncomeChangeInsights(allIncome: IncomeRecord[], selectedMonth: string | 'all', insights: Insight[]) {
  const months = Array.from(new Set(allIncome.map(r => r.month))).sort();
  if (months.length < 2) return;

  const latestMonth = selectedMonth !== 'all' ? selectedMonth : months[months.length - 1];
  const latestIdx = months.indexOf(latestMonth);
  if (latestIdx < 1) return;
  const prevMonth = months[latestIdx - 1];

  const latestIncome = allIncome.filter(r => r.month === latestMonth);
  const prevIncome = allIncome.filter(r => r.month === prevMonth);

  const latestTotal = latestIncome.reduce((s, r) => s + r.propertyIncome, 0);
  const prevTotal = prevIncome.reduce((s, r) => s + r.propertyIncome, 0);

  if (prevTotal === 0) return;

  const changePct = ((latestTotal - prevTotal) / prevTotal) * 100;
  const monthLabel = new Date(latestMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const prevLabel = new Date(prevMonth + '-01').toLocaleDateString('en-US', { month: 'short' });

  insights.push({
    id: nextId(),
    category: 'income-change',
    severity: changePct < -5 ? 'critical' : changePct < 0 ? 'warning' : 'positive',
    title: `Total income ${changePct >= 0 ? 'increased' : 'decreased'} by ${Math.abs(changePct).toFixed(1)}% in ${monthLabel}`,
    description: `Income moved from ${formatCurrency(prevTotal)} (${prevLabel}) to ${formatCurrency(latestTotal)}. ${changePct < -5 ? 'Significant decline — investigate property-level income drops.' : changePct < 0 ? 'Slight decline — monitor next month.' : changePct > 5 ? 'Strong growth — identify contributing properties.' : 'Stable income performance.'}`,
    metric: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`,
    metricLabel: 'month-on-month',
    entityType: 'portfolio',
    trend: changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'stable',
    changePercent: changePct,
    priority: changePct < -5 ? 2 : changePct < 0 ? 5 : 8,
  });

  // Property with largest income increase
  const propLatest = new Map<string, { name: string; income: number }>();
  latestIncome.forEach(r => {
    const ex = propLatest.get(r.staNo) || { name: r.propertyName, income: 0 };
    ex.income += r.propertyIncome;
    propLatest.set(r.staNo, ex);
  });

  const propPrev = new Map<string, number>();
  prevIncome.forEach(r => propPrev.set(r.staNo, (propPrev.get(r.staNo) || 0) + r.propertyIncome));

  const changes = Array.from(propLatest.entries()).map(([staNo, { name, income }]) => {
    const prev = propPrev.get(staNo) || 0;
    const change = prev > 0 ? ((income - prev) / prev) * 100 : 0;
    return { staNo, name, income, prev, change, absolute: income - prev };
  }).filter(c => c.prev > 0);

  // Largest increase
  const sortedUp = [...changes].sort((a, b) => b.change - a.change);
  if (sortedUp.length > 0 && sortedUp[0].change > 2) {
    const best = sortedUp[0];
    insights.push({
      id: nextId(),
      category: 'income-change',
      severity: 'positive',
      title: `${best.name} had the largest income increase (+${best.change.toFixed(1)}%)`,
      description: `Income grew from ${formatCurrency(best.prev)} to ${formatCurrency(best.income)}, an increase of ${formatCurrency(best.absolute)}. Identify what drove this growth to replicate across other properties.`,
      metric: `+${best.change.toFixed(1)}%`,
      metricLabel: `+${formatCurrency(best.absolute)}`,
      entity: best.name,
      entityType: 'property',
      trend: 'up',
      changePercent: best.change,
      priority: 10,
    });
  }

  // Largest decrease
  const sortedDown = [...changes].sort((a, b) => a.change - b.change);
  if (sortedDown.length > 0 && sortedDown[0].change < -2) {
    const worst = sortedDown[0];
    insights.push({
      id: nextId(),
      category: 'income-change',
      severity: worst.change < -10 ? 'critical' : 'warning',
      title: `${worst.name} had the largest income decline (${worst.change.toFixed(1)}%)`,
      description: `Income dropped from ${formatCurrency(worst.prev)} to ${formatCurrency(worst.income)}, a decrease of ${formatCurrency(Math.abs(worst.absolute))}. Investigate tenant vacancies, lease expirations, or payment delays.`,
      metric: `${worst.change.toFixed(1)}%`,
      metricLabel: `-${formatCurrency(Math.abs(worst.absolute))}`,
      entity: worst.name,
      entityType: 'property',
      trend: 'down',
      changePercent: worst.change,
      priority: worst.change < -10 ? 2 : 4,
    });
  }
}

// ── Expense Changes (MoM) ────────────────────────────────────
function generateExpenseChangeInsights(allExpenses: ExpenseRecord[], selectedMonth: string | 'all', insights: Insight[]) {
  const months = Array.from(new Set(allExpenses.map(r => r.month))).sort();
  if (months.length < 2) return;

  const latestMonth = selectedMonth !== 'all' ? selectedMonth : months[months.length - 1];
  const latestIdx = months.indexOf(latestMonth);
  if (latestIdx < 1) return;
  const prevMonth = months[latestIdx - 1];

  const latestExpenses = allExpenses.filter(r => r.month === latestMonth);
  const prevExpenses = allExpenses.filter(r => r.month === prevMonth);

  const latestTotal = latestExpenses.reduce((s, r) => s + r.amount, 0);
  const prevTotal = prevExpenses.reduce((s, r) => s + r.amount, 0);

  if (prevTotal === 0) return;

  const changePct = ((latestTotal - prevTotal) / prevTotal) * 100;
  const monthLabel = new Date(latestMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // For expenses, increase is bad, decrease is good
  insights.push({
    id: nextId(),
    category: 'expense-change',
    severity: changePct > 10 ? 'critical' : changePct > 3 ? 'warning' : changePct < -3 ? 'positive' : 'info',
    title: `Total expenses ${changePct >= 0 ? 'increased' : 'decreased'} by ${Math.abs(changePct).toFixed(1)}% in ${monthLabel}`,
    description: `Expenses moved from ${formatCurrency(prevTotal)} to ${formatCurrency(latestTotal)}. ${changePct > 10 ? 'Significant cost increase — review category-level expense changes.' : changePct > 3 ? 'Moderate cost increase — monitor for sustained trends.' : changePct < -3 ? 'Cost reduction achieved — identify which categories contributed.' : 'Expenses remained stable.'}`,
    metric: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`,
    metricLabel: 'month-on-month',
    entityType: 'portfolio',
    trend: changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'stable',
    changePercent: changePct,
    priority: changePct > 10 ? 2 : changePct > 3 ? 5 : 9,
  });

  // Vendor with largest expense increase
  const vendorLatest = new Map<string, number>();
  latestExpenses.forEach(r => vendorLatest.set(r.supplierName, (vendorLatest.get(r.supplierName) || 0) + r.amount));

  const vendorPrev = new Map<string, number>();
  prevExpenses.forEach(r => vendorPrev.set(r.supplierName, (vendorPrev.get(r.supplierName) || 0) + r.amount));

  const vendorChanges = Array.from(vendorLatest.entries()).map(([name, amount]) => {
    const prev = vendorPrev.get(name) || 0;
    const change = prev > 0 ? ((amount - prev) / prev) * 100 : 0;
    return { name, amount, prev, change, absolute: amount - prev };
  }).filter(c => c.prev > 0);

  const sortedVendorUp = [...vendorChanges].sort((a, b) => b.change - a.change);
  if (sortedVendorUp.length > 0 && sortedVendorUp[0].change > 5) {
    const worst = sortedVendorUp[0];
    insights.push({
      id: nextId(),
      category: 'expense-change',
      severity: worst.change > 20 ? 'critical' : 'warning',
      title: `${worst.name} costs increased by ${worst.change.toFixed(1)}%`,
      description: `Spend rose from ${formatCurrency(worst.prev)} to ${formatCurrency(worst.amount)}, an increase of ${formatCurrency(worst.absolute)}. Review recent invoices and contract terms.`,
      metric: `+${worst.change.toFixed(1)}%`,
      metricLabel: `+${formatCurrency(worst.absolute)}`,
      entity: worst.name,
      entityType: 'vendor',
      trend: 'up',
      changePercent: worst.change,
      priority: worst.change > 20 ? 3 : 6,
    });
  }

  // Category with largest expense increase
  const catLatest = new Map<string, number>();
  latestExpenses.forEach(r => catLatest.set(r.category, (catLatest.get(r.category) || 0) + r.amount));

  const catPrev = new Map<string, number>();
  prevExpenses.forEach(r => catPrev.set(r.category, (catPrev.get(r.category) || 0) + r.amount));

  const catChanges = Array.from(catLatest.entries()).map(([cat, amount]) => {
    const prev = catPrev.get(cat) || 0;
    const change = prev > 0 ? ((amount - prev) / prev) * 100 : 0;
    return { cat, amount, prev, change };
  }).filter(c => c.prev > 0 && Math.abs(c.change) > 5);

  const sortedCatUp = [...catChanges].sort((a, b) => b.change - a.change);
  if (sortedCatUp.length > 0 && sortedCatUp[0].change > 5) {
    const worst = sortedCatUp[0];
    insights.push({
      id: nextId(),
      category: 'expense-change',
      severity: 'info',
      title: `${worst.cat} expenses increased by ${worst.change.toFixed(1)}%`,
      description: `Category spend rose from ${formatCurrency(worst.prev)} to ${formatCurrency(worst.amount)}. Review whether this is seasonal or indicates a cost escalation trend.`,
      metric: `+${worst.change.toFixed(1)}%`,
      metricLabel: worst.cat,
      entityType: 'portfolio',
      trend: 'up',
      changePercent: worst.change,
      priority: 11,
    });
  }
}

// ── Profitability ─────────────────────────────────────────────
function generateProfitabilityInsights(income: IncomeRecord[], expenses: ExpenseRecord[], insights: Insight[]) {
  if (income.length === 0) return;

  const propIncome = new Map<string, { name: string; income: number }>();
  income.forEach(r => {
    const ex = propIncome.get(r.staNo) || { name: r.propertyName, income: 0 };
    ex.income += r.propertyIncome;
    propIncome.set(r.staNo, ex);
  });

  const propExpense = new Map<string, number>();
  expenses.forEach(r => propExpense.set(r.staNo, (propExpense.get(r.staNo) || 0) + r.amount));

  const properties = Array.from(propIncome.entries()).map(([staNo, { name, income: inc }]) => {
    const exp = propExpense.get(staNo) || 0;
    const netProfit = inc - exp;
    const margin = inc > 0 ? netProfit / inc : 0;
    return { staNo, name, income: inc, expenses: exp, netProfit, margin };
  });

  // Loss-making properties
  const lossMaking = properties.filter(p => p.netProfit < 0);
  if (lossMaking.length > 0) {
    const totalLoss = lossMaking.reduce((s, p) => s + Math.abs(p.netProfit), 0);
    insights.push({
      id: nextId(),
      category: 'profitability',
      severity: 'critical',
      title: `${lossMaking.length} propert${lossMaking.length > 1 ? 'ies are' : 'y is'} operating at a loss`,
      description: `${lossMaking.map(p => `${p.name} (${formatCurrency(p.netProfit)})`).join(', ')}. Combined losses total ${formatCurrency(totalLoss)}. Immediate review of cost structures and revenue strategies needed.`,
      metric: formatCurrency(totalLoss),
      metricLabel: 'total losses',
      entityType: 'portfolio',
      priority: 1,
    });
  }

  // Lowest margin property
  const sortedByMargin = [...properties].sort((a, b) => a.margin - b.margin);
  if (sortedByMargin.length > 0) {
    const lowest = sortedByMargin[0];
    if (lowest.margin < 0.3) {
      insights.push({
        id: nextId(),
        category: 'profitability',
        severity: lowest.margin < 0 ? 'critical' : 'warning',
        title: `${lowest.name} has the lowest profit margin at ${(lowest.margin * 100).toFixed(1)}%`,
        description: `With income of ${formatCurrency(lowest.income)} and expenses of ${formatCurrency(lowest.expenses)}, this property's net profit is ${formatCurrency(lowest.netProfit)}. ${lowest.margin < 0 ? 'Property is loss-making.' : 'Margin is thin — optimize costs or increase revenue.'}`,
        metric: `${(lowest.margin * 100).toFixed(1)}%`,
        metricLabel: 'profit margin',
        entity: lowest.name,
        entityType: 'property',
        priority: lowest.margin < 0 ? 1 : 4,
      });
    }
  }

  // Highest margin property (opportunity)
  const sortedByMarginDesc = [...properties].sort((a, b) => b.margin - a.margin);
  if (sortedByMarginDesc.length > 0) {
    const best = sortedByMarginDesc[0];
    insights.push({
      id: nextId(),
      category: 'profitability',
      severity: 'positive',
      title: `${best.name} leads with the highest profit margin at ${(best.margin * 100).toFixed(1)}%`,
      description: `Net profit of ${formatCurrency(best.netProfit)} from income of ${formatCurrency(best.income)}. Study this property's cost structure as a benchmark for underperforming properties.`,
      metric: `${(best.margin * 100).toFixed(1)}%`,
      metricLabel: 'profit margin',
      entity: best.name,
      entityType: 'property',
      trend: 'up',
      priority: 10,
    });
  }

  // Portfolio net profit
  const totalIncome = properties.reduce((s, p) => s + p.income, 0);
  const totalExpenses = properties.reduce((s, p) => s + p.expenses, 0);
  const netProfit = totalIncome - totalExpenses;
  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
  insights.push({
    id: nextId(),
    category: 'profitability',
    severity: margin < 30 ? 'warning' : 'positive',
    title: `Portfolio net profit is ${formatCurrency(netProfit)} with a ${margin.toFixed(1)}% margin`,
    description: `Across ${properties.length} properties, total income is ${formatCurrency(totalIncome)} and total expenses are ${formatCurrency(totalExpenses)}. ${margin > 50 ? 'Strong portfolio profitability.' : margin > 30 ? 'Healthy margin with room for improvement.' : 'Margin is below target — review cost drivers.'}`,
    metric: formatCurrency(netProfit),
    metricLabel: `${margin.toFixed(1)}% margin`,
    entityType: 'portfolio',
    priority: 7,
  });
}

// ── Risk Alerts ───────────────────────────────────────────────
function generateRiskInsights(income: IncomeRecord[], expenses: ExpenseRecord[], insights: Insight[]) {
  if (income.length === 0) return;

  // Deferred income concentration
  const totalDeferred = income.reduce((s, r) => s + r.deferredIncome, 0);
  const totalReceivable = income.reduce((s, r) => s + r.incomeReceivable, 0);
  if (totalDeferred > 0 && totalReceivable > 0) {
    const deferredPct = (totalDeferred / totalReceivable) * 100;
    if (deferredPct > 5) {
      insights.push({
        id: nextId(),
        category: 'risk',
        severity: deferredPct > 10 ? 'warning' : 'info',
        title: `${formatCurrency(totalDeferred)} in deferred income (${deferredPct.toFixed(1)}% of receivable)`,
        description: `Deferred income represents revenue recognized but not yet due. ${deferredPct > 10 ? 'High deferred amount may indicate timing risks in revenue recognition.' : 'Deferred amount is within normal range.'}`,
        metric: formatCurrency(totalDeferred),
        metricLabel: `${deferredPct.toFixed(1)}% deferred`,
        entityType: 'portfolio',
        priority: deferredPct > 10 ? 5 : 11,
      });
    }
  }

  // Pending expenses
  const pendingExpenses = expenses.filter(e => e.status === 'pending');
  if (pendingExpenses.length > 0) {
    const pendingTotal = pendingExpenses.reduce((s, e) => s + e.amount, 0);
    insights.push({
      id: nextId(),
      category: 'risk',
      severity: pendingTotal > 300000 ? 'warning' : 'info',
      title: `${formatCurrency(pendingTotal)} in pending vendor invoices`,
      description: `${pendingExpenses.length} invoices are awaiting payment. Ensure timely processing to avoid late payment penalties and maintain vendor relationships.`,
      metric: formatCurrency(pendingTotal),
      metricLabel: `${pendingExpenses.length} pending`,
      entityType: 'portfolio',
      priority: pendingTotal > 300000 ? 6 : 12,
    });
  }
}

// ── Opportunities ─────────────────────────────────────────────
function generateOpportunityInsights(income: IncomeRecord[], expenses: ExpenseRecord[], insights: Insight[]) {
  if (income.length === 0 || expenses.length === 0) return;

  // Properties with improving collection rates (multi-month)
  const months = Array.from(new Set(income.map(r => r.month))).sort();
  if (months.length >= 3) {
    const propMonthly = new Map<string, Map<string, { name: string; collected: number; receivable: number }>>();
    income.forEach(r => {
      if (!propMonthly.has(r.staNo)) propMonthly.set(r.staNo, new Map());
      const monthMap = propMonthly.get(r.staNo)!;
      const existing = monthMap.get(r.month) || { name: r.propertyName, collected: 0, receivable: 0 };
      existing.collected += r.propertyIncome;
      existing.receivable += r.incomeReceivable;
      monthMap.set(r.month, existing);
    });

    const improving: string[] = [];
    Array.from(propMonthly.entries()).forEach(([, monthMap]) => {
      const sorted = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      if (sorted.length >= 3) {
        const rates = sorted.map(([, d]) => d.receivable > 0 ? d.collected / d.receivable : 0);
        const last3 = rates.slice(-3);
        if (last3[2] > last3[1] && last3[1] > last3[0]) {
          improving.push(sorted[0][1].name);
        }
      }
    });

    if (improving.length > 0) {
      insights.push({
        id: nextId(),
        category: 'opportunity',
        severity: 'positive',
        title: `${improving.length} propert${improving.length > 1 ? 'ies show' : 'y shows'} improving collection rates`,
        description: `${improving.join(', ')} ${improving.length > 1 ? 'have' : 'has'} shown consistent collection rate improvement over the last 3 months. Continue current collection strategies at these properties.`,
        metric: `${improving.length}`,
        metricLabel: 'improving',
        entityType: 'portfolio',
        trend: 'up',
        priority: 10,
      });
    }
  }

  // Properties with high income and low cost (stars)
  const propIncome = new Map<string, { name: string; income: number }>();
  income.forEach(r => {
    const ex = propIncome.get(r.staNo) || { name: r.propertyName, income: 0 };
    ex.income += r.propertyIncome;
    propIncome.set(r.staNo, ex);
  });

  const propExpense = new Map<string, number>();
  expenses.forEach(r => propExpense.set(r.staNo, (propExpense.get(r.staNo) || 0) + r.amount));

  const properties = Array.from(propIncome.entries()).map(([staNo, { name, income: inc }]) => {
    const exp = propExpense.get(staNo) || 0;
    const margin = inc > 0 ? (inc - exp) / inc : 0;
    return { staNo, name, income: inc, expenses: exp, margin };
  });

  const avgIncome = properties.reduce((s, p) => s + p.income, 0) / properties.length;
  const stars = properties.filter(p => p.income > avgIncome && p.margin > 0.6);
  if (stars.length > 0) {
    insights.push({
      id: nextId(),
      category: 'opportunity',
      severity: 'positive',
      title: `${stars.length} star propert${stars.length > 1 ? 'ies' : 'y'}: high income with strong margins`,
      description: `${stars.map(p => `${p.name} (${(p.margin * 100).toFixed(0)}% margin)`).join(', ')} ${stars.length > 1 ? 'generate' : 'generates'} above-average income with margins exceeding 60%. These are your portfolio's top performers.`,
      metric: `${stars.length}`,
      metricLabel: 'star properties',
      entityType: 'portfolio',
      trend: 'up',
      priority: 9,
    });
  }
}


