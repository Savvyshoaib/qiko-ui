// ============================================================
// Analytics Engine — Computes KPIs, summaries, and risk items
// ============================================================

import type {
  IncomeRecord,
  ExpenseRecord,
  PortfolioKPIs,
  PropertySummary,
  VendorSummary,
  RiskItem,
  MonthlyDataPoint,
  FinancialHealthSummary,
  SummaryMetric,
  PropertyIncomeAnalysis,
} from './types';

export function computePortfolioKPIs(
  income: IncomeRecord[],
  expenses: ExpenseRecord[],
  selectedMonth: string | 'all',
  comparisonMonth?: string
): PortfolioKPIs {
  const filteredIncome = selectedMonth === 'all' ? income : income.filter(r => r.month === selectedMonth);
  const filteredExpenses = selectedMonth === 'all' ? expenses : expenses.filter(r => r.month === selectedMonth);

  const totalIncome = filteredIncome.reduce((s, r) => s + r.propertyIncome, 0);
  const totalExpenses = filteredExpenses.reduce((s, r) => s + r.amount, 0);
  const totalExpensesNett = filteredExpenses.reduce((s, r) => s + (r.nett || r.amount), 0);
  const totalVAT = filteredExpenses.reduce((s, r) => s + (r.vat || 0), 0);
  const totalReceivable = filteredIncome.reduce((s, r) => s + r.incomeReceivable, 0);
  const totalDeferred = filteredIncome.reduce((s, r) => s + r.deferredIncome, 0);
  const uncollectedIncome = totalReceivable - totalIncome;
  const collectionRate = totalReceivable > 0 ? totalIncome / totalReceivable : 0;

  const properties = new Set(filteredIncome.map(r => r.staNo));
  const vendors = new Set(filteredExpenses.map(r => r.supplierName));
  const overdueExpenses = filteredExpenses.filter(r => r.status === 'overdue');

  // Month-on-month comparison
  let incomeChangePercent = 0;
  let expenseChangePercent = 0;
  if (comparisonMonth) {
    const prevIncome = income.filter(r => r.month === comparisonMonth).reduce((s, r) => s + r.propertyIncome, 0);
    const prevExpenses = expenses.filter(r => r.month === comparisonMonth).reduce((s, r) => s + r.amount, 0);
    incomeChangePercent = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;
    expenseChangePercent = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;
  }

  return {
    totalIncome,
    totalExpenses,
    totalExpensesNett,
    totalVAT,
    netIncome: totalIncome - totalExpenses,
    collectionRate,
    totalReceivable,
    totalDeferred,
    uncollectedIncome,
    propertyCount: properties.size,
    vendorCount: vendors.size,
    overdueInvoices: overdueExpenses.length,
    overdueAmount: overdueExpenses.reduce((s, r) => s + r.amount, 0),
    incomeChangePercent,
    expenseChangePercent,
  };
}

export function computePropertySummaries(
  income: IncomeRecord[],
  expenses: ExpenseRecord[],
  selectedMonth: string | 'all'
): PropertySummary[] {
  const filteredIncome = selectedMonth === 'all' ? income : income.filter(r => r.month === selectedMonth);
  const filteredExpenses = selectedMonth === 'all' ? expenses : expenses.filter(r => r.month === selectedMonth);

  const propertyMap = new Map<string, PropertySummary>();

  // Aggregate income
  for (const r of filteredIncome) {
    if (!propertyMap.has(r.staNo)) {
      propertyMap.set(r.staNo, {
        staNo: r.staNo,
        propertyName: r.propertyName,
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        collectionRate: 0,
        incomeReceivable: 0,
        deferredIncome: 0,
        uncollectedAmount: 0,
        expenseBreakdown: {},
        monthlyTrend: [],
      });
    }
    const p = propertyMap.get(r.staNo)!;
    p.totalIncome += r.propertyIncome;
    p.incomeReceivable += r.incomeReceivable;
    p.deferredIncome += r.deferredIncome;
  }

  // Aggregate expenses
  for (const r of filteredExpenses) {
    if (!propertyMap.has(r.staNo)) continue;
    const p = propertyMap.get(r.staNo)!;
    p.totalExpenses += r.amount;
    p.expenseBreakdown[r.category] = (p.expenseBreakdown[r.category] || 0) + r.amount;
  }

  // Compute derived fields and monthly trends
  const allMonths = Array.from(new Set(income.map(r => r.month))).sort();

  for (const [staNo, p] of Array.from(propertyMap.entries())) {
    p.netIncome = p.totalIncome - p.totalExpenses;
    p.collectionRate = p.incomeReceivable > 0 ? p.totalIncome / p.incomeReceivable : 0;
    p.uncollectedAmount = p.incomeReceivable - p.totalIncome;

    // Monthly trend (net income per month)
    p.monthlyTrend = allMonths.map(month => {
      const mIncome = income.filter(r => r.staNo === staNo && r.month === month).reduce((s, r) => s + r.propertyIncome, 0);
      const mExpense = expenses.filter(r => r.staNo === staNo && r.month === month).reduce((s, r) => s + r.amount, 0);
      return { month, value: mIncome - mExpense };
    });
  }

  return Array.from(propertyMap.values()).sort((a, b) => b.netIncome - a.netIncome);
}

export function computeVendorSummaries(
  expenses: ExpenseRecord[],
  selectedMonth: string | 'all'
): VendorSummary[] {
  const filtered = selectedMonth === 'all' ? expenses : expenses.filter(r => r.month === selectedMonth);
  const vendorMap = new Map<string, VendorSummary>();

  for (const r of filtered) {
    if (!vendorMap.has(r.supplierName)) {
      vendorMap.set(r.supplierName, {
        supplierName: r.supplierName,
        totalSpend: 0,
        invoiceCount: 0,
        avgInvoiceAmount: 0,
        properties: [],
        categories: [],
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        monthlySpend: [],
      });
    }
    const v = vendorMap.get(r.supplierName)!;
    v.totalSpend += r.amount;
    v.invoiceCount += 1;
    if (!v.properties.includes(r.propertyName)) v.properties.push(r.propertyName);
    if (!v.categories.includes(r.category)) v.categories.push(r.category);
    if (r.status === 'paid') v.paidAmount += r.amount;
    else if (r.status === 'pending') v.pendingAmount += r.amount;
    else v.overdueAmount += r.amount;
  }

  // Monthly trends
  const allMonths = Array.from(new Set(expenses.map(r => r.month))).sort();
  for (const [name, v] of Array.from(vendorMap.entries())) {
    v.avgInvoiceAmount = v.invoiceCount > 0 ? v.totalSpend / v.invoiceCount : 0;
    v.monthlySpend = allMonths.map(month => ({
      month,
      value: expenses.filter(r => r.supplierName === name && r.month === month).reduce((s, r) => s + r.amount, 0),
    }));
  }

  return Array.from(vendorMap.values()).sort((a, b) => b.totalSpend - a.totalSpend);
}

export function identifyRisks(
  income: IncomeRecord[],
  expenses: ExpenseRecord[],
  propertySummaries: PropertySummary[],
  vendorSummaries: VendorSummary[]
): RiskItem[] {
  const risks: RiskItem[] = [];
  let id = 1;

  // 1. Uncollected income by property
  for (const p of propertySummaries) {
    if (p.collectionRate < 0.85 && p.uncollectedAmount > 10000) {
      risks.push({
        id: `RISK-${id++}`,
        type: 'uncollected_income',
        severity: p.collectionRate < 0.75 ? 'high' : 'medium',
        title: `Low collection rate at ${p.propertyName}`,
        description: `Collection rate is ${(p.collectionRate * 100).toFixed(1)}% with ${formatCurrency(p.uncollectedAmount)} uncollected.`,
        amount: p.uncollectedAmount,
        property: p.propertyName,
      });
    }
  }

  // 2. Overdue invoices
  const overdueExpenses = expenses.filter(r => r.status === 'overdue');
  const overdueByVendor = new Map<string, { count: number; amount: number }>();
  for (const e of overdueExpenses) {
    const v = overdueByVendor.get(e.supplierName) || { count: 0, amount: 0 };
    v.count += 1;
    v.amount += e.amount;
    overdueByVendor.set(e.supplierName, v);
  }
  for (const [vendor, data] of Array.from(overdueByVendor.entries())) {
    if (data.amount > 5000) {
      risks.push({
        id: `RISK-${id++}`,
        type: 'overdue_invoice',
        severity: data.amount > 20000 ? 'high' : 'medium',
        title: `Overdue invoices from ${vendor}`,
        description: `${data.count} overdue invoices totalling ${formatCurrency(data.amount)}.`,
        amount: data.amount,
        vendor,
      });
    }
  }

  // 3. High expense ratio properties
  for (const p of propertySummaries) {
    if (p.totalIncome > 0) {
      const ratio = p.totalExpenses / p.totalIncome;
      if (ratio > 0.7) {
        risks.push({
          id: `RISK-${id++}`,
          type: 'high_expense_ratio',
          severity: ratio > 0.9 ? 'high' : 'medium',
          title: `High expense ratio at ${p.propertyName}`,
          description: `Expenses are ${(ratio * 100).toFixed(1)}% of income. Net margin is thin.`,
          amount: p.totalExpenses,
          property: p.propertyName,
        });
      }
    }
  }

  // 4. Income decline detection
  for (const p of propertySummaries) {
    if (p.monthlyTrend.length >= 2) {
      const last = p.monthlyTrend[p.monthlyTrend.length - 1].value;
      const prev = p.monthlyTrend[p.monthlyTrend.length - 2].value;
      if (prev > 0 && (last - prev) / prev < -0.15) {
        risks.push({
          id: `RISK-${id++}`,
          type: 'income_decline',
          severity: (last - prev) / prev < -0.25 ? 'high' : 'medium',
          title: `Income declining at ${p.propertyName}`,
          description: `Net income dropped ${(((prev - last) / prev) * 100).toFixed(1)}% month-over-month.`,
          amount: prev - last,
          property: p.propertyName,
        });
      }
    }
  }

  // 5. Vendor concentration risk
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
  for (const v of vendorSummaries) {
    const share = totalExpenses > 0 ? v.totalSpend / totalExpenses : 0;
    if (share > 0.15) {
      risks.push({
        id: `RISK-${id++}`,
        type: 'vendor_concentration',
        severity: share > 0.25 ? 'high' : 'low',
        title: `High vendor concentration: ${v.supplierName}`,
        description: `${v.supplierName} accounts for ${(share * 100).toFixed(1)}% of total expenses.`,
        amount: v.totalSpend,
        vendor: v.supplierName,
      });
    }
  }

  return risks.sort((a, b) => {
    const sev = { high: 3, medium: 2, low: 1 };
    return sev[b.severity] - sev[a.severity] || b.amount - a.amount;
  });
}

// ============================================================
// Financial Health Summary — full-dataset aggregation with MoM
// ============================================================

export function computeFinancialHealthSummary(
  income: IncomeRecord[],
  expenses: ExpenseRecord[],
  selectedMonth: string | 'all',
  selectedProperty: string | 'all'
): FinancialHealthSummary {
  // Get all available months sorted chronologically
  const allMonths = Array.from(
    new Set([...income.map(r => r.month), ...expenses.map(r => r.month)])
  ).sort();

  // Filter by property if needed
  const propIncome = selectedProperty === 'all' ? income : income.filter(r => r.staNo === selectedProperty);
  const propExpenses = selectedProperty === 'all' ? expenses : expenses.filter(r => r.staNo === selectedProperty);

  // Helper: compute metrics for a given set of months
  function metricsForMonths(months: string[]) {
    const inc = propIncome.filter(r => months.includes(r.month));
    const exp = propExpenses.filter(r => months.includes(r.month));
    const totalIncome = inc.reduce((s, r) => s + r.propertyIncome, 0);
    const totalExpenses = exp.reduce((s, r) => s + r.amount, 0);
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? netProfit / totalIncome : 0;
    const totalReceivable = inc.reduce((s, r) => s + r.incomeReceivable, 0);
    const totalDeferred = inc.reduce((s, r) => s + r.deferredIncome, 0);
    return { totalIncome, totalExpenses, netProfit, profitMargin, totalReceivable, totalDeferred };
  }

  // Determine current period and comparison period
  let currentMonths: string[];
  let prevMonths: string[] | null = null;
  let periodLabel: string;
  let comparisonLabel: string | null = null;

  if (selectedMonth === 'all') {
    currentMonths = allMonths;
    // For "all" mode, compare the latest month to the one before it
    if (allMonths.length >= 2) {
      const latestMonth = allMonths[allMonths.length - 1];
      const prevMonth = allMonths[allMonths.length - 2];
      // We'll use per-month sparklines and compute MoM from the last two months
      prevMonths = [prevMonth];
      // But for the main values, we use the full dataset
      // MoM will compare latest single month vs previous single month
    }
    if (allMonths.length > 0) {
      const first = new Date(allMonths[0] + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const last = new Date(allMonths[allMonths.length - 1] + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      periodLabel = allMonths.length === 1 ? first : `${first} \u2014 ${last}`;
    } else {
      periodLabel = 'No data';
    }
  } else {
    currentMonths = [selectedMonth];
    const idx = allMonths.indexOf(selectedMonth);
    if (idx > 0) {
      prevMonths = [allMonths[idx - 1]];
      const prevDate = new Date(allMonths[idx - 1] + '-01');
      comparisonLabel = `vs ${prevDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }
    const curDate = new Date(selectedMonth + '-01');
    periodLabel = curDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // Compute current values
  const current = metricsForMonths(currentMonths);

  // For "all" mode, MoM compares the latest month vs previous month
  let prev: ReturnType<typeof metricsForMonths> | null = null;
  if (selectedMonth === 'all' && allMonths.length >= 2) {
    const latestMetrics = metricsForMonths([allMonths[allMonths.length - 1]]);
    const prevMetrics = metricsForMonths([allMonths[allMonths.length - 2]]);
    prev = prevMetrics;
    // For "all" mode, we show the aggregated values but MoM is latest vs prev
    // We'll compute change from the latest single month perspective
    const latestLabel = new Date(allMonths[allMonths.length - 1] + '-01').toLocaleDateString('en-US', { month: 'short' });
    const prevLabel = new Date(allMonths[allMonths.length - 2] + '-01').toLocaleDateString('en-US', { month: 'short' });
    comparisonLabel = `${latestLabel} vs ${prevLabel}`;
    // Override prev to be the previous month's metrics for change calculation
    prev = prevMetrics;
    // We need latestMetrics for change calc
    // Store it temporarily
    (prev as any).__latestForChange = latestMetrics;
  } else if (prevMonths) {
    prev = metricsForMonths(prevMonths);
  }

  // Build sparklines: one value per month
  const sparklineMonths = allMonths;
  const sparklines = {
    totalIncome: sparklineMonths.map(m => metricsForMonths([m]).totalIncome),
    totalExpenses: sparklineMonths.map(m => metricsForMonths([m]).totalExpenses),
    netProfit: sparklineMonths.map(m => metricsForMonths([m]).netProfit),
    profitMargin: sparklineMonths.map(m => metricsForMonths([m]).profitMargin),
    totalReceivable: sparklineMonths.map(m => metricsForMonths([m]).totalReceivable),
    totalDeferred: sparklineMonths.map(m => metricsForMonths([m]).totalDeferred),
  };

  // Helper to build a SummaryMetric
  function buildMetric(
    label: string,
    currentVal: number,
    prevVal: number | undefined,
    sparkline: number[],
    format: 'currency' | 'percent',
    latestVal?: number // for "all" mode, the latest single-month value
  ): SummaryMetric {
    const effectiveCurrent = latestVal !== undefined ? latestVal : currentVal;
    const hasPrev = prevVal !== undefined && prevVal !== null;
    let changePercent: number | null = null;
    let changeAbsolute: number | null = null;
    if (hasPrev) {
      changeAbsolute = effectiveCurrent - prevVal;
      if (format === 'percent') {
        // For percentages, show absolute point change
        changeAbsolute = effectiveCurrent - prevVal;
        changePercent = prevVal !== 0 ? ((effectiveCurrent - prevVal) / Math.abs(prevVal)) * 100 : null;
      } else {
        changePercent = prevVal !== 0 ? ((effectiveCurrent - prevVal) / Math.abs(prevVal)) * 100 : null;
      }
    }
    return {
      label,
      value: currentVal,
      previousValue: hasPrev ? prevVal : null,
      changePercent,
      changeAbsolute,
      sparkline,
      format,
    };
  }

  // For "all" mode, use latest single-month values for MoM change
  const latestForChange = selectedMonth === 'all' && prev
    ? (prev as any).__latestForChange as ReturnType<typeof metricsForMonths> | undefined
    : undefined;

  return {
    totalIncome: buildMetric(
      'Total Income', current.totalIncome,
      prev?.totalIncome, sparklines.totalIncome, 'currency',
      latestForChange?.totalIncome
    ),
    totalExpenses: buildMetric(
      'Total Expenses', current.totalExpenses,
      prev?.totalExpenses, sparklines.totalExpenses, 'currency',
      latestForChange?.totalExpenses
    ),
    netProfit: buildMetric(
      'Net Profit', current.netProfit,
      prev?.netProfit, sparklines.netProfit, 'currency',
      latestForChange?.netProfit
    ),
    profitMargin: buildMetric(
      'Profit Margin', current.profitMargin,
      prev?.profitMargin, sparklines.profitMargin, 'percent',
      latestForChange?.profitMargin
    ),
    totalReceivable: buildMetric(
      'Income Receivable', current.totalReceivable,
      prev?.totalReceivable, sparklines.totalReceivable, 'currency',
      latestForChange?.totalReceivable
    ),
    totalDeferred: buildMetric(
      'Deferred Income', current.totalDeferred,
      prev?.totalDeferred, sparklines.totalDeferred, 'currency',
      latestForChange?.totalDeferred
    ),
    periodLabel,
    comparisonLabel,
  };
}

export function formatCurrency(value: number): string {
  // Guard against malformed numeric payloads bubbling into UI.
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeValue);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

export function getMonthlyIncomeExpenseTrend(
  income: IncomeRecord[],
  expenses: ExpenseRecord[],
  property?: string
): { month: string; income: number; expenses: number; net: number }[] {
  const months = Array.from(new Set([...income.map(r => r.month), ...expenses.map(r => r.month)])).sort();

  return months.map(month => {
    const mIncome = income
      .filter(r => r.month === month && (!property || r.staNo === property))
      .reduce((s, r) => s + r.propertyIncome, 0);
    const mExpense = expenses
      .filter(r => r.month === month && (!property || r.staNo === property))
      .reduce((s, r) => s + r.amount, 0);
    return { month, income: mIncome, expenses: mExpense, net: mIncome - mExpense };
  });
}

export function getExpenseCategoryBreakdown(
  expenses: ExpenseRecord[],
  selectedMonth: string | 'all',
  property?: string
): { category: string; amount: number; percentage: number }[] {
  const filtered = expenses.filter(r =>
    (selectedMonth === 'all' || r.month === selectedMonth) &&
    (!property || r.staNo === property)
  );
  const total = filtered.reduce((s, r) => s + r.amount, 0);
  const byCategory = new Map<string, number>();
  for (const r of filtered) {
    byCategory.set(r.category, (byCategory.get(r.category) || 0) + r.amount);
  }
  return Array.from(byCategory.entries())
    .map(([category, amount]) => ({ category, amount, percentage: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

// ============================================================
// Income Analysis — Per-property income breakdown
// ============================================================

export function computePropertyIncomeAnalysis(
  income: IncomeRecord[],
  selectedMonth: string | 'all'
): PropertyIncomeAnalysis[] {
  const filtered = selectedMonth === 'all' ? income : income.filter(r => r.month === selectedMonth);
  const allMonths = Array.from(new Set(income.map(r => r.month))).sort();

  const propMap = new Map<string, {
    staNo: string;
    propertyName: string;
    totalIncome: number;
    incomeReceivable: number;
    deferredIncome: number;
    incomeByCategory: Record<string, number>;
  }>();

  for (const r of filtered) {
    if (!propMap.has(r.staNo)) {
      propMap.set(r.staNo, {
        staNo: r.staNo,
        propertyName: r.propertyName,
        totalIncome: 0,
        incomeReceivable: 0,
        deferredIncome: 0,
        incomeByCategory: {},
      });
    }
    const p = propMap.get(r.staNo)!;
    p.totalIncome += r.propertyIncome;
    p.incomeReceivable += r.incomeReceivable;
    p.deferredIncome += r.deferredIncome;
    if (r.category) {
      p.incomeByCategory[r.category] = (p.incomeByCategory[r.category] || 0) + r.propertyIncome;
    }
  }

  const results: PropertyIncomeAnalysis[] = [];

  for (const [staNo, p] of Array.from(propMap.entries())) {
    const outstandingIncome = p.incomeReceivable - p.totalIncome;
    const collectionRate = p.incomeReceivable > 0 ? p.totalIncome / p.incomeReceivable : 0;

    // Monthly breakdown
    const monthlyIncome = allMonths.map(month => {
      const monthRecords = income.filter(r => r.staNo === staNo && r.month === month);
      return {
        month,
        income: monthRecords.reduce((s, r) => s + r.propertyIncome, 0),
        receivable: monthRecords.reduce((s, r) => s + r.incomeReceivable, 0),
        deferred: monthRecords.reduce((s, r) => s + r.deferredIncome, 0),
        collected: monthRecords.reduce((s, r) => s + r.propertyIncome, 0),
      };
    });

    results.push({
      staNo,
      propertyName: p.propertyName,
      totalIncome: p.totalIncome,
      incomeReceivable: p.incomeReceivable,
      deferredIncome: p.deferredIncome,
      outstandingIncome,
      collectionRate,
      incomeByCategory: p.incomeByCategory,
      monthlyIncome,
    });
  }

  return results.sort((a, b) => b.totalIncome - a.totalIncome);
}

// ============================================================
// Expense Analysis — Per-property and per-vendor breakdowns
// ============================================================

import type { PropertyExpenseAnalysis, VendorExpenseAnalysis, ExpenseConcentration } from './types';

export function computePropertyExpenseAnalysis(
  expenses: ExpenseRecord[],
  selectedMonth: string | 'all'
): PropertyExpenseAnalysis[] {
  const filtered = selectedMonth === 'all' ? expenses : expenses.filter(r => r.month === selectedMonth);
  const allMonths = Array.from(new Set(expenses.map(r => r.month))).sort();

  const propMap = new Map<string, {
    staNo: string;
    propertyName: string;
    totalExpenses: number;
    expenseByCategory: Record<string, number>;
    expenseByVendor: Record<string, number>;
    invoiceCount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
  }>();

  for (const r of filtered) {
    if (!propMap.has(r.staNo)) {
      propMap.set(r.staNo, {
        staNo: r.staNo,
        propertyName: r.propertyName,
        totalExpenses: 0,
        expenseByCategory: {},
        expenseByVendor: {},
        invoiceCount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
      });
    }
    const p = propMap.get(r.staNo)!;
    p.totalExpenses += r.amount;
    p.invoiceCount += 1;
    p.expenseByCategory[r.category] = (p.expenseByCategory[r.category] || 0) + r.amount;
    p.expenseByVendor[r.supplierName] = (p.expenseByVendor[r.supplierName] || 0) + r.amount;
    if (r.status === 'paid') p.paidAmount += r.amount;
    else if (r.status === 'pending') p.pendingAmount += r.amount;
    else p.overdueAmount += r.amount;
  }

  const results: PropertyExpenseAnalysis[] = [];

  for (const [staNo, p] of Array.from(propMap.entries())) {
    const monthlyExpenses = allMonths.map(month => ({
      month,
      amount: expenses.filter(r => r.staNo === staNo && r.month === month).reduce((s, r) => s + r.amount, 0),
    }));

    results.push({
      ...p,
      monthlyExpenses,
    });
  }

  return results.sort((a, b) => b.totalExpenses - a.totalExpenses);
}

export function computeVendorExpenseAnalysis(
  expenses: ExpenseRecord[],
  selectedMonth: string | 'all'
): VendorExpenseAnalysis[] {
  const filtered = selectedMonth === 'all' ? expenses : expenses.filter(r => r.month === selectedMonth);
  const allMonths = Array.from(new Set(expenses.map(r => r.month))).sort();
  const grandTotal = filtered.reduce((s, r) => s + r.amount, 0);

  const vendorMap = new Map<string, {
    supplierName: string;
    totalSpend: number;
    invoiceCount: number;
    propertiesSet: Set<string>;
    categoriesSet: Set<string>;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
  }>();

  for (const r of filtered) {
    if (!vendorMap.has(r.supplierName)) {
      vendorMap.set(r.supplierName, {
        supplierName: r.supplierName,
        totalSpend: 0,
        invoiceCount: 0,
        propertiesSet: new Set(),
        categoriesSet: new Set(),
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
      });
    }
    const v = vendorMap.get(r.supplierName)!;
    v.totalSpend += r.amount;
    v.invoiceCount += 1;
    v.propertiesSet.add(r.propertyName);
    v.categoriesSet.add(r.category);
    if (r.status === 'paid') v.paidAmount += r.amount;
    else if (r.status === 'pending') v.pendingAmount += r.amount;
    else v.overdueAmount += r.amount;
  }

  const results: VendorExpenseAnalysis[] = [];

  for (const [name, v] of Array.from(vendorMap.entries())) {
    const properties = Array.from(v.propertiesSet);
    const categories = Array.from(v.categoriesSet);
    const monthlySpend = allMonths.map(month => ({
      month,
      amount: expenses.filter(r => r.supplierName === name && r.month === month).reduce((s, r) => s + r.amount, 0),
    }));

    results.push({
      supplierName: v.supplierName,
      totalSpend: v.totalSpend,
      percentOfTotal: grandTotal > 0 ? v.totalSpend / grandTotal : 0,
      invoiceCount: v.invoiceCount,
      avgInvoiceAmount: v.invoiceCount > 0 ? v.totalSpend / v.invoiceCount : 0,
      avgCostPerProperty: properties.length > 0 ? v.totalSpend / properties.length : 0,
      propertyCount: properties.length,
      properties,
      categories,
      paidAmount: v.paidAmount,
      pendingAmount: v.pendingAmount,
      overdueAmount: v.overdueAmount,
      monthlySpend,
    });
  }

  return results.sort((a, b) => b.totalSpend - a.totalSpend);
}

export function computeExpenseConcentration(
  vendorAnalysis: VendorExpenseAnalysis[]
): ExpenseConcentration {
  const totalExpenses = vendorAnalysis.reduce((s, v) => s + v.totalSpend, 0);
  const sorted = [...vendorAnalysis].sort((a, b) => b.totalSpend - a.totalSpend);

  const top3 = sorted.slice(0, 3);
  const top5 = sorted.slice(0, 5);

  const top3Spend = top3.reduce((s, v) => s + v.totalSpend, 0);
  const top5Spend = top5.reduce((s, v) => s + v.totalSpend, 0);

  return {
    top3Vendors: {
      names: top3.map(v => v.supplierName),
      totalSpend: top3Spend,
      percentOfTotal: totalExpenses > 0 ? top3Spend / totalExpenses : 0,
    },
    top5Vendors: {
      names: top5.map(v => v.supplierName),
      totalSpend: top5Spend,
      percentOfTotal: totalExpenses > 0 ? top5Spend / totalExpenses : 0,
    },
    totalExpenses,
  };
}

// ============================================================
// Profitability Analysis — Per-property P&L with classification
// ============================================================

import type { PropertyProfitability } from './types';

export function computePropertyProfitability(
  income: IncomeRecord[],
  expenses: ExpenseRecord[],
  selectedMonth: string | 'all'
): PropertyProfitability[] {
  const filteredIncome = selectedMonth === 'all' ? income : income.filter(r => r.month === selectedMonth);
  const filteredExpenses = selectedMonth === 'all' ? expenses : expenses.filter(r => r.month === selectedMonth);
  const allMonths = Array.from(new Set([
    ...income.map(r => r.month),
    ...expenses.map(r => r.month),
  ])).sort();

  // Build property map from income
  const propMap = new Map<string, {
    staNo: string;
    propertyName: string;
    totalIncome: number;
    totalExpenses: number;
    incomeReceivable: number;
    deferredIncome: number;
    expenseByCategory: Map<string, number>;
    expenseByVendor: Map<string, number>;
  }>();

  for (const r of filteredIncome) {
    if (!propMap.has(r.staNo)) {
      propMap.set(r.staNo, {
        staNo: r.staNo,
        propertyName: r.propertyName,
        totalIncome: 0,
        totalExpenses: 0,
        incomeReceivable: 0,
        deferredIncome: 0,
        expenseByCategory: new Map(),
        expenseByVendor: new Map(),
      });
    }
    const p = propMap.get(r.staNo)!;
    p.totalIncome += r.propertyIncome;
    p.incomeReceivable += r.incomeReceivable;
    p.deferredIncome += r.deferredIncome;
  }

  // Add expenses
  for (const r of filteredExpenses) {
    if (!propMap.has(r.staNo)) {
      // Property exists only in expenses (unlikely but safe)
      propMap.set(r.staNo, {
        staNo: r.staNo,
        propertyName: r.propertyName,
        totalIncome: 0,
        totalExpenses: 0,
        incomeReceivable: 0,
        deferredIncome: 0,
        expenseByCategory: new Map(),
        expenseByVendor: new Map(),
      });
    }
    const p = propMap.get(r.staNo)!;
    p.totalExpenses += r.amount;
    p.expenseByCategory.set(r.category, (p.expenseByCategory.get(r.category) || 0) + r.amount);
    p.expenseByVendor.set(r.supplierName, (p.expenseByVendor.get(r.supplierName) || 0) + r.amount);
  }

  const results: PropertyProfitability[] = [];

  for (const [staNo, p] of Array.from(propMap.entries())) {
    const netProfit = p.totalIncome - p.totalExpenses;
    const profitMargin = p.totalIncome > 0 ? netProfit / p.totalIncome : (netProfit < 0 ? -1 : 0);
    const collectionRate = p.incomeReceivable > 0 ? p.totalIncome / p.incomeReceivable : 0;
    const expenseRatio = p.totalIncome > 0 ? p.totalExpenses / p.totalIncome : (p.totalExpenses > 0 ? Infinity : 0);

    // Classification logic
    let classification: PropertyProfitability['classification'];
    if (netProfit < 0) {
      classification = 'loss-making';
    } else if (profitMargin < 0.20) {
      classification = 'low-margin';
    } else if (profitMargin >= 0.50 && expenseRatio <= 0.50) {
      classification = 'high-performing';
    } else {
      classification = 'profitable';
    }

    // Monthly profitability
    const monthlyProfitability = allMonths.map(month => {
      const mIncome = income.filter(r => r.staNo === staNo && r.month === month).reduce((s, r) => s + r.propertyIncome, 0);
      const mExpenses = expenses.filter(r => r.staNo === staNo && r.month === month).reduce((s, r) => s + r.amount, 0);
      const mNetProfit = mIncome - mExpenses;
      const mMargin = mIncome > 0 ? mNetProfit / mIncome : (mNetProfit < 0 ? -1 : 0);
      return { month, income: mIncome, expenses: mExpenses, netProfit: mNetProfit, margin: mMargin };
    });

    // Top expense categories (sorted desc)
    const topExpenseCategories = Array.from(p.expenseByCategory.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    // Top vendors (sorted desc)
    const topVendors = Array.from(p.expenseByVendor.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    results.push({
      staNo,
      propertyName: p.propertyName,
      totalIncome: p.totalIncome,
      totalExpenses: p.totalExpenses,
      netProfit,
      profitMargin,
      incomeReceivable: p.incomeReceivable,
      deferredIncome: p.deferredIncome,
      collectionRate,
      expenseRatio,
      classification,
      monthlyProfitability,
      topExpenseCategories,
      topVendors,
    });
  }

  return results.sort((a, b) => b.netProfit - a.netProfit);
}

// ============================================================
// Vendor Intelligence Analytics
// ============================================================

import type { VendorIntelligence, VendorConcentrationSummary } from './types';

export function computeVendorIntelligence(expenses: ExpenseRecord[]): VendorIntelligence[] {
  if (!expenses.length) return [];

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const vendorMap = new Map<string, ExpenseRecord[]>();

  for (const e of expenses) {
    const key = e.supplierName;
    if (!vendorMap.has(key)) vendorMap.set(key, []);
    vendorMap.get(key)!.push(e);
  }

  const results: VendorIntelligence[] = [];

  // Compute average cost per property across ALL vendors for disproportionate flagging
  const allVendorAvgCosts: number[] = [];

  for (const [supplierName, records] of Array.from(vendorMap.entries())) {
    const totalSpend = records.reduce((s, r) => s + r.amount, 0);
    const percentOfTotal = totalExpenses > 0 ? totalSpend / totalExpenses : 0;
    const invoiceCount = records.length;
    const avgInvoiceAmount = invoiceCount > 0 ? totalSpend / invoiceCount : 0;

    // Properties
    const propMap = new Map<string, { name: string; staNo: string; amount: number; count: number }>();
    for (const r of records) {
      if (!propMap.has(r.staNo)) propMap.set(r.staNo, { name: r.propertyName, staNo: r.staNo, amount: 0, count: 0 });
      const p = propMap.get(r.staNo)!;
      p.amount += r.amount;
      p.count += 1;
    }
    const properties = Array.from(propMap.values()).map(p => p.name);
    const propertyCount = properties.length;
    const avgCostPerProperty = propertyCount > 0 ? totalSpend / propertyCount : 0;
    allVendorAvgCosts.push(avgCostPerProperty);

    const propertyBreakdown = Array.from(propMap.values())
      .map(p => ({ propertyName: p.name, staNo: p.staNo, amount: p.amount, invoiceCount: p.count }))
      .sort((a, b) => b.amount - a.amount);

    // Categories
    const catSet = new Set<string>();
    for (const r of records) catSet.add(r.category);
    const categories = Array.from(catSet);

    // Payment status
    let paidAmount = 0, pendingAmount = 0, overdueAmount = 0;
    for (const r of records) {
      if (r.status === 'paid') paidAmount += r.amount;
      else if (r.status === 'pending') pendingAmount += r.amount;
      else overdueAmount += r.amount;
    }

    // Monthly spend
    const monthMap = new Map<string, number>();
    for (const r of records) {
      monthMap.set(r.month, (monthMap.get(r.month) || 0) + r.amount);
    }
    const monthlySpend = Array.from(monthMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Dependency score: weighted by % of total spend and property coverage
    const dependencyScore = Math.min(100, Math.round(percentOfTotal * 100 * 1.5 + (propertyCount / Math.max(1, vendorMap.size)) * 20));

    results.push({
      supplierName,
      totalSpend,
      percentOfTotal,
      invoiceCount,
      avgInvoiceAmount,
      propertyCount,
      properties,
      avgCostPerProperty,
      categories,
      paidAmount,
      pendingAmount,
      overdueAmount,
      monthlySpend,
      spendPerInvoice: avgInvoiceAmount,
      isDisproportionate: false, // set below after computing global average
      dependencyScore,
      propertyBreakdown,
    });
  }

  // Flag disproportionate vendors: avgCostPerProperty > 1.5x the median
  const sortedAvgs = [...allVendorAvgCosts].sort((a, b) => a - b);
  const medianAvg = sortedAvgs.length > 0
    ? sortedAvgs[Math.floor(sortedAvgs.length / 2)]
    : 0;
  const threshold = medianAvg * 1.5;

  for (const v of results) {
    v.isDisproportionate = v.avgCostPerProperty > threshold && v.totalSpend > totalExpenses * 0.05;
  }

  return results.sort((a, b) => b.totalSpend - a.totalSpend);
}

export function computeVendorConcentration(expenses: ExpenseRecord[]): VendorConcentrationSummary {
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const vendorTotals = new Map<string, number>();

  for (const e of expenses) {
    vendorTotals.set(e.supplierName, (vendorTotals.get(e.supplierName) || 0) + e.amount);
  }

  const sorted = Array.from(vendorTotals.entries())
    .sort((a, b) => b[1] - a[1]);

  const vendorCount = sorted.length;

  const makeGroup = (n: number) => {
    const top = sorted.slice(0, n);
    const topSpend = top.reduce((s, [, v]) => s + v, 0);
    return {
      names: top.map(([name]) => name),
      totalSpend: topSpend,
      percentOfTotal: totalExpenses > 0 ? topSpend / totalExpenses : 0,
    };
  };

  // Herfindahl-Hirschman Index (normalized 0-1)
  let hhi = 0;
  for (const [, spend] of sorted) {
    const share = totalExpenses > 0 ? spend / totalExpenses : 0;
    hhi += share * share;
  }

  return {
    top3: makeGroup(3),
    top5: makeGroup(5),
    top10: makeGroup(10),
    totalExpenses,
    vendorCount,
    herfindahlIndex: hhi,
  };
}

// ============================================================
// Cash Flow Risk Analysis — Receivables, collection rates, delayed payments
// ============================================================

import type { PropertyCashFlowRisk, CashFlowRiskSummary } from './types';

export function computeCashFlowRiskAnalysis(
  income: IncomeRecord[],
  expenses: ExpenseRecord[]
): CashFlowRiskSummary {
  const allMonths = Array.from(new Set(income.map(r => r.month))).sort();

  // Build per-property data
  const propMap = new Map<string, {
    staNo: string;
    propertyName: string;
    totalIncome: number;
    incomeReceivable: number;
    deferredIncome: number;
    totalExpenses: number;
    overdueExpenses: number;
    pendingExpenses: number;
  }>();

  for (const r of income) {
    if (!propMap.has(r.staNo)) {
      propMap.set(r.staNo, {
        staNo: r.staNo,
        propertyName: r.propertyName,
        totalIncome: 0,
        incomeReceivable: 0,
        deferredIncome: 0,
        totalExpenses: 0,
        overdueExpenses: 0,
        pendingExpenses: 0,
      });
    }
    const p = propMap.get(r.staNo)!;
    p.totalIncome += r.propertyIncome;
    p.incomeReceivable += r.incomeReceivable;
    p.deferredIncome += r.deferredIncome;
  }

  // Add expense data
  for (const e of expenses) {
    if (!propMap.has(e.staNo)) {
      propMap.set(e.staNo, {
        staNo: e.staNo,
        propertyName: e.propertyName,
        totalIncome: 0,
        incomeReceivable: 0,
        deferredIncome: 0,
        totalExpenses: 0,
        overdueExpenses: 0,
        pendingExpenses: 0,
      });
    }
    const p = propMap.get(e.staNo)!;
    p.totalExpenses += e.amount;
    if (e.status === 'overdue') p.overdueExpenses += e.amount;
    if (e.status === 'pending') p.pendingExpenses += e.amount;
  }

  const properties: PropertyCashFlowRisk[] = [];

  for (const [, p] of Array.from(propMap.entries())) {
    const outstandingIncome = Math.max(0, p.incomeReceivable - p.totalIncome);
    const collectionRate = p.incomeReceivable > 0 ? p.totalIncome / p.incomeReceivable : 1;
    const receivablePercent = p.incomeReceivable > 0 ? outstandingIncome / p.incomeReceivable : 0;
    const netCashPosition = p.totalIncome - p.totalExpenses;

    // Monthly collection trend
    const monthlyCollectionTrend = allMonths.map(month => {
      const monthIncome = income.filter(r => r.staNo === p.staNo && r.month === month);
      const collected = monthIncome.reduce((s, r) => s + r.propertyIncome, 0);
      const receivable = monthIncome.reduce((s, r) => s + r.incomeReceivable, 0);
      const deferred = monthIncome.reduce((s, r) => s + r.deferredIncome, 0);
      const outstanding = Math.max(0, receivable - collected);
      const cr = receivable > 0 ? collected / receivable : 1;
      return { month, collectionRate: cr, outstanding, receivable, collected, deferred };
    });

    // Determine collection trend direction
    let collectionTrendDirection: 'improving' | 'declining' | 'stable' = 'stable';
    if (monthlyCollectionTrend.length >= 3) {
      const recent = monthlyCollectionTrend.slice(-3);
      const firstCR = recent[0].collectionRate;
      const lastCR = recent[recent.length - 1].collectionRate;
      const diff = lastCR - firstCR;
      if (diff > 0.03) collectionTrendDirection = 'improving';
      else if (diff < -0.03) collectionTrendDirection = 'declining';
    }

    const avgMonthlyCollection = monthlyCollectionTrend.length > 0
      ? monthlyCollectionTrend.reduce((s, m) => s + m.collectionRate, 0) / monthlyCollectionTrend.length
      : 0;
    const latestMonthCollection = monthlyCollectionTrend.length > 0
      ? monthlyCollectionTrend[monthlyCollectionTrend.length - 1].collectionRate
      : 0;

    // Compute risk score (0-100, higher = more risky)
    let riskScore = 0;
    const riskFactors: string[] = [];

    // Factor 1: Collection rate (0-40 points)
    if (collectionRate < 0.70) { riskScore += 40; riskFactors.push(`Very low collection rate: ${(collectionRate * 100).toFixed(1)}%`); }
    else if (collectionRate < 0.80) { riskScore += 30; riskFactors.push(`Low collection rate: ${(collectionRate * 100).toFixed(1)}%`); }
    else if (collectionRate < 0.90) { riskScore += 15; riskFactors.push(`Below-target collection rate: ${(collectionRate * 100).toFixed(1)}%`); }

    // Factor 2: Outstanding receivable % (0-25 points)
    if (receivablePercent > 0.30) { riskScore += 25; riskFactors.push(`High outstanding receivables: ${(receivablePercent * 100).toFixed(1)}% of total`); }
    else if (receivablePercent > 0.20) { riskScore += 15; riskFactors.push(`Elevated outstanding receivables: ${(receivablePercent * 100).toFixed(1)}%`); }
    else if (receivablePercent > 0.10) { riskScore += 8; riskFactors.push(`Moderate outstanding receivables: ${(receivablePercent * 100).toFixed(1)}%`); }

    // Factor 3: Collection trend (0-15 points)
    if (collectionTrendDirection === 'declining') { riskScore += 15; riskFactors.push('Collection rate declining over recent months'); }

    // Factor 4: Net cash position (0-10 points)
    if (netCashPosition < 0) { riskScore += 10; riskFactors.push(`Negative net cash position: ${formatCurrency(netCashPosition)}`); }

    // Factor 5: Overdue expenses (0-10 points)
    if (p.overdueExpenses > 0) {
      const overdueRatio = p.totalExpenses > 0 ? p.overdueExpenses / p.totalExpenses : 0;
      if (overdueRatio > 0.15) { riskScore += 10; riskFactors.push(`High overdue expenses: ${formatCurrency(p.overdueExpenses)}`); }
      else if (overdueRatio > 0.05) { riskScore += 5; riskFactors.push(`Some overdue expenses: ${formatCurrency(p.overdueExpenses)}`); }
    }

    riskScore = Math.min(100, riskScore);

    // Classify risk level
    let riskLevel: PropertyCashFlowRisk['riskLevel'] = 'low';
    if (riskScore >= 60) riskLevel = 'critical';
    else if (riskScore >= 40) riskLevel = 'high';
    else if (riskScore >= 20) riskLevel = 'medium';

    properties.push({
      staNo: p.staNo,
      propertyName: p.propertyName,
      totalIncome: p.totalIncome,
      incomeReceivable: p.incomeReceivable,
      deferredIncome: p.deferredIncome,
      outstandingIncome,
      collectionRate,
      receivablePercent,
      monthlyCollectionTrend,
      riskLevel,
      riskScore,
      riskFactors,
      collectionTrendDirection,
      avgMonthlyCollection,
      latestMonthCollection,
      overdueExpenses: p.overdueExpenses,
      pendingExpenses: p.pendingExpenses,
      netCashPosition,
    });
  }

  // Sort by risk score descending
  properties.sort((a, b) => b.riskScore - a.riskScore);

  // Portfolio-level aggregates
  const totalOutstandingReceivables = properties.reduce((s, p) => s + p.outstandingIncome, 0);
  const totalDeferredIncome = properties.reduce((s, p) => s + p.deferredIncome, 0);
  const totalIncomeReceivable = properties.reduce((s, p) => s + p.incomeReceivable, 0);
  const totalCollected = properties.reduce((s, p) => s + p.totalIncome, 0);
  const portfolioCollectionRate = totalIncomeReceivable > 0 ? totalCollected / totalIncomeReceivable : 1;
  const avgPropertyCollectionRate = properties.length > 0
    ? properties.reduce((s, p) => s + p.collectionRate, 0) / properties.length
    : 0;
  const totalOverdueExpenses = properties.reduce((s, p) => s + p.overdueExpenses, 0);
  const totalPendingExpenses = properties.reduce((s, p) => s + p.pendingExpenses, 0);

  const criticalCount = properties.filter(p => p.riskLevel === 'critical').length;
  const highCount = properties.filter(p => p.riskLevel === 'high').length;
  const mediumCount = properties.filter(p => p.riskLevel === 'medium').length;
  const lowCount = properties.filter(p => p.riskLevel === 'low').length;

  // Portfolio cash flow health score (inverse of risk — higher = healthier)
  const avgRiskScore = properties.length > 0
    ? properties.reduce((s, p) => s + p.riskScore, 0) / properties.length
    : 0;
  const cashFlowHealthScore = Math.round(100 - avgRiskScore);

  return {
    totalOutstandingReceivables,
    totalDeferredIncome,
    totalIncomeReceivable,
    portfolioCollectionRate,
    avgPropertyCollectionRate,
    propertiesAtRisk: criticalCount + highCount,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    totalOverdueExpenses,
    totalPendingExpenses,
    cashFlowHealthScore,
    properties,
  };
}

