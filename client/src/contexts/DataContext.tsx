// ============================================================
// DataContext — Centralized data pipeline for Financial Intelligence
// All derived metrics computed from raw uploaded/sample data using
// the analytics engine. Every feed card, notebook entry, and chat
// context is driven by these computed values.
//
// Date range filtering: the activeRange state controls which months
// of data are included in all downstream computations. Options:
//   - 'all'        → full dataset
//   - 'last-1'     → most recent month
//   - 'last-3'     → most recent 3 months (quarterly)
//   - 'last-6'     → most recent 6 months (half-year)
//   - 'last-12'    → most recent 12 months (last year)
//   - 'YYYY-MM'    → a specific single month
// ============================================================

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { IncomeRecord, ExpenseRecord, UploadedDataset } from '@/lib/types';
import { generateSampleIncome, generateSampleExpenses, getAvailableMonths } from '@/lib/sampleData';
import {
  computePropertySummaries,
  computeVendorSummaries,
  computePortfolioKPIs,
  computePropertyProfitability,
  computeVendorExpenseAnalysis,
  computeExpenseConcentration,
  computeCashFlowRiskAnalysis,
  identifyRisks,
  formatCurrency,
  formatPercent,
} from '@/lib/analytics';
import { generateInsights } from '@/lib/insights';
import type { PropertySummary, VendorSummary, PortfolioKPIs, PropertyProfitability, VendorExpenseAnalysis, ExpenseConcentration, CashFlowRiskSummary, RiskItem } from '@/lib/types';
import {
  isActivePropertyProfitability,
  isActivePropertySummary,
} from '@/features/financial/financialDisplayFilters';

// ── Date range type ────────────────────────────────────────
export type DateRange = 'all' | 'last-1' | 'last-3' | 'last-6' | 'last-12' | string; // string = specific YYYY-MM

export interface DateRangeOption {
  value: DateRange;
  label: string;
}

// ── Enriched row types with all derived metrics ─────────────
export interface PropertyRow {
  staNo: string;
  propertyName: string;
  income: number;
  expenses: number;
  profit: number;
  margin: number;          // Profit / Income
  collectionRate: number;
  incomeReceivable: number;
  outstanding: number;     // Receivable - Collected
  expenseRatio: number;    // Expenses / Income
}

export interface VendorRow {
  supplierName: string;
  totalSpend: number;
  percentOfTotal: number;  // % contribution of each vendor
  invoiceCount: number;
  avgInvoiceAmount: number;
  propertyCount: number;
  properties: string[];
  categories: string[];
}

export interface QuickSummary {
  totalIncome: number;
  totalExpenses: number;       // gross
  totalExpensesNett: number;   // nett (excl. VAT)
  totalVAT: number;            // total VAT on expenses
  netProfit: number;
  profitMargin: number;
  outstandingReceivables: number;
  totalReceivable: number;
  collectionRate: number;
  topProperty: { name: string; income: number; profit: number; margin: number } | null;
  topVendor: { name: string; spend: number; percentOfTotal: number } | null;
  worstProperty: { name: string; profit: number; margin: number } | null;
  propertyCount: number;
  vendorCount: number;
  overdueInvoices: number;
  overdueAmount: number;
}

interface DataContextType {
  // Raw data (full dataset, unfiltered)
  incomeData: IncomeRecord[];
  expenseData: ExpenseRecord[];
  datasets: UploadedDataset[];
  hasData: boolean;

  // Filtered data (based on active date range)
  filteredIncome: IncomeRecord[];
  filteredExpenses: ExpenseRecord[];

  // Date range filtering
  activeRange: DateRange;
  setActiveRange: (range: DateRange) => void;
  availableMonths: string[];
  dateRangeOptions: DateRangeOption[];
  periodLabel: string;

  // Derived metrics (all computed from FILTERED data via analytics engine)
  summary: QuickSummary;
  propertyTable: PropertyRow[];
  vendorTable: VendorRow[];
  insights: ReturnType<typeof generateInsights>;

  // Rich analytics (from analytics engine, using filtered data)
  propertySummaries: PropertySummary[];
  vendorSummaries: VendorSummary[];
  portfolioKPIs: PortfolioKPIs;
  profitability: PropertyProfitability[];
  vendorAnalysis: VendorExpenseAnalysis[];
  vendorConcentration: ExpenseConcentration;
  cashFlowRisk: CashFlowRiskSummary;
  risks: RiskItem[];

  // Data context string for chat (enriched with all derived metrics)
  dataContextString: string;

  // Data management
  addIncomeData: (records: IncomeRecord[], datasetName: string) => void;
  addExpenseData: (records: ExpenseRecord[], datasetName: string) => void;
  clearAllData: () => void;
  loadSampleData: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

// ── Helper: resolve which months are included for a given range ─
function resolveMonths(allMonths: string[], range: DateRange): string[] {
  if (range === 'all') return allMonths;

  // Specific month
  if (/^\d{4}-\d{2}$/.test(range)) {
    return allMonths.includes(range) ? [range] : allMonths;
  }

  // last-N pattern
  const match = range.match(/^last-(\d+)$/);
  if (match) {
    const n = parseInt(match[1], 10);
    return allMonths.slice(-n);
  }

  // year-YYYY pattern
  const yearMatch = range.match(/^year-(\d{4})$/);
  if (yearMatch) {
    const year = yearMatch[1];
    return allMonths.filter((m) => m.startsWith(`${year}-`));
  }

  return allMonths;
}

function buildPeriodLabel(months: string[], range: DateRange): string {
  if (months.length === 0) return 'No data';

  const fmt = (m: string) => {
    // Use T12:00:00 to avoid timezone-induced day rollback
    const d = new Date(m + '-01T12:00:00');
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  if (range === 'all') {
    if (months.length === 1) return fmt(months[0]);
    return `${fmt(months[0])} — ${fmt(months[months.length - 1])}`;
  }

  if (/^\d{4}-\d{2}$/.test(range)) {
    return fmt(range);
  }

  if (range === 'last-1') {
    return fmt(months[months.length - 1]);
  }

  if (range === 'last-3') {
    if (months.length === 1) return fmt(months[0]);
    return `${fmt(months[0])} — ${fmt(months[months.length - 1])}`;
  }

  if (range === 'last-6') {
    if (months.length === 1) return fmt(months[0]);
    return `${fmt(months[0])} — ${fmt(months[months.length - 1])}`;
  }

  if (range === 'last-12') {
    if (months.length === 1) return fmt(months[0]);
    return `${fmt(months[0])} — ${fmt(months[months.length - 1])}`;
  }

  if (/^year-(\d{4})$/.test(range)) {
    if (months.length === 1) return fmt(months[0]);
    return `${fmt(months[0])} — ${fmt(months[months.length - 1])}`;
  }

  return 'Custom period';
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [incomeData, setIncomeData] = useState<IncomeRecord[]>(() => generateSampleIncome());
  const [expenseData, setExpenseData] = useState<ExpenseRecord[]>(() => generateSampleExpenses());
  const [datasets, setDatasets] = useState<UploadedDataset[]>([
    { id: 'sample-income', name: 'Sample Income Data', type: 'income', uploadDate: new Date().toISOString(), recordCount: 360, months: getAvailableMonths() },
    { id: 'sample-expense', name: 'Sample Expense Data', type: 'expense', uploadDate: new Date().toISOString(), recordCount: 504, months: getAvailableMonths() },
  ]);

  const [activeRange, setActiveRange] = useState<DateRange>('all');

  const hasData = incomeData.length > 0 || expenseData.length > 0;

  // ═══════════════════════════════════════════════════════════
  // DATE RANGE — Derive available months and filter data
  // ═══════════════════════════════════════════════════════════

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    for (const r of incomeData) monthSet.add(r.month);
    for (const r of expenseData) monthSet.add(r.month);
    return Array.from(monthSet).sort();
  }, [incomeData, expenseData]);

  const activeMonths = useMemo(() =>
    resolveMonths(availableMonths, activeRange),
    [availableMonths, activeRange]
  );

  const periodLabel = useMemo(() =>
    buildPeriodLabel(activeMonths, activeRange),
    [activeMonths, activeRange]
  );

  // Build dropdown options dynamically from available data
  const dateRangeOptions = useMemo((): DateRangeOption[] => {
    const options: DateRangeOption[] = [
      { value: 'all', label: 'All time' },
    ];

    if (availableMonths.length > 1) {
      options.push({ value: 'last-1', label: 'Last month' });
    }
    if (availableMonths.length >= 6) {
      options.push({ value: 'last-6', label: 'Last 6 month' });
    }
    if (availableMonths.length >= 12) {
      options.push({ value: 'last-12', label: 'Last year' });
    }

    // Add individual months (most recent first)
    const monthFmt = (m: string) => {
      // Use T12:00:00 to avoid timezone-induced day rollback
      const d = new Date(m + '-01T12:00:00');
      return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    };
    for (const m of [...availableMonths].reverse()) {
      options.push({ value: m, label: monthFmt(m) });
    }

    return options;
  }, [availableMonths]);

  // ── Filtered data ────────────────────────────────────────
  const filteredIncome = useMemo(() => {
    const monthSet = new Set(activeMonths);
    return incomeData.filter(r => monthSet.has(r.month));
  }, [incomeData, activeMonths]);

  const filteredExpenses = useMemo(() => {
    const monthSet = new Set(activeMonths);
    return expenseData.filter(r => monthSet.has(r.month));
  }, [expenseData, activeMonths]);

  // ═══════════════════════════════════════════════════════════
  // DERIVED METRICS — All computed from FILTERED income/expense data
  // ═══════════════════════════════════════════════════════════

  // ── Portfolio KPIs ────────────────────────────────────────
  const portfolioKPIs = useMemo(() =>
    computePortfolioKPIs(filteredIncome, filteredExpenses, 'all'),
    [filteredIncome, filteredExpenses]
  );

  // ── Property Summaries (from analytics engine) ────────────
  const propertySummaries = useMemo(() => {
    const raw = computePropertySummaries(filteredIncome, filteredExpenses, 'all');
    return raw.filter(isActivePropertySummary);
  }, [filteredIncome, filteredExpenses]);

  // ── Vendor Summaries (from analytics engine) ──────────────
  const vendorSummaries = useMemo(() =>
    computeVendorSummaries(filteredExpenses, 'all'),
    [filteredExpenses]
  );

  // ── Profitability Analysis ────────────────────────────────
  const profitability = useMemo(() => {
    const raw = computePropertyProfitability(filteredIncome, filteredExpenses, 'all');
    return raw.filter(isActivePropertyProfitability);
  }, [filteredIncome, filteredExpenses]);

  // ── Vendor Expense Analysis ───────────────────────────────
  const vendorAnalysis = useMemo(() =>
    computeVendorExpenseAnalysis(filteredExpenses, 'all'),
    [filteredExpenses]
  );

  // ── Vendor Concentration ──────────────────────────────────
  const vendorConcentration = useMemo(() =>
    computeExpenseConcentration(vendorAnalysis),
    [vendorAnalysis]
  );

  // ── Cash Flow Risk ────────────────────────────────────────
  const cashFlowRisk = useMemo(() =>
    computeCashFlowRiskAnalysis(filteredIncome, filteredExpenses),
    [filteredIncome, filteredExpenses]
  );

  // ── Risk Items ────────────────────────────────────────────
  const risks = useMemo(() =>
    identifyRisks(filteredIncome, filteredExpenses, propertySummaries, vendorSummaries),
    [filteredIncome, filteredExpenses, propertySummaries, vendorSummaries]
  );

  // ── Insights (from insights engine) ───────────────────────
  const insights = useMemo(() =>
    generateInsights(filteredIncome, filteredExpenses, 'all'),
    [filteredIncome, filteredExpenses]
  );

  // ═══════════════════════════════════════════════════════════
  // ENRICHED TABLES — Built from analytics engine results
  // ═══════════════════════════════════════════════════════════

  // ── Property Table (enriched with margin, collection, outstanding) ─
  const propertyTable = useMemo<PropertyRow[]>(() => {
    return profitability.map(p => ({
      staNo: p.staNo,
      propertyName: p.propertyName,
      income: p.totalIncome,
      expenses: p.totalExpenses,
      profit: p.netProfit,
      margin: p.profitMargin,
      collectionRate: p.collectionRate,
      incomeReceivable: p.incomeReceivable,
      outstanding: Math.max(0, p.incomeReceivable - p.totalIncome),
      expenseRatio: p.expenseRatio === Infinity ? 0 : p.expenseRatio,
    }));
  }, [profitability]);

  // ── Vendor Table (enriched with % contribution, properties, categories) ─
  const vendorTable = useMemo<VendorRow[]>(() => {
    return vendorAnalysis.map(v => ({
      supplierName: v.supplierName,
      totalSpend: v.totalSpend,
      percentOfTotal: v.percentOfTotal,
      invoiceCount: v.invoiceCount,
      avgInvoiceAmount: v.avgInvoiceAmount,
      propertyCount: v.propertyCount,
      properties: v.properties,
      categories: v.categories,
    }));
  }, [vendorAnalysis]);

  // ── Quick Summary (from portfolio KPIs + profitability) ───
  const summary = useMemo<QuickSummary>(() => {
    const topProp = profitability.length > 0 ? profitability[0] : null;
    const worstProp = profitability.length > 0 ? profitability[profitability.length - 1] : null;
    const topVendorData = vendorAnalysis.length > 0 ? vendorAnalysis[0] : null;

    return {
      totalIncome: portfolioKPIs.totalIncome,
      totalExpenses: portfolioKPIs.totalExpenses,
      totalExpensesNett: portfolioKPIs.totalExpensesNett,
      totalVAT: portfolioKPIs.totalVAT,
      netProfit: portfolioKPIs.netIncome,
      profitMargin: portfolioKPIs.totalIncome > 0 ? portfolioKPIs.netIncome / portfolioKPIs.totalIncome : 0,
      outstandingReceivables: portfolioKPIs.uncollectedIncome,
      totalReceivable: portfolioKPIs.totalReceivable,
      collectionRate: portfolioKPIs.collectionRate,
      topProperty: topProp ? {
        name: topProp.propertyName,
        income: topProp.totalIncome,
        profit: topProp.netProfit,
        margin: topProp.profitMargin,
      } : null,
      worstProperty: worstProp && worstProp.staNo !== topProp?.staNo ? {
        name: worstProp.propertyName,
        profit: worstProp.netProfit,
        margin: worstProp.profitMargin,
      } : null,
      topVendor: topVendorData ? {
        name: topVendorData.supplierName,
        spend: topVendorData.totalSpend,
        percentOfTotal: topVendorData.percentOfTotal,
      } : null,
      propertyCount: profitability.length > 0 ? profitability.length : portfolioKPIs.propertyCount,
      vendorCount: portfolioKPIs.vendorCount,
      overdueInvoices: portfolioKPIs.overdueInvoices,
      overdueAmount: portfolioKPIs.overdueAmount,
    };
  }, [portfolioKPIs, profitability, vendorAnalysis]);

  // ═══════════════════════════════════════════════════════════
  // CHAT CONTEXT — Deep analytical briefing for LLM
  // Structured to enable answering: property performance,
  // vendor costs, profitability, receivables, and "why" queries
  // ═══════════════════════════════════════════════════════════
  const dataContextString = useMemo(() => {
    // ── Section 1: Portfolio Overview ──────────────────────────
    const portfolioSection = [
      `═══ PORTFOLIO OVERVIEW (${periodLabel}) ═══`,
      `Total Income: ${formatCurrency(summary.totalIncome)}`,
      `Total Expenses (Gross): ${formatCurrency(summary.totalExpenses)}`,
      `Expenses (Nett excl. VAT): ${formatCurrency(summary.totalExpensesNett)}`,
      `Total VAT: ${formatCurrency(summary.totalVAT)}`,
      `Net Profit: ${formatCurrency(summary.netProfit)}`,
      `Profit Margin: ${formatPercent(summary.profitMargin)}`,
      `Outstanding Receivables: ${formatCurrency(summary.outstandingReceivables)}`,
      `Total Receivable: ${formatCurrency(summary.totalReceivable)}`,
      `Collection Rate: ${formatPercent(summary.collectionRate)}`,
      `Properties: ${summary.propertyCount}`,
      `Vendors: ${summary.vendorCount}`,
      `Overdue Invoices: ${summary.overdueInvoices} worth ${formatCurrency(summary.overdueAmount)}`,
      summary.topProperty ? `Best Property: ${summary.topProperty.name} (Profit ${formatCurrency(summary.topProperty.profit)}, Margin ${formatPercent(summary.topProperty.margin)})` : '',
      summary.worstProperty ? `Worst Property: ${summary.worstProperty.name} (Profit ${formatCurrency(summary.worstProperty.profit)}, Margin ${formatPercent(summary.worstProperty.margin)})` : '',
      summary.topVendor ? `Highest-Spend Vendor: ${summary.topVendor.name} (${formatCurrency(summary.topVendor.spend)}, ${formatPercent(summary.topVendor.percentOfTotal)} of total)` : '',
    ].filter(Boolean).join('\n');

    // ── Section 2: Profitability Classification ────────────────
    const highPerformers = profitability.filter(p => p.classification === 'high-performing');
    const profitable = profitability.filter(p => p.classification === 'profitable');
    const lowMargin = profitability.filter(p => p.classification === 'low-margin');
    const lossMaking = profitability.filter(p => p.classification === 'loss-making');

    const classSection = [
      `\n═══ PROFITABILITY CLASSIFICATION ═══`,
      `High-performing (margin >50%): ${highPerformers.length} — ${highPerformers.map(p => p.propertyName).join(', ') || 'None'}`,
      `Profitable: ${profitable.length} — ${profitable.map(p => p.propertyName).join(', ') || 'None'}`,
      `Low-margin (margin <20%): ${lowMargin.length} — ${lowMargin.map(p => p.propertyName).join(', ') || 'None'}`,
      `Loss-making: ${lossMaking.length} — ${lossMaking.map(p => p.propertyName).join(', ') || 'None'}`,
    ].join('\n');

    // ── Section 3: Detailed Property Analysis ──────────────────
    const propertyDetails = profitability.map(p => {
      const topCats = p.topExpenseCategories.slice(0, 5)
        .map(c => `${c.category}: ${formatCurrency(c.amount)}`).join(', ');
      const topVendorsStr = p.topVendors.slice(0, 5)
        .map(v => `${v.name}: ${formatCurrency(v.amount)}`).join(', ');
      const riskProp = cashFlowRisk.properties.find(r => r.staNo === p.staNo);
      const riskInfo = riskProp
        ? `Risk: ${riskProp.riskLevel.toUpperCase()} (score ${riskProp.riskScore}/100). Factors: ${riskProp.riskFactors.join('; ')}. Collection trend: ${riskProp.collectionTrendDirection}.`
        : 'Risk: LOW';
      const outstanding = Math.max(0, p.incomeReceivable - p.totalIncome);

      return [
        `\n--- ${p.propertyName} (${p.staNo}) ---`,
        `Income: ${formatCurrency(p.totalIncome)} | Expenses: ${formatCurrency(p.totalExpenses)} | Profit: ${formatCurrency(p.netProfit)} | Margin: ${formatPercent(p.profitMargin)}`,
        `Expense Ratio: ${formatPercent(p.expenseRatio)} | Collection Rate: ${formatPercent(p.collectionRate)} | Outstanding: ${formatCurrency(outstanding)}`,
        `Classification: ${p.classification}`,
        `Top Expense Categories: ${topCats || 'N/A'}`,
        `Top Vendors: ${topVendorsStr || 'N/A'}`,
        riskInfo,
      ].join('\n');
    }).join('\n');

    const propertySection = `\n═══ DETAILED PROPERTY ANALYSIS (${profitability.length} properties) ═══${propertyDetails}`;

    // ── Section 4: Detailed Vendor Analysis ────────────────────
    const vendorDetails = vendorAnalysis.map(v => {
      const propsServed = v.properties.slice(0, 8).join(', ');
      const paidPct = v.totalSpend > 0 ? formatPercent(v.paidAmount / v.totalSpend) : '0%';
      const pendingPct = v.totalSpend > 0 ? formatPercent(v.pendingAmount / v.totalSpend) : '0%';
      const overduePct = v.totalSpend > 0 ? formatPercent(v.overdueAmount / v.totalSpend) : '0%';

      return [
        `\n--- ${v.supplierName} ---`,
        `Total Spend: ${formatCurrency(v.totalSpend)} (${formatPercent(v.percentOfTotal)} of total expenses)`,
        `Invoices: ${v.invoiceCount} | Avg Invoice: ${formatCurrency(v.avgInvoiceAmount)} | Avg Cost/Property: ${formatCurrency(v.avgCostPerProperty)}`,
        `Properties Served (${v.propertyCount}): ${propsServed}${v.properties.length > 8 ? ` +${v.properties.length - 8} more` : ''}`,
        `Categories: ${v.categories.join(', ')}`,
        `Payment Status: Paid ${formatCurrency(v.paidAmount)} (${paidPct}) | Pending ${formatCurrency(v.pendingAmount)} (${pendingPct}) | Overdue ${formatCurrency(v.overdueAmount)} (${overduePct})`,
      ].join('\n');
    }).join('\n');

    const vendorSection = `\n═══ DETAILED VENDOR ANALYSIS (${vendorAnalysis.length} vendors) ═══${vendorDetails}`;

    // ── Section 5: Vendor Concentration ────────────────────────
    const concentrationSection = [
      `\n═══ VENDOR CONCENTRATION ═══`,
      `Top 3 vendors (${vendorConcentration.top3Vendors.names.join(', ')}): ${formatCurrency(vendorConcentration.top3Vendors.totalSpend)} = ${formatPercent(vendorConcentration.top3Vendors.percentOfTotal)} of total`,
      `Top 5 vendors (${vendorConcentration.top5Vendors.names.join(', ')}): ${formatCurrency(vendorConcentration.top5Vendors.totalSpend)} = ${formatPercent(vendorConcentration.top5Vendors.percentOfTotal)} of total`,
    ].join('\n');

    // ── Section 6: Cash Flow & Risk ───────────────────────────
    const atRiskProps = cashFlowRisk.properties
      .filter(p => p.riskLevel === 'critical' || p.riskLevel === 'high')
      .map(p => `${p.propertyName}: Risk ${p.riskLevel.toUpperCase()} (score ${p.riskScore}/100), Collection Rate ${formatPercent(p.collectionRate)}, Outstanding ${formatCurrency(p.outstandingIncome)}, Overdue Expenses ${formatCurrency(p.overdueExpenses)}, Net Cash ${formatCurrency(p.netCashPosition)}. Factors: ${p.riskFactors.join('; ')}.`)
      .join('\n');

    const riskSection = [
      `\n═══ CASH FLOW & RISK ANALYSIS ═══`,
      `Portfolio Health Score: ${cashFlowRisk.cashFlowHealthScore}/100`,
      `Properties at Risk: ${cashFlowRisk.propertiesAtRisk} (${cashFlowRisk.criticalCount} critical, ${cashFlowRisk.highCount} high, ${cashFlowRisk.mediumCount} medium)`,
      `Total Outstanding Receivables: ${formatCurrency(cashFlowRisk.totalOutstandingReceivables)}`,
      `Total Overdue Expenses: ${formatCurrency(cashFlowRisk.totalOverdueExpenses)}`,
      `Total Pending Expenses: ${formatCurrency(cashFlowRisk.totalPendingExpenses)}`,
      atRiskProps ? `\nAt-Risk Properties:\n${atRiskProps}` : 'No properties at critical or high risk.',
    ].join('\n');

    // ── Section 7: Key Insights ───────────────────────────────
    const insightSection = `\n═══ KEY INSIGHTS ═══\n` +
      insights.slice(0, 15).map(i => {
        const parts = [`[${i.severity.toUpperCase()}] ${i.title}`];
        if (i.description) parts.push(i.description);
        if (i.entity) parts.push(`Entity: ${i.entity}`);
        if (i.metric) parts.push(`Metric: ${i.metric} ${i.metricLabel || ''}`);
        return parts.join(' | ');
      }).join('\n');

    // ── Section 8: Risk Register ──────────────────────────────
    const riskRegister = risks.length > 0
      ? `\n═══ RISK REGISTER (${risks.length} items) ═══\n` +
        risks.slice(0, 20).map(r => {
          const parts = [`[${r.severity.toUpperCase()}] ${r.title}: ${r.description}`];
          if (r.amount > 0) parts.push(`Amount: ${formatCurrency(r.amount)}`);
          if (r.property) parts.push(`Property: ${r.property}`);
          if (r.vendor) parts.push(`Vendor: ${r.vendor}`);
          return parts.join(' | ');
        }).join('\n')
      : '';

    return [
      portfolioSection,
      classSection,
      propertySection,
      vendorSection,
      concentrationSection,
      riskSection,
      insightSection,
      riskRegister,
    ].filter(Boolean).join('\n');
  }, [summary, profitability, vendorAnalysis, vendorConcentration, cashFlowRisk, insights, risks, periodLabel]);

  // ═══════════════════════════════════════════════════════════
  // DATA MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  const addIncomeData = useCallback((records: IncomeRecord[], datasetName: string) => {
    setIncomeData(prev => [...prev, ...records]);
    setDatasets(prev => [...prev, {
      id: `inc-${Date.now()}`,
      name: datasetName,
      type: 'income',
      uploadDate: new Date().toISOString(),
      recordCount: records.length,
      months: Array.from(new Set(records.map(r => r.month))).sort(),
    }]);
  }, []);

  const addExpenseData = useCallback((records: ExpenseRecord[], datasetName: string) => {
    setExpenseData(prev => [...prev, ...records]);
    setDatasets(prev => [...prev, {
      id: `exp-${Date.now()}`,
      name: datasetName,
      type: 'expense',
      uploadDate: new Date().toISOString(),
      recordCount: records.length,
      months: Array.from(new Set(records.map(r => r.month))).sort(),
    }]);
  }, []);

  const clearAllData = useCallback(() => {
    setIncomeData([]);
    setExpenseData([]);
    setDatasets([]);
  }, []);

  const loadSampleData = useCallback(() => {
    setIncomeData(generateSampleIncome());
    setExpenseData(generateSampleExpenses());
    setDatasets([
      { id: 'sample-income', name: 'Sample Income Data', type: 'income', uploadDate: new Date().toISOString(), recordCount: 360, months: getAvailableMonths() },
      { id: 'sample-expense', name: 'Sample Expense Data', type: 'expense', uploadDate: new Date().toISOString(), recordCount: 504, months: getAvailableMonths() },
    ]);
  }, []);

  const value = useMemo(() => ({
    incomeData,
    expenseData,
    datasets,
    hasData,
    filteredIncome,
    filteredExpenses,
    activeRange,
    setActiveRange,
    availableMonths,
    dateRangeOptions,
    periodLabel,
    summary,
    propertyTable,
    vendorTable,
    insights,
    propertySummaries,
    vendorSummaries,
    portfolioKPIs,
    profitability,
    vendorAnalysis,
    vendorConcentration,
    cashFlowRisk,
    risks,
    dataContextString,
    addIncomeData,
    addExpenseData,
    clearAllData,
    loadSampleData,
  }), [
    incomeData, expenseData, datasets, hasData,
    filteredIncome, filteredExpenses,
    activeRange, availableMonths, dateRangeOptions, periodLabel,
    summary, propertyTable, vendorTable, insights,
    propertySummaries, vendorSummaries, portfolioKPIs,
    profitability, vendorAnalysis, vendorConcentration,
    cashFlowRisk, risks, dataContextString,
    addIncomeData, addExpenseData, clearAllData, loadSampleData,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
