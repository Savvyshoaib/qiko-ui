// @ts-nocheck
// ============================================================
// Financial Intelligence Template — Qiko Studio (Visual Edition)
// Layout: Feed (left) + Chat (right) | Chat (separate tab)
// Charts, graphs, KPI sparklines, and visual drill-downs
// ============================================================

import { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { cn } from '@/lib/utils';
import { useData } from '@/contexts/DataContext';
import { AIChatBox, type Message } from '@/components/AIChatBox';
import { formatCurrency, formatPercent } from '@/lib/analytics';
import { sendFinancialChat, type UnitLedgerExpense, type UnitLedgerItem } from '@/lib/ELApi';
import { getChatHistory as getAvatarChatHistory, sendAvatarMessage } from '@/lib/avatarApi';
import { Badge } from '@/components/ui/badge';
import GlobalLayout from '@/components/GlobalLayout';
import { useLocation, useParams } from 'wouter';
import { useFinancialData } from '@/features/financial/useFinancialData';
import { isActivePropertyCashFlowRisk } from '@/features/financial/financialDisplayFilters';
import { useAppSelector } from '@/store/hooks';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip,
  RadialBarChart, RadialBar,
} from 'recharts';
import {
  Menu,
  Building2,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  BarChart3,
  Tag,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  PieChart as PieChartIcon,
  Activity,
  Calendar,
  Check,
  Upload,
  Database,
  ArrowLeft,
  History,
  RefreshCw,
  Info,
  ChevronLeft,
  Search,
  ArrowUpDown,
  MessageSquarePlus,
  Mail,
  User,
  Clock3,
} from 'lucide-react';
import { Streamdown } from "streamdown";

const QIKO_LOGO = '/qiko-logo.png';

// ── Types ────────────────────────────────────────────────────
type ActiveTab = 'feed' | 'chat' | 'history';

// ── Color palette for charts ────────────────────────────────
const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c084fc',
  '#e879f9', '#f472b6', '#fb7185', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
];
const INCOME_COLOR = '#22c55e';
const EXPENSE_COLOR = '#ef4444';
const PROFIT_COLOR = '#6366f1';
const RECEIVABLE_COLOR = '#f59e0b';
const CLASSIFICATION_COLORS: Record<string, string> = {
  'high-performing': '#22c55e',
  'profitable': '#6366f1',
  'low-margin': '#f59e0b',
  'loss-making': '#ef4444',
};
const CHAT_SIDEBAR_MIN_WIDTH = 320;
const CHAT_SIDEBAR_MAX_WIDTH = 450;

const RISK_ASSESSMENT_TOOLTIP =
  "Risk assessment evaluates financial and operational risk using cost-to-income ratio, outstanding balance, expense patterns, and overall profitability.";

/** Hex for risk tier — must match “Risk Score by Property” bar/badge colors. */
function cashFlowRiskLevelHex(level: string | undefined): string {
  const l = String(level || "low").toLowerCase();
  if (l === "critical") return "#ef4444";
  if (l === "high") return "#f97316";
  if (l === "medium") return "#f59e0b";
  return "#22c55e";
}

const FINANCIAL_CHAT_STORAGE_PREFIX = 'qiko_financial_chat_v1';

/** Group raw expense lines by unit for a property (uploaded / sample data). */
/**
 * Many workbooks store nominal / chart-of-accounts codes as a leading number (e.g. "01 Central Heating").
 * We separate code from label so the table stays readable; the full original string is kept for tooltips.
 */
function parseExpenseCategoryHeading(raw: string): { code: string | null; label: string; full: string } {
  const full = String(raw || '').trim() || '—';
  const m = full.match(/^(\d{1,4})\s+(.+)$/);
  if (m) {
    const label = (m[2] || '').trim();
    return { code: m[1], label: label || full, full };
  }
  return { code: null, label: full, full };
}

function buildUnitExpenseRows(
  expenses: Array<{
    staNo: string;
    unitRef?: string;
    unitDescription?: string;
    gross?: number;
    amount?: number;
  }>,
  staNo: string
): { label: string; amount: number; invoices: number }[] {
  const map = new Map<string, { amount: number; invoices: number }>();
  for (const e of expenses) {
    if (String(e.staNo) !== String(staNo)) continue;
    const label =
      (e.unitRef && e.unitRef.trim()) ||
      (e.unitDescription && e.unitDescription.trim()) ||
      "Property-wide";
    const amt = Number(e.gross ?? e.amount ?? 0);
    const cur = map.get(label) || { amount: 0, invoices: 0 };
    cur.amount += amt;
    cur.invoices += 1;
    map.set(label, cur);
  }
  return Array.from(map.entries())
    .map(([label, v]) => ({ label, amount: v.amount, invoices: v.invoices }))
    .sort((a, b) => b.amount - a.amount);
}

type UnitLedgerExpenseRow = UnitLedgerExpense & {
  unitRef?: string;
  unitDescription?: string;
};

type GlobalSearchSuggestion = {
  id: string;
  type: "property" | "vendor" | "expense";
  title: string;
  subtitle: string;
  staNo: string;
  ledgerHint?: string;
};

type HistoryMessageRow = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type HistoryConversation = {
  id: string;
  title: string;
  contactName: string;
  contactEmail: string | null;
  startedAt: number;
  updatedAt: number;
  messages: HistoryMessageRow[];
};

function formatLedgerText(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  return text || "-";
}

function normalizeSettledLabel(value: unknown): string {
  if (typeof value === "boolean") return value ? "paid" : "pending";
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "-";
  if (["yes", "y", "true", "paid", "settled"].includes(normalized)) return "paid";
  if (["no", "n", "false", "pending", "unsettled"].includes(normalized)) return "pending";
  return normalized;
}

/** Axis labels: stronger contrast on dark navy panels */
const CHART_AXIS_TICK = { fill: 'rgba(255,255,255,0.78)', fontSize: 10 };

/** Recharts tooltip hover band — matches chart.tsx (foreground tint, not dark muted) */
const FINANCIAL_CHART_TOOLTIP_CURSOR = {
  fill: 'color-mix(in oklab, var(--foreground) 10%, transparent)',
};

const FINANCIAL_RECHARTS_TOOLTIP_BOX = {
  background: 'oklch(0.22 0.03 250)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: '10px',
  boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
};

const FINANCIAL_RECHARTS_TOOLTIP_LABEL_STYLE = {
  color: 'rgba(255,255,255,0.92)',
  fontWeight: 600,
  marginBottom: 2,
};

const FINANCIAL_RECHARTS_TOOLTIP_ITEM_STYLE = { color: 'rgba(255,255,255,0.84)' };

const FINANCIAL_LINE_TOOLTIP_CURSOR = { stroke: 'rgba(255,255,255,0.22)', strokeWidth: 1 };

function normalizeVendorName(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(limited|ltd|llc|inc|co|company|services?)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDefaultChatSidebarWidth(): number {
  if (typeof window === "undefined") return 360;
  return window.innerWidth < 1536 ? 340 : 400;
}

/** Single-line cell: Radix tooltip only when CSS truncation is active (avoids useless tooltips). */
function LedgerTruncatedText({
  text,
  className,
  tooltip,
}: {
  text: string;
  className?: string;
  /** Shown when truncated; defaults to `text` */
  tooltip?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  const tip = (tooltip ?? text) || '';

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setTruncated(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, text]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const inner = (
    <span ref={ref} className={cn('block min-w-0 whitespace-normal break-words', className)}>
      {text}
    </span>
  );

  if (!truncated || !tip) {
    return <span className="block min-w-0 max-w-full">{inner}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block min-w-0 max-w-full cursor-default outline-none" tabIndex={0}>
          {inner}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap text-xs leading-snug">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Drill-down state ────────────────────────────────────────
interface DrillDown {
  type: 'property' | 'vendor';
  id: string;
}

interface PortfolioChartFilter {
  type: "classification" | "expense-category";
  key: string;
  label: string;
}

type KpiMetricKey = "totalIncome" | "totalExpenses" | "netProfit" | "outstanding";

interface KpiDrillDown {
  key: KpiMetricKey;
  title: string;
}

/** Line items under `analytics.charts.expenseCategories[].details` (financial API). */
interface ExpenseCategoryApiDetail {
  propertyRef: string;
  propertyName: string;
  unitRef: string;
  unitDescription: string;
  vendor: string;
  supplierRef: string;
  heading: string;
  description: string;
  gross: number | null;
  nett: number | null;
  vat: number | null;
  invoiceDate: string;
  periodFrom: string;
  periodTo: string;
  settled: string;
  fixFloRef: string;
}

interface ExpenseCategoryDrilldownState {
  categoryKey: string;
  categoryTitle: string;
  propertyRef: string | null;
}

function parseExpenseCategoryApiDetail(raw: Record<string, unknown>): ExpenseCategoryApiDetail {
  const parseMaybeNumber = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (!s || s === '-' || s === '—') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  return {
    propertyRef: String(raw.propertyRef ?? ""),
    propertyName: String(raw.propertyName ?? ""),
    unitRef: String(raw.unitRef ?? ""),
    unitDescription: String(raw.unitDescription ?? ""),
    vendor: String(raw.vendor ?? ""),
    supplierRef: String(raw.supplierRef ?? ""),
    heading: String(raw.heading ?? ""),
    description: String(raw.description ?? ""),
    gross: parseMaybeNumber(raw.gross),
    nett: parseMaybeNumber(raw.nett),
    vat: parseMaybeNumber(raw.vat),
    invoiceDate: String(raw.invoiceDate ?? ""),
    periodFrom: String(raw.periodFrom ?? ""),
    periodTo: String(raw.periodTo ?? ""),
    settled: String(raw.settled ?? ""),
    fixFloRef: String(raw.fixFloRef ?? ""),
  };
}

const TREND_STYLE_PRESETS = [
  {
    icon: Building2,
    accent: "bg-emerald-400",
    border: "border-emerald-400/25",
    badge: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
  },
  {
    icon: AlertTriangle,
    accent: "bg-amber-400",
    border: "border-amber-400/25",
    badge: "text-amber-300 border-amber-400/30 bg-amber-500/10",
  },
  {
    icon: Tag,
    accent: "bg-violet-400",
    border: "border-violet-400/25",
    badge: "text-violet-300 border-violet-400/30 bg-violet-500/10",
  },
] as const;

type TrendInsightView = {
  title: string;
  text: string;
};

type TrendSectionView = {
  title: string;
  insights: TrendInsightView[];
};

const DEFAULT_TRENDS_SECTIONS = [
  {
    title: "Property Performance",
    ...TREND_STYLE_PRESETS[0],
    insights: [
      {
        title: "Top Performer",
        text: "Parkside Apartments generates the highest net income at £142,580, contributing 18.3% of total portfolio income",
      },
      {
        title: "Negative Margins",
        text: "3 properties operate at negative margins — Riverside Court, The Willows, and Cedar House require cost review",
      },
      {
        title: "Concentration Risk",
        text: "Top 5 properties account for 62% of total portfolio income, indicating high concentration risk",
      },
    ],
  },
  {
    title: "Arrears & Collections",
    ...TREND_STYLE_PRESETS[1],
    insights: [
      {
        title: "Total Arrears",
        text: "Total tenant arrears stand at £352,383 across 24 properties — 4.5% of annual demanded rent",
      },
      {
        title: "Highest Arrears",
        text: "Maple House has the highest individual arrears at £48,200 — recommend escalation to collections",
      },
      {
        title: "Collection Rate",
        text: "Collection rate is 99.8% overall but 3 properties fall below 95% threshold",
      },
    ],
  },
  {
    title: "Vendor Insights",
    ...TREND_STYLE_PRESETS[2],
    insights: [
      {
        title: "Vendor Concentration",
        text: "Top 3 vendors account for 51% of total spend — high supplier concentration",
      },
      {
        title: "Highest Spend Vendor",
        text: "ABC Maintenance Ltd is the highest-spend vendor at £8,420 across 6 properties",
      },
      {
        title: "Consolidation Opportunity",
        text: "5 vendors are single-property only — review for consolidation opportunities",
      },
    ],
  },
] as const;

function humanizeTrendKey(raw: string): string {
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function toTrendInsight(value: unknown): TrendInsightView | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? { title: "", text } : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const title = String(item.title ?? item.name ?? item.heading ?? item.label ?? "").trim();
  const text = String(
    item.insightText ?? item.insight ?? item.text ?? item.message ?? item.description ?? ""
  ).trim();
  if (!text) return null;
  return { title, text };
}

function parseTrendInsights(value: unknown): TrendInsightView[] {
  if (Array.isArray(value)) {
    return value.map((item) => toTrendInsight(item)).filter(Boolean) as TrendInsightView[];
  }
  const one = toTrendInsight(value);
  return one ? [one] : [];
}

function parseTrendSection(value: unknown, index: number, fallbackTitle?: string): TrendSectionView | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const sectionObj = value as Record<string, unknown>;
  const title = String(
    sectionObj.section ?? sectionObj.title ?? sectionObj.name ?? sectionObj.heading ?? fallbackTitle ?? `Trend ${index + 1}`
  ).trim();
  const insights = parseTrendInsights(
    sectionObj.insights ?? sectionObj.items ?? sectionObj.points ?? sectionObj.data
  );
  if (!title || insights.length === 0) return null;
  return { title, insights };
}

function normalizeTrendSections(payload: unknown): TrendSectionView[] {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload
      .map((item, index) => parseTrendSection(item, index))
      .filter(Boolean) as TrendSectionView[];
  }

  if (typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;

  // Expected API shape: trends: { trends: [{ section, insights: [{ title, insightText }] }] }
  const nestedTrends = obj.trends;
  if (Array.isArray(nestedTrends)) {
    return nestedTrends
      .map((item, index) => parseTrendSection(item, index))
      .filter(Boolean) as TrendSectionView[];
  }

  const directSection = parseTrendSection(obj, 0);
  if (directSection) return [directSection];

  return Object.entries(obj)
    .map(([key, value], index) => parseTrendSection(value, index, humanizeTrendKey(key)))
    .filter(Boolean) as TrendSectionView[];
}

function getTrendStyle(title: string, index: number) {
  const normalizedTitle = title.toLowerCase();
  if (
    normalizedTitle.includes("arrear") ||
    normalizedTitle.includes("collection") ||
    normalizedTitle.includes("risk")
  ) {
    return TREND_STYLE_PRESETS[1];
  }
  if (
    normalizedTitle.includes("vendor") ||
    normalizedTitle.includes("supplier") ||
    normalizedTitle.includes("spend") ||
    normalizedTitle.includes("expense")
  ) {
    return TREND_STYLE_PRESETS[2];
  }
  return TREND_STYLE_PRESETS[index % TREND_STYLE_PRESETS.length];
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AnalystTemplate() {
  const params = useParams<{ workerId?: string }>();
  const workerId = params.workerId ?? null;
  const [, setLocation] = useLocation();
  const baseData = useData();
  const filteredExpenses = baseData.filteredExpenses;
  const hasData = baseData.hasData;
  const hasRealUploadedData = baseData.datasets.some((dataset) => !dataset.id.startsWith('sample-'));
  const financial = useFinancialData(workerId, { autoLoad: false });
  const { load: loadFinancialData, effectiveAgentUniqueId } = financial;
  const authToken = useAppSelector((state) => state.auth.token);
  const authUserInfo = useAppSelector((state) => state.auth.userInfo);
  const [workerDateRange, setWorkerDateRange] = useState<string>("all");
  const [workerAvailableMonthOptions, setWorkerAvailableMonthOptions] = useState<Array<{ value: string; label: string }>>([]);
  const financialDashboard = financial.dashboardData;
  const isWorkerDashboard = Boolean(workerId);
  const hasFinancialData = Boolean(financialDashboard?.hasData);
  const shouldShowDashboard = isWorkerDashboard ? hasFinancialData : hasData && hasRealUploadedData;
  const summary = (isWorkerDashboard && hasFinancialData ? financialDashboard!.summary : baseData.summary) as any;
  const propertyTable = (isWorkerDashboard && hasFinancialData ? financialDashboard!.propertyTable : baseData.propertyTable) as any[];
  const vendorTable = (isWorkerDashboard && hasFinancialData ? financialDashboard!.vendorTable : baseData.vendorTable) as any[];
  const profitability = (isWorkerDashboard && hasFinancialData ? financialDashboard!.profitability : baseData.profitability) as any[];
  const vendorAnalysis = (isWorkerDashboard && hasFinancialData ? financialDashboard!.vendorAnalysis : baseData.vendorAnalysis) as any[];
  const vendorConcentration = isWorkerDashboard && hasFinancialData
    ? financialDashboard!.vendorConcentration
    : baseData.vendorConcentration;
  const cashFlowRisk = (isWorkerDashboard && hasFinancialData ? financialDashboard!.cashFlowRisk : baseData.cashFlowRisk) as any;
  const insights = (isWorkerDashboard && hasFinancialData ? financialDashboard!.insights : baseData.insights) as any[];
  const trendsPayload = isWorkerDashboard && hasFinancialData
    ? (financialDashboard as any)?.trends
    : (baseData as any)?.trends;
  const risks = (isWorkerDashboard && hasFinancialData ? financialDashboard!.risks : baseData.risks) as any[];
  const propertySummaries = (isWorkerDashboard && hasFinancialData ? financialDashboard!.propertySummaries : baseData.propertySummaries) as any[];
  const activeCashFlowRiskProperties = useMemo(
    () =>
      (Array.isArray(cashFlowRisk?.properties) ? cashFlowRisk.properties : []).filter(isActivePropertyCashFlowRisk),
    [cashFlowRisk]
  );
  const activeRange = isWorkerDashboard ? workerDateRange : baseData.activeRange;
  const setActiveRange = isWorkerDashboard
    ? (range: string) => {
        setWorkerDateRange(range);
      }
    : baseData.setActiveRange;
  const workerMonthOptions = useMemo(() => {
    const source = workerAvailableMonthOptions.length > 0
      ? workerAvailableMonthOptions
      : (hasFinancialData ? (financialDashboard?.dateRangeOptions || []) : []);
    const seen = new Set<string>();
    const normalized: Array<{ value: string; label: string }> = [];
    const push = (opt?: { value?: string; label?: string }) => {
      if (!opt?.value) return;
      const value = String(opt.value);
      if (seen.has(value)) return;
      seen.add(value);
      normalized.push({ value, label: opt.label || opt.value });
    };
    const monthOptions = source.filter((opt) => opt?.value && opt.value !== "all");
    const shouldShowAll = monthOptions.length > 1;
    if (shouldShowAll) {
      push({ value: "all", label: "All" });
    }
    monthOptions.forEach(push);
    return normalized;
  }, [financialDashboard?.dateRangeOptions, hasFinancialData, workerAvailableMonthOptions]);

  const dateRangeOptions = (isWorkerDashboard
    ? workerMonthOptions
    : baseData.dateRangeOptions) as Array<{ value: string; label: string }>;
  const periodLabel = isWorkerDashboard
    ? dateRangeOptions.find((opt) => opt.value === activeRange)?.label || "Select month"
    : baseData.periodLabel;
  const allRangeLabel = useMemo(
    () => dateRangeOptions.find((opt) => opt.value === "all")?.label || "All",
    [dateRangeOptions]
  );
  const selectedMonthLabel = useMemo(() => {
    if (!/^\d{2}-\d{4}$/.test(activeRange)) return "";
    const [month, year] = activeRange.split("-");
    const m = Number(month);
    const y = Number(year);
    if (!m || !y) return activeRange;
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-GB", { month: "long", year: "numeric" });
  }, [activeRange]);
  const noDataForSelectedMonth =
    isWorkerDashboard &&
    /^\d{2}-\d{4}$/.test(activeRange) &&
    Boolean(financial.error);
  const monthOptionsByYear = useMemo(() => {
    const grouped: Record<string, Array<{ value: string; label: string }>> = {};
    for (const opt of dateRangeOptions) {
      const parts = opt.value.split("-");
      const year = parts.length === 2 ? parts[1] : "";
      if (!year) continue;
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(opt);
    }
    return grouped;
  }, [dateRangeOptions]);

  // If "All" is hidden (because only one month is available) and user was on "all", fall back to the first month.
  useEffect(() => {
    if (!isWorkerDashboard) return;
    const hasAllOption = dateRangeOptions.some((o) => o.value === "all");
    if (hasAllOption) return;
    if (activeRange !== "all") return;
    const first = dateRangeOptions.find((o) => o.value !== "all");
    if (first?.value) {
      setWorkerDateRange(first.value);
    }
  }, [activeRange, dateRangeOptions, isWorkerDashboard]);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const globalSearchRef = useRef<HTMLDivElement>(null);

  // Close date picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
      if (globalSearchRef.current && !globalSearchRef.current.contains(e.target as Node)) {
        setGlobalSearchOpen(false);
      }
    }
    if (datePickerOpen || globalSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [datePickerOpen, globalSearchOpen]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [portfolioDetailStaNo, setPortfolioDetailStaNo] = useState<string | null>(null);
  const [portfolioOpenedFromSearch, setPortfolioOpenedFromSearch] = useState(false);
  const [unitLedgerInfoRow, setUnitLedgerInfoRow] = useState<UnitLedgerExpenseRow | null>(null);
  const [collapsedUnitGroups, setCollapsedUnitGroups] = useState<Record<string, boolean>>({});
  const [portfolioSearchTerm, setPortfolioSearchTerm] = useState("");
  const [portfolioSortKey, setPortfolioSortKey] = useState<"propertyName" | "income" | "expenses">("expenses");
  const [portfolioSortDirection, setPortfolioSortDirection] = useState<"asc" | "desc">("desc");
  const [portfolioPage, setPortfolioPage] = useState(1);
  const [portfolioChartFilter, setPortfolioChartFilter] = useState<PortfolioChartFilter | null>(null);
  const [expenseCategoryDrilldown, setExpenseCategoryDrilldown] = useState<ExpenseCategoryDrilldownState | null>(null);
  const [kpiDrillDown, setKpiDrillDown] = useState<KpiDrillDown | null>(null);
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState("");
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [ledgerPage, setLedgerPage] = useState(1);

  useEffect(() => {
    if (globalSearchTerm.trim().length > 0) return;
    setGlobalSearchOpen(false);
    if (portfolioOpenedFromSearch) {
      setPortfolioOpenedFromSearch(false);
      setPortfolioOpen(false);
      setPortfolioDetailStaNo(null);
      setDrillDown(null);
      setLedgerSearchTerm("");
      setLedgerStatusFilter("all");
      setLedgerPage(1);
    }
  }, [globalSearchTerm, portfolioOpenedFromSearch]);

  const [unitRowsSortKey, setUnitRowsSortKey] = useState<"label" | "invoices" | "amount">("amount");
  const [unitRowsSortDirection, setUnitRowsSortDirection] = useState<"asc" | "desc">("desc");
  const [expenseBreakdownSortKey, setExpenseBreakdownSortKey] = useState<"name" | "amount">("amount");
  const [expenseBreakdownSortDirection, setExpenseBreakdownSortDirection] = useState<"asc" | "desc">("desc");
  const [vendorTotalsSortKey, setVendorTotalsSortKey] = useState<"name" | "amount">("amount");
  const [vendorTotalsSortDirection, setVendorTotalsSortDirection] = useState<"asc" | "desc">("desc");
  const [ledgerSortKey, setLedgerSortKey] = useState<"vendor" | "category" | "amount" | "month" | "status">("amount");
  const [ledgerSortDirection, setLedgerSortDirection] = useState<"asc" | "desc">("desc");
  const [unitLedgerSortKey, setUnitLedgerSortKey] = useState<"unitRef" | "heading" | "gross" | "settled">("gross");
  const [unitLedgerSortDirection, setUnitLedgerSortDirection] = useState<"asc" | "desc">("desc");
  const [chatSidebarWidth, setChatSidebarWidth] = useState<number>(getDefaultChatSidebarWidth);
  const [mobileInsightsOpen, setMobileInsightsOpen] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(chatSidebarWidth);

  useEffect(() => {
    if (!workerId) {
      return;
    }
    setWorkerDateRange("all");
    setWorkerAvailableMonthOptions([]);
  }, [workerId]);

  useEffect(() => {
    if (!isWorkerDashboard || !hasFinancialData) return;
    const incoming = (financialDashboard?.dateRangeOptions || []).filter((opt) => opt.value !== "all");
    if (!incoming.length) return;
    setWorkerAvailableMonthOptions((prev) => {
      const merged = new Map<string, { value: string; label: string }>();
      for (const item of prev) merged.set(item.value, item);
      for (const item of incoming) merged.set(item.value, item);
      return Array.from(merged.values()).sort((a, b) => {
        const [am, ay] = a.value.split("-").map(Number);
        const [bm, by] = b.value.split("-").map(Number);
        return ay !== by ? ay - by : am - bm;
      });
    });
  }, [financialDashboard?.dateRangeOptions, hasFinancialData, isWorkerDashboard]);

  useEffect(() => {
    if (!isWorkerDashboard) return;
    if (workerAvailableMonthOptions.length === 0) return;
    if (workerDateRange === "all") return;
    const hasSelected = workerAvailableMonthOptions.some((opt) => opt.value === workerDateRange);
    if (!hasSelected) {
      // Keep default unfiltered API call unless user explicitly selects a month.
      setWorkerDateRange("all");
    }
  }, [isWorkerDashboard, workerAvailableMonthOptions, workerDateRange]);

  useEffect(() => {
    const identityToUse = workerId || effectiveAgentUniqueId;
    if (!identityToUse) return;
    if (isWorkerDashboard) {
      void loadFinancialData(identityToUse, { activeRange: workerDateRange });
      return;
    }
    void loadFinancialData(identityToUse);
  }, [effectiveAgentUniqueId, isWorkerDashboard, loadFinancialData, workerDateRange, workerId]);

  const handleSendMessage = useCallback(async (content: string) => {
    const chatAgentId = workerId || effectiveAgentUniqueId;
    if (!chatAgentId) {
      return;
    }
    const userMsg: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);

    // Add placeholder assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    setChatLoading(true);

    try {
      let responseText = "";

      try {
        const avatarChat = await sendAvatarMessage(
          {
            agent_unique_id: String(chatAgentId),
            user_name: String(authUserInfo?.user_name ?? authUserInfo?.name ?? ''),
            message: content,
            email: String(authUserInfo?.email ?? ''),
          },
          String(chatAgentId)
        );
        responseText =
          String(
            avatarChat?.data?.[0]?.reply ??
            avatarChat?.data?.reply ??
            avatarChat?.reply ??
            ""
          ).trim();
      } catch {
        // Keep legacy API as fallback for compatibility.
        const legacyChat = await sendFinancialChat({
          agent_unique_id: chatAgentId,
          message: content,
        });
        responseText = String(legacyChat?.reply ?? "").trim();
      }

      if (!responseText) {
        responseText = "No response received.";
      }

      setMessages(prev => {
        const updated = [...prev];
        // Replace last assistant message
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].role === 'assistant' && updated[i].content === '') {
            updated[i] = { ...updated[i], content: responseText };
            break;
          }
        }
        return updated;
      });
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].role === 'assistant' && updated[i].content === '') {
            updated[i] = { ...updated[i], content: 'Sorry, something went wrong. Please try again.' };
            break;
          }
        }
        return updated;
      });
    } finally {
      setChatLoading(false);
    }
  }, [authUserInfo?.email, authUserInfo?.name, authUserInfo?.user_name, effectiveAgentUniqueId, workerId]);

  const handleTrendInsightClick = useCallback((insightText: string, sectionTitle: string, insightTitle?: string) => {
    const trimmedInsight = String(insightText ?? "").trim();
    if (!trimmedInsight || chatLoading) return;
    setActiveTab('chat');
    setRightPanelTab('chat');
    setMobileInsightsOpen(false);
    const trendLine = insightTitle ? `${insightTitle}: ${trimmedInsight}` : trimmedInsight;
    const prompt = sectionTitle
      ? `Please analyze this ${sectionTitle} trend and suggest actions: ${trendLine}`
      : trendLine;
    void handleSendMessage(prompt);
  }, [chatLoading, handleSendMessage]);

  const chatApiWorkerId = workerId || effectiveAgentUniqueId || null;

  const [historyConversations, setHistoryConversations] = useState<HistoryConversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const previousAuthTokenRef = useRef<string | null>(authToken);

  const loadChatHistory = useCallback(async () => {
    if (!chatApiWorkerId) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await getAvatarChatHistory(String(chatApiWorkerId));
      const chats = Array.isArray(res?.data?.chats) ? res.data.chats : [];
      const mappedConversations: HistoryConversation[] = chats
        .map((chat, idx) => {
          const rows: HistoryMessageRow[] = Array.isArray(chat?.messages)
            ? chat.messages
              .map((msg) => {
                const role = msg?.sender?.type === "user" ? "user" : "assistant";
                const content = typeof msg?.message === "string" ? msg.message : "";
                const parsed = Date.parse(String(msg?.created_at || ""));
                const timestamp = Number.isFinite(parsed) ? parsed : Date.now();
                return {
                  role,
                  content,
                  timestamp,
                } as HistoryMessageRow;
              })
              .filter((row) => row.content.trim().length > 0)
              .sort((a, b) => a.timestamp - b.timestamp)
            : [];

          const firstUserMessage = rows.find((row) => row.role === "user");
          const contactName =
            typeof chat?.other_agent?.agent_name === "string" && chat.other_agent.agent_name.trim().length > 0
              ? chat.other_agent.agent_name.trim()
              : "Unknown user";
          const contactEmail =
            typeof chat?.other_agent?.email === "string" && chat.other_agent.email.trim().length > 0
              ? chat.other_agent.email.trim()
              : null;
          const fallbackTitle =
            typeof chat?.other_agent?.agent_name === "string" && chat.other_agent.agent_name.trim().length > 0
              ? chat.other_agent.agent_name.trim()
              : "Untitled chat";
          const normalizedTitle = String(firstUserMessage?.content || "")
            .replace(/\s+/g, " ")
            .trim();
          const title = normalizedTitle || fallbackTitle;
          const startedAt = rows[0]?.timestamp ?? Date.now();
          const updatedAt = rows[rows.length - 1]?.timestamp ?? startedAt;
          const id = `conv-${String(chat?.conversation_id ?? idx)}`;
          return {
            id,
            title,
            contactName,
            contactEmail,
            startedAt,
            updatedAt,
            messages: rows,
          };
        })
        .sort((a, b) => b.updatedAt - a.updatedAt);

      setHistoryConversations(mappedConversations);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : 'Failed to load chat history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [chatApiWorkerId]);

  const chatUserKey = useMemo(() => {
    const id =
      String(authUserInfo?.id ?? '').trim() ||
      String(authUserInfo?.email ?? '').trim().toLowerCase() ||
      String(authUserInfo?.user_name ?? '').trim().toLowerCase() ||
      String(authUserInfo?.name ?? '').trim().toLowerCase();
    return id || null;
  }, [authUserInfo?.email, authUserInfo?.id, authUserInfo?.name, authUserInfo?.user_name]);

  const activeChatStorageKey = useMemo(() => {
    if (!authToken || !chatUserKey || !chatApiWorkerId) return null;
    return `${FINANCIAL_CHAT_STORAGE_PREFIX}:${chatUserKey}:${chatApiWorkerId}`;
  }, [authToken, chatApiWorkerId, chatUserKey]);

  const handleNewChat = useCallback(() => {
    setChatLoading(false);
    if (activeChatStorageKey) {
      try {
        localStorage.setItem(activeChatStorageKey, JSON.stringify([]));
      } catch {
        // ignore
      }
    }
    setMessages([]);
  }, [activeChatStorageKey]);

  useEffect(() => {
    if (!activeChatStorageKey) {
      setMessages([]);
      return;
    }
    try {
      const raw = localStorage.getItem(activeChatStorageKey);
      if (!raw) {
        setMessages([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setMessages([]);
        return;
      }
      const hydrated: Message[] = parsed
        .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
        .map((item) => ({
          role: item.role,
          content: typeof item.content === 'string' ? item.content : '',
        }));
      setMessages(hydrated);
    } catch {
      setMessages([]);
    }
  }, [activeChatStorageKey]);

  useEffect(() => {
    if (!activeChatStorageKey) return;
    try {
      localStorage.setItem(activeChatStorageKey, JSON.stringify(messages));
    } catch {
      // Ignore storage write errors (quota/private mode)
    }
  }, [activeChatStorageKey, messages]);

  useEffect(() => {
    const previousToken = previousAuthTokenRef.current;
    // When user logs out, clear persisted financial chat sessions and in-memory chat.
    if (previousToken && !authToken) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`${FINANCIAL_CHAT_STORAGE_PREFIX}:`)) {
            keysToRemove.push(key);
          }
        }
        for (const key of keysToRemove) {
          localStorage.removeItem(key);
        }
      } catch {
        // Ignore storage access errors
      }
      setMessages([]);
      setHistoryConversations([]);
    }
    previousAuthTokenRef.current = authToken;
  }, [authToken]);

  useEffect(() => {
    if (activeTab !== 'history') return;
    void loadChatHistory();
  }, [activeTab, loadChatHistory]);

  const filteredHistoryConversations = useMemo(() => {
    const term = historySearchTerm.trim().toLowerCase();
    if (!term) return historyConversations;
    return historyConversations.filter((conversation) =>
      conversation.title.toLowerCase().includes(term) ||
      String(conversation.contactName ?? "").toLowerCase().includes(term) ||
      String(conversation.contactEmail ?? "").toLowerCase().includes(term)
    );
  }, [historyConversations, historySearchTerm]);

  useEffect(() => {
    if (filteredHistoryConversations.length === 0) {
      setSelectedConversationId(null);
      return;
    }
    const selectedStillVisible = filteredHistoryConversations.some((c) => c.id === selectedConversationId);
    if (!selectedStillVisible) {
      setSelectedConversationId(filteredHistoryConversations[0].id);
    }
  }, [filteredHistoryConversations, selectedConversationId]);

  const selectedHistoryConversation = useMemo(
    () => filteredHistoryConversations.find((c) => c.id === selectedConversationId) || null,
    [filteredHistoryConversations, selectedConversationId]
  );

  useEffect(() => {
    const onResize = () => {
      if (isResizingSidebar) return;
      setChatSidebarWidth((prev) =>
        Math.max(
          CHAT_SIDEBAR_MIN_WIDTH,
          Math.min(CHAT_SIDEBAR_MAX_WIDTH, Number.isFinite(prev) ? prev : getDefaultChatSidebarWidth())
        )
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isResizingSidebar]);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (event: MouseEvent) => {
      const delta = event.clientX - resizeStartXRef.current;
      const next = resizeStartWidthRef.current - delta;
      setChatSidebarWidth(
        Math.max(CHAT_SIDEBAR_MIN_WIDTH, Math.min(CHAT_SIDEBAR_MAX_WIDTH, next))
      );
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingSidebar]);

  const kpiSummaryRowsByKey = useMemo(() => {
    const api = financial.state?.apiResponse as { analytics?: { summary?: unknown } } | undefined;
    const rows = api?.analytics?.summary;
    const targetKeys = new Set<KpiMetricKey>(["totalIncome", "totalExpenses", "netProfit", "outstanding"]);
    const out: Partial<Record<KpiMetricKey, Record<string, unknown>>> = {};
    if (!Array.isArray(rows)) return out;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const key = String((row as { key?: string }).key || "") as KpiMetricKey;
      if (!targetKeys.has(key)) continue;
      out[key] = row as Record<string, unknown>;
    }
    return out;
  }, [financial.state?.apiResponse]);

  // ── KPI sparkline data ────────────────────────────────────
  const kpiCards = useMemo(() => {
    const months = Array.from(new Set(propertySummaries.flatMap(p => p.monthlyTrend.map(m => m.month)))).sort();
    const incomeByMonth = months.map(m => ({
      month: m.slice(5),
      value: propertySummaries.reduce((s, p) => s + (p.monthlyTrend.find(t => t.month === m)?.value || 0) + (p.totalExpenses / Math.max(1, months.length)), 0),
    }));
    const expenseByMonth = months.map(m => ({
      month: m.slice(5),
      value: propertySummaries.reduce((s, p) => s + (p.expenseBreakdown ? Object.values(p.expenseBreakdown).reduce((a, b) => a + b, 0) / Math.max(1, months.length) : 0), 0),
    }));
    const profitByMonth = months.map((m, i) => ({
      month: m.slice(5),
      value: (incomeByMonth[i]?.value || 0) - (expenseByMonth[i]?.value || 0),
    }));

    const totalIncomeRow = kpiSummaryRowsByKey.totalIncome;
    const totalExpensesRow = kpiSummaryRowsByKey.totalExpenses;
    const netProfitRow = kpiSummaryRowsByKey.netProfit;
    const outstandingRow = kpiSummaryRowsByKey.outstanding;

    return [
      {
        key: 'totalIncome' as const,
        label: 'Total Income',
        value: totalIncomeRow?.value ?? summary.totalIncome,
        formatted: typeof totalIncomeRow?.value === "string" ? totalIncomeRow.value : formatCurrency(summary.totalIncome),
        color: INCOME_COLOR,
        icon: TrendingUp,
        sparkline: incomeByMonth,
      },
      {
        key: 'totalExpenses' as const,
        label: 'Total Expenses',
        value: totalExpensesRow?.value ?? summary.totalExpenses,
        formatted: typeof totalExpensesRow?.value === "string" ? totalExpensesRow.value : formatCurrency(summary.totalExpenses),
        subtitle: typeof totalExpensesRow?.subtitle === "string"
          ? totalExpensesRow.subtitle
          : `Nett ${formatCurrency(summary.totalExpensesNett)} + VAT ${formatCurrency(summary.totalVAT)}`,
        color: EXPENSE_COLOR,
        icon: TrendingDown,
        sparkline: expenseByMonth,
      },
      {
        key: 'netProfit' as const,
        label: 'Net Profit',
        value: netProfitRow?.value ?? summary.netProfit,
        formatted: typeof netProfitRow?.value === "string" ? netProfitRow.value : formatCurrency(summary.netProfit),
        color: PROFIT_COLOR,
        icon: DollarSign,
        sparkline: profitByMonth,
      },
      {
        key: 'outstanding' as const,
        label: 'Outstanding',
        value: outstandingRow?.value ?? summary.outstandingReceivables,
        formatted: typeof outstandingRow?.value === "string" ? outstandingRow.value : formatCurrency(summary.outstandingReceivables),
        color: RECEIVABLE_COLOR,
        icon: AlertTriangle,
        sparkline: [],
      },
    ];
  }, [summary, propertySummaries, kpiSummaryRowsByKey]);

  const kpiDrillDownData = useMemo(() => {
    if (!kpiDrillDown) return null;
    const row = kpiSummaryRowsByKey[kpiDrillDown.key];
    if (row) {
      return {
        key: kpiDrillDown.key,
        title: String(row.label || kpiDrillDown.title),
        formatted: String(
          row.formatted ||
          (row.value != null ? row.value : "")
        ),
        details: Object.entries(row).filter(([key, value]) => {
          if (["key", "label", "value", "formatted"].includes(key)) return false;
          if (value == null) return false;
          if (typeof value === "string" && value.trim() === "") return false;
          return true;
        }),
      };
    }

    const fallbackValue =
      kpiDrillDown.key === "totalIncome"
        ? summary.totalIncome
        : kpiDrillDown.key === "totalExpenses"
          ? summary.totalExpenses
          : kpiDrillDown.key === "netProfit"
            ? summary.totalIncome - summary.totalExpenses
            : summary.outstandingReceivables;

    return {
      key: kpiDrillDown.key,
      title: kpiDrillDown.title,
      formatted: formatCurrency(fallbackValue),
      details: [] as Array<[string, unknown]>,
    };
  }, [kpiDrillDown, kpiSummaryRowsByKey, summary]);

  // ── Property comparison chart data ────────────────────────
  const propertyChartData = useMemo(() => {
    return profitability.slice(0, 10).map(p => ({
      name: p.propertyName,
      fullName: p.propertyName,
      staNo: p.staNo,
      income: Math.round(p.totalIncome),
      expenses: Math.round(p.totalExpenses),
      profit: Math.round(p.netProfit),
      margin: Math.round(p.profitMargin * 100),
    }));
  }, [profitability]);

  // ── Profitability classification donut ────────────────────
  const classificationData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of profitability) {
      counts[p.classification] = (counts[p.classification] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({
      key: name,
      name: name.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value,
      color: CLASSIFICATION_COLORS[name] || '#888',
    }));
  }, [profitability]);

  // ── Vendor spend chart data ───────────────────────────────
  const vendorChartData = useMemo(() => {
    return vendorAnalysis.slice(0, 8).map((v, i) => ({
      name: v.supplierName,
      fullName: v.supplierName,
      spend: Math.round(v.totalSpend),
      percent: Math.round(v.percentOfTotal * 100),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [vendorAnalysis]);

  // ── Expense category breakdown ────────────────────────────
  const expenseCategoryData = useMemo(() => {
    const catMap = new Map<string, number>();
    for (const p of profitability) {
      for (const c of p.topExpenseCategories) {
        catMap.set(c.category, (catMap.get(c.category) || 0) + c.amount);
      }
    }
    return Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value], i) => ({
        key: name,
        name: name.length > 16 ? name.slice(0, 16) + '…' : name,
        value: Math.round(value),
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));
  }, [profitability]);

  const analyticsCharts = useMemo(() => {
    const api = financial.state?.apiResponse as { analytics?: { charts?: Record<string, unknown> } } | undefined;
    return (api?.analytics?.charts || {}) as {
      profitabilityClassification?: Array<{
        label?: string;
        details?: Array<{ propertyId?: string; propertyRef?: string; propertyName?: string }>;
      }>;
      expenseCategories?: Array<{
        categoryId?: string;
        categoryName?: string;
        amount?: number;
        sharePercent?: number;
        details?: Array<Record<string, unknown>>;
      }>;
    };
  }, [financial.state?.apiResponse]);

  const normalizedClassificationKeyToProperties = useMemo(() => {
    const out: Record<string, { ids: Set<string>; refs: Set<string>; names: Set<string> }> = {};
    for (const bucket of analyticsCharts.profitabilityClassification || []) {
      const label = String(bucket?.label || "").trim().toLowerCase();
      if (!label) continue;
      if (!out[label]) {
        out[label] = { ids: new Set<string>(), refs: new Set<string>(), names: new Set<string>() };
      }
      for (const detail of bucket.details || []) {
        const id = String(detail?.propertyId || "").trim().toLowerCase();
        const ref = String(detail?.propertyRef || "").trim().toLowerCase();
        const name = String(detail?.propertyName || "").trim().toLowerCase();
        if (id) out[label].ids.add(id);
        if (ref) out[label].refs.add(ref);
        if (name) out[label].names.add(name);
      }
    }
    return out;
  }, [analyticsCharts.profitabilityClassification]);

  const normalizedExpenseCategoryKeyToProperties = useMemo(() => {
    const out: Record<string, { refs: Set<string>; names: Set<string> }> = {};
    for (const bucket of analyticsCharts.expenseCategories || []) {
      const category = String(bucket?.categoryName || "").trim().toLowerCase();
      if (!category) continue;
      if (!out[category]) {
        out[category] = { refs: new Set<string>(), names: new Set<string>() };
      }
      for (const detail of bucket.details || []) {
        const ref = String(detail?.propertyRef || "").trim().toLowerCase();
        const name = String(detail?.propertyName || "").trim().toLowerCase();
        if (ref) out[category].refs.add(ref);
        if (name) out[category].names.add(name);
      }
    }
    return out;
  }, [analyticsCharts.expenseCategories]);

  const expenseCategoryApiDetailsByKey = useMemo(() => {
    const out: Record<string, ExpenseCategoryApiDetail[]> = {};
    for (const bucket of analyticsCharts.expenseCategories || []) {
      const k = String(bucket?.categoryName || "").trim().toLowerCase();
      if (!k) continue;
      const rawList = Array.isArray(bucket?.details) ? bucket.details : [];
      out[k] = rawList.map((d) => parseExpenseCategoryApiDetail((d && typeof d === "object" ? d : {}) as Record<string, unknown>));
    }
    return out;
  }, [analyticsCharts.expenseCategories]);

  const openPortfolioFromChart = useCallback((filter: PortfolioChartFilter) => {
    setDrillDown(null);
    setKpiDrillDown(null);
    setExpenseCategoryDrilldown(null);
    setPortfolioOpenedFromSearch(false);
    setPortfolioDetailStaNo(null);
    setUnitLedgerInfoRow(null);
    setPortfolioSearchTerm("");
    setPortfolioPage(1);
    setPortfolioChartFilter(filter);
    setPortfolioOpen(true);
  }, []);

  const openExpenseCategoryFromChart = useCallback(
    (segment: { key: string }) => {
      const categoryKey = String(segment.key || "").trim().toLowerCase();
      const title = String(segment.key || "").trim() || "Expense category";
      const lines = expenseCategoryApiDetailsByKey[categoryKey] || [];
      if (lines.length > 0) {
        setPortfolioOpen(false);
        setPortfolioChartFilter(null);
        setPortfolioDetailStaNo(null);
        setPortfolioOpenedFromSearch(false);
        setUnitLedgerInfoRow(null);
        setKpiDrillDown(null);
        setDrillDown(null);
        setExpenseCategoryDrilldown({ categoryKey, categoryTitle: title, propertyRef: null });
        return;
      }
      openPortfolioFromChart({
        type: "expense-category",
        key: categoryKey,
        label: title,
      });
    },
    [expenseCategoryApiDetailsByKey, openPortfolioFromChart]
  );

  const expenseCategoryPropertySummaries = useMemo(() => {
    if (!expenseCategoryDrilldown) return [];
    const lines = expenseCategoryApiDetailsByKey[expenseCategoryDrilldown.categoryKey] || [];
    const map = new Map<string, { propertyRef: string; propertyName: string; lines: ExpenseCategoryApiDetail[] }>();
    for (const line of lines) {
      const ref =
        String(line.propertyRef || "").trim() ||
        String(line.propertyName || "").trim() ||
        "—";
      if (!map.has(ref)) {
        map.set(ref, { propertyRef: ref, propertyName: line.propertyName || ref, lines: [] });
      }
      map.get(ref)!.lines.push(line);
    }
    const sumGross = (rows: ExpenseCategoryApiDetail[]) =>
      rows.reduce((s, x) => s + (x.gross ?? 0), 0);
    return Array.from(map.values()).sort((a, b) => sumGross(b.lines) - sumGross(a.lines));
  }, [expenseCategoryApiDetailsByKey, expenseCategoryDrilldown]);

  const expenseCategorySelectedLines = useMemo(() => {
    if (!expenseCategoryDrilldown?.propertyRef) return [];
    const all = expenseCategoryApiDetailsByKey[expenseCategoryDrilldown.categoryKey] || [];
    const target = expenseCategoryDrilldown.propertyRef;
    return all.filter((l) => {
      const lineKey =
        String(l.propertyRef || "").trim() ||
        String(l.propertyName || "").trim() ||
        "—";
      return lineKey === target;
    });
  }, [
    expenseCategoryApiDetailsByKey,
    expenseCategoryDrilldown?.categoryKey,
    expenseCategoryDrilldown?.propertyRef,
  ]);

  // ── Risk score data ───────────────────────────────────────
  const riskData = useMemo(() => {
    return activeCashFlowRiskProperties.slice(0, 10).map(p => ({
      name: p.propertyName,
      fullName: p.propertyName,
      staNo: p.staNo,
      riskScore: p.riskScore,
      collectionRate: Math.round(p.collectionRate * 100),
      riskLevel: p.riskLevel,
      color: cashFlowRiskLevelHex(p.riskLevel),
    }));
  }, [activeCashFlowRiskProperties]);

  const totalPropertiesCount = useMemo(() => {
    if (profitability.length > 0) return profitability.length;
    return Number(summary.propertyCount) || propertyTable.length || 0;
  }, [profitability.length, summary.propertyCount, propertyTable.length]);

  const portfolioRows = useMemo(() => {
    if (propertyTable.length > 0) {
      return [...propertyTable].sort((a, b) =>
        String(a.propertyName || "").localeCompare(String(b.propertyName || ""))
      );
    }
    return [...profitability]
      .map((p) => ({
        staNo: p.staNo,
        propertyName: p.propertyName,
        income: p.totalIncome,
        expenses: p.totalExpenses,
        profit: p.netProfit,
        margin: p.profitMargin,
      }))
      .sort((a, b) => String(a.propertyName || "").localeCompare(String(b.propertyName || "")));
  }, [propertyTable, profitability]);

  const portfolioDetailProp = useMemo(
    () => (portfolioDetailStaNo ? profitability.find((p) => p.staNo === portfolioDetailStaNo) : undefined),
    [profitability, portfolioDetailStaNo]
  );

  const portfolioDetailSummary = useMemo(
    () => (portfolioDetailStaNo ? propertySummaries.find((s) => s.staNo === portfolioDetailStaNo) : undefined),
    [propertySummaries, portfolioDetailStaNo]
  );

  const portfolioUnitRows = useMemo(
    () => (portfolioDetailStaNo ? buildUnitExpenseRows(filteredExpenses, portfolioDetailStaNo) : []),
    [filteredExpenses, portfolioDetailStaNo]
  );

  const groupedUnitLedger = useMemo(() => {
    const financialApi = (financial.state?.apiResponse as { analytics?: { properties?: Array<Record<string, unknown>> } } | undefined)?.analytics;
    const properties = Array.isArray(financialApi?.properties) ? financialApi.properties : [];
    const selectedProperty =
      properties.find((property) => String(property?.propertyId ?? "") === String(portfolioDetailStaNo ?? "")) ||
      properties.find(
        (property) => String(property?.name ?? "").trim() === String(portfolioDetailProp?.propertyName ?? "").trim()
      );
    const unitLedger = Array.isArray(selectedProperty?.unitLedger)
      ? (selectedProperty.unitLedger as UnitLedgerItem[])
      : [];

    return unitLedger
      .map((unit, idx) => {
        const unitReference = String(unit?.unitRef || `Unit-${idx + 1}`);
        const unitDescription = unit?.unitDescription?.trim() ? String(unit.unitDescription) : "-";
        const totalGross = Number(unit?.totalGross ?? 0);
        const rows = Array.isArray(unit?.expenses)
          ? unit.expenses.map((expense) => ({
              ...expense,
              unitRef: unit?.unitRef,
              unitDescription: unit?.unitDescription,
            }))
          : [];
        return {
          unitReference,
          unitDescription,
          totalGross: Number.isFinite(totalGross) ? totalGross : 0,
          rows,
        };
      })
      .sort((a, b) => a.unitReference.localeCompare(b.unitReference, undefined, { numeric: true }));
  }, [financial.state?.apiResponse, portfolioDetailProp?.propertyName, portfolioDetailStaNo]);

  /** Raw expense lines for the open property — links each expense to its vendor (uploaded / sample data). */
  const portfolioExpenseLines = useMemo(() => {
    if (!portfolioDetailStaNo) return [];
    const propName = portfolioDetailProp?.propertyName?.trim();
    return filteredExpenses
      .filter(
        (e) =>
          String(e.staNo) === String(portfolioDetailStaNo) ||
          (propName && String(e.propertyName || "").trim() === propName)
      )
      .map((e) => {
        const cat = parseExpenseCategoryHeading(String(e.category || ""));
        return {
          id: e.id,
          vendor: String(e.supplierName || "—").trim() || "—",
          categoryCode: cat.code,
          categoryLabel: cat.label,
          categoryFull: cat.full,
          description: (e.description && String(e.description).trim()) || "",
          amount: Number(e.gross ?? e.amount ?? 0),
          month: e.month || "—",
          status: e.status || "paid",
        };
      })
      .sort((a, b) => b.amount - a.amount)
      ;
  }, [filteredExpenses, portfolioDetailStaNo, portfolioDetailProp?.propertyName]);

  const filteredPortfolioRows = useMemo(() => {
    const term = portfolioSearchTerm.trim().toLowerCase();
    const chartFilteredRows = portfolioChartFilter
      ? portfolioRows.filter((row) => {
          const rowStaNo = String(row.staNo || "").trim().toLowerCase();
          const rowName = String(row.propertyName || "").trim().toLowerCase();
          const sourceProperty = profitability.find((p) => String(p.staNo || "").trim().toLowerCase() === rowStaNo);

          if (portfolioChartFilter.type === "classification") {
            const key = portfolioChartFilter.key.trim().toLowerCase();
            const mapped = normalizedClassificationKeyToProperties[key];
            if (mapped) {
              return (
                mapped.ids.has(rowStaNo) ||
                mapped.refs.has(rowStaNo) ||
                mapped.names.has(rowName)
              );
            }
            return String(sourceProperty?.classification || "").trim().toLowerCase() === key;
          }

          const categoryKey = portfolioChartFilter.key.trim().toLowerCase();
          const mappedCategory = normalizedExpenseCategoryKeyToProperties[categoryKey];
          if (mappedCategory) {
            if (mappedCategory.refs.has(rowStaNo) || mappedCategory.names.has(rowName)) return true;
          }
          return (sourceProperty?.topExpenseCategories || []).some(
            (c) => String(c?.category || "").trim().toLowerCase() === categoryKey
          );
        })
      : portfolioRows;

    const rows = term
      ? chartFilteredRows.filter((row) => row.propertyName.toLowerCase().includes(term) || row.staNo.toLowerCase().includes(term))
      : chartFilteredRows;
    const sortedRows = [...rows].sort((a, b) => {
      if (portfolioSortKey === "propertyName") {
        return portfolioSortDirection === "asc"
          ? a.propertyName.localeCompare(b.propertyName)
          : b.propertyName.localeCompare(a.propertyName);
      }
      const left = portfolioSortKey === "income" ? a.income : a.expenses;
      const right = portfolioSortKey === "income" ? b.income : b.expenses;
      return portfolioSortDirection === "asc" ? left - right : right - left;
    });
    return sortedRows;
  }, [
    portfolioRows,
    portfolioSearchTerm,
    portfolioSortDirection,
    portfolioSortKey,
    portfolioChartFilter,
    profitability,
    normalizedClassificationKeyToProperties,
    normalizedExpenseCategoryKeyToProperties,
  ]);

  const portfolioPageSize = 50;
  const portfolioTotalPages = Math.max(1, Math.ceil(filteredPortfolioRows.length / portfolioPageSize));
  const paginatedPortfolioRows = useMemo(() => {
    const start = (portfolioPage - 1) * portfolioPageSize;
    return filteredPortfolioRows.slice(start, start + portfolioPageSize);
  }, [filteredPortfolioRows, portfolioPage]);

  const filteredLedgerLines = useMemo(() => {
    const term = ledgerSearchTerm.trim().toLowerCase();
    return portfolioExpenseLines.filter((row) => {
      const status = normalizeSettledLabel(row.status);
      const statusMatch = ledgerStatusFilter === "all" || status === ledgerStatusFilter;
      if (!statusMatch) return false;
      if (!term) return true;
      return (
        row.vendor.toLowerCase().includes(term) ||
        row.categoryFull.toLowerCase().includes(term) ||
        row.description.toLowerCase().includes(term) ||
        row.month.toLowerCase().includes(term)
      );
    });
  }, [portfolioExpenseLines, ledgerSearchTerm, ledgerStatusFilter]);

  const ledgerStatusOptions = useMemo(() => {
    const counts = { paid: 0, pending: 0 };
    for (const row of portfolioExpenseLines) {
      const normalized = normalizeSettledLabel(row.status);
      if (normalized === "paid") counts.paid += 1;
      if (normalized === "pending") counts.pending += 1;
    }
    return [
      { value: "all" as const, label: "All statuses", count: portfolioExpenseLines.length, enabled: portfolioExpenseLines.length > 0 },
      { value: "paid" as const, label: "Paid", count: counts.paid, enabled: counts.paid > 0 },
      { value: "pending" as const, label: "Pending", count: counts.pending, enabled: counts.pending > 0 },
    ];
  }, [portfolioExpenseLines]);

  const sortedPortfolioUnitRows = useMemo(() => {
    const rows = [...portfolioUnitRows];
    rows.sort((a, b) => {
      if (unitRowsSortKey === "label") {
        return unitRowsSortDirection === "asc"
          ? a.label.localeCompare(b.label)
          : b.label.localeCompare(a.label);
      }
      if (unitRowsSortKey === "invoices") {
        return unitRowsSortDirection === "asc" ? a.invoices - b.invoices : b.invoices - a.invoices;
      }
      return unitRowsSortDirection === "asc" ? a.amount - b.amount : b.amount - a.amount;
    });
    return rows;
  }, [portfolioUnitRows, unitRowsSortDirection, unitRowsSortKey]);

  const expenseBreakdownRows = useMemo(() => {
    const rows =
      portfolioDetailSummary?.expenseBreakdown && Object.keys(portfolioDetailSummary.expenseBreakdown).length > 0
        ? Object.entries(portfolioDetailSummary.expenseBreakdown).map(([name, amount]) => ({ name, amount: Number(amount) }))
        : (portfolioDetailProp?.topExpenseCategories || []).map((c) => ({ name: c.category, amount: c.amount }));
    rows.sort((a, b) => {
      if (expenseBreakdownSortKey === "name") {
        return expenseBreakdownSortDirection === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return expenseBreakdownSortDirection === "asc" ? a.amount - b.amount : b.amount - a.amount;
    });
    return rows;
  }, [expenseBreakdownSortDirection, expenseBreakdownSortKey, portfolioDetailProp?.topExpenseCategories, portfolioDetailSummary?.expenseBreakdown]);

  const sortedTopVendors = useMemo(() => {
    const rows = [...(portfolioDetailProp?.topVendors || [])];
    rows.sort((a, b) => {
      if (vendorTotalsSortKey === "name") {
        return vendorTotalsSortDirection === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return vendorTotalsSortDirection === "asc" ? a.amount - b.amount : b.amount - a.amount;
    });
    return rows;
  }, [portfolioDetailProp?.topVendors, vendorTotalsSortDirection, vendorTotalsSortKey]);

  const sortedFilteredLedgerLines = useMemo(() => {
    const rows = [...filteredLedgerLines];
    rows.sort((a, b) => {
      if (ledgerSortKey === "vendor") {
        return ledgerSortDirection === "asc" ? a.vendor.localeCompare(b.vendor) : b.vendor.localeCompare(a.vendor);
      }
      if (ledgerSortKey === "category") {
        return ledgerSortDirection === "asc"
          ? a.categoryFull.localeCompare(b.categoryFull)
          : b.categoryFull.localeCompare(a.categoryFull);
      }
      if (ledgerSortKey === "month") {
        return ledgerSortDirection === "asc" ? a.month.localeCompare(b.month) : b.month.localeCompare(a.month);
      }
      if (ledgerSortKey === "status") {
        return ledgerSortDirection === "asc"
          ? normalizeSettledLabel(a.status).localeCompare(normalizeSettledLabel(b.status))
          : normalizeSettledLabel(b.status).localeCompare(normalizeSettledLabel(a.status));
      }
      return ledgerSortDirection === "asc" ? a.amount - b.amount : b.amount - a.amount;
    });
    return rows;
  }, [filteredLedgerLines, ledgerSortDirection, ledgerSortKey]);

  const sortedGroupedUnitLedger = useMemo(() => {
    const groups = groupedUnitLedger.map((group) => {
      const rows = [...group.rows];
      rows.sort((a, b) => {
        if (unitLedgerSortKey === "heading") {
          return unitLedgerSortDirection === "asc"
            ? formatLedgerText(a.heading).localeCompare(formatLedgerText(b.heading))
            : formatLedgerText(b.heading).localeCompare(formatLedgerText(a.heading));
        }
        if (unitLedgerSortKey === "settled") {
          return unitLedgerSortDirection === "asc"
            ? normalizeSettledLabel(a.settled).localeCompare(normalizeSettledLabel(b.settled))
            : normalizeSettledLabel(b.settled).localeCompare(normalizeSettledLabel(a.settled));
        }
        if (unitLedgerSortKey === "gross") {
          return unitLedgerSortDirection === "asc"
            ? Number(a.gross ?? 0) - Number(b.gross ?? 0)
            : Number(b.gross ?? 0) - Number(a.gross ?? 0);
        }
        return unitLedgerSortDirection === "asc"
          ? formatLedgerText(a.unitRef).localeCompare(formatLedgerText(b.unitRef))
          : formatLedgerText(b.unitRef).localeCompare(formatLedgerText(a.unitRef));
      });
      return { ...group, rows };
    });
    groups.sort((a, b) => {
      if (unitLedgerSortKey === "gross") {
        return unitLedgerSortDirection === "asc" ? a.totalGross - b.totalGross : b.totalGross - a.totalGross;
      }
      return unitLedgerSortDirection === "asc"
        ? a.unitReference.localeCompare(b.unitReference, undefined, { numeric: true })
        : b.unitReference.localeCompare(a.unitReference, undefined, { numeric: true });
    });
    return groups;
  }, [groupedUnitLedger, unitLedgerSortDirection, unitLedgerSortKey]);

  const globalSearchSuggestions = useMemo(() => {
    const q = globalSearchTerm.trim().toLowerCase();
    if (!q) return [] as GlobalSearchSuggestion[];

    const suggestions: GlobalSearchSuggestion[] = [];
    const seen = new Set<string>();

    for (const p of profitability) {
      const haystack = `${p.propertyName} ${p.staNo}`.toLowerCase();
      if (!haystack.includes(q)) continue;
      const key = `property:${p.staNo}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        id: key,
        type: "property",
        title: p.propertyName,
        subtitle: `Property ${p.staNo} · Net ${formatCurrency(p.netProfit)}`,
        staNo: p.staNo,
      });
    }

    for (const v of vendorAnalysis) {
      const vendorName = String(v.supplierName || "");
      if (!vendorName.toLowerCase().includes(q)) continue;
      const matchedProperty = profitability.find((p) =>
        p.topVendors.some((tv) => normalizeVendorName(tv.name) === normalizeVendorName(vendorName))
      );
      if (!matchedProperty) continue;
      const key = `vendor:${vendorName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        id: key,
        type: "vendor",
        title: vendorName,
        subtitle: `Vendor · ${formatCurrency(v.totalSpend)} · ${matchedProperty.propertyName}`,
        staNo: matchedProperty.staNo,
        ledgerHint: vendorName,
      });
    }

    for (const e of filteredExpenses) {
      const vendor = String(e.supplierName || "").trim();
      const category = String(e.category || "").trim();
      const description = String(e.description || "").trim();
      const haystack = `${vendor} ${category} ${description}`.toLowerCase();
      if (!haystack.includes(q)) continue;
      const staNo = String(e.staNo || "");
      if (!staNo) continue;
      const prop = profitability.find((p) => String(p.staNo) === staNo);
      const key = `expense:${e.id}`;
      if (!prop || seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        id: key,
        type: "expense",
        title: vendor || category || "Expense line",
        subtitle: `${prop.propertyName} · ${formatCurrency(Number(e.gross ?? e.amount ?? 0))}`,
        staNo,
        ledgerHint: vendor || description || category,
      });
    }

    return suggestions.slice(0, 12);
  }, [filteredExpenses, globalSearchTerm, profitability, vendorAnalysis]);

  const ledgerPageSize = 100;
  const ledgerTotalPages = Math.max(1, Math.ceil(sortedFilteredLedgerLines.length / ledgerPageSize));
  const paginatedLedgerLines = useMemo(() => {
    const start = (ledgerPage - 1) * ledgerPageSize;
    return sortedFilteredLedgerLines.slice(start, start + ledgerPageSize);
  }, [sortedFilteredLedgerLines, ledgerPage]);

  useEffect(() => {
    setPortfolioPage(1);
  }, [portfolioSearchTerm, portfolioSortDirection, portfolioSortKey]);

  useEffect(() => {
    setLedgerPage(1);
  }, [ledgerSearchTerm, ledgerStatusFilter, portfolioDetailStaNo]);

  const togglePortfolioSort = useCallback((key: "propertyName" | "income" | "expenses") => {
    if (portfolioSortKey === key) {
      setPortfolioSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setPortfolioSortKey(key);
    setPortfolioSortDirection(key === "propertyName" ? "asc" : "desc");
  }, [portfolioSortKey]);

  const toggleUnitRowsSort = useCallback((key: "label" | "invoices" | "amount") => {
    if (unitRowsSortKey === key) {
      setUnitRowsSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setUnitRowsSortKey(key);
    setUnitRowsSortDirection(key === "label" ? "asc" : "desc");
  }, [unitRowsSortKey]);

  const toggleExpenseBreakdownSort = useCallback((key: "name" | "amount") => {
    if (expenseBreakdownSortKey === key) {
      setExpenseBreakdownSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setExpenseBreakdownSortKey(key);
    setExpenseBreakdownSortDirection(key === "name" ? "asc" : "desc");
  }, [expenseBreakdownSortKey]);

  const toggleVendorTotalsSort = useCallback((key: "name" | "amount") => {
    if (vendorTotalsSortKey === key) {
      setVendorTotalsSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setVendorTotalsSortKey(key);
    setVendorTotalsSortDirection(key === "name" ? "asc" : "desc");
  }, [vendorTotalsSortKey]);

  const toggleLedgerSort = useCallback((key: "vendor" | "category" | "amount" | "month" | "status") => {
    if (ledgerSortKey === key) {
      setLedgerSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setLedgerSortKey(key);
    setLedgerSortDirection(key === "amount" ? "desc" : "asc");
  }, [ledgerSortKey]);

  const toggleUnitLedgerSort = useCallback((key: "unitRef" | "heading" | "gross" | "settled") => {
    if (unitLedgerSortKey === key) {
      setUnitLedgerSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setUnitLedgerSortKey(key);
    setUnitLedgerSortDirection(key === "gross" ? "desc" : "asc");
  }, [unitLedgerSortKey]);

  const handleGlobalSuggestionSelect = useCallback((suggestion: GlobalSearchSuggestion) => {
    setGlobalSearchTerm(suggestion.title);
    setGlobalSearchOpen(false);
    setActiveTab("feed");
    setPortfolioOpen(true);
    setPortfolioChartFilter(null);
    setKpiDrillDown(null);
    setExpenseCategoryDrilldown(null);
    setPortfolioOpenedFromSearch(true);
    setPortfolioDetailStaNo(suggestion.staNo);
    setLedgerPage(1);
    setLedgerStatusFilter("all");
    setLedgerSearchTerm(suggestion.ledgerHint || "");
    setDrillDown(null);
  }, []);

  // ── Drill-down data ───────────────────────────────────────
  const drillDownData = useMemo(() => {
    if (!drillDown) return null;

    if (drillDown.type === 'property') {
      const prop = profitability.find(p => p.staNo === drillDown.id);
      const riskProp = cashFlowRisk.properties.find(p => p.staNo === drillDown.id);
      if (!prop) return null;

      const expensePie = prop.topExpenseCategories.map((c, i) => ({
        name: c.category,
        value: Math.round(c.amount),
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));

      const vendorBar = prop.topVendors.map((v, i) => ({
        name: v.name,
        fullName: v.name,
        amount: Math.round(v.amount),
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));

      const monthlyTrend = prop.monthlyProfitability.map(m => ({
        month: m.month.slice(5),
        income: Math.round(m.income),
        expenses: Math.round(m.expenses),
        profit: Math.round(m.netProfit),
      }));

      return {
        type: 'property' as const,
        name: prop.propertyName,
        staNo: prop.staNo,
        income: prop.totalIncome,
        expenses: prop.totalExpenses,
        profit: prop.netProfit,
        margin: prop.profitMargin,
        classification: prop.classification,
        collectionRate: prop.collectionRate,
        riskScore: riskProp?.riskScore || 0,
        riskLevel: riskProp?.riskLevel || 'low',
        riskFactors: riskProp?.riskFactors || [],
        expensePie,
        vendorBar,
        monthlyTrend,
      };
    }

    if (drillDown.type === 'vendor') {
      const vendor = vendorAnalysis.find(v => v.supplierName === drillDown.id);
      if (!vendor) return null;

      const normalizedVendorName = normalizeVendorName(vendor.supplierName);
      const derivedPropertyNames = profitability
        .filter((p) => p.topVendors.some((v) => normalizeVendorName(v.name) === normalizedVendorName))
        .map((p) => p.propertyName);
      const propertyCandidates = (vendor.properties.length > 0 ? vendor.properties : derivedPropertyNames).slice(0, 8);

      const propertyBar = propertyCandidates
        .map((propName, i) => {
          const propExpenses = profitability.find(p => p.propertyName === propName);
          const vendorSpendAtProp =
            propExpenses?.topVendors.find(v => normalizeVendorName(v.name) === normalizedVendorName)?.amount || 0;
          return {
            name: propName,
            fullName: propName,
            amount: Math.round(vendorSpendAtProp),
            color: CHART_COLORS[i % CHART_COLORS.length],
          };
        })
        .filter((p) => p.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      const safePropertyBar =
        propertyBar.length > 0
          ? propertyBar
          : vendor.totalSpend > 0
            ? [
                {
                  name: 'Mapped via API total',
                  fullName: 'Mapped via API total',
                  amount: Math.round(vendor.totalSpend),
                  color: CHART_COLORS[0],
                },
              ]
            : [];

      const paymentPie = [
        { name: 'Paid', value: Math.round(vendor.paidAmount), color: '#22c55e' },
        { name: 'Pending', value: Math.round(vendor.pendingAmount), color: '#f59e0b' },
        { name: 'Overdue', value: Math.round(vendor.overdueAmount), color: '#ef4444' },
      ].filter(d => d.value > 0);

      const monthlyTrend = vendor.monthlySpend.map(m => ({
        month: m.month.slice(5),
        spend: Math.round(m.amount),
      }));

      return {
        type: 'vendor' as const,
        name: vendor.supplierName,
        totalSpend: vendor.totalSpend,
        percentOfTotal: vendor.percentOfTotal,
        invoiceCount: vendor.invoiceCount,
        propertyCount: Math.max(vendor.propertyCount, safePropertyBar.length),
        categories: vendor.categories,
        propertyBar: safePropertyBar,
        paymentPie,
        monthlyTrend,
      };
    }

    return null;
  }, [drillDown, profitability, vendorAnalysis, cashFlowRisk]);

  // ── Suggested prompts ─────────────────────────────────────
  const suggestedPrompts = [
    'Which property is losing money and why?',
    'Which vendors should we review for cost savings?',
    'Give me a profitability breakdown by property',
    'What are the biggest cash flow risks right now?',
    'Compare the top 3 properties by margin',
  ];

  const trendsSections = useMemo(() => {
    const dynamicSections = normalizeTrendSections(trendsPayload);
    if (dynamicSections.length === 0) {
      return DEFAULT_TRENDS_SECTIONS;
    }

    return dynamicSections.map((section, index) => ({
      title: section.title,
      insights: section.insights,
      ...getTrendStyle(section.title, index),
    }));
  }, [trendsPayload]);


  // ── Chart configs ─────────────────────────────────────────
  const propertyBarConfig: ChartConfig = {
    income: { label: 'Income', color: INCOME_COLOR },
    expenses: { label: 'Expenses', color: EXPENSE_COLOR },
  };

  const profitBarConfig: ChartConfig = {
    profit: { label: 'Net Profit', color: PROFIT_COLOR },
  };

  const vendorBarConfig: ChartConfig = {
    spend: { label: 'Total Spend', color: '#8b5cf6' },
  };

  const riskBarConfig: ChartConfig = {
    riskScore: { label: 'Risk Score', color: '#ef4444' },
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (isWorkerDashboard && financial.loading) {
    return (
      <GlobalLayout activeSection="dashboard">
        <div className="h-screen p-4" style={{ background: 'oklch(0.13 0.025 250)' }}>
          <div className="h-full rounded-2xl border border-white/[0.08] p-5 space-y-4 animate-pulse" style={{ background: 'oklch(0.16 0.02 250)' }}>
            <div className="h-6 w-48 rounded bg-white/10" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-28 rounded-xl bg-white/[0.06]" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-72 rounded-xl bg-white/[0.06]" />
              <div className="h-72 rounded-xl bg-white/[0.06]" />
            </div>
            <div className="h-56 rounded-xl bg-white/[0.06]" />
          </div>
        </div>
      </GlobalLayout>
    );
  }

  if (!shouldShowDashboard) {
    return (
      <GlobalLayout activeSection="dashboard">
        <div className="h-screen flex items-center justify-center px-4" style={{ background: 'oklch(0.13 0.025 250)' }}>
          <div className="w-full max-w-2xl rounded-2xl border border-white/[0.08] p-6 sm:p-8" style={{ background: 'oklch(0.16 0.02 250)' }}>
            <img src={QIKO_LOGO} alt="Qiko" className="h-7 mb-6 opacity-80" />
            <h2 className="text-xl sm:text-2xl font-semibold text-white/90 mb-2">No financial data yet</h2>
            <p className="text-sm text-white/45 mb-6">
              {isWorkerDashboard
                ? 'Upload and process a file in Worker module > Train > Knowledge > Finance. This dashboard will appear automatically once data is available.'
                : 'Upload your data to complete first-time setup. Dashboard insights will appear here once data is available.'}
            </p>

            <div className="mb-5 flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                    return;
                  }
                  if (workerId) {
                  setLocation(`/app/workers/${workerId}/train?step=knowledge`);
                    return;
                  }
                  setLocation('/app/studio');
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] px-3 py-2 text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              {workerId ? (
                <button
                  onClick={() => setLocation(`/app/workers/${workerId}/train?step=knowledge`)}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Data
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/[0.07] p-4 bg-white/[0.02]">
                <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center mb-2">
                  <Upload className="w-4 h-4 text-cyan-300" />
                </div>
                <p className="text-xs font-semibold text-white/80 mb-1">Step 1</p>
                <p className="text-xs text-white/45">Open Worker {">"} Train {">"} Knowledge {">"} Finance.</p>
              </div>

              <div className="rounded-xl border border-white/[0.07] p-4 bg-white/[0.02]">
                <div className="w-8 h-8 rounded-lg bg-indigo-400/10 flex items-center justify-center mb-2">
                  <Database className="w-4 h-4 text-indigo-300" />
                </div>
                <p className="text-xs font-semibold text-white/80 mb-1">Step 2</p>
                <p className="text-xs text-white/45">Click Upload / Process and wait for API response.</p>
              </div>

              <div className="rounded-xl border border-white/[0.07] p-4 bg-white/[0.02]">
                <div className="w-8 h-8 rounded-lg bg-green-400/10 flex items-center justify-center mb-2">
                  <BarChart3 className="w-4 h-4 text-green-300" />
                </div>
                <p className="text-xs font-semibold text-white/80 mb-1">Step 3</p>
                <p className="text-xs text-white/45">Return here to view charts and analysis.</p>
              </div>
            </div>
          </div>
        </div>
      </GlobalLayout>
    );
  }

  return (
    <GlobalLayout activeSection="dashboard">
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'oklch(0.13 0.025 250)' }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex items-center justify-end px-4 py-3 border-b border-white/[0.06]">
        <Sheet>
          {/* <SheetTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors">
              <Menu className="w-5 h-5 text-white/50" />
            </button>
          </SheetTrigger> */}
          <SheetContent side="left" className="w-72 border-white/[0.06]" style={{ background: 'oklch(0.15 0.025 250)' }}>
            <SheetHeader>
              <SheetTitle className="text-white/90">
                <img src={QIKO_LOGO} alt="Qiko" className="h-6" />
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-6 space-y-1">
              <SideMenuLink icon={<BarChart3 className="w-4 h-4" />} label="Financial Intelligence" active />
              <SideMenuLink icon={<BookOpen className="w-4 h-4" />} label="Dashboard" onClick={() => setActiveTab('feed')} />
              <SideMenuLink icon={<MessageSquare className="w-4 h-4" />} label="Ask Analyst" onClick={() => setActiveTab('chat')} />
              <SideMenuLink icon={<History className="w-4 h-4" />} label="Chat History" onClick={() => setActiveTab('history')} />
            </nav>
          </SheetContent>
        </Sheet>

        {/* <img src={QIKO_LOGO} alt="Qiko" className="h-6" /> */}

        <div className="flex items-center gap-1 bg-white/[0.06] rounded-full p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.13_0.025_250)] ${
              activeTab === 'feed' ? 'bg-white/[0.12] text-white' : 'text-white/50 hover:text-white/75'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Intelligence
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.13_0.025_250)] ${
              activeTab === 'chat' ? 'bg-white/[0.12] text-white' : 'text-white/50 hover:text-white/75'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.13_0.025_250)] ${
              activeTab === 'history' ? 'bg-white/[0.12] text-white' : 'text-white/50 hover:text-white/75'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History
          </button>
        </div>
      </header>

      {/* ── Worker Info Bar ──────────────────────────────────── */}
      {activeTab !== 'chat' && (
      <div className="px-4 py-2.5 border-b border-white/[0.04] flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white/90">Financial Analyst</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-500/30 text-indigo-400 uppercase tracking-wider">Template</Badge>
          </div>
          <p className="text-xs text-white/50 whitespace-normal break-words">
            {summary.propertyCount} properties · {summary.vendorCount} vendors
          </p>
        </div>

        {activeTab === 'feed' ? (
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <div className="relative w-full sm:w-[min(26rem,42vw)] sm:max-w-sm" ref={globalSearchRef}>
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-white/45" />
            <input
              value={globalSearchTerm}
              onFocus={() => setGlobalSearchOpen(true)}
              onChange={(e) => {
                setGlobalSearchTerm(e.target.value);
                setGlobalSearchOpen(true);
              }}
              placeholder="Search"
              className="h-8.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-8 pr-3 text-xs text-white/85 outline-none placeholder:text-white/45 focus:border-indigo-400/45"
            />
            {globalSearchOpen && globalSearchTerm.trim().length > 0 ? (
              <div
                className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-white/[0.08] p-1.5 shadow-2xl"
                style={{ background: 'oklch(0.16 0.025 250)' }}
              >
                {globalSearchSuggestions.length > 0 ? (
                  globalSearchSuggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleGlobalSuggestionSelect(s)}
                      className="flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40"
                    >
                      <span className="text-xs font-medium text-white/90">{s.title}</span>
                      <span className="text-[11px] text-white/55">{s.subtitle}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-2.5 py-2 text-xs text-white/55">
                    No matches for "{globalSearchTerm}" in current response data.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {/* <div className="hidden lg:flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1">
            {quickDateRanges.map((opt) => {
              const isActive = activeRange === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setActiveRange(opt.value)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45 ${
                    isActive
                      ? "bg-indigo-500/15 text-indigo-300"
                      : "text-white/62 hover:bg-white/[0.06] hover:text-white/85"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div> */}

          {/* ── Date Range Filter ─────────────────────────────── */}
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => setDatePickerOpen(prev => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.15] bg-white/[0.04] hover:bg-white/[0.06] transition-all text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.13_0.025_250)]"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-white/80 font-medium">{periodLabel}</span>
              <ChevronDown className={`w-3 h-3 text-white/45 transition-transform ${datePickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {datePickerOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-white/[0.08] shadow-2xl z-50 overflow-hidden"
                style={{ background: 'oklch(0.16 0.025 250)' }}
              >
                <div className="px-3 py-2 border-b border-white/[0.06]">
                  <span className="text-[10px] font-semibold text-white/45 uppercase tracking-wider">Date Range</span>
                </div>
                <div className="py-1 max-h-64 overflow-y-auto scrollbar-hide">
                  {/* All-time option (only when multiple months exist) */}
                  {dateRangeOptions.some((o) => o.value === "all") ? (
                    <div className="px-3 pt-2 pb-1 border-t border-white/[0.04]">
                      {(() => {
                        const isActive = activeRange === "all";
                        return (
                          <button
                            key="all"
                            onClick={() => { setActiveRange("all"); setDatePickerOpen(false); }}
                            className={`w-full flex items-center justify-between px-0 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/35 ${
                              isActive
                                ? 'text-indigo-300'
                                : 'text-white/68 hover:text-white/88'
                            }`}
                          >
                            <span className={isActive ? 'font-medium' : ''}>{allRangeLabel}</span>
                            {isActive && <Check className="w-3.5 h-3.5 text-indigo-300" />}
                          </button>
                        );
                      })()}
                    </div>
                  ) : null}
                  {Object.entries(monthOptionsByYear)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([year, options]) => (
                      <div key={year}>
                        <div className="px-3 pt-2 pb-1 border-t border-white/[0.04] first:border-t-0">
                          <span className="text-[10px] font-semibold text-white/34 uppercase tracking-wider">{year}</span>
                        </div>
                        {options.map((opt) => {
                          const isActive = opt.value === activeRange;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => { setActiveRange(opt.value); setDatePickerOpen(false); }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/35 ${
                                isActive
                                  ? 'bg-indigo-500/10 text-indigo-400'
                                  : 'text-white/68 hover:text-white/88 hover:bg-white/[0.05]'
                              }`}
                            >
                              <span className={isActive ? 'font-medium' : ''}>{opt.label}</span>
                              {isActive && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setMobileInsightsOpen(true);
            }}
            className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white/82 transition-colors hover:bg-white/[0.06] xl:hidden"
          >
            <MessageSquare className="h-3.5 w-3.5 text-indigo-300" />
            Chat
          </button>
        </div>
        ) : null}
      </div>
      )}

      {/* ── Content ─────────────────────────────────────────── */}
      {activeTab === 'feed' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* ── Left: Charts & Visualizations ────────────────── */}
          <div
            className={
              portfolioOpen ||
              (!portfolioOpen && drillDown && drillDownData) ||
              (!portfolioOpen && kpiDrillDownData) ||
              (!portfolioOpen && expenseCategoryDrilldown)
                ? "hidden"
                : "flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4"
            }
          >
            {!portfolioOpen &&
              !(drillDown && drillDownData) &&
              !kpiDrillDownData &&
              !expenseCategoryDrilldown &&
              (noDataForSelectedMonth ? (
              <div
                className="rounded-xl border border-amber-400/25 p-6 sm:p-7"
                style={{ background: "linear-gradient(135deg, oklch(0.19 0.03 250), oklch(0.16 0.02 250))" }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/15">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-white/92">
                      No data found for {selectedMonthLabel || "selected month"}
                    </h3>
                    <p className="mt-1 text-sm text-white/58">
                      Is month ka dashboard data available nahi hai. Dropdown se koi aur month select karein.
                    </p>
                    {financial.error ? (
                      <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/65">
                        {financial.error}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <>

            {/* ── KPI Cards + Total Properties (equal-height cells, aligned rows, responsive grid) ───────────────── */}
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-3">
              {kpiCards.filter((kpi) => kpi.key !== "outstanding").map((kpi, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => {
                    setDrillDown(null);
                    setPortfolioOpen(false);
                    setPortfolioDetailStaNo(null);
                    setPortfolioOpenedFromSearch(false);
                    setPortfolioChartFilter(null);
                    setExpenseCategoryDrilldown(null);
                    setKpiDrillDown({ key: kpi.key, title: kpi.label });
                  }}
                  className="flex h-full min-h-0 flex-col rounded-xl border border-white/[0.06] p-4 text-left transition-all duration-200 hover:border-indigo-400/35 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.13_0.025_250)]"
                  style={{ background: 'oklch(0.16 0.02 250)' }}
                >
                  <div className="flex min-h-[1.25rem] shrink-0 items-center justify-between gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-white/55">{kpi.label}</span>
                    <kpi.icon className="h-4 w-4 shrink-0" style={{ color: kpi.color }} />
                  </div>
                  <div className="mt-2 min-h-[1.75rem] shrink-0 text-lg sm:text-xl font-bold leading-tight text-white/90 break-words">{kpi.formatted}</div>
                  {/* <div className="mt-1 min-h-[2.75rem] text-[10px] leading-snug text-white/48">
                    {kpi.subtitle || ''}
                  </div> */}
                  {/* <div className="mt-1 h-8 w-full shrink-0" aria-hidden /> */}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setDrillDown(null);
                  setKpiDrillDown(null);
                  setExpenseCategoryDrilldown(null);
                  setPortfolioOpenedFromSearch(false);
                  setPortfolioDetailStaNo(null);
                  setPortfolioChartFilter(null);
                  setPortfolioOpen(true);
                }}
                className="flex h-full min-h-0 flex-col rounded-xl border border-white/[0.06] p-4 text-left transition-all duration-200 hover:border-indigo-400/35 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.13_0.025_250)]"
                style={{ background: 'oklch(0.16 0.02 250)' }}
              >
                <div className="flex min-h-[1.25rem] shrink-0 items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-white/55">Total Properties</span>
                  <Building2 className="h-4 w-4 shrink-0 text-cyan-400" />
                </div>
                <div className="mt-2 min-h-[1.75rem] shrink-0 text-lg sm:text-xl font-bold leading-tight text-white/90 tabular-nums">{totalPropertiesCount}</div>
                <div className="mt-1 min-h-[2.75rem] text-[10px] leading-snug text-white/48">
                  Open portfolio table
                </div>
                {/* <div className="mt-1 h-8 w-full shrink-0" aria-hidden /> */}
              </button>
            </div>

            {/* ── Income vs Expenses by Property ─────────────── */}
            <div className="rounded-xl p-5 border border-white/[0.06]" style={{ background: 'oklch(0.16 0.02 250)' }}>
              <h3 className="text-sm font-semibold text-white/88 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                Income vs Expenses by Property
              </h3>
              <ChartContainer config={propertyBarConfig} className="h-[280px] w-full">
                <BarChart data={propertyChartData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="name"
                    tick={CHART_AXIS_TICK}
                    angle={-35}
                    textAnchor="end"
                    height={60}
                    tickFormatter={(value: string) => {
                      const label = String(value ?? "");
                      const maxLen = 24;
                      return label.length > maxLen ? `${label.slice(0, maxLen)}...` : label;
                    }}
                  />
                  <YAxis tick={CHART_AXIS_TICK} tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip
                    cursor={FINANCIAL_CHART_TOOLTIP_CURSOR}
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                  />
                  <Bar
                    dataKey="income"
                    fill={INCOME_COLOR}
                    radius={[4, 4, 0, 0]}
                    activeBar={false}
                    cursor="pointer"
                    onClick={(d: { staNo?: string }) => {
                      if (!d.staNo) return;
                      setExpenseCategoryDrilldown(null);
                      setDrillDown({ type: "property", id: d.staNo });
                    }}
                  />
                  <Bar
                    dataKey="expenses"
                    fill={EXPENSE_COLOR}
                    radius={[4, 4, 0, 0]}
                    activeBar={false}
                    cursor="pointer"
                    onClick={(d: { staNo?: string }) => {
                      if (!d.staNo) return;
                      setExpenseCategoryDrilldown(null);
                      setDrillDown({ type: "property", id: d.staNo });
                    }}
                  />
                </BarChart>
              </ChartContainer>
            </div>

            {/* ── Two-column: Profitability Donut + Vendor Spend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Profitability Classification */}
              <div className="rounded-xl p-5 border border-white/[0.06]" style={{ background: 'oklch(0.16 0.02 250)' }}>
                <h3 className="text-sm font-semibold text-white/88 mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-green-400" />
                  Profitability Classification
                </h3>
                <div className="h-[220px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={classificationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        cursor="pointer"
                        onClick={(_, index) => {
                          const selected = classificationData[index];
                          if (!selected) return;
                          openPortfolioFromChart({
                            type: "classification",
                            key: String(selected.key || "").trim().toLowerCase(),
                            label: selected.name,
                          });
                        }}
                      >
                        {classificationData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        cursor={false}
                        contentStyle={{ ...FINANCIAL_RECHARTS_TOOLTIP_BOX, fontSize: '12px' }}
                        labelStyle={FINANCIAL_RECHARTS_TOOLTIP_LABEL_STYLE}
                        itemStyle={FINANCIAL_RECHARTS_TOOLTIP_ITEM_STYLE}
                        formatter={(value: number, name: string) => [`${value} properties`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {classificationData.map((d, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() =>
                        openPortfolioFromChart({
                          type: "classification",
                          key: String(d.key || "").trim().toLowerCase(),
                          label: d.name,
                        })
                      }
                      className="flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45"
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-[11px] text-white/68">{d.name} ({d.value})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Top Vendors by Spend */}
              <div className="rounded-xl p-5 border border-white/[0.06]" style={{ background: 'oklch(0.16 0.02 250)' }}>
                <h3 className="text-sm font-semibold text-white/88 mb-4 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-400" />
                  Top Vendors by Spend
                </h3>
                <div className="space-y-2.5">
                  {vendorChartData.map((v, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => {
                        setExpenseCategoryDrilldown(null);
                        setDrillDown({ type: "vendor", id: v.fullName });
                      }}
                      className="w-full text-left group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.16_0.02_250)]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="min-w-0 flex-1 break-words text-xs text-white/72 group-hover:text-white/90 transition-colors">{v.name}</span>
                        <span className="text-xs text-white/58">{formatCurrency(v.spend)} ({v.percent}%)</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div
                          className="h-full rounded-full transition-all group-hover:brightness-110"
                          style={{ width: `${v.percent}%`, background: v.color, minWidth: '4px' }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Two-column: Expense Categories + Risk Scores ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Expense Categories Donut */}
              <div className="rounded-xl p-5 border border-white/[0.06]" style={{ background: 'oklch(0.16 0.02 250)' }}>
                <h3 className="text-sm font-semibold text-white/88 mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  Expense Categories
                </h3>
                <div className="h-[220px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        cursor="pointer"
                        onClick={(_, index) => {
                          const selected = expenseCategoryData[index];
                          if (!selected) return;
                          openExpenseCategoryFromChart({ key: selected.key });
                        }}
                      >
                        {expenseCategoryData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        cursor={false}
                        contentStyle={{ ...FINANCIAL_RECHARTS_TOOLTIP_BOX, fontSize: '12px' }}
                        labelStyle={FINANCIAL_RECHARTS_TOOLTIP_LABEL_STYLE}
                        itemStyle={FINANCIAL_RECHARTS_TOOLTIP_ITEM_STYLE}
                        formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {expenseCategoryData.slice(0, 6).map((d, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => openExpenseCategoryFromChart({ key: d.key })}
                      className="flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-[10px] text-white/62">{d.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk Score by Property */}
              <div className="rounded-xl p-5 border border-white/[0.06]" style={{ background: 'oklch(0.16 0.02 250)' }}>
                <h3 className="text-sm font-semibold text-white/88 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Risk Score by Property
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex rounded-md p-0.5 text-white/45 transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
                        aria-label="What is risk assessment?"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-[min(22rem,calc(100vw-2rem))] border border-white/15 bg-[oklch(0.22_0.03_250)] px-3 py-2 text-xs leading-relaxed text-white/90 shadow-xl"
                    >
                      {RISK_ASSESSMENT_TOOLTIP}
                    </TooltipContent>
                  </Tooltip>
                </h3>
                <div className="space-y-2">
                  {riskData.map((r, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => {
                        setExpenseCategoryDrilldown(null);
                        setDrillDown({ type: "property", id: r.staNo });
                      }}
                      className="w-full text-left group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.16_0.02_250)]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white/72 group-hover:text-white/90 transition-colors">{r.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-0" style={{ color: r.color, background: `${r.color}15` }}>
                            {r.riskLevel}
                          </Badge>
                          <span className="text-xs font-mono text-white/58">{r.riskScore}/100</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${r.riskScore}%`, background: r.color }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Property Profitability Ranking ──────────────── */}
            <div className="rounded-xl p-5 border border-white/[0.06]" style={{ background: 'oklch(0.16 0.02 250)' }}>
              <h3 className="text-sm font-semibold text-white/88 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Property Profitability Ranking
              </h3>
              <ChartContainer config={profitBarConfig} className="h-[250px] w-full">
                <BarChart data={propertyChartData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" tick={CHART_AXIS_TICK} angle={-35} textAnchor="end" height={60} />
                  <YAxis tick={CHART_AXIS_TICK} tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip
                    cursor={FINANCIAL_CHART_TOOLTIP_CURSOR}
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                  />
                  <Bar
                    dataKey="profit"
                    radius={[4, 4, 0, 0]}
                    activeBar={false}
                    cursor="pointer"
                    onClick={(d: { staNo?: string }) => {
                      if (!d.staNo) return;
                      setExpenseCategoryDrilldown(null);
                      setDrillDown({ type: "property", id: d.staNo });
                    }}
                  >
                    {propertyChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.profit >= 0 ? INCOME_COLOR : EXPENSE_COLOR} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>



              </>
            ))}
          </div>

          {/* <div
            className="order-2 hidden xl:flex w-2 cursor-col-resize items-stretch justify-center group"
            onMouseDown={(event) => {
              setIsResizingSidebar(true);
              resizeStartXRef.current = event.clientX;
              resizeStartWidthRef.current = chatSidebarWidth;
            }}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat panel"
          >
            <div className="w-[2px] rounded-full bg-white/[0.08] group-hover:bg-cyan-400/70 transition-colors" />
          </div> */}

          {/* ── Right: Chat Sidebar ─────────────────────────── */}
          <aside
            className="order-3 hidden xl:flex flex-shrink-0 flex-col border-l border-white/[0.06]"
            style={{
              width: `${chatSidebarWidth}px`,
              minWidth: `${CHAT_SIDEBAR_MIN_WIDTH}px`,
              maxWidth: `${CHAT_SIDEBAR_MAX_WIDTH}px`,
            }}
          >
            <div className="h-full p-4 xl:p-5">
              <section
                className="h-full rounded-2xl border border-white/[0.08] overflow-hidden flex flex-col"
                style={{ background: 'oklch(0.16 0.02 250)' }}
              >
                <div className="h-14 px-3 border-b border-white/[0.06] flex items-center gap-2 shrink-0">
                  <div className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200/90">
                      Trends
                    </p>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                  {trendsSections.map((section) => (
                    <section
                      key={section.title}
                      className={`rounded-xl border bg-white/[0.02] p-3 ${section.border}`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <section.icon className="h-4 w-4 text-white/75" />
                          <h4 className="text-sm font-semibold text-white/88 break-words">{section.title}</h4>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${section.badge}`}>
                          {section.insights.length} insights
                        </span>
                      </div>
                      <div className="space-y-2">
                        {section.insights.map((insight, insightIndex) => (
                          <button
                            key={`${section.title}-${insightIndex}`}
                            type="button"
                            onClick={() => handleTrendInsightClick(insight.text, section.title, insight.title)}
                            className="relative block w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 pl-4 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55"
                          >
                            <span className={`absolute left-0 top-0 h-full w-1 rounded-l-lg ${section.accent}`} />
                            {insight.title ? (
                              <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-white/70">{insight.title}</p>
                            ) : null}
                            <p className="text-[13px] leading-relaxed text-white/82">{insight.text}</p>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            </div>
          </aside>

          {/* ── Mobile: Chat/Trends Drawer ───────────────────── */}
          <Sheet open={mobileInsightsOpen} onOpenChange={setMobileInsightsOpen}>
            <SheetContent
              side="bottom"
              className="h-[85vh] border-white/[0.08] p-0 xl:hidden"
              style={{ background: 'oklch(0.15 0.025 250)' }}
            >
              <SheetHeader className="border-b border-white/[0.06] px-4 py-3">
                <SheetTitle className="text-left text-sm text-white/90">Trends</SheetTitle>
              </SheetHeader>
              <div className="flex h-[calc(85vh-56px)] flex-col p-3">
                <div className="min-h-0 flex-1 overflow-y-auto space-y-3 pr-1">
                  {trendsSections.map((section) => (
                    <section
                      key={section.title}
                      className={`rounded-xl border bg-white/[0.02] p-3 ${section.border}`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <section.icon className="h-4 w-4 text-white/75" />
                          <h4 className="text-sm font-semibold text-white/88 break-words">{section.title}</h4>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${section.badge}`}>
                          {section.insights.length} insights
                        </span>
                      </div>
                      <div className="space-y-2">
                        {section.insights.map((insight, insightIndex) => (
                          <button
                            key={`${section.title}-${insightIndex}`}
                            type="button"
                            onClick={() => handleTrendInsightClick(insight.text, section.title, insight.title)}
                            className="relative block w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 pl-4 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55"
                          >
                            <span className={`absolute left-0 top-0 h-full w-1 rounded-l-lg ${section.accent}`} />
                            {insight.title ? (
                              <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-white/70">{insight.title}</p>
                            ) : null}
                            <p className="text-[13px] leading-relaxed text-white/82">{insight.text}</p>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* ── Drill-down full screen (same pattern as portfolio properties) ── */}
          {!portfolioOpen && drillDown && drillDownData && !expenseCategoryDrilldown && (
            <section
              className="order-1 flex-1 overflow-y-auto rounded-xl border border-white/[0.08] text-white m-4"
              style={{ background: 'oklch(0.15 0.025 250)' }}
            >
              <div className="border-b border-white/[0.07] px-6 py-4">
                <button
                  type="button"
                  onClick={() => setDrillDown(null)}
                  className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-2.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45"
                >
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Back to dashboard
                </button>
                <div className="space-y-1.5 text-left">
                  <h3 className="text-lg font-semibold text-white/95">{drillDownData.name}</h3>
                  <p className="text-sm text-white/55">
                    {drillDownData.type === 'property'
                      ? `Property ${drillDownData.staNo} — income, expenses, risk, and vendor mix for the selected period.`
                      : `${drillDownData.propertyCount} properties · ${drillDownData.invoiceCount} invoices — vendor spend profile and payment mix.`}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-8 pt-4">
                {drillDownData.type === 'property' && (
                  <>
                    {/* Property KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {[
                        { label: 'Income', value: formatCurrency(drillDownData.income), color: INCOME_COLOR },
                        { label: 'Expenses', value: formatCurrency(drillDownData.expenses), color: EXPENSE_COLOR },
                        { label: 'Profit', value: formatCurrency(drillDownData.profit), color: drillDownData.profit >= 0 ? INCOME_COLOR : EXPENSE_COLOR },
                        { label: 'Margin', value: formatPercent(drillDownData.margin), color: drillDownData.margin > 0.3 ? INCOME_COLOR : drillDownData.margin > 0 ? RECEIVABLE_COLOR : EXPENSE_COLOR },
                      ].map((kpi, i) => (
                        <div key={i} className="rounded-lg p-3 border border-white/[0.06]" style={{ background: 'oklch(0.18 0.02 250)' }}>
                          <span className="text-[10px] text-white/52 uppercase tracking-wider">{kpi.label}</span>
                          <div className="text-base font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Monthly Trend */}
                    <div className="rounded-xl p-4 border border-white/[0.06] mb-4" style={{ background: 'oklch(0.17 0.02 250)' }}>
                      <h4 className="text-xs font-semibold text-white/72 mb-3">Monthly Trend</h4>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={drillDownData.monthlyTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                            <XAxis dataKey="month" tick={CHART_AXIS_TICK} />
                            <YAxis tick={CHART_AXIS_TICK} tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`} />
                            <RechartsTooltip
                              cursor={FINANCIAL_LINE_TOOLTIP_CURSOR}
                              contentStyle={{ ...FINANCIAL_RECHARTS_TOOLTIP_BOX, fontSize: '12px' }}
                              labelStyle={FINANCIAL_RECHARTS_TOOLTIP_LABEL_STYLE}
                              itemStyle={FINANCIAL_RECHARTS_TOOLTIP_ITEM_STYLE}
                              formatter={(v: number) => formatCurrency(v)}
                            />
                            <Line type="monotone" dataKey="income" stroke={INCOME_COLOR} strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="expenses" stroke={EXPENSE_COLOR} strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="profit" stroke={PROFIT_COLOR} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Two-column: Expense Pie + Top Vendors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl p-4 border border-white/[0.06]" style={{ background: 'oklch(0.17 0.02 250)' }}>
                        <h4 className="text-xs font-semibold text-white/72 mb-3">Expense Categories</h4>
                        <div className="h-[180px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={drillDownData.expensePie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                                {drillDownData.expensePie.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} stroke="transparent" />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                cursor={false}
                                contentStyle={{ ...FINANCIAL_RECHARTS_TOOLTIP_BOX, fontSize: '11px' }}
                                labelStyle={FINANCIAL_RECHARTS_TOOLTIP_LABEL_STYLE}
                                itemStyle={FINANCIAL_RECHARTS_TOOLTIP_ITEM_STYLE}
                                formatter={(v: number) => formatCurrency(v)}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {drillDownData.expensePie.slice(0, 5).map((d, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                              <span className="text-[9px] text-white/58">{d.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl p-4 border border-white/[0.06]" style={{ background: 'oklch(0.17 0.02 250)' }}>
                        <h4 className="text-xs font-semibold text-white/72 mb-3">Top Vendors</h4>
                        <div className="space-y-2.5">
                          {drillDownData.vendorBar.map((v, i) => (
                            <div key={i}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="min-w-0 flex-1 break-words pr-2 text-[11px] text-white/65">{v.name}</span>
                                <span className="text-[10px] text-white/52">{formatCurrency(v.amount)}</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (v.amount / (drillDownData.vendorBar[0]?.amount || 1)) * 100)}%`, background: v.color }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Risk info */}
                    {drillDownData.riskScore > 0 && (
                      <div className="rounded-xl p-4 border border-white/[0.06] mt-4" style={{ background: 'oklch(0.17 0.02 250)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-white/72">Risk Assessment</h4>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-0" style={{
                            color: cashFlowRiskLevelHex(drillDownData.riskLevel),
                            background: `${cashFlowRiskLevelHex(drillDownData.riskLevel)}15`,
                          }}>
                            {drillDownData.riskLevel} — {drillDownData.riskScore}/100
                          </Badge>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full" style={{
                            width: `${drillDownData.riskScore}%`,
                            background: cashFlowRiskLevelHex(drillDownData.riskLevel),
                          }} />
                        </div>
                        {drillDownData.riskFactors.length > 0 && (
                          <ul className="space-y-1">
                            {drillDownData.riskFactors.map((f, i) => (
                              <li key={i} className="text-[11px] text-white/58 flex items-start gap-1.5">
                                <span className="text-amber-400 mt-0.5">•</span>
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}

                {drillDownData.type === 'vendor' && (
                  <>
                    {/* Vendor KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {[
                        { label: 'Total Spend', value: formatCurrency(drillDownData.totalSpend), color: '#8b5cf6' },
                        { label: '% of Total', value: formatPercent(drillDownData.percentOfTotal), color: '#a78bfa' },
                        { label: 'Invoices', value: String(drillDownData.invoiceCount), color: '#c084fc' },
                        { label: 'Properties', value: String(drillDownData.propertyCount), color: '#e879f9' },
                      ].map((kpi, i) => (
                        <div key={i} className="rounded-lg p-3 border border-white/[0.06]" style={{ background: 'oklch(0.18 0.02 250)' }}>
                          <span className="text-[10px] text-white/52 uppercase tracking-wider">{kpi.label}</span>
                          <div className="text-base font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Monthly Spend Trend */}
                    <div className="rounded-xl p-4 border border-white/[0.06] mb-4" style={{ background: 'oklch(0.17 0.02 250)' }}>
                      <h4 className="text-xs font-semibold text-white/72 mb-3">Monthly Spend Trend</h4>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={drillDownData.monthlyTrend}>
                            <defs>
                              <linearGradient id="vendorGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                            <XAxis dataKey="month" tick={CHART_AXIS_TICK} />
                            <YAxis tick={CHART_AXIS_TICK} tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`} />
                            <RechartsTooltip
                              cursor={FINANCIAL_LINE_TOOLTIP_CURSOR}
                              contentStyle={{ ...FINANCIAL_RECHARTS_TOOLTIP_BOX, fontSize: '12px' }}
                              labelStyle={FINANCIAL_RECHARTS_TOOLTIP_LABEL_STYLE}
                              itemStyle={FINANCIAL_RECHARTS_TOOLTIP_ITEM_STYLE}
                              formatter={(v: number) => formatCurrency(v)}
                            />
                            <Area type="monotone" dataKey="spend" stroke="#8b5cf6" strokeWidth={2} fill="url(#vendorGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Two-column: Payment Status + Property Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl p-4 border border-white/[0.06]" style={{ background: 'oklch(0.17 0.02 250)' }}>
                        <h4 className="text-xs font-semibold text-white/72 mb-3">Payment Status</h4>
                        <div className="h-[180px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={drillDownData.paymentPie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                                {drillDownData.paymentPie.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} stroke="transparent" />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                cursor={false}
                                contentStyle={{ ...FINANCIAL_RECHARTS_TOOLTIP_BOX, fontSize: '11px' }}
                                labelStyle={FINANCIAL_RECHARTS_TOOLTIP_LABEL_STYLE}
                                itemStyle={FINANCIAL_RECHARTS_TOOLTIP_ITEM_STYLE}
                                formatter={(v: number) => formatCurrency(v)}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex gap-4 justify-center mt-1">
                          {drillDownData.paymentPie.map((d, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                              <span className="text-[10px] text-white/62">{d.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl p-4 border border-white/[0.06]" style={{ background: 'oklch(0.17 0.02 250)' }}>
                        <h4 className="text-xs font-semibold text-white/72 mb-3">Spend by Property</h4>
                        <div className="space-y-2.5">
                          {drillDownData.propertyBar.map((p, i) => (
                            <div key={i}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="min-w-0 flex-1 break-words pr-2 text-[11px] text-white/65">{p.name}</span>
                                <span className="text-[10px] text-white/52">{formatCurrency(p.amount)}</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (p.amount / (drillDownData.propertyBar[0]?.amount || 1)) * 100)}%`, background: p.color }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Categories */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {drillDownData.categories.map((c, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-white/14 text-white/58">{c}</Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {!portfolioOpen && kpiDrillDownData && !expenseCategoryDrilldown && (
            <section
              className="order-1 flex-1 overflow-y-auto rounded-xl border border-white/[0.08] text-white m-4"
              style={{ background: 'oklch(0.15 0.025 250)' }}
            >
              <div className="border-b border-white/[0.07] px-6 py-4">
                <button
                  type="button"
                  onClick={() => setKpiDrillDown(null)}
                  className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-2.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45"
                >
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Back to dashboard
                </button>
                <div className="space-y-1.5 text-left">
                  <h3 className="text-lg font-semibold text-white/95">{kpiDrillDownData.title}</h3>
                  <p className="text-2xl font-bold leading-tight text-white/95 tabular-nums">{kpiDrillDownData.formatted}</p>
                </div>
              </div>

              <ScrollArea className="h-[calc(100vh-16rem)] px-6 pb-6 pt-4">
                {kpiDrillDownData.details.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {kpiDrillDownData.details.map(([key, value]) => {
                      const readableLabel = key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (ch) => ch.toUpperCase());
                      const readableValue =
                        typeof value === "number"
                          ? Number.isFinite(value)
                            ? String(value)
                            : "-"
                          : typeof value === "string"
                            ? value
                            : JSON.stringify(value);
                      return (
                        <div key={key} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">{readableLabel}</p>
                          <p className="mt-1 text-sm font-semibold text-white/90 break-words">{readableValue}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-xs leading-relaxed text-white/48">
                    No extra details available for this card in the current API response.
                  </p>
                )}
              </ScrollArea>
            </section>
          )}

          {!portfolioOpen && expenseCategoryDrilldown && (
            <section
              className="order-1 flex-1 overflow-y-auto rounded-xl border border-white/[0.08] text-white m-4"
              style={{ background: 'oklch(0.15 0.025 250)' }}
            >
              <div className="border-b border-white/[0.07] px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    if (expenseCategoryDrilldown.propertyRef) {
                      setExpenseCategoryDrilldown((prev) =>
                        prev ? { ...prev, propertyRef: null } : null
                      );
                      return;
                    }
                    setExpenseCategoryDrilldown(null);
                  }}
                  className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-2.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45"
                >
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {expenseCategoryDrilldown.propertyRef ? "Back to properties" : "Back to dashboard"}
                </button>
                <div className="space-y-1.5 text-left">
                  <h3 className="text-lg font-semibold text-white/95">
                    {expenseCategoryDrilldown.propertyRef
                      ? expenseCategoryPropertySummaries.find(
                          (p) => p.propertyRef === expenseCategoryDrilldown.propertyRef
                        )?.propertyName || "Property"
                      : `Expense category · ${expenseCategoryDrilldown.categoryTitle}`}
                  </h3>
                  <p className="text-sm text-white/55">
                    {expenseCategoryDrilldown.propertyRef
                      ? "Line items from the financial API for this category and property (same fields as analytics.charts.expenseCategories[].details)."
                      : "Properties with spend in this category. Select one to view invoice-level rows from the API."}
                  </p>
                </div>
              </div>

              <ScrollArea className="h-[calc(100vh-16rem)] px-6 pb-6 pt-2">
                {!expenseCategoryDrilldown.propertyRef ? (
                  expenseCategoryPropertySummaries.length === 0 ? (
                    <p className="py-8 text-center text-sm text-white/50">
                      No property breakdown in the API for this category.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {expenseCategoryPropertySummaries.map((row) => {
                        const totalGross = row.lines.reduce(
                          (s, x) => s + (x.gross ?? 0),
                          0
                        );
                        return (
                          <button
                            key={row.propertyRef}
                            type="button"
                            onClick={() =>
                              setExpenseCategoryDrilldown((prev) =>
                                prev ? { ...prev, propertyRef: row.propertyRef } : null
                              )
                            }
                            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white/90">{row.propertyName}</p>
                                <p className="mt-0.5 font-mono text-[11px] text-white/48">{row.propertyRef}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-white/48">{row.lines.length} line{row.lines.length === 1 ? "" : "s"}</p>
                                <p className="text-sm font-semibold tabular-nums text-amber-200/95">
                                  {formatCurrency(totalGross)}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )
                ) : expenseCategorySelectedLines.length === 0 ? (
                  <p className="py-8 text-center text-sm text-white/50">No API lines for this property.</p>
                ) : (
                  <div className="space-y-4 pb-4">
                    {expenseCategorySelectedLines.map((line, idx) => (
                      <div
                        key={`${line.fixFloRef}-${line.invoiceDate}-${idx}`}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4"
                      >
                        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                          {(() => {
                            const settledText = formatLedgerText(line.settled);
                            const fields = [
                              { key: "propertyRef", label: "Property Ref", value: formatLedgerText(line.propertyRef) },
                              { key: "propertyName", label: "Property Name", value: formatLedgerText(line.propertyName) },
                              { key: "unitRef", label: "Unit Ref", value: formatLedgerText(line.unitRef) },
                              { key: "unitDescription", label: "Unit Description", value: formatLedgerText(line.unitDescription) },
                              { key: "vendor", label: "Vendor", value: formatLedgerText(line.vendor) },
                              { key: "supplierRef", label: "Supplier Ref", value: formatLedgerText(line.supplierRef) },
                              { key: "heading", label: "Heading", value: formatLedgerText(line.heading) },
                              { key: "description", label: "Description", value: formatLedgerText(line.description) },
                              { key: "gross", label: "Gross", value: line.gross != null ? formatCurrency(line.gross) : "-" },
                              { key: "nett", label: "Net", value: line.nett != null ? formatCurrency(line.nett) : "-" },
                              { key: "vat", label: "VAT", value: line.vat != null ? formatCurrency(line.vat) : "-" },
                              { key: "invoiceDate", label: "Invoice Date", value: formatLedgerText(line.invoiceDate) },
                              { key: "periodFrom", label: "Period From", value: formatLedgerText(line.periodFrom) },
                              { key: "periodTo", label: "Period To", value: formatLedgerText(line.periodTo) },
                              { key: "settled", label: "Settled", value: settledText !== "-" ? `£${settledText}` : "-" },
                              { key: "fixFloRef", label: "FixFlo Ref", value: formatLedgerText(line.fixFloRef) },
                            ] as const;

                            const visible = fields.filter((f) => {
                              const val = String(f.value ?? "").trim();
                              return val !== "" && val !== "-" && val !== "—";
                            });

                            return visible.map((f) => (
                              <div
                                key={f.key}
                                className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                              >
                                <span className="text-[11px] text-white/50">{f.label}</span>
                                <p className="mt-0.5 break-words font-medium text-white/88">{f.value}</p>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </section>
          )}

          {portfolioOpen ? (
            <section
              className="order-1 flex-1 overflow-y-auto rounded-xl border border-white/[0.08] text-white m-4"
              style={{ background: 'oklch(0.15 0.025 250)' }}
            >
              <div className="border-b border-white/[0.07] px-6 py-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (unitLedgerInfoRow) {
                        setUnitLedgerInfoRow(null);
                        return;
                      }
                      if (portfolioDetailStaNo) {
                        if (portfolioOpenedFromSearch) {
                          setPortfolioDetailStaNo(null);
                          setUnitLedgerInfoRow(null);
                          setPortfolioOpen(false);
                          setPortfolioOpenedFromSearch(false);
                          return;
                        }
                        setPortfolioDetailStaNo(null);
                        setUnitLedgerInfoRow(null);
                        return;
                      }
                      setPortfolioChartFilter(null);
                      setPortfolioOpen(false);
                      setPortfolioOpenedFromSearch(false);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-2.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {unitLedgerInfoRow
                      ? "Back to property"
                      : portfolioDetailStaNo
                        ? (portfolioOpenedFromSearch ? "Back to dashboard" : "Back to properties")
                        : "Back to dashboard"}
                  </button>
                  {!portfolioDetailStaNo ? (
                    <div className="relative ml-auto w-full max-w-sm">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
                      <input
                        value={portfolioSearchTerm}
                        onChange={(e) => setPortfolioSearchTerm(e.target.value)}
                        placeholder="Search by property name or code..."
                        className="h-9 w-full rounded-lg border border-white/[0.12] bg-white/[0.04] pl-9 pr-3 text-xs text-white/90 outline-none placeholder:text-white/38 focus:border-indigo-400/50"
                      />
                    </div>
                  ) : null}
                </div>
                <div className="space-y-1.5 text-left">
                  <h3 className="text-lg font-semibold text-white/95">
                    {unitLedgerInfoRow
                      ? "Unit ledger details"
                      : portfolioDetailStaNo
                        ? portfolioDetailProp?.propertyName || "Property"
                        : portfolioChartFilter
                          ? `Portfolio properties · ${portfolioChartFilter.label}`
                          : "Portfolio properties"}
                  </h3>
                  <p className="text-sm text-white/55">
                    {unitLedgerInfoRow
                      ? `${portfolioDetailProp?.propertyName ? `${portfolioDetailProp.propertyName} · ` : ""}Supplier, amounts, settled status, and full invoice metadata for this line.`
                      : portfolioDetailStaNo
                        ? "Unit-level spend, vendors, and all ledger records with searchable + filterable tables."
                        : portfolioChartFilter
                          ? `Showing only properties mapped to "${portfolioChartFilter.label}" from the selected chart segment.`
                          : "Dedicated table view for portfolio records with sort, search, and pagination for large datasets."}
                  </p>
                </div>
              </div>

              <ScrollArea className="h-[calc(100vh-16rem)] px-6 pb-6 pt-2">
                {unitLedgerInfoRow ? (
                  <div className="grid grid-cols-1 gap-3 pb-4 text-sm md:grid-cols-2">
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2"><span className="text-white/50">Unit Reference:</span> <span className="font-medium">{formatLedgerText(unitLedgerInfoRow.unitRef)}</span></div>
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2"><span className="text-white/50">FixFlo Reference:</span> <span className="font-medium">{formatLedgerText(unitLedgerInfoRow.fixFloRef)}</span></div>
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2"><span className="text-white/50">Supplier:</span> <span className="font-medium">{formatLedgerText(unitLedgerInfoRow.supplierName)}</span></div>
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2"><span className="text-white/50">Supplier Ref:</span> <span className="font-medium">{formatLedgerText(unitLedgerInfoRow.supplierRef)}</span></div>
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2"><span className="text-white/50">Heading:</span> <span className="font-medium">{formatLedgerText(unitLedgerInfoRow.heading)}</span></div>
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2"><span className="text-white/50">Settled:</span> <span className="font-medium">{normalizeSettledLabel(unitLedgerInfoRow.settled)}</span></div>
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2"><span className="text-white/50">Invoice Date:</span> <span className="font-medium">{formatLedgerText(unitLedgerInfoRow.invoiceDate)}</span></div>
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2"><span className="text-white/50">Period:</span> <span className="font-medium">{formatLedgerText(unitLedgerInfoRow.periodFrom)} to {formatLedgerText(unitLedgerInfoRow.periodTo)}</span></div>
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2"><span className="text-white/50">Nett:</span> <span className="font-medium">{formatCurrency(Number(unitLedgerInfoRow.nett ?? 0))}</span></div>
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2"><span className="text-white/50">VAT:</span> <span className="font-medium">{formatCurrency(Number(unitLedgerInfoRow.vat ?? 0))}</span></div>
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 md:col-span-2"><span className="text-white/50">Gross:</span> <span className="font-semibold text-white">{formatCurrency(Number(unitLedgerInfoRow.gross ?? 0))}</span></div>
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 md:col-span-2"><span className="text-white/50">Description:</span> <span className="font-medium">{formatLedgerText(unitLedgerInfoRow.expenditureDescription)}</span></div>
                  </div>
                ) : !portfolioDetailStaNo ? (
                  filteredPortfolioRows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-white/50">No properties in the current range.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
                      <table className="w-full min-w-[28rem] border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-[oklch(0.2_0.035_265)]">
                          <tr className="border-b border-white/[0.08] text-left text-[11px] font-semibold uppercase tracking-wider text-white/55">
                            <th className="px-4 py-3">
                              <button type="button" onClick={() => togglePortfolioSort("propertyName")} className="inline-flex items-center gap-1">
                                Property name
                                <ArrowUpDown className="h-3.5 w-3.5 text-white/45" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-right">
                              <button type="button" onClick={() => togglePortfolioSort("income")} className="ml-auto inline-flex items-center gap-1">
                                Total income
                                <ArrowUpDown className="h-3.5 w-3.5 text-white/45" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-right">
                              <button type="button" onClick={() => togglePortfolioSort("expenses")} className="ml-auto inline-flex items-center gap-1">
                                Total expenses
                                <ArrowUpDown className="h-3.5 w-3.5 text-white/45" />
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPortfolioRows.map((row) => (
                            <tr
                              key={row.staNo}
                              role="button"
                              tabIndex={0}
                              onClick={() => setPortfolioDetailStaNo(row.staNo)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setPortfolioDetailStaNo(row.staNo);
                                }
                              }}
                              className="cursor-pointer border-t border-white/[0.06] text-white/88 transition-colors hover:bg-white/[0.07] focus-visible:bg-white/[0.07] focus-visible:outline-none"
                            >
                              <td className="max-w-[14rem] px-4 py-3 font-medium leading-snug text-white/90">
                                {row.propertyName}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-emerald-300/95">
                                {formatCurrency(row.income)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-rose-300/95">
                                {formatCurrency(row.expenses)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <div className="space-y-8 pb-2">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">Income</p>
                        <p className="text-sm font-semibold tabular-nums text-emerald-300">
                          {portfolioDetailProp ? formatCurrency(portfolioDetailProp.totalIncome) : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">Expenses</p>
                        <p className="text-sm font-semibold tabular-nums text-rose-300">
                          {portfolioDetailProp ? formatCurrency(portfolioDetailProp.totalExpenses) : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 sm:col-span-1 col-span-2">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">Net profit</p>
                        <p className="text-sm font-semibold tabular-nums text-white/90">
                          {portfolioDetailProp ? formatCurrency(portfolioDetailProp.netProfit) : "—"}
                        </p>
                      </div>
                    </div>

                    {portfolioUnitRows.length > 0 ? (
                      <section>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/55">
                          Unit-level expenses
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
                          <table className="w-full min-w-[22rem] text-sm">
                            <thead className="bg-[oklch(0.2_0.03_250)] text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">
                              <tr>
                                <th className="px-3 py-2.5">
                                  <button type="button" onClick={() => toggleUnitRowsSort("label")} className="inline-flex items-center gap-1">
                                    Unit / scope <ArrowUpDown className="h-3 w-3 text-white/45" />
                                  </button>
                                </th>
                                <th className="px-3 py-2.5 text-right">
                                  <button type="button" onClick={() => toggleUnitRowsSort("invoices")} className="ml-auto inline-flex items-center gap-1">
                                    Invoices <ArrowUpDown className="h-3 w-3 text-white/45" />
                                  </button>
                                </th>
                                <th className="px-3 py-2.5 text-right">
                                  <button type="button" onClick={() => toggleUnitRowsSort("amount")} className="ml-auto inline-flex items-center gap-1">
                                    Amount <ArrowUpDown className="h-3 w-3 text-white/45" />
                                  </button>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedPortfolioUnitRows.map((u) => (
                                <tr
                                  key={u.label}
                                  className="border-t border-white/[0.06] text-white/85 transition-colors hover:bg-white/[0.05]"
                                >
                                  <td className="px-3 py-2.5">{u.label}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums text-white/60">{u.invoices}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(u.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    ) : (
                      <section>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/55">
                          Expense breakdown
                        </h4>
                        <p className="mb-2 text-xs leading-relaxed text-white/45">
                          No unit-level line items for this view. Showing category totals from your portfolio data.
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
                          <table className="w-full min-w-[20rem] text-sm">
                            <thead className="bg-[oklch(0.2_0.03_250)] text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">
                              <tr>
                                <th className="px-3 py-2.5">
                                  <button type="button" onClick={() => toggleExpenseBreakdownSort("name")} className="inline-flex items-center gap-1">
                                    Category <ArrowUpDown className="h-3 w-3 text-white/45" />
                                  </button>
                                </th>
                                <th className="px-3 py-2.5 text-right">
                                  <button type="button" onClick={() => toggleExpenseBreakdownSort("amount")} className="ml-auto inline-flex items-center gap-1">
                                    Amount <ArrowUpDown className="h-3 w-3 text-white/45" />
                                  </button>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {expenseBreakdownRows.map((c) => (
                                <tr
                                  key={c.name}
                                  className="border-t border-white/[0.06] text-white/85 transition-colors hover:bg-white/[0.05]"
                                >
                                  <td className="px-3 py-2.5">{c.name}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(c.amount)}</td>
                                </tr>
                              ))}
                              {!expenseBreakdownRows.length ? (
                                <tr>
                                  <td colSpan={2} className="px-3 py-4 text-center text-xs text-white/45">
                                    No category breakdown available.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    )}

                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/55">
                        Vendors (totals)
                      </h4>
                      <p className="mb-2 text-[11px] leading-relaxed text-white/42">
                        Rolled-up spend per vendor for this property. For each invoice line with vendor and category, see the ledger below when expense data is loaded.
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
                        <table className="w-full min-w-[20rem] text-sm">
                          <thead className="bg-[oklch(0.2_0.03_250)] text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">
                            <tr>
                              <th className="px-3 py-2.5">
                                <button type="button" onClick={() => toggleVendorTotalsSort("name")} className="inline-flex items-center gap-1">
                                  Vendor <ArrowUpDown className="h-3 w-3 text-white/45" />
                                </button>
                              </th>
                              <th className="px-3 py-2.5 text-right">
                                <button type="button" onClick={() => toggleVendorTotalsSort("amount")} className="ml-auto inline-flex items-center gap-1">
                                  Spend <ArrowUpDown className="h-3 w-3 text-white/45" />
                                </button>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedTopVendors.map((v, idx) => (
                              <tr
                                key={`${v.name}-${idx}`}
                                className="border-t border-white/[0.06] text-white/85 transition-colors hover:bg-white/[0.05]"
                              >
                                <td className="px-3 py-2.5">{v.name}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(v.amount)}</td>
                              </tr>
                            ))}
                            {!sortedTopVendors.length ? (
                              <tr>
                                <td colSpan={2} className="px-3 py-4 text-center text-xs text-white/45">
                                  No vendor breakdown for this property.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {portfolioExpenseLines.length > 0 ? (
                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/55">
                        Expense ledger (vendor per line)
                      </h4>
                      <div className="mb-2 flex w-full flex-wrap items-center gap-2">
                        <div className="relative min-w-[14rem] flex-1 sm:flex-none">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
                          <input
                            value={ledgerSearchTerm}
                            onChange={(e) => setLedgerSearchTerm(e.target.value)}
                            placeholder="Search vendor, category, description..."
                            className="h-9 w-full rounded-lg border border-white/[0.12] bg-white/[0.04] pl-9 pr-3 text-xs text-white/90 outline-none placeholder:text-white/38 focus:border-indigo-400/50"
                          />
                        </div>
                        <Select
                            value={ledgerStatusFilter}
                            onValueChange={(value) =>
                              setLedgerStatusFilter(value as "all" | "paid" | "pending")
                            }
                          >
                            <SelectTrigger className="h-9 min-w-[10rem] rounded-lg border border-white/20 bg-white/5 text-xs text-white/90 placeholder:text-white/50 focus:ring-1 focus:ring-white/30">
                              <SelectValue placeholder="Filter status" />
                            </SelectTrigger>

                            <SelectContent
                              className="z-50 min-w-[10rem] overflow-hidden rounded-lg border border-white/20 bg-[#1f2937] text-white shadow-xl backdrop-blur-md"
                              position="popper"
                              sideOffset={6}
                            >
                              {ledgerStatusOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                  disabled={!option.enabled}
                                  className="
                                    flex items-center justify-between
                                    px-3 py-2 text-xs text-white/90 cursor-pointer
                                    transition-colors duration-150 ease-in-out

                                    data-[highlighted]:bg-white/20
                                    data-[highlighted]:text-white

                                    data-[state=checked]:bg-white/10
                                    data-[state=checked]:text-white

                                    data-[disabled]:text-white/40
                                    data-[disabled]:cursor-not-allowed
                                  "
                                >
                                  <span>{option.label}</span>
                                  <span className="text-white/60">({option.count})</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                      </div>
                      {sortedFilteredLedgerLines.length > 0 ? (
                        <>
                          <p className="mb-2 text-[11px] leading-relaxed text-white/42">
                            Each row is one expense line from the selected property. Filters are applied live and only the current page is rendered to keep large datasets smooth.
                          </p>
                          <div className="max-h-[min(42vh,360px)] overflow-y-auto overflow-x-auto rounded-lg border border-white/[0.08]">
                            <table className="w-full min-w-[34rem] text-sm">
                              <thead className="sticky top-0 z-10 bg-[oklch(0.2_0.035_265)] text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">
                                <tr>
                                  <th className="px-3 py-2.5">
                                    <button type="button" onClick={() => toggleLedgerSort("vendor")} className="inline-flex items-center gap-1">
                                      Vendor <ArrowUpDown className="h-3 w-3 text-white/45" />
                                    </button>
                                  </th>
                                  <th className="px-3 py-2.5">
                                    <button type="button" onClick={() => toggleLedgerSort("category")} className="inline-flex items-center gap-1">
                                      Category <ArrowUpDown className="h-3 w-3 text-white/45" />
                                    </button>
                                  </th>
                                  <th className="px-3 py-2.5 text-right">
                                    <button type="button" onClick={() => toggleLedgerSort("amount")} className="ml-auto inline-flex items-center gap-1">
                                      Amount <ArrowUpDown className="h-3 w-3 text-white/45" />
                                    </button>
                                  </th>
                                  <th className="px-3 py-2.5 whitespace-nowrap">
                                    <button type="button" onClick={() => toggleLedgerSort("month")} className="inline-flex items-center gap-1">
                                      Period <ArrowUpDown className="h-3 w-3 text-white/45" />
                                    </button>
                                  </th>
                                  <th className="px-3 py-2.5">
                                    <button type="button" onClick={() => toggleLedgerSort("status")} className="inline-flex items-center gap-1">
                                      Status <ArrowUpDown className="h-3 w-3 text-white/45" />
                                    </button>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedLedgerLines.map((row) => (
                                  <tr
                                    key={row.id}
                                    className="border-t border-white/[0.06] text-white/85 transition-colors hover:bg-white/[0.05]"
                                    title={row.description || undefined}
                                  >
                                    <td className="max-w-[11rem] px-3 py-2 align-middle">
                                      <LedgerTruncatedText text={row.vendor} className="font-medium text-white/90" />
                                    </td>
                                    <td className="max-w-[16rem] px-3 py-2 align-middle">
                                      <div className="flex min-w-0 items-center gap-1.5">
                                        {row.categoryCode ? (
                                          <span
                                            className="shrink-0 rounded border border-white/[0.08] bg-white/[0.04] px-1 py-0.5 font-mono text-[9px] leading-none text-white/45"
                                            title="Nominal / account code from your expense file"
                                          >
                                            {row.categoryCode}
                                          </span>
                                        ) : null}
                                        <div className="min-w-0 flex-1">
                                          <LedgerTruncatedText
                                            text={row.categoryLabel}
                                            tooltip={row.categoryFull}
                                            className="text-white/72"
                                          />
                                        </div>
                                      </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-white/90">
                                      {formatCurrency(row.amount)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-white/55">{row.month}</td>
                                    <td className="px-3 py-2">
                                      <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] capitalize text-white/65">
                                        {row.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-xs leading-relaxed text-white/48">
                          Vendor-to-expense detail is not available for this view yet. It appears when expense line items are loaded in the app (uploaded workbook with property code, supplier, and amounts). Until then, use{" "}
                          <span className="font-medium text-white/65">Vendors (totals)</span> above for each vendor’s aggregate spend on this property.
                        </p>
                      )}
                    </section>
                    ) : null}

                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/55">
                        Unit ledger
                      </h4>
                      <div className="max-h-[min(42vh,360px)] overflow-y-auto overflow-x-auto rounded-lg border border-white/[0.08]">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 z-10 bg-[oklch(0.2_0.035_265)] text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">
                            <tr>
                              <th className="px-3 py-2.5">
                                <button type="button" onClick={() => toggleUnitLedgerSort("unitRef")} className="inline-flex items-center gap-1">
                                  Unit Ref <ArrowUpDown className="h-3 w-3 text-white/45" />
                                </button>
                              </th>
                              <th className="px-3 py-2.5">Description</th>
                              {/* <th className="px-3 py-2.5">Supplier</th> */}
                              <th className="px-3 py-2.5">
                                <button type="button" onClick={() => toggleUnitLedgerSort("heading")} className="inline-flex items-center gap-1">
                                  Heading <ArrowUpDown className="h-3 w-3 text-white/45" />
                                </button>
                              </th>
                              {/* <th className="px-3 py-2.5 whitespace-nowrap">Invoice Date</th> */}
                              <th className="px-3 py-2.5 text-right">
                                <button type="button" onClick={() => toggleUnitLedgerSort("gross")} className="ml-auto inline-flex items-center gap-1">
                                  Gross <ArrowUpDown className="h-3 w-3 text-white/45" />
                                </button>
                              </th>
                              <th className="px-3 py-2.5">
                                <button type="button" onClick={() => toggleUnitLedgerSort("settled")} className="inline-flex items-center gap-1">
                                  Settled <ArrowUpDown className="h-3 w-3 text-white/45" />
                                </button>
                              </th>
                              <th className="px-3 py-2.5 text-center">More Info</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedGroupedUnitLedger.flatMap((group) => {
                              const isCollapsed = collapsedUnitGroups[group.unitReference] ?? true;
                              const canExpandUnit = Number(group.totalGross) !== 0;
                              return [
                                <tr key={`group-${group.unitReference}`} className="border-t border-white/[0.08] bg-white/[0.03]">
                                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums font-semibold text-white/80">
                                    {canExpandUnit ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setCollapsedUnitGroups((prev) => ({
                                            ...prev,
                                            [group.unitReference]: !(prev[group.unitReference] ?? true),
                                          }))
                                        }
                                        className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
                                        aria-expanded={!isCollapsed}
                                        aria-label={`${isCollapsed ? "Expand" : "Collapse"} unit ${group.unitReference}`}
                                      >
                                        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                        <span>{group.unitReference}</span>
                                      </button>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-1 py-0.5 tabular-nums">{group.unitReference}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 font-semibold text-white/80">
                                    {group.unitDescription}
                                  </td>
                                  <td className="px-3 py-2.5" />
                                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                                    <span className="rounded-md border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-indigo-200">
                                      Total Gross: {formatCurrency(group.totalGross)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5" />
                                  <td className="px-3 py-2.5" />
                                </tr>,
                                ...(canExpandUnit && !isCollapsed
                                  ? group.rows.map((row, idx) => (
                                <tr
                                  key={`${group.unitReference}-${row.fixFloRef || idx}`}
                                  className="border-t border-white/[0.06] text-white/85 transition-colors hover:bg-white/[0.05]"
                                  title={row.expenditureDescription || undefined}
                                >
                                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                                    {/* {row["Unit Reference"]} */}

                                  </td>
                                  <td className="max-w-[16rem] px-3 py-2">
                                    {/* <LedgerTruncatedText text={String(row["Unit Description"] || "—")} className="text-white/85" /> */}
                                  </td>
                                  <td className="max-w-[12rem] px-3 py-2">
                                    <LedgerTruncatedText text={formatLedgerText(row.heading)} className="text-white/75" />
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-white/90">
                                    {formatCurrency(Number(row.gross ?? 0))}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] capitalize text-white/65">
                                      {normalizeSettledLabel(row.settled)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setUnitLedgerInfoRow(row)}
                                      className="inline-flex items-center justify-center rounded-md border border-white/[0.12] bg-white/[0.04] p-1.5 text-white/70 transition-colors hover:border-white/[0.25] hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
                                      aria-label={`More info for ${row.unitRef || "unit ledger row"}`}
                                      title="View full ledger details"
                                    >
                                      <Info className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                                    ))
                                  : []),
                              ];
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {portfolioUnitRows.length > 0 && (portfolioDetailProp?.topExpenseCategories || []).length > 0 ? (
                      <section>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/55">
                          Top expense categories
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {(portfolioDetailProp?.topExpenseCategories || []).slice(0, 8).map((c, i) => (
                            <span
                              key={c.category}
                              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/75 transition-colors hover:border-indigo-400/30 hover:bg-white/[0.07]"
                            >
                              <span className="size-1.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                              {c.category}{" "}
                              <span className="tabular-nums text-white/55">{formatCurrency(c.amount)}</span>
                            </span>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </div>
                )}
              </ScrollArea>
              {!portfolioDetailStaNo && filteredPortfolioRows.length > 0 ? (
                <div className="border-t border-white/[0.07] px-6 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/58">
                    <span>
                      Showing {(portfolioPage - 1) * portfolioPageSize + 1}-{Math.min(portfolioPage * portfolioPageSize, filteredPortfolioRows.length)} of {filteredPortfolioRows.length}
                    </span>
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPortfolioPage((p) => Math.max(1, p - 1))}
                        disabled={portfolioPage === 1}
                        className="rounded border border-white/[0.1] px-2 py-1 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="px-1">Page {portfolioPage} / {portfolioTotalPages}</span>
                      <button
                        type="button"
                        onClick={() => setPortfolioPage((p) => Math.min(portfolioTotalPages, p + 1))}
                        disabled={portfolioPage >= portfolioTotalPages}
                        className="rounded border border-white/[0.1] px-2 py-1 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {portfolioDetailStaNo && sortedFilteredLedgerLines.length > 0 && !unitLedgerInfoRow ? (
                <div className="border-t border-white/[0.07] px-6 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/58">
                    <span>
                      Showing {(ledgerPage - 1) * ledgerPageSize + 1}-{Math.min(ledgerPage * ledgerPageSize, sortedFilteredLedgerLines.length)} of {sortedFilteredLedgerLines.length} expense rows
                    </span>
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                        disabled={ledgerPage === 1}
                        className="rounded border border-white/[0.1] px-2 py-1 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="px-1">Page {ledgerPage} / {ledgerTotalPages}</span>
                      <button
                        type="button"
                        onClick={() => setLedgerPage((p) => Math.min(ledgerTotalPages, p + 1))}
                        disabled={ledgerPage >= ledgerTotalPages}
                        className="rounded border border-white/[0.1] px-2 py-1 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : activeTab === 'chat' ? (
        /* ── Chat Tab ──────────────────────────────────────── */
        <div className="flex-1 overflow-hidden p-4">
          <div className="h-full">
            <section
              className="h-full rounded-2xl border border-white/[0.08] overflow-hidden"
              style={{ background: 'oklch(0.15 0.02 250)' }}
            >
              <div className="h-14 px-4 border-b border-white/[0.06] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/90">Financial Chat</p>
                    <p className="text-[11px] text-white/35">Clean workspace for quick analysis</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {chatApiWorkerId ? (
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45"
                      title="Start a new conversation"
                      aria-label="New chat"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">New chat</span>
                    </button>
                  ) : null}
                  {/* <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-indigo-500/20 text-indigo-300">
                    API Live
                  </Badge> */}
                </div>
              </div>

              <div className="h-[calc(100%-56px)]">
                <AIChatBox
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={chatLoading}
                  suggestedPrompts={messages.length === 0 ? suggestedPrompts : undefined}
                  placeholder="Ask about property performance, vendor costs, profitability…"
                />
              </div>
            </section>
          </div>
        </div>
      ) : (
        /* ── History Tab (server-backed) ───────────────────── */
        <div className="flex-1 overflow-hidden p-4">
          <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_400px] gap-4">
            <section
              className="h-full rounded-2xl border border-white/[0.08] overflow-hidden flex flex-col"
              style={{ background: 'oklch(0.15 0.02 250)' }}
            >
              <div className="h-14 px-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-violet-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/90 truncate">
                      {selectedHistoryConversation?.title || "Chat History"}
                    </p>
                    <p className="text-[11px] text-white/35 truncate">
                      {selectedHistoryConversation
                        ? selectedHistoryConversation.contactEmail
                          ? `${selectedHistoryConversation.contactName || "Unknown user"} · ${selectedHistoryConversation.contactEmail}`
                          : selectedHistoryConversation.contactName || "Unknown user"
                        : chatApiWorkerId
                          ? `Worker ${chatApiWorkerId}`
                          : 'Open a worker to load history'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void loadChatHistory()}
                  disabled={historyLoading || !chatApiWorkerId}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.06] border border-white/[0.08] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-4 space-y-3">
                {!chatApiWorkerId && (
                  <div className="rounded-xl border border-white/[0.08] p-6 text-center text-sm text-white/45">
                    Open a worker to load chat history for that worker.
                  </div>
                )}
                {chatApiWorkerId && historyError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200/90">
                    {historyError}
                  </div>
                )}
                {chatApiWorkerId &&
                  historyLoading &&
                  historyConversations.length === 0 &&
                  !historyError && (
                  <div className="space-y-3 py-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`rounded-2xl border border-white/[0.06] px-4 py-3.5 animate-pulse ${
                          idx % 2 === 0
                            ? "bg-white/[0.03] ml-4 sm:ml-10 mr-0"
                            : "bg-indigo-500/[0.07] ml-0 mr-4 sm:mr-10"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="h-2.5 w-16 rounded bg-white/10" />
                          <div className="h-2.5 w-24 rounded bg-white/10" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-2.5 w-full rounded bg-white/10" />
                          <div className="h-2.5 w-5/6 rounded bg-white/10" />
                          <div className="h-2.5 w-2/3 rounded bg-white/10" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {chatApiWorkerId &&
                  !historyLoading &&
                  !historyError &&
                  historyConversations.length === 0 && (
                  <div className="rounded-xl border border-white/[0.08] p-8 text-center">
                    <p className="text-sm text-white/50 mb-1">No messages yet</p>
                    <p className="text-xs text-white/35">Use the Chat tab to ask the analyst — conversations appear here.</p>
                  </div>
                )}
                {(selectedHistoryConversation?.messages || []).map((row, idx) => {
                  const isUser = row.role === 'user';
                  return (
                    <div
                      key={`${row.timestamp}-${idx}`}
                      className={`flex w-full items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser ? (
                        <div className="h-8 w-8 shrink-0 rounded-full border border-violet-400/30 bg-violet-500/15 flex items-center justify-center">
                          <MessageSquare className="h-3.5 w-3.5 text-violet-200" />
                        </div>
                      ) : null}
                      <div
                        className={`max-w-[min(88%,44rem)] rounded-2xl border px-4 py-3 shadow-sm ${
                          isUser
                            ? 'border-indigo-500/30 bg-indigo-500/[0.14]'
                            : 'border-white/[0.08] bg-white/[0.04]'
                        }`}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                            {isUser ? 'You' : 'Financial Analyst'}
                          </span>
                          <span className="text-[10px] text-white/30 tabular-nums">
                            {new Date(row.timestamp).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <HistoryMessageContent content={row.content} role={row.role} />
                      </div>
                      {isUser ? (
                        <div className="h-8 w-8 shrink-0 rounded-full border border-indigo-400/30 bg-indigo-500/15 flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-indigo-200" />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            <aside
              className="hidden xl:flex rounded-2xl border border-white/[0.08] p-4 flex-col gap-4"
              style={{ background: 'oklch(0.16 0.02 250)' }}
            >
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                  <input
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    placeholder="Search chats..."
                    className="h-9 w-full rounded-lg border border-white/[0.12] bg-white/[0.03] pl-9 pr-3 text-xs text-white/90 outline-none placeholder:text-white/36 focus:border-indigo-400/45"
                  />
                </div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/68">History</h4>
                <div className="max-h-[55vh] space-y-1.5 overflow-y-auto pr-2">
                  {filteredHistoryConversations.length === 0 ? (
                    <p className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2 text-[11px] text-white/42">
                      {historySearchTerm.trim() ? 'No chats match your search.' : 'No chat titles available yet.'}
                    </p>
                  ) : (
                    filteredHistoryConversations.map((conversation) => {
                      const isActive = selectedHistoryConversation?.id === conversation.id;
                      const contactName = String(conversation.contactName || "Unknown user").trim() || "Unknown user";
                      const contactInitial = contactName.charAt(0).toUpperCase();
                      const contactEmail = String(conversation.contactEmail || "").trim();
                      return (
                        <button
                          key={conversation.id}
                          type="button"
                          onClick={() => setSelectedConversationId(conversation.id)}
                          className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45 ${
                            isActive
                              ? 'border-indigo-400/35 bg-indigo-500/[0.12] text-white'
                              : 'border-white/[0.08] bg-white/[0.02] text-white/75 hover:border-white/[0.14] hover:bg-white/[0.05]'
                          }`}
                          title={conversation.title}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full border border-white/15 bg-white/[0.05] flex items-center justify-center">
                              <span className="text-xs font-semibold text-white/80">
                                {contactInitial}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <User className="h-3 w-3 shrink-0 text-white/45" />
                                <p className="truncate text-xs font-semibold text-white/90">{contactName}</p>
                              </div>
                              {contactEmail ? (
                                <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
                                  <Mail className="h-3 w-3 shrink-0 text-white/35" />
                                  <p className="truncate text-[10px] text-white/52">{contactEmail}</p>
                                </div>
                              ) : null}
                              {/* <p className="mt-1.5 truncate text-[11px] text-white/72">{conversation.title}</p> */}

                              <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
                                  <Clock3 className="h-3 w-3 shrink-0 text-white/35" />
                                  <p className="truncate text-[10px] text-white/52">
                                  {new Date(conversation.updatedAt).toLocaleString(undefined, {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })}
                                  </p>
                                </div>


                            </div>
                          </div>
                          {/* <p className="mt-2 text-[10px] text-white/38">
                            {new Date(conversation.updatedAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p> */}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('chat');
                }}
                className="w-full flex items-center justify-center gap-2 text-xs font-medium text-white/70 py-2.5 rounded-lg border border-white/[0.1] hover:bg-white/[0.05] transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Back to Chat
              </button>
            </aside>
          </div>
        </div>
      )}
      </div>
    </GlobalLayout>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function SideMenuLink({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.15_0.025_250)] ${
        active ? 'bg-white/[0.08] text-white/90 font-medium' : 'text-white/50 hover:text-white/78 hover:bg-white/[0.05]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function HistoryMessageContent({
  content,
  role,
}: {
  content: string;
  role: "user" | "assistant";
}) {
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(content);
  if (role === "user") {
    return <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{content}</p>;
  }

  if (!hasHtml) {
    return (
      <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-strong:text-white prose-em:text-white/90 prose-a:text-cyan-300 prose-code:text-emerald-300 prose-pre:bg-[#060a14] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg">
        <Streamdown>{content}</Streamdown>
      </div>
    );
  }

  const safeHtml = sanitizeHistoryHtml(content);
  return (
    <div
      className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-strong:text-white prose-a:text-cyan-300 prose-code:text-emerald-300 prose-pre:bg-[#060a14] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

function sanitizeHistoryHtml(input: string): string {
  if (!input.trim()) return "";
  if (typeof window === "undefined") return input;

  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed").forEach((node) => node.remove());

  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        continue;
      }
      if ((name === "href" || name === "src") && value.startsWith("javascript:")) {
        el.removeAttribute(attr.name);
      }
    }
  });

  return doc.body.innerHTML;
}
