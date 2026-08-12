import type {
  CashFlowRiskSummary,
  DateRangeOption,
  ExpenseRecord,
  IncomeRecord,
  PropertyProfitability,
  PropertySummary,
  QuickSummary,
  VendorExpenseAnalysis,
  ExpenseConcentration,
} from "@/contexts/DataContext";

export type WorkbookCell = string | number | boolean | null;

export type FinancialSheetType = "tabular" | "statement_matrix";

export interface FinancialWorkbookSheet {
  type: FinancialSheetType;
  headers?: string[];
  rows: WorkbookCell[][];
}

export interface FinancialWorkbookPayload {
  sheetOrder: string[];
  sheets: Record<string, FinancialWorkbookSheet>;
}

export interface FinancialDashboardData {
  hasData: boolean;
  periodLabel: string;
  activeRange: string;
  dateRangeOptions: DateRangeOption[];
  summary: QuickSummary;
  propertySummaries: PropertySummary[];
  profitability: PropertyProfitability[];
  vendorAnalysis: VendorExpenseAnalysis[];
  vendorConcentration: ExpenseConcentration;
  cashFlowRisk: CashFlowRiskSummary;
  propertyTable: Array<Record<string, unknown>>;
  vendorTable: Array<Record<string, unknown>>;
  insights: Array<Record<string, unknown>>;
  trends?: Record<string, unknown> | Array<unknown>;
  risks: Array<Record<string, unknown>>;
  dataContextString: string;
  extraMetrics: {
    unsettledReceipts: number;
    depositsCharged: number;
    depositsPaid: number;
    ownerExpenditure: number;
    deferredIncome: number;
    receivableBalance: number;
  };
}

export interface FinancialStorageState {
  version: "1.0";
  workerId: string;
  file: {
    fileName: string;
    fileType: "xlsx" | "xls" | "csv";
    uploadedAt: string;
    sourceType: "financial_workbook" | "api_analyze" | "api_user";
    fileUrl?: string | null;
  };
  workbook: FinancialWorkbookPayload;
  dashboardData: FinancialDashboardData | null;
  apiResponse?: Record<string, unknown> | null;
  aiSummary: string | null;
  dataQualityWarnings?: string[];
  detectedPeriod?: string | null;
  detectedCurrency?: string | null;
  processingStatus?: "idle" | "processing" | "ready" | "error";
  lastProcessedAt: string | null;
}

export interface WorkbookParseResult {
  workbook: FinancialWorkbookPayload;
  fileType: "xlsx" | "csv";
}

export interface FinancialMapResult {
  dashboardData: FinancialDashboardData;
  normalizedIncome: IncomeRecord[];
  normalizedExpenses: ExpenseRecord[];
  dataQualityWarnings: string[];
  detectedPeriod: string | null;
  detectedCurrency: string | null;
}
