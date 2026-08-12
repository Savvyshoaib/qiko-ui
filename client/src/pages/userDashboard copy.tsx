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
import { sendFinancialChat, getChatHistory, type UnitLedgerExpense, type UnitLedgerItem } from '@/lib/ELApi';
import { Badge } from '@/components/ui/badge';
import GlobalLayout from '@/components/GlobalLayout';
import { useLocation, useParams } from 'wouter';
import { useFinancialData } from '@/features/financial/useFinancialData';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Sparkles,
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
  X,
  Calendar,
  Check,
  Upload,
  Database,
  ArrowLeft,
  History,
  RefreshCw,
  Info,
  ChevronLeft,
} from 'lucide-react';
import { Streamdown } from "streamdown";

const QIKO_LOGO = 'https://d2xsxph8kpxj0f.cloudfront.net/113764710/4TN22xnKZRWDfxyCLGf8R2/qiko-logo-wordmark_f76052ee.png';

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
const CHAT_SIDEBAR_MIN_WIDTH = 450;
// const CHAT_SIDEBAR_MAX_WIDTH = 1220;
const CHAT_SIDEBAR_MAX_WIDTH = 450;

const RISK_ASSESSMENT_TOOLTIP =
  "Risk assessment evaluates financial and operational risk using cost-to-income ratio, outstanding balance, expense patterns, and overall profitability.";

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
  if (typeof window === "undefined") return 400;
  return window.innerWidth < 1280 ? 320 : 400;
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
    <span ref={ref} className={cn('block min-w-0 truncate', className)}>
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
  const [workerDateRange, setWorkerDateRange] = useState<string>("all");
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
  const risks = (isWorkerDashboard && hasFinancialData ? financialDashboard!.risks : baseData.risks) as any[];
  const propertySummaries = (isWorkerDashboard && hasFinancialData ? financialDashboard!.propertySummaries : baseData.propertySummaries) as any[];
  const activeRange = isWorkerDashboard && hasFinancialData ? financialDashboard!.activeRange : baseData.activeRange;
  const setActiveRange = isWorkerDashboard
    ? (range: string) => {
        setWorkerDateRange(range);
      }
    : baseData.setActiveRange;
  const dateRangeOptions = (isWorkerDashboard && hasFinancialData ? financialDashboard!.dateRangeOptions : baseData.dateRangeOptions) as Array<{ value: string; label: string }>;
  const periodLabel = isWorkerDashboard && hasFinancialData ? financialDashboard!.periodLabel : baseData.periodLabel;
  const currentYear = new Date().getFullYear();
  const quickDateRanges = [
    { value: "last-1", label: "Last month" },
    { value: "last-3", label: "Last 3 months" },
    { value: "last-6", label: "Last 6 months" },
    { value: `year-${currentYear}`, label: "This year" },
    { value: `year-${currentYear - 1}`, label: "Last year" },
  ] as const;

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close date picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
    }
    if (datePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [datePickerOpen]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [portfolioDetailStaNo, setPortfolioDetailStaNo] = useState<string | null>(null);
  const [unitLedgerInfoRow, setUnitLedgerInfoRow] = useState<UnitLedgerExpenseRow | null>(null);
  const [collapsedUnitGroups, setCollapsedUnitGroups] = useState<Record<string, boolean>>({});
  const [chatSidebarWidth, setChatSidebarWidth] = useState<number>(getDefaultChatSidebarWidth);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(chatSidebarWidth);

  useEffect(() => {
    if (!workerId) {
      return;
    }
    setWorkerDateRange("all");
  }, [workerId]);

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
      const chat = await sendFinancialChat({
        agent_unique_id: chatAgentId,
        message: content,
      });
      const responseText = chat.reply || "No response received.";
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
  }, [effectiveAgentUniqueId, workerId]);

  const chatApiWorkerId = workerId || effectiveAgentUniqueId || null;

  const [historyItems, setHistoryItems] = useState<
    { role: 'user' | 'assistant'; content: string; timestamp: number }[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadChatHistory = useCallback(async () => {
    if (!chatApiWorkerId) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await getChatHistory(chatApiWorkerId, 100);
      setHistoryItems(Array.isArray(res.history) ? res.history : []);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : 'Failed to load chat history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [chatApiWorkerId]);

  useEffect(() => {
    if (activeTab !== 'history') return;
    void loadChatHistory();
  }, [activeTab, loadChatHistory]);

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

  // ── KPI sparkline data ────────────────────────────────────
  const kpiCards = useMemo(() => {
    if (!propertySummaries.length) return [];
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

    return [
      {
        label: 'Total Income',
        value: summary.totalIncome,
        formatted: formatCurrency(summary.totalIncome),
        color: INCOME_COLOR,
        icon: TrendingUp,
        sparkline: incomeByMonth,
      },
      {
        label: 'Total Expenses',
        value: summary.totalExpenses,
        formatted: formatCurrency(summary.totalExpenses),
        subtitle: `Nett ${formatCurrency(summary.totalExpensesNett)} + VAT ${formatCurrency(summary.totalVAT)}`,
        color: EXPENSE_COLOR,
        icon: TrendingDown,
        sparkline: expenseByMonth,
      },
      {
        label: 'Net Profit',
        value: summary.totalIncome - summary.totalExpenses,
        formatted: formatCurrency(summary.totalIncome - summary.totalExpenses),
        color: PROFIT_COLOR,
        icon: DollarSign,
        sparkline: profitByMonth,
      },
      {
        label: 'Outstanding',
        value: summary.outstandingReceivables,
        formatted: formatCurrency(summary.outstandingReceivables),
        color: RECEIVABLE_COLOR,
        icon: AlertTriangle,
        sparkline: [],
      },
    ];
  }, [summary, propertySummaries]);

  // ── Property comparison chart data ────────────────────────
  const propertyChartData = useMemo(() => {
    return profitability.slice(0, 10).map(p => ({
      name: p.propertyName.length > 15 ? p.propertyName.slice(0, 15) + '…' : p.propertyName,
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
      name: name.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value,
      color: CLASSIFICATION_COLORS[name] || '#888',
    }));
  }, [profitability]);

  // ── Vendor spend chart data ───────────────────────────────
  const vendorChartData = useMemo(() => {
    return vendorAnalysis.slice(0, 8).map((v, i) => ({
      name: v.supplierName.length > 18 ? v.supplierName.slice(0, 18) + '…' : v.supplierName,
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
        name: name.length > 16 ? name.slice(0, 16) + '…' : name,
        value: Math.round(value),
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));
  }, [profitability]);



  // ── Risk score data ───────────────────────────────────────
  const riskData = useMemo(() => {
    return cashFlowRisk.properties.slice(0, 10).map(p => ({
      name: p.propertyName.length > 15 ? p.propertyName.slice(0, 15) + '…' : p.propertyName,
      fullName: p.propertyName,
      staNo: p.staNo,
      riskScore: p.riskScore,
      collectionRate: Math.round(p.collectionRate * 100),
      riskLevel: p.riskLevel,
      color: p.riskLevel === 'critical' ? '#ef4444' : p.riskLevel === 'high' ? '#f97316' : p.riskLevel === 'medium' ? '#f59e0b' : '#22c55e',
    }));
  }, [cashFlowRisk]);

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
      .slice(0, 200);
  }, [filteredExpenses, portfolioDetailStaNo, portfolioDetailProp?.propertyName]);

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
        name: v.name.length > 14 ? v.name.slice(0, 14) + '…' : v.name,
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
            name: propName.length > 14 ? propName.slice(0, 14) + '…' : propName,
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
                ? 'Worker module me Train > Knowledge > Property Finance se file upload/process karein. Data aate hi yahan dashboard auto-show hoga.'
                : 'First time setup ke liye data upload karna hoga. Jab data available hoga to dashboard insights yahin show hongi.'}
            </p>

            <button
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                  return;
                }
                if (workerId) {
                  setLocation(`/app/workers/${workerId}/train`);
                  return;
                }
                setLocation('/app/studio');
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] px-3 py-2 text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors mb-5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/[0.07] p-4 bg-white/[0.02]">
                <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center mb-2">
                  <Upload className="w-4 h-4 text-cyan-300" />
                </div>
                <p className="text-xs font-semibold text-white/80 mb-1">Step 1</p>
                <p className="text-xs text-white/45">Open Worker {">"} Train {">"} Knowledge {">"} Property Finance.</p>
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
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
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
          {/* <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'chat' ? 'bg-white/[0.12] text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </button> */}
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
      <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white/90">Financial Analyst</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-500/30 text-indigo-400 uppercase tracking-wider">Template</Badge>
          </div>
          <p className="text-xs text-white/50 truncate">
            {summary.propertyCount} properties · {summary.vendorCount} vendors · {formatCurrency(summary.totalIncome)} income
          </p>
        </div>

        <div className="flex items-center gap-2">
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
                  <div className="px-3 pt-2 pb-1 border-b border-white/[0.04]">
                    <span className="text-[10px] font-semibold text-white/34 uppercase tracking-wider">Quick Date Range</span>
                  </div>
                  {quickDateRanges.map((opt) => {
                    const isActive = opt.value === activeRange;
                    return (
                      <button
                        key={`quick-${opt.value}`}
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

                  {dateRangeOptions.map(opt => {
                    const isActive = opt.value === activeRange;
                    const isPreset = ['all', 'last-1', 'last-3', 'last-6', 'last-12'].includes(opt.value);
                    const isFirstMonth = !isPreset && opt === dateRangeOptions.find(o => !['all', 'last-1', 'last-3', 'last-6', 'last-12'].includes(o.value));
                    return (
                      <div key={opt.value}>
                        {isFirstMonth && (
                          <div className="px-3 pt-2 pb-1 border-t border-white/[0.04]">
                            <span className="text-[10px] font-semibold text-white/34 uppercase tracking-wider">Individual Months</span>
                          </div>
                        )}
                        <button
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
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      {activeTab === 'feed' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* ── Left: Charts & Visualizations ────────────────── */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">

            {/* ── KPI Cards + Total Properties (equal-height cells, aligned rows, responsive grid) ───────────────── */}
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {kpiCards.map((kpi, i) => (
                <div
                  key={i}
                  className="flex h-full min-h-0 flex-col rounded-xl border border-white/[0.06] p-4"
                  style={{ background: 'oklch(0.16 0.02 250)' }}
                >
                  <div className="flex min-h-[1.25rem] shrink-0 items-center justify-between gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-white/55">{kpi.label}</span>
                    <kpi.icon className="h-4 w-4 shrink-0" style={{ color: kpi.color }} />
                  </div>
                  <div className="mt-2 min-h-[1.75rem] shrink-0 text-xl font-bold leading-tight text-white/90">{kpi.formatted}</div>
                  <div className="mt-1 min-h-[2.75rem] text-[10px] leading-snug text-white/48">
                    {kpi.subtitle || ''}
                  </div>
                  <div className="mt-1 h-8 w-full shrink-0">
                    {kpi.sparkline.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={kpi.sparkline}>
                          <defs>
                            <linearGradient id={`spark-${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={kpi.color} stopOpacity={0.3} />
                              <stop offset="100%" stopColor={kpi.color} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="value" stroke={kpi.color} strokeWidth={1.5} fill={`url(#spark-${i})`} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setPortfolioDetailStaNo(null);
                  setPortfolioOpen(true);
                }}
                className="flex h-full min-h-0 flex-col rounded-xl border border-white/[0.06] p-4 text-left transition-all duration-200 hover:border-indigo-400/35 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.13_0.025_250)]"
                style={{ background: 'oklch(0.16 0.02 250)' }}
              >
                <div className="flex min-h-[1.25rem] shrink-0 items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-white/55">Total Properties</span>
                  <Building2 className="h-4 w-4 shrink-0 text-cyan-400" />
                </div>
                <div className="mt-2 min-h-[1.75rem] shrink-0 text-xl font-bold leading-tight text-white/90 tabular-nums">{totalPropertiesCount}</div>
                <div className="mt-1 min-h-[2.75rem] text-[10px] leading-snug text-white/48">
                  Open portfolio table
                </div>
                <div className="mt-1 h-8 w-full shrink-0" aria-hidden />
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
                  <XAxis dataKey="name" tick={CHART_AXIS_TICK} angle={-35} textAnchor="end" height={60} />
                  <YAxis tick={CHART_AXIS_TICK} tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip
                    cursor={FINANCIAL_CHART_TOOLTIP_CURSOR}
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                  />
                  <Bar dataKey="income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} activeBar={false} cursor="pointer" onClick={(d: { staNo?: string }) => d.staNo && setDrillDown({ type: 'property', id: d.staNo })} />
                  <Bar dataKey="expenses" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} activeBar={false} cursor="pointer" onClick={(d: { staNo?: string }) => d.staNo && setDrillDown({ type: 'property', id: d.staNo })} />
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
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-[11px] text-white/68">{d.name} ({d.value})</span>
                    </div>
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
                      onClick={() => setDrillDown({ type: 'vendor', id: v.fullName })}
                      className="w-full text-left group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.16_0.02_250)]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white/72 group-hover:text-white/90 transition-colors">{v.name}</span>
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
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-[10px] text-white/62">{d.name}</span>
                    </div>
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
                      onClick={() => setDrillDown({ type: 'property', id: r.staNo })}
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
                  <Bar dataKey="profit" radius={[4, 4, 0, 0]} activeBar={false} cursor="pointer" onClick={(d: { staNo?: string }) => d.staNo && setDrillDown({ type: 'property', id: d.staNo })}>
                    {propertyChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.profit >= 0 ? INCOME_COLOR : EXPENSE_COLOR} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>



          </div>

          <div
            className="hidden lg:flex w-2 cursor-col-resize items-stretch justify-center group"
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
          </div>

          {/* ── Right: Chat Sidebar ─────────────────────────── */}
          <aside
            className="hidden lg:flex flex-shrink-0 flex-col border-l border-white/[0.06]"
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
                <div className="h-14 px-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-indigo-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/90"> Chat</p>
                      {/* <p className="text-sm font-semibold text-white/90">Financial Chat</p> */}
                      <p className="text-[11px] text-white/50">Ask about property performance and risks</p>
                    </div>
                  </div>
                  {/* <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-indigo-500/20 text-indigo-300">
                    API Live
                  </Badge> */}
                </div>
                <div className="flex-1 min-h-0">
                  <AIChatBox
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isLoading={chatLoading}
                    suggestedPrompts={messages.length === 0 ? suggestedPrompts : undefined}
                    placeholder="Ask about property performance..."
                  />
                </div>
              </section>
            </div>
          </aside>

          {/* ── Drill-down Overlay ───────────────────────────── */}
          {drillDown && drillDownData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDrillDown(null)}>
              <div
                className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.08] p-6 m-4"
                style={{ background: 'oklch(0.15 0.025 250)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white/90">{drillDownData.name}</h2>
                    <p className="text-xs text-white/55 mt-0.5">
                      {drillDownData.type === 'property' ? `Property ${drillDownData.staNo}` : `${drillDownData.propertyCount} properties · ${drillDownData.invoiceCount} invoices`}
                    </p>
                  </div>
                  <button type="button" onClick={() => setDrillDown(null)} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45">
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>

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
                                <span className="text-[11px] text-white/65">{v.name}</span>
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
                            color: drillDownData.riskLevel === 'critical' ? '#ef4444' : drillDownData.riskLevel === 'high' ? '#f97316' : '#f59e0b',
                            background: drillDownData.riskLevel === 'critical' ? '#ef444415' : drillDownData.riskLevel === 'high' ? '#f9731615' : '#f59e0b15',
                          }}>
                            {drillDownData.riskLevel} — {drillDownData.riskScore}/100
                          </Badge>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full" style={{
                            width: `${drillDownData.riskScore}%`,
                            background: drillDownData.riskLevel === 'critical' ? '#ef4444' : drillDownData.riskLevel === 'high' ? '#f97316' : '#f59e0b',
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
                                <span className="text-[11px] text-white/65">{p.name}</span>
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
            </div>
          )}

          <Dialog
            open={portfolioOpen}
            onOpenChange={(open) => {
              setPortfolioOpen(open);
              if (!open) setPortfolioDetailStaNo(null);
            }}
          >
            <DialogContent
              className="max-h-[min(92vh,720px)] w-full max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden border-white/[0.1] p-0 text-white shadow-2xl duration-200 sm:max-w-3xl"
              style={{ background: 'oklch(0.15 0.025 250)' }}
            >
              <div className="border-b border-white/[0.07] px-6 py-4 pr-14">
                {portfolioDetailStaNo ? (
                  <button
                    type="button"
                    onClick={() => setPortfolioDetailStaNo(null)}
                    className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Back to properties
                  </button>
                ) : null}
                <DialogHeader className="space-y-1.5 p-0 text-left">
                  <DialogTitle className="text-lg font-semibold text-white/95">
                    {portfolioDetailStaNo
                      ? portfolioDetailProp?.propertyName || "Property"
                      : "Portfolio properties"}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-white/55">
                    {portfolioDetailStaNo
                      ? "Unit-level spend (when expense line items include units), vendors, and expense categories."
                      : "All properties in the current range. Select a row for unit, vendor, and category detail."}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <ScrollArea className="h-[min(62vh,520px)] px-6 pb-6 pt-2">
                {!portfolioDetailStaNo ? (
                  portfolioRows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-white/50">No properties in the current range.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
                      <table className="w-full min-w-[28rem] border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-[oklch(0.2_0.035_265)]">
                          <tr className="border-b border-white/[0.08] text-left text-[11px] font-semibold uppercase tracking-wider text-white/55">
                            <th className="px-4 py-3">Property name</th>
                            <th className="px-4 py-3 text-right">Total income</th>
                            <th className="px-4 py-3 text-right">Total expenses</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portfolioRows.map((row) => (
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
                                <th className="px-3 py-2.5">Unit / scope</th>
                                <th className="px-3 py-2.5 text-right">Invoices</th>
                                <th className="px-3 py-2.5 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {portfolioUnitRows.map((u) => (
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
                                <th className="px-3 py-2.5">Category</th>
                                <th className="px-3 py-2.5 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(portfolioDetailSummary?.expenseBreakdown &&
                              Object.keys(portfolioDetailSummary.expenseBreakdown).length > 0
                                ? Object.entries(portfolioDetailSummary.expenseBreakdown)
                                    .map(([name, amount]) => ({ name, amount: Number(amount) }))
                                    .sort((a, b) => b.amount - a.amount)
                                : (portfolioDetailProp?.topExpenseCategories || []).map((c) => ({
                                    name: c.category,
                                    amount: c.amount,
                                  }))
                              ).map((c) => (
                                <tr
                                  key={c.name}
                                  className="border-t border-white/[0.06] text-white/85 transition-colors hover:bg-white/[0.05]"
                                >
                                  <td className="px-3 py-2.5">{c.name}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(c.amount)}</td>
                                </tr>
                              ))}
                              {!(
                                (portfolioDetailSummary?.expenseBreakdown &&
                                  Object.keys(portfolioDetailSummary.expenseBreakdown).length > 0) ||
                                (portfolioDetailProp?.topExpenseCategories || []).length > 0
                              ) ? (
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
                              <th className="px-3 py-2.5">Vendor</th>
                              <th className="px-3 py-2.5 text-right">Spend</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(portfolioDetailProp?.topVendors || []).map((v, idx) => (
                              <tr
                                key={`${v.name}-${idx}`}
                                className="border-t border-white/[0.06] text-white/85 transition-colors hover:bg-white/[0.05]"
                              >
                                <td className="px-3 py-2.5">{v.name}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(v.amount)}</td>
                              </tr>
                            ))}
                            {!(portfolioDetailProp?.topVendors || []).length ? (
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

                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/55">
                        Expense ledger (vendor per line)
                      </h4>
                      {portfolioExpenseLines.length > 0 ? (
                        <>
                          <p className="mb-2 text-[11px] leading-relaxed text-white/42">
                            Each row is one expense line (up to 200, largest first). Category codes such as 01 or 13 from your ledger appear as a small badge; hover any truncated text to see the full value.
                          </p>
                          <div className="max-h-[min(42vh,360px)] overflow-y-auto overflow-x-auto rounded-lg border border-white/[0.08]">
                            <table className="w-full min-w-[34rem] text-sm">
                              <thead className="sticky top-0 z-10 bg-[oklch(0.2_0.035_265)] text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">
                                <tr>
                                  <th className="px-3 py-2.5">Vendor</th>
                                  <th className="px-3 py-2.5">Category</th>
                                  <th className="px-3 py-2.5 text-right">Amount</th>
                                  <th className="px-3 py-2.5 whitespace-nowrap">Period</th>
                                  <th className="px-3 py-2.5">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {portfolioExpenseLines.map((row) => (
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

                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/55">
                        Unit ledger
                      </h4>
                      <div className="max-h-[min(42vh,360px)] overflow-y-auto overflow-x-auto rounded-lg border border-white/[0.08]">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 z-10 bg-[oklch(0.2_0.035_265)] text-left text-[11px] font-semibold uppercase tracking-wider text-white/50">
                            <tr>
                              <th className="px-3 py-2.5">Unit Ref</th>
                              <th className="px-3 py-2.5">Description</th>
                              {/* <th className="px-3 py-2.5">Supplier</th> */}
                              <th className="px-3 py-2.5">Heading</th>
                              {/* <th className="px-3 py-2.5 whitespace-nowrap">Invoice Date</th> */}
                              <th className="px-3 py-2.5 text-right">Gross</th>
                              <th className="px-3 py-2.5">Settled</th>
                              <th className="px-3 py-2.5 text-center">More Info</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupedUnitLedger.flatMap((group) => {
                              const isCollapsed = collapsedUnitGroups[group.unitReference] ?? true;
                              return [
                                <tr key={`group-${group.unitReference}`} className="border-t border-white/[0.08] bg-white/[0.03]">
                                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums font-semibold text-white/80">
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
                                ...(!isCollapsed
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
                      <Dialog open={Boolean(unitLedgerInfoRow)} onOpenChange={(open) => !open && setUnitLedgerInfoRow(null)}>
                        <DialogContent className="max-w-2xl border-white/[0.12] bg-[oklch(0.16_0.02_250)] text-white">
                          <DialogHeader>
                            <DialogTitle className="text-white">
                              Unit ledger details
                            </DialogTitle>
                            <DialogDescription className="text-white/60">
                              Supplier, gross, settled status, and full invoice metadata.
                            </DialogDescription>
                          </DialogHeader>
                          {unitLedgerInfoRow ? (
                            <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
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
                          ) : null}
                        </DialogContent>
                      </Dialog>
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
            </DialogContent>
          </Dialog>
        </div>
      ) : activeTab === 'chat' ? (
        /* ── Chat Tab ──────────────────────────────────────── */
        <div className="flex-1 overflow-hidden p-4">
          <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_400px] gap-4">
            <section
              className="h-full rounded-2xl border border-white/[0.08] overflow-hidden"
              style={{ background: 'oklch(0.15 0.02 250)' }}
            >
              <div className="h-14 px-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/90">Financial Chat</p>
                    <p className="text-[11px] text-white/35">Clean workspace for quick analysis</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-indigo-500/20 text-indigo-300">
                  API Live
                </Badge>
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

            <aside
              className="hidden xl:flex rounded-2xl border border-white/[0.08] p-4 flex-col gap-4"
              style={{ background: 'oklch(0.16 0.02 250)' }}
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                  <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Quick Prompts</h3>
                </div>
                <div className="space-y-2">
                  {suggestedPrompts.slice(0, 4).map((prompt, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full text-left text-xs text-white/60 hover:text-white/88 transition-colors px-3 py-2 rounded-lg border border-white/[0.06] hover:border-white/[0.14] bg-white/[0.02] hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.16_0.02_250)]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] p-3 bg-white/[0.02]">
                <h4 className="text-xs font-semibold text-white/72 mb-2">Current Context</h4>
                <div className="space-y-2 text-[11px] text-white/58">
                  <p>{summary.propertyCount} properties in current range</p>
                  <p>{summary.vendorCount} vendors tracked</p>
                  <p>{periodLabel}</p>
                </div>
              </div>

              {/* <div className="rounded-xl border border-amber-400/15 p-3 bg-amber-400/5">
                <h4 className="text-xs font-semibold text-amber-200/80 mb-1">Note</h4>
                <p className="text-[11px] text-amber-100/60 leading-relaxed">
                  Chat replies and dashboard metrics are now fetched using the worker agent_unique_id.
                </p>
              </div> */}
            </aside>
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
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <History className="w-4 h-4 text-violet-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/90">Chat History</p>
                    <p className="text-[11px] text-white/35">
                      {chatApiWorkerId ? `Stored for ${chatApiWorkerId}` : 'Open a worker to load history'}
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

              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-4 space-y-4">
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
                  historyItems.length === 0 &&
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
                  historyItems.length === 0 && (
                  <div className="rounded-xl border border-white/[0.08] p-8 text-center">
                    <p className="text-sm text-white/50 mb-1">No messages yet</p>
                    <p className="text-xs text-white/35">Use the Chat tab to ask the analyst — conversations appear here.</p>
                  </div>
                )}
                {historyItems.map((row, idx) => (
                  <div
                    key={`${row.timestamp}-${idx}`}
                    className={`rounded-2xl border px-4 py-3.5 shadow-sm ${
                      row.role === 'user'
                        ? 'border-indigo-500/25 bg-indigo-500/[0.08] ml-0 mr-4 sm:mr-10'
                        : 'border-white/[0.08] bg-white/[0.04] ml-4 sm:ml-10 mr-0'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        {row.role === 'user' ? 'You' : 'Analyst'}
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
                ))}
              </div>
            </section>

            <aside
              className="hidden xl:flex rounded-2xl border border-white/[0.08] p-4 flex-col gap-4"
              style={{ background: 'oklch(0.16 0.02 250)' }}
            >
              <div className="rounded-xl border border-white/[0.06] p-3 bg-white/[0.02]">
                <h4 className="text-xs font-semibold text-white/72 mb-2">About history</h4>
                <p className="text-[11px] text-white/45 leading-relaxed">
                  Messages are loaded from the financial API for the current worker agent_unique_id.
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] p-3 bg-white/[0.02]">
                <h4 className="text-xs font-semibold text-white/72 mb-2">Current Context</h4>
                <div className="space-y-2 text-[11px] text-white/58">
                  <p>{summary.propertyCount} properties in current range</p>
                  <p>{summary.vendorCount} vendors tracked</p>
                  <p>{periodLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
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
