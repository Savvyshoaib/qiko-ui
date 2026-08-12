// ============================================================
// PropFin Dashboard — Data Types
// Design: "Command Center" dark theme, Qiko branding
// All financial figures use number type (cents avoided, stored as float)
// ============================================================

export interface IncomeRecord {
  id: string;
  month: string;           // YYYY-MM format
  staNo: string;           // Property identifier (e.g. ELR0201)
  propertyName: string;    // Property address / description
  tenantName?: string;     // Tenant name from Excel
  unitRef?: string;        // Unit reference (e.g. ELR0201-001)
  unitDescription?: string; // Unit description (e.g. "Flat 1")
  incomeReceivable: number; // Total income receivable
  deferredIncome: number;  // Deferred income
  propertyIncome: number;  // Amount (actual income for the period)
  collectionRate: number;  // propertyIncome / incomeReceivable (derived)
  periodFrom?: string;     // Period start date from Excel
  periodTo?: string;       // Period end date from Excel
  category?: string;       // e.g. "Rent", "Service Charges", "Parking"
}

export interface ExpenseRecord {
  id: string;
  month: string;
  staNo: string;           // Property identifier (e.g. ELR0201)
  propertyName: string;    // Property address / description
  supplierName: string;    // Supplier name
  supplierRef?: string;    // Supplier reference code
  invoiceNumber?: string;  // Supplier invoice number
  invoiceDate?: string;    // Invoice date
  expDate?: string;        // Expenditure date
  nett: number;            // Net amount (excl. VAT)
  vat: number;             // VAT amount
  gross: number;           // Gross amount (nett + vat)
  amount: number;          // Alias for gross (backward compat)
  category: string;        // Heading from Excel (e.g. "Heating", "Plumbing")
  description?: string;    // Expenditure description
  unitRef?: string;        // Unit reference
  unitDescription?: string; // Unit description
  status: 'paid' | 'pending' | 'overdue'; // Derived from Settled column
  settled?: boolean;       // Direct from Excel Settled column
  fixFloRef?: string;      // FixFlo reference for maintenance tracking
}

export interface PropertySummary {
  staNo: string;
  propertyName: string;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  collectionRate: number;
  incomeReceivable: number;
  deferredIncome: number;
  uncollectedAmount: number;
  expenseBreakdown: Record<string, number>;
  monthlyTrend: MonthlyDataPoint[];
}

export interface VendorSummary {
  supplierName: string;
  totalSpend: number;
  invoiceCount: number;
  avgInvoiceAmount: number;
  properties: string[];
  categories: string[];
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  monthlySpend: MonthlyDataPoint[];
}

export interface MonthlyDataPoint {
  month: string;
  value: number;
}

export interface RiskItem {
  id: string;
  type: 'uncollected_income' | 'overdue_invoice' | 'high_expense_ratio' | 'income_decline' | 'vendor_concentration';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  amount: number;
  property?: string;
  vendor?: string;
  month?: string;
}

export interface PortfolioKPIs {
  totalIncome: number;
  totalExpenses: number;       // gross amount
  totalExpensesNett: number;   // nett (excl. VAT)
  totalVAT: number;            // total VAT on expenses
  netIncome: number;
  collectionRate: number;
  totalReceivable: number;
  totalDeferred: number;
  uncollectedIncome: number;
  propertyCount: number;
  vendorCount: number;
  overdueInvoices: number;
  overdueAmount: number;
  incomeChangePercent: number;
  expenseChangePercent: number;
}

export interface SummaryMetric {
  label: string;
  value: number;
  previousValue: number | null;   // null if no prior month exists
  changePercent: number | null;
  changeAbsolute: number | null;
  sparkline: number[];            // last N months of this metric
  format: 'currency' | 'percent'; // how to render the value
}

export interface FinancialHealthSummary {
  totalIncome: SummaryMetric;
  totalExpenses: SummaryMetric;
  netProfit: SummaryMetric;
  profitMargin: SummaryMetric;
  totalReceivable: SummaryMetric;
  totalDeferred: SummaryMetric;
  periodLabel: string;            // e.g. "December 2025" or "Jul 2025 — Dec 2025"
  comparisonLabel: string | null; // e.g. "vs November 2025"
}

export interface PropertyIncomeAnalysis {
  staNo: string;
  propertyName: string;
  totalIncome: number;          // propertyIncome (collected)
  incomeReceivable: number;     // total receivable
  deferredIncome: number;
  outstandingIncome: number;    // receivable - collected
  collectionRate: number;       // collected / receivable
  incomeByCategory: Record<string, number>;
  monthlyIncome: { month: string; income: number; receivable: number; deferred: number; collected: number }[];
}

export interface PropertyExpenseAnalysis {
  staNo: string;
  propertyName: string;
  totalExpenses: number;
  expenseByCategory: Record<string, number>;
  expenseByVendor: Record<string, number>;
  invoiceCount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  monthlyExpenses: { month: string; amount: number }[];
}

export interface VendorExpenseAnalysis {
  supplierName: string;
  totalSpend: number;
  percentOfTotal: number;
  invoiceCount: number;
  avgInvoiceAmount: number;
  avgCostPerProperty: number;
  propertyCount: number;
  properties: string[];
  categories: string[];
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  monthlySpend: { month: string; amount: number }[];
}

export interface ExpenseConcentration {
  top3Vendors: { names: string[]; totalSpend: number; percentOfTotal: number };
  top5Vendors: { names: string[]; totalSpend: number; percentOfTotal: number };
  totalExpenses: number;
}

export interface PropertyProfitability {
  staNo: string;
  propertyName: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;           // netProfit / totalIncome (0-1 range)
  incomeReceivable: number;
  deferredIncome: number;
  collectionRate: number;
  expenseRatio: number;           // totalExpenses / totalIncome
  classification: 'high-performing' | 'profitable' | 'low-margin' | 'loss-making';
  monthlyProfitability: { month: string; income: number; expenses: number; netProfit: number; margin: number }[];
  topExpenseCategories: { category: string; amount: number }[];
  topVendors: { name: string; amount: number }[];
}

export interface VendorIntelligence {
  supplierName: string;
  totalSpend: number;
  percentOfTotal: number;
  invoiceCount: number;
  avgInvoiceAmount: number;
  propertyCount: number;
  properties: string[];
  avgCostPerProperty: number;
  categories: string[];
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  monthlySpend: { month: string; amount: number }[];
  // Efficiency & dependency metrics
  spendPerInvoice: number;
  isDisproportionate: boolean;  // flagged if cost/property significantly above average
  dependencyScore: number;      // 0-100, how dependent the portfolio is on this vendor
  propertyBreakdown: { propertyName: string; staNo: string; amount: number; invoiceCount: number }[];
}

export interface VendorConcentrationSummary {
  top3: { names: string[]; totalSpend: number; percentOfTotal: number };
  top5: { names: string[]; totalSpend: number; percentOfTotal: number };
  top10: { names: string[]; totalSpend: number; percentOfTotal: number };
  totalExpenses: number;
  vendorCount: number;
  herfindahlIndex: number;  // 0-1, higher = more concentrated
}

export interface PropertyCashFlowRisk {
  staNo: string;
  propertyName: string;
  totalIncome: number;
  incomeReceivable: number;
  deferredIncome: number;
  outstandingIncome: number;       // receivable - collected
  collectionRate: number;          // collected / receivable
  receivablePercent: number;       // outstanding / receivable
  monthlyCollectionTrend: { month: string; collectionRate: number; outstanding: number; receivable: number; collected: number; deferred: number }[];
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskScore: number;               // 0-100 composite score
  riskFactors: string[];           // human-readable risk descriptions
  collectionTrendDirection: 'improving' | 'declining' | 'stable';
  avgMonthlyCollection: number;
  latestMonthCollection: number;
  overdueExpenses: number;         // overdue vendor invoices for this property
  pendingExpenses: number;         // pending vendor invoices for this property
  netCashPosition: number;         // collected income - total expenses
}

export interface CashFlowRiskSummary {
  totalOutstandingReceivables: number;
  totalDeferredIncome: number;
  totalIncomeReceivable: number;
  portfolioCollectionRate: number;
  avgPropertyCollectionRate: number;
  propertiesAtRisk: number;        // critical + high
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalOverdueExpenses: number;
  totalPendingExpenses: number;
  cashFlowHealthScore: number;     // 0-100 portfolio-level
  properties: PropertyCashFlowRisk[];
}

export interface Insight {
  id: string;
  category: 'vendor' | 'cost-efficiency' | 'receivables' | 'income-change' | 'expense-change' | 'profitability' | 'risk' | 'opportunity';
  severity: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  description: string;
  metric?: string;          // e.g. "65%", "R 1,200,000"
  metricLabel?: string;     // e.g. "of total spend", "outstanding"
  entity?: string;          // property name, vendor name, etc.
  entityType?: 'property' | 'vendor' | 'portfolio';
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
  priority: number;         // 1 = highest priority, used for sorting
}

export interface UploadedDataset {
  id: string;
  name: string;
  type: 'income' | 'expense';
  uploadDate: string;
  recordCount: number;
  months: string[];
}


export interface DashboardFilters {
  selectedMonth: string | 'all';
  selectedProperty: string | 'all';
  comparisonMonth?: string;
}
