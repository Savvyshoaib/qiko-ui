import type { DateRangeOption, QuickSummary } from "@/contexts/DataContext";
import type { FinancialDashboardData } from "./financialTypes";
import type {
  ELUserAnalyticsResponse,
  ELUserProperty,
  ELUserAnalyticsSummary,
  ELUserAnalyticsSummaryMetric,
} from "@/lib/ELApi";
import { isActiveElApiProperty } from "./financialDisplayFilters";
import type {
  CashFlowRiskSummary,
  ExpenseConcentration,
  PropertyCashFlowRisk,
  PropertyProfitability,
  PropertySummary,
  VendorExpenseAnalysis,
} from "@/lib/types";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Inclusive YYYY-MM list between ISO date strings (date only). */
export function monthsBetweenInclusive(fromIso: string, toIso: string): string[] {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`);
  const to = new Date(`${toIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return [];
  const out: string[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    out.push(`${cur.getUTCFullYear()}-${pad2(cur.getUTCMonth() + 1)}`);
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return Array.from(new Set(out)).sort();
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-GB", { month: "short", year: "numeric" });
}

function monthLabelFromMonthYear(value: string): string {
  const [m, y] = value.split("-").map(Number);
  if (!m || !y) return value;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-GB", { month: "short", year: "numeric" });
}

function normalizeToMonthYearToken(value: string): string | null {
  const text = String(value || "").trim();
  if (!text) return null;

  const yyyyMm = text.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])\b/);
  if (yyyyMm) return `${yyyyMm[2]}-${yyyyMm[1]}`;

  const mmYyyy = text.match(/\b(0[1-9]|1[0-2])[-/](20\d{2})\b/);
  if (mmYyyy) return `${mmYyyy[1]}-${mmYyyy[2]}`;

  const monthName = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s\-_/,]*(20\d{2})\b/i
  );
  if (monthName) {
    const monthMap: Record<string, string> = {
      jan: "01", january: "01",
      feb: "02", february: "02",
      mar: "03", march: "03",
      apr: "04", april: "04",
      may: "05",
      jun: "06", june: "06",
      jul: "07", july: "07",
      aug: "08", august: "08",
      sep: "09", sept: "09", september: "09",
      oct: "10", october: "10",
      nov: "11", november: "11",
      dec: "12", december: "12",
    };
    const month = monthMap[monthName[1].toLowerCase()];
    const year = monthName[2];
    if (month && year) return `${month}-${year}`;
  }

  return null;
}

function buildAvailableDateRangeOptions(analytics: ELUserAnalyticsResponse): DateRangeOption[] {
  const tokens = new Set<string>();

  for (const file of Array.isArray(analytics.files) ? analytics.files : []) {
    const candidates = [file?.label, file?.namespace];
    for (const candidate of candidates) {
      const token = normalizeToMonthYearToken(String(candidate || ""));
      if (token) tokens.add(token);
    }
  }

  return Array.from(tokens)
    .sort((a, b) => {
      const [am, ay] = a.split("-").map(Number);
      const [bm, by] = b.split("-").map(Number);
      return ay !== by ? ay - by : am - bm;
    })
    .map((value) => ({ value, label: monthLabelFromMonthYear(value) }));
}

function lastDayOfMonthUtc(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return `${ym}-28`;
  const last = new Date(Date.UTC(y, m, 0));
  return `${last.getUTCFullYear()}-${pad2(last.getUTCMonth() + 1)}-${pad2(last.getUTCDate())}`;
}

function firstDayOfMonthUtc(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return `${ym}-01`;
  return `${y}-${pad2(m)}-01`;
}

function shiftMonth(ym: string, deltaMonths: number): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  const d = new Date(Date.UTC(y, m - 1 + deltaMonths, 1));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapProfitabilityClass(raw: string | undefined): PropertyProfitability["classification"] {
  const n = (raw || "").toLowerCase().replace(/_/g, "-");
  if (n.includes("high") && n.includes("perform")) return "high-performing";
  if (n.includes("loss")) return "loss-making";
  if (n.includes("low") && n.includes("margin")) return "low-margin";
  return "profitable";
}

type ApiProperty = ELUserProperty & {
  propertyId: string;
  name: string;
  income: number;
  expenses: number;
  netProfit: number;
  marginPercent: number;
  outstanding: number;
  costToIncomeRatio: number;
  riskScore: number;
  riskLevel: string;
  profitabilityClass?: string;
  expenseCategories?: { category: string; amount: number }[];
  topVendors?: { vendorName: string; amount: number }[];
};

type ApiVendorChart = {
  vendorName: string;
  amount: number;
  sharePercent: number;
};

function toPropertyProfitability(p: ApiProperty, ymKey: string): PropertyProfitability {
  const income = Number(p.income ?? 0);
  const expenses = Number(p.expenses ?? 0);
  const netProfit = Number(p.netProfit ?? income - expenses);
  const marginFrac = income > 0 ? netProfit / income : Number(p.marginPercent ?? 0) / 100;
  const expenseRatio = income > 0 ? expenses / income : Number(p.costToIncomeRatio ?? 0) / 100;
  const ym = /^\d{4}-\d{2}$/.test(ymKey) ? ymKey : "2000-01";
  return {
    staNo: String(p.propertyId),
    propertyName: String(p.name),
    totalIncome: income,
    totalExpenses: expenses,
    netProfit,
    profitMargin: marginFrac,
    incomeReceivable: income,
    deferredIncome: 0,
    collectionRate: income > 0 ? Math.max(0, Math.min(1, 1 - Math.abs(Number(p.outstanding ?? 0)) / (income + 1e-9))) : 0,
    expenseRatio: expenseRatio || (income > 0 ? expenses / income : 0),
    classification: mapProfitabilityClass(p.profitabilityClass),
    monthlyProfitability: [
      {
        month: ym,
        income,
        expenses,
        netProfit,
        margin: marginFrac,
      },
    ],
    topExpenseCategories: (p.expenseCategories || []).map((c) => ({
      category: c.category,
      amount: Number(c.amount ?? 0),
    })),
    topVendors: (p.topVendors || []).map((v) => ({
      name: v.vendorName,
      amount: Number(v.amount ?? 0),
    })),
  };
}

function toPropertySummary(p: ApiProperty, ymKey: string): PropertySummary {
  const income = Number(p.income ?? 0);
  const expenses = Number(p.expenses ?? 0);
  const ym = /^\d{4}-\d{2}$/.test(ymKey) ? ymKey : "2000-01";
  const breakdown: Record<string, number> = {};
  for (const c of p.expenseCategories || []) {
    breakdown[c.category] = (breakdown[c.category] || 0) + Number(c.amount ?? 0);
  }
  return {
    staNo: String(p.propertyId),
    propertyName: String(p.name),
    totalIncome: income,
    totalExpenses: expenses,
    netIncome: income - expenses,
    collectionRate: income > 0 ? Math.max(0, Math.min(1, income / (income + Math.abs(Number(p.outstanding ?? 0)) + 1e-9))) : 0,
    incomeReceivable: income,
    deferredIncome: 0,
    uncollectedAmount: Number(p.outstanding ?? 0),
    expenseBreakdown: breakdown,
    monthlyTrend: [{ month: ym, value: income }],
  };
}

function normalizeVendorName(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(limited|ltd|llc|inc|co|company|services?)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toVendorAnalysis(
  rows: ApiVendorChart[],
  totalExpense: number,
  properties: ApiProperty[],
  ymKey: string
): VendorExpenseAnalysis[] {
  const vendorToPropertySpend = new Map<string, Map<string, number>>();

  for (const property of properties) {
    for (const topVendor of property.topVendors || []) {
      const vendorKey = normalizeVendorName(topVendor.vendorName);
      if (!vendorKey) continue;
      const propertyName = String(property.name || "").trim();
      if (!propertyName) continue;
      const amount = Number(topVendor.amount ?? 0);
      if (!vendorToPropertySpend.has(vendorKey)) {
        vendorToPropertySpend.set(vendorKey, new Map<string, number>());
      }
      const propertyMap = vendorToPropertySpend.get(vendorKey)!;
      propertyMap.set(propertyName, (propertyMap.get(propertyName) || 0) + amount);
    }
  }

  const monthlyKey = /^\d{4}-\d{2}$/.test(ymKey) ? ymKey : "2000-01";

  return rows.map((v) => {
    const spend = Number(v.amount ?? 0);
    const share = Number(v.sharePercent ?? 0) / 100;
    const normalizedVendor = normalizeVendorName(v.vendorName);

    let propertyMap = vendorToPropertySpend.get(normalizedVendor);
    if (!propertyMap && normalizedVendor.length >= 6) {
      propertyMap = Array.from(vendorToPropertySpend.entries()).find(
        ([key]) => key.includes(normalizedVendor) || normalizedVendor.includes(key)
      )?.[1];
    }

    const propertyEntries = propertyMap
      ? Array.from(propertyMap.entries()).sort((a, b) => b[1] - a[1])
      : [];
    const propertiesForVendor = propertyEntries.map(([propertyName]) => propertyName);
    const propertyCount = propertiesForVendor.length;

    return {
      supplierName: String(v.vendorName),
      totalSpend: spend,
      percentOfTotal: share || (totalExpense > 0 ? spend / totalExpense : 0),
      invoiceCount: 0,
      avgInvoiceAmount: spend,
      avgCostPerProperty: propertyCount > 0 ? spend / propertyCount : spend,
      propertyCount,
      properties: propertiesForVendor,
      categories: [],
      paidAmount: spend,
      pendingAmount: 0,
      overdueAmount: 0,
      monthlySpend: [{ month: monthlyKey, amount: spend }],
    };
  });
}

function toCashFlowRisk(properties: ApiProperty[]): CashFlowRiskSummary {
  const mapped: PropertyCashFlowRisk[] = properties.map((p) => {
    const income = Number(p.income ?? 0);
    const expenses = Number(p.expenses ?? 0);
    const outstanding = Number(p.outstanding ?? 0);
    const level = (p.riskLevel || "low").toLowerCase();
    const riskLevel =
      level === "critical" || level === "high" || level === "medium" || level === "low"
        ? (level as PropertyCashFlowRisk["riskLevel"])
        : "low";
    return {
      staNo: String(p.propertyId),
      propertyName: String(p.name),
      totalIncome: income,
      incomeReceivable: income,
      deferredIncome: 0,
      outstandingIncome: outstanding,
      collectionRate: income > 0 ? Math.max(0, Math.min(1, income / (income + Math.abs(outstanding) + 1e-9))) : 0,
      receivablePercent: income > 0 ? Math.abs(outstanding) / income : 0,
      monthlyCollectionTrend: [],
      riskLevel,
      riskScore: Number(p.riskScore ?? 0),
      riskFactors: [],
      collectionTrendDirection: "stable",
      avgMonthlyCollection: 0,
      latestMonthCollection: 0,
      overdueExpenses: 0,
      pendingExpenses: 0,
      netCashPosition: income - expenses,
    };
  });

  const totalOutstanding = properties.reduce((s, p) => s + Number(p.outstanding ?? 0), 0);
  const critical = mapped.filter((x) => x.riskLevel === "critical").length;
  const high = mapped.filter((x) => x.riskLevel === "high").length;
  const medium = mapped.filter((x) => x.riskLevel === "medium").length;
  const low = mapped.filter((x) => x.riskLevel === "low").length;
  const atRisk = mapped.filter((x) => x.riskLevel === "critical" || x.riskLevel === "high").length;
  const avgScore = mapped.length ? mapped.reduce((s, x) => s + x.riskScore, 0) / mapped.length : 0;
  const health = Math.max(0, Math.min(100, Math.round(100 - avgScore)));

  return {
    totalOutstandingReceivables: totalOutstanding,
    totalDeferredIncome: 0,
    totalIncomeReceivable: properties.reduce((s, p) => s + Number(p.income ?? 0), 0),
    portfolioCollectionRate: 0,
    avgPropertyCollectionRate: mapped.length
      ? mapped.reduce((s, x) => s + x.collectionRate, 0) / mapped.length
      : 0,
    propertiesAtRisk: atRisk,
    criticalCount: critical,
    highCount: high,
    mediumCount: medium,
    lowCount: low,
    totalOverdueExpenses: 0,
    totalPendingExpenses: 0,
    cashFlowHealthScore: health,
    properties: mapped,
  };
}

function parseNetVatFromSubtitle(subtitle: string | undefined): { net: number; vat: number } {
  if (!subtitle || typeof subtitle !== "string") return { net: Number.NaN, vat: Number.NaN };
  const toNum = (raw: string) => Number(String(raw).replace(/,/g, "").replace(/\s/g, "")) || 0;
  const netM = subtitle.match(/Nett?\s+([0-9,.\s]+)/i);
  const vatM = subtitle.match(/VAT\s+([0-9,.\s]+)/i);
  return {
    net: netM ? toNum(netM[1]) : Number.NaN,
    vat: vatM ? toNum(vatM[1]) : Number.NaN,
  };
}

/** Supports legacy flat `summary` objects and newer `summary: [{ key, value, subtitle? }]`. */
function normalizeElUserSummary(summary: ELUserAnalyticsResponse["summary"]): ELUserAnalyticsSummary {
  if (summary == null) return {};
  if (!Array.isArray(summary)) return summary as ELUserAnalyticsSummary;

  const byKey = new Map<string, ELUserAnalyticsSummaryMetric>();
  for (const row of summary) {
    if (row && typeof row.key === "string") byKey.set(row.key, row);
  }
  const n = (key: string) => Number(byKey.get(key)?.value ?? 0);
  const totalExpenses = n("totalExpenses");
  const teRow = byKey.get("totalExpenses");
  const parsed = parseNetVatFromSubtitle(teRow?.subtitle);
  const netFromSubtitle = Number.isFinite(parsed.net) ? parsed.net : totalExpenses;
  const vatFromSubtitle = Number.isFinite(parsed.vat) ? parsed.vat : 0;

  return {
    propertyCount: byKey.has("propertyCount") ? n("propertyCount") : undefined,
    vendorCount: byKey.has("vendorCount") ? n("vendorCount") : undefined,
    totalIncome: n("totalIncome"),
    totalExpenses,
    netProfit: n("netProfit"),
    outstanding: n("outstanding"),
    expenseBreakdown: teRow?.subtitle ? { net: netFromSubtitle, vat: vatFromSubtitle } : undefined,
  };
}

function buildQuickSummary(
  analytics: ELUserAnalyticsResponse,
  properties: ApiProperty[]
): QuickSummary {
  const s = normalizeElUserSummary(analytics.summary);
  const totalIncome = Number(s.totalIncome ?? 0);
  const totalExpenses = Number(s.totalExpenses ?? 0);
  const netProfit = Number(s.netProfit ?? totalIncome - totalExpenses);
  const nett = Number(s.expenseBreakdown?.net ?? totalExpenses);
  const vat = Number(s.expenseBreakdown?.vat ?? 0);
  const outstanding = Number(s.outstanding ?? 0);

  const sorted = [...properties].sort((a, b) => Number(b.netProfit ?? 0) - Number(a.netProfit ?? 0));
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const topVendorRow = (analytics.charts as { topVendorsBySpend?: ApiVendorChart[] } | undefined)?.topVendorsBySpend?.[0];

  return {
    totalIncome,
    totalExpenses,
    totalExpensesNett: nett,
    totalVAT: vat,
    netProfit,
    profitMargin: totalIncome > 0 ? netProfit / totalIncome : 0,
    outstandingReceivables: outstanding,
    totalReceivable: totalIncome,
    collectionRate: totalIncome > 0 ? Math.max(0, Math.min(1, 1 - Math.abs(outstanding) / (totalIncome + 1e-9))) : 0,
    topProperty: best
      ? {
          name: best.name,
          income: Number(best.income),
          profit: Number(best.netProfit),
          margin: Number(best.marginPercent ?? 0) / 100,
        }
      : null,
    topVendor: topVendorRow
      ? {
          name: topVendorRow.vendorName,
          spend: Number(topVendorRow.amount),
          percentOfTotal: Number(topVendorRow.sharePercent ?? 0) / 100,
        }
      : null,
    worstProperty: worst
      ? {
          name: worst.name,
          profit: Number(worst.netProfit),
          margin: Number(worst.marginPercent ?? 0) / 100,
        }
      : null,
    propertyCount: properties.length,
    vendorCount: Number(s.vendorCount ?? 0),
    overdueInvoices: 0,
    overdueAmount: 0,
  };
}

/**
 * Maps Excel Agent `GET /api/user` JSON into the dashboard shape used by `userDashboard.tsx`.
 */
export function mapElUserAnalyticsToDashboardData(
  analytics: ELUserAnalyticsResponse,
  activeRange: string
): FinancialDashboardData {
  const rawProperties = (Array.isArray(analytics.properties) ? analytics.properties : []) as ApiProperty[];
  const properties = rawProperties.filter(isActiveElApiProperty);
  const charts = (analytics.charts || {}) as {
    topVendorsBySpend?: ApiVendorChart[];
    incomeVsExpensesByProperty?: { propertyId: string; propertyName: string; income: number; expenses: number }[];
  };
  const vendorRows = charts.topVendorsBySpend || [];
  const totalExpenses = Number(normalizeElUserSummary(analytics.summary).totalExpenses ?? 0);

  const dateRangeOptions: DateRangeOption[] = buildAvailableDateRangeOptions(analytics);

  const periodLabel = /^\d{2}-\d{4}$/.test(activeRange)
    ? monthLabelFromMonthYear(activeRange)
    : "Select month";

  const ymForSpark = /^\d{2}-\d{4}$/.test(activeRange)
    ? `${activeRange.slice(3)}-${activeRange.slice(0, 2)}`
    : "2000-01";

  const profitability = properties.map((p) => toPropertyProfitability(p, ymForSpark));
  const propertySummaries = properties.map((p) => toPropertySummary(p, ymForSpark));
  const vendorAnalysis = toVendorAnalysis(vendorRows, totalExpenses, properties, ymForSpark);

  const top3 = vendorRows.slice(0, 3);
  const top5 = vendorRows.slice(0, 5);
  const t3Spend = top3.reduce((s, v) => s + Number(v.amount ?? 0), 0);
  const t5Spend = top5.reduce((s, v) => s + Number(v.amount ?? 0), 0);
  const vendorConcentration: ExpenseConcentration = {
    top3Vendors: {
      names: top3.map((v) => v.vendorName),
      totalSpend: t3Spend,
      percentOfTotal:
        totalExpenses > 0
          ? t3Spend / totalExpenses
          : Math.min(1, top3.reduce((s, v) => s + Number(v.sharePercent ?? 0), 0) / 100),
    },
    top5Vendors: {
      names: top5.map((v) => v.vendorName),
      totalSpend: t5Spend,
      percentOfTotal:
        totalExpenses > 0
          ? t5Spend / totalExpenses
          : Math.min(1, top5.reduce((s, v) => s + Number(v.sharePercent ?? 0), 0) / 100),
    },
    totalExpenses,
  };

  const summary = buildQuickSummary(analytics, properties);
  const cashFlowRisk = toCashFlowRisk(properties);

  const propertyTable = profitability.map((p) => ({
    staNo: p.staNo,
    propertyName: p.propertyName,
    income: p.totalIncome,
    expenses: p.totalExpenses,
    profit: p.netProfit,
    margin: p.profitMargin,
  }));

  const vendorTable = vendorAnalysis.map((v) => ({
    supplierName: v.supplierName,
    totalSpend: v.totalSpend,
    invoiceCount: v.invoiceCount,
    propertyCount: v.propertyCount,
  }));

  const insightsPayload = analytics.insights || {};
  const insights = Array.isArray(insightsPayload) ? insightsPayload : [insightsPayload as Record<string, unknown>];
  const trends = analytics.trends;

  const dataContextString = [
    `Agent Unique ID: ${analytics.agent_unique_id ?? analytics.email ?? "-"}`,
    `Files: ${analytics.totalFiles}, Rows: ${analytics.totalRows}`,
    `Income: ${summary.totalIncome}, Expenses: ${summary.totalExpenses}, Net: ${summary.netProfit}`,
  ].join("\n");

  const hasData =
    rawProperties.length > 0 ||
    (Number(analytics.totalRows ?? 0) > 0 && (analytics.totalFiles ?? 0) > 0);

  return {
    hasData,
    periodLabel,
    activeRange,
    dateRangeOptions,
    summary,
    propertySummaries,
    profitability,
    vendorAnalysis,
    vendorConcentration,
    cashFlowRisk,
    propertyTable,
    vendorTable,
    insights,
    trends,
    risks: [],
    dataContextString,
    extraMetrics: {
      unsettledReceipts: 0,
      depositsCharged: 0,
      depositsPaid: 0,
      ownerExpenditure: 0,
      deferredIncome: 0,
      receivableBalance: summary.outstandingReceivables,
    },
  };
}

export function resolveUserAnalyticsQuery(
  activeRange: string,
  dateFrom?: string,
  dateTo?: string
): { from?: string; to?: string; month?: string } {
  if (/^\d{2}-\d{4}$/.test(activeRange)) {
    return { month: activeRange };
  }
  if (/^\d{4}-\d{2}$/.test(activeRange)) {
    const [y, m] = activeRange.split("-");
    return { month: `${m}-${y}` };
  }
  if (!activeRange || activeRange === "all") {
    return {};
  }
  const lastMatch = activeRange.match(/^last-(\d+)$/);
  if (lastMatch) {
    const months = Math.max(1, Number(lastMatch[1]));
    const anchor = /^\d{4}-\d{2}-\d{2}$/.test(dateTo || "")
      ? String(dateTo).slice(0, 7)
      : new Date().toISOString().slice(0, 7);
    const fromMonth = shiftMonth(anchor, -(months - 1));
    return { from: firstDayOfMonthUtc(fromMonth), to: lastDayOfMonthUtc(anchor) };
  }
  const yearMatch = activeRange.match(/^year-(\d{4})$/);
  if (yearMatch) {
    const year = yearMatch[1];
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  return {};
}
