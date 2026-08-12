import {
  computeCashFlowRiskAnalysis,
  computeExpenseConcentration,
  computePortfolioKPIs,
  computePropertyProfitability,
  computePropertySummaries,
  computeVendorExpenseAnalysis,
  formatCurrency,
} from "@/lib/analytics";
import { generateInsights } from "@/lib/insights";
import { identifyRisks } from "@/lib/analytics";
import type { ExpenseRecord, IncomeRecord } from "@/lib/types";
import type {
  FinancialMapResult,
  FinancialWorkbookPayload,
  WorkbookCell,
} from "./financialTypes";
import type { DateRangeOption, QuickSummary } from "@/contexts/DataContext";
import { isActivePropertyProfitability, isActivePropertySummary } from "./financialDisplayFilters";

type RowObject = Record<string, WorkbookCell>;

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function indexHeaders(headers: string[]): Record<string, number> {
  return headers.reduce<Record<string, number>>((acc, h, i) => {
    acc[normalizeHeader(h)] = i;
    return acc;
  }, {});
}

function toRowObjects(headers: string[], rows: WorkbookCell[][]): RowObject[] {
  const filtered = rows.filter((r) => r.some((c) => c !== null && String(c).trim() !== ""));
  return filtered.map((row) =>
    headers.reduce<RowObject>((acc, header, idx) => {
      acc[header] = row[idx] ?? null;
      return acc;
    }, {})
  );
}

function asNumber(v: WorkbookCell): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const clean = v.replace(/,/g, "").replace(/[^0-9.-]/g, "");
    if (!clean) return 0;
    const num = Number(clean);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

function excelSerialToIso(serial: number): string {
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const ms = Math.round(serial * 86400000);
  return new Date(epoch.getTime() + ms).toISOString();
}

function parseDate(v: WorkbookCell): string | null {
  if (v === null) return null;
  if (typeof v === "number") {
    if (v > 20000 && v < 90000) return excelSerialToIso(v);
    return null;
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const timestamp = Date.parse(trimmed);
    if (!Number.isNaN(timestamp)) return new Date(timestamp).toISOString();
  }
  return null;
}

function monthFromDateCell(v: WorkbookCell): string {
  const iso = parseDate(v);
  if (!iso) return "unknown";
  return iso.slice(0, 7);
}

function getSheet(workbook: FinancialWorkbookPayload, sheetName: string) {
  return workbook.sheets[sheetName] || null;
}

function deriveIncomeRecords(workbook: FinancialWorkbookPayload): IncomeRecord[] {
  const sheet = getSheet(workbook, "Income receivable");
  if (!sheet || !sheet.headers) return [];
  const rowObjects = toRowObjects(sheet.headers, sheet.rows);
  const idx = indexHeaders(sheet.headers);

  return rowObjects.map((row, i) => {
    const staNo = String(row[sheet.headers[idx["sta no"]] ?? ""] ?? `STA-${i + 1}`);
    const propertyName =
      String(row[sheet.headers[idx["unit"]] ?? ""] ?? "") ||
      String(row[sheet.headers[idx["unit ref"]] ?? ""] ?? "") ||
      staNo;
    const periodFrom = parseDate(row[sheet.headers[idx["period from"]] ?? ""]);
    const periodTo = parseDate(row[sheet.headers[idx["period to"]] ?? ""]);
    const month = monthFromDateCell(row[sheet.headers[idx["tran date"]] ?? ""]);
    const incomeReceivable = asNumber(row[sheet.headers[idx["income receivable"]] ?? ""]);
    const deferredIncome = asNumber(row[sheet.headers[idx["deferred income"]] ?? ""]);
    const propertyIncome = asNumber(row[sheet.headers[idx["amount[1]"]] ?? ""]);

    return {
      id: `inc-${i}`,
      month,
      staNo,
      propertyName,
      tenantName: String(row[sheet.headers[idx["tenant name"]] ?? ""] ?? "") || undefined,
      unitRef: String(row[sheet.headers[idx["unit ref"]] ?? ""] ?? "") || undefined,
      unitDescription: String(row[sheet.headers[idx["unit"]] ?? ""] ?? "") || undefined,
      incomeReceivable,
      deferredIncome,
      propertyIncome,
      collectionRate: incomeReceivable > 0 ? propertyIncome / incomeReceivable : 0,
      periodFrom: periodFrom ?? undefined,
      periodTo: periodTo ?? undefined,
      category: String(row[sheet.headers[idx["description"]] ?? ""] ?? "") || undefined,
    };
  });
}

function deriveExpenseStatus(value: WorkbookCell): "paid" | "pending" | "overdue" {
  if (typeof value === "number") return value > 0 ? "paid" : "pending";
  const text = String(value ?? "").toLowerCase();
  if (text.includes("paid") || text === "1" || text === "y" || text === "yes") return "paid";
  if (text.includes("overdue")) return "overdue";
  return "pending";
}

function deriveExpenseRecords(workbook: FinancialWorkbookPayload): ExpenseRecord[] {
  const sheet = getSheet(workbook, "Exp");
  if (!sheet || !sheet.headers) return [];
  const rowObjects = toRowObjects(sheet.headers, sheet.rows);
  const idx = indexHeaders(sheet.headers);

  return rowObjects.map((row, i) => {
    const staNo = String(row[sheet.headers[idx["sta no"]] ?? ""] ?? `EXP-${i + 1}`);
    const propertyName =
      String(row[sheet.headers[idx["unit description"]] ?? ""] ?? "") ||
      String(row[sheet.headers[idx["property reference"]] ?? ""] ?? "") ||
      staNo;
    const gross = asNumber(row[sheet.headers[idx["gross"]] ?? ""]);
    const nett = asNumber(row[sheet.headers[idx["nett"]] ?? ""]);
    const vat = asNumber(row[sheet.headers[idx["vat"]] ?? ""]);
    const month = monthFromDateCell(row[sheet.headers[idx["exp date"]] ?? ""]);

    return {
      id: `exp-${i}`,
      month,
      staNo,
      propertyName,
      supplierName: String(row[sheet.headers[idx["supplier name"]] ?? ""] ?? "Unknown supplier"),
      supplierRef: String(row[sheet.headers[idx["supplier ref."]] ?? ""] ?? "") || undefined,
      invoiceNumber: String(row[sheet.headers[idx["supplier invoice number"]] ?? ""] ?? "") || undefined,
      invoiceDate: parseDate(row[sheet.headers[idx["inv date"]] ?? ""]) ?? undefined,
      expDate: parseDate(row[sheet.headers[idx["exp date"]] ?? ""]) ?? undefined,
      nett: nett || gross,
      vat,
      gross: gross || nett + vat,
      amount: gross || nett + vat,
      category: String(row[sheet.headers[idx["heading"]] ?? ""] ?? "General"),
      description: String(row[sheet.headers[idx["expenditure description"]] ?? ""] ?? "") || undefined,
      unitRef: String(row[sheet.headers[idx["unit reference"]] ?? ""] ?? "") || undefined,
      unitDescription: String(row[sheet.headers[idx["unit description"]] ?? ""] ?? "") || undefined,
      status: deriveExpenseStatus(row[sheet.headers[idx["settled[1]"]] ?? ""]),
      settled: deriveExpenseStatus(row[sheet.headers[idx["settled[1]"]] ?? ""]) === "paid",
      fixFloRef: String(row[sheet.headers[idx["fixflo reference"]] ?? ""] ?? "") || undefined,
    };
  });
}

function sumColumn(workbook: FinancialWorkbookPayload, sheetName: string, headerName: string): number {
  const sheet = getSheet(workbook, sheetName);
  if (!sheet || !sheet.headers) return 0;
  const idx = indexHeaders(sheet.headers)[normalizeHeader(headerName)];
  if (idx === undefined) return 0;
  return sheet.rows.reduce((sum, row) => sum + asNumber(row[idx] ?? null), 0);
}

function detectPeriod(income: IncomeRecord[], expenses: ExpenseRecord[]): string | null {
  const months = Array.from(new Set([...income.map((i) => i.month), ...expenses.map((e) => e.month)])).filter(
    (m) => m !== "unknown"
  );
  if (!months.length) return null;
  months.sort();
  if (months.length === 1) return months[0];
  return `${months[0]}..${months[months.length - 1]}`;
}

export function mapWorkbookToDashboardData(workbook: FinancialWorkbookPayload): FinancialMapResult {
  const income = deriveIncomeRecords(workbook);
  const expenses = deriveExpenseRecords(workbook);

  const dataQualityWarnings: string[] = [];
  if (!income.length) dataQualityWarnings.push("Income receivable sheet is empty or missing.");
  if (!expenses.length) dataQualityWarnings.push("Exp sheet is empty or missing.");

  const portfolioKPIs = computePortfolioKPIs(income, expenses, "all");
  const propertySummaries = computePropertySummaries(income, expenses, "all").filter(isActivePropertySummary);
  const profitability = computePropertyProfitability(income, expenses, "all").filter(isActivePropertyProfitability);
  const vendorAnalysis = computeVendorExpenseAnalysis(expenses, "all");
  const vendorConcentration = computeExpenseConcentration(vendorAnalysis);
  const cashFlowRisk = computeCashFlowRiskAnalysis(income, expenses);
  const risks = identifyRisks(income, expenses, propertySummaries, []);
  const insights = generateInsights(income, expenses, "all");

  const summary: QuickSummary = {
    totalIncome: portfolioKPIs.totalIncome,
    totalExpenses: portfolioKPIs.totalExpenses,
    totalExpensesNett: portfolioKPIs.totalExpensesNett,
    totalVAT: portfolioKPIs.totalVAT,
    netProfit: portfolioKPIs.netIncome,
    profitMargin: portfolioKPIs.totalIncome > 0 ? portfolioKPIs.netIncome / portfolioKPIs.totalIncome : 0,
    outstandingReceivables: portfolioKPIs.uncollectedIncome,
    totalReceivable: portfolioKPIs.totalReceivable,
    collectionRate: portfolioKPIs.collectionRate,
    topProperty: profitability[0]
      ? {
          name: profitability[0].propertyName,
          income: profitability[0].totalIncome,
          profit: profitability[0].netProfit,
          margin: profitability[0].profitMargin,
        }
      : null,
    topVendor: vendorAnalysis[0]
      ? {
          name: vendorAnalysis[0].supplierName,
          spend: vendorAnalysis[0].totalSpend,
          percentOfTotal: vendorAnalysis[0].percentOfTotal,
        }
      : null,
    worstProperty: profitability[profitability.length - 1]
      ? {
          name: profitability[profitability.length - 1].propertyName,
          profit: profitability[profitability.length - 1].netProfit,
          margin: profitability[profitability.length - 1].profitMargin,
        }
      : null,
    propertyCount: profitability.length > 0 ? profitability.length : portfolioKPIs.propertyCount,
    vendorCount: portfolioKPIs.vendorCount,
    overdueInvoices: portfolioKPIs.overdueInvoices,
    overdueAmount: portfolioKPIs.overdueAmount,
  };

  const detectedPeriod = detectPeriod(income, expenses);
  const periodLabel = detectedPeriod ?? "Uploaded workbook";
  const dateRangeOptions: DateRangeOption[] = [{ value: "all", label: "All Time" }];

  const dataContextString = [
    `Total income: ${formatCurrency(summary.totalIncome)}`,
    `Total expenses: ${formatCurrency(summary.totalExpenses)}`,
    `Net profit: ${formatCurrency(summary.netProfit)}`,
    `Outstanding receivables: ${formatCurrency(summary.outstandingReceivables)}`,
  ].join("\n");

  const dashboardData = {
    hasData: income.length > 0 || expenses.length > 0,
    periodLabel,
    activeRange: "all",
    dateRangeOptions,
    summary,
    propertySummaries,
    profitability,
    vendorAnalysis,
    vendorConcentration,
    cashFlowRisk,
    propertyTable: profitability.map((p) => ({
      staNo: p.staNo,
      propertyName: p.propertyName,
      income: p.totalIncome,
      expenses: p.totalExpenses,
      profit: p.netProfit,
      margin: p.profitMargin,
    })),
    vendorTable: vendorAnalysis.map((v) => ({
      supplierName: v.supplierName,
      totalSpend: v.totalSpend,
      invoiceCount: v.invoiceCount,
      propertyCount: v.propertyCount,
    })),
    insights: insights as Array<Record<string, unknown>>,
    risks: risks as Array<Record<string, unknown>>,
    dataContextString,
    extraMetrics: {
      unsettledReceipts: sumColumn(workbook, "Unsettled Receipts", "Unsettled"),
      depositsCharged: sumColumn(workbook, "Deps", "Deposit charged"),
      depositsPaid: sumColumn(workbook, "Deps", "Deposit paid"),
      ownerExpenditure: sumColumn(workbook, "Owner Expenditure", "Amounts (Fund currency) Gross"),
      deferredIncome: sumColumn(workbook, "Income receivable", "Deferred Income"),
      receivableBalance: sumColumn(workbook, "Income receivable", "Income Receivable"),
    },
  };

  return {
    dashboardData,
    normalizedIncome: income,
    normalizedExpenses: expenses,
    dataQualityWarnings,
    detectedPeriod,
    detectedCurrency: "GBP",
  };
}
