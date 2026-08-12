import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  CloudUpload,
  DatabaseZap,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Globe2,
  LayoutDashboard,
  Link2,
  ListChecks,
  Loader2,
  LockKeyhole,
  NotebookPen,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getIdgSalesActivityLogs,
  getIdgSalesOpportunities,
  getIdgSalesOpportunity,
  getIdgSalesSources,
  IDG_SALES_STATIC_AGENT_ID,
  reviewIdgSalesOpportunity,
  scanIdgSalesSource,
  type IdgSalesActivityLog,
  type IdgSalesIngestionSource,
  type IdgSalesOpportunity,
  type IdgSalesOpportunityStage,
} from "@/lib/idgSalesApi";

type OpportunityStatus =
  | "new"
  | "extracting"
  | "qualified"
  | "needs_review"
  | "rejected"
  | "validated"
  | "ready_salesforce"
  | "pushed"
  | "push_failed";

type Recommendation = "Bid" | "Review" | "No Bid" | "";
type Competition = "Low" | "Medium" | "High" | "";
type SourceStatus = "connected" | "limited" | "needs_access" | "error";
type AuditTone = "info" | "success" | "warning" | "danger";

interface SourceConnector {
  id: string;
  name: string;
  type: "API" | "Portal" | "Manual";
  status: SourceStatus;
  auth: string;
  cadence: string;
  lastScan: string;
  found: number;
  error?: string;
}

interface Criterion {
  name: string;
  score: number;
  weight: number;
  note: string;
}

interface Opportunity {
  id: string;
  title: string;
  buyer: string;
  source: string;
  sourceUrl: string;
  country: string;
  region: string;
  category: string;
  value: number | null;
  currency: "GBP" | "EUR" | "USD";
  deadline: string;
  status: OpportunityStatus;
  recommendation: Recommendation;
  qualificationScore: number;
  confidence: number;
  competitorReadiness: Competition;
  summary: string;
  criteria: Criterion[];
  risks: string[];
  missing: string[];
  reviewer?: string;
  reviewNote?: string;
  rejectionReason?: string;
  salesforceId?: string;
  salesforceError?: string;
  updatedAt: string;
}

interface AuditItem {
  id: string;
  time: string;
  actor: string;
  action: string;
  detail: string;
  tone: AuditTone;
}

const statusLabels: Record<OpportunityStatus, string> = {
  new: "New",
  extracting: "Extracting",
  qualified: "Scanned",
  needs_review: "Needs Review",
  rejected: "Rejected",
  validated: "Validated",
  ready_salesforce: "Ready for Salesforce",
  pushed: "Pushed",
  push_failed: "Push Failed",
};

const statusOrder: OpportunityStatus[] = [
  "new",
  "extracting",
  "qualified",
  "needs_review",
  "validated",
  "ready_salesforce",
  "pushed",
  "push_failed",
  "rejected",
];

const pipelineColumns: OpportunityStatus[] = [
  "new",
  "qualified",
  "needs_review",
  "validated",
  "ready_salesforce",
  "pushed",
];

const initialSources: SourceConnector[] = [];

function mapApiStageToStatus(stage: IdgSalesOpportunityStage): OpportunityStatus {
  const map: Record<IdgSalesOpportunityStage, OpportunityStatus> = {
    ingested: "new",
    qualifying: "extracting",
    qualified: "qualified",
    awaiting_review: "needs_review",
    rejected: "rejected",
    validated: "validated",
    push_pending: "ready_salesforce",
    pushed: "pushed",
    push_failed: "push_failed",
  };
  return map[stage] ?? "new";
}

function mapSourceStatus(source: IdgSalesIngestionSource): SourceStatus {
  if (source.lastScanStatus === "failed" || source.status === "error") return "error";
  if (source.status === "connected" || source.status === "active") return "connected";
  if (source.status === "limited" || source.authStatus?.includes("limited")) return "limited";
  return "needs_access";
}

function mapSourceType(type: string): SourceConnector["type"] {
  const normalized = type.toLowerCase();
  if (normalized === "api") return "API";
  if (normalized === "manual") return "Manual";
  return "Portal";
}

function asCurrency(value?: string | null): Opportunity["currency"] {
  if (value === "EUR" || value === "USD") return value;
  return "GBP";
}

function asRecommendation(value?: string | null): Recommendation {
  const normalized = value?.toLowerCase();
  if (normalized === "bid") return "Bid";
  if (normalized === "no_bid" || normalized === "no bid" || normalized === "no-bid") return "No Bid";
  if (normalized === "review") return "Review";
  return "";
}

function asCompetition(value?: string | null): Competition {
  const normalized = value?.toLowerCase();
  if (normalized === "low") return "Low";
  if (normalized === "medium") return "Medium";
  if (normalized === "high") return "High";
  return "";
}

function hasApiId<T extends { id?: unknown }>(item: T | null | undefined): item is T & { id: string | number } {
  return item !== null && item !== undefined && item.id !== null && item.id !== undefined && String(item.id).trim() !== "";
}

function asAuditTone(value?: string | null): AuditTone {
  if (value === "success" || value === "warning" || value === "danger" || value === "info") return value;
  return "info";
}

function formatApiDateTime(value?: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatActivityAction(action: string) {
  return action
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapApiSourceToUi(source: IdgSalesIngestionSource): SourceConnector {
  return {
    id: String(source.id),
    name: source.name,
    type: mapSourceType(source.type),
    status: mapSourceStatus(source),
    auth: source.authStatus?.replace(/_/g, " ") ?? "",
    cadence: source.scanCadence?.replace(/_/g, " ") ?? "",
    lastScan: formatApiDateTime(source.lastScanAt),
    found: source.opportunitiesFound ?? 0,
    error: source.lastError ?? undefined,
  };
}

function mapApiOpportunityToUi(opportunity: IdgSalesOpportunity): Opportunity {
  const score = opportunity.qualificationScore ?? 0;

  return {
    id: String(opportunity.id),
    title: opportunity.title || "",
    buyer: opportunity.buyer ?? "",
    source: opportunity.source ?? opportunity.sourceKey ?? "",
    sourceUrl: opportunity.sourceUrl ?? "",
    country: opportunity.country ?? "",
    region: opportunity.region ?? "",
    category: opportunity.category ?? "",
    value: opportunity.estimatedValue ?? null,
    currency: asCurrency(opportunity.currency),
    deadline: opportunity.deadlineAt ?? "",
    status: mapApiStageToStatus(opportunity.stage),
    recommendation: asRecommendation(opportunity.recommendation),
    qualificationScore: score,
    confidence: opportunity.confidence ?? 0,
    competitorReadiness: asCompetition(opportunity.competitorReadiness),
    summary: opportunity.qualificationSummary ?? "",
    criteria: [],
    risks: opportunity.risks ?? [],
    missing: opportunity.missingFields ?? [],
    reviewer: opportunity.reviewedBy?.userName || opportunity.reviewedBy?.email || undefined,
    reviewNote: opportunity.humanReviewNotes ?? undefined,
    rejectionReason: opportunity.rejectionReasons?.[0],
    salesforceId: opportunity.salesforceOpportunityId ?? undefined,
    salesforceError: opportunity.salesforcePushError ?? undefined,
    updatedAt: opportunity.updatedAt ? formatApiDateTime(opportunity.updatedAt) : "",
  };
}

function mapApiActivityLogToUi(log: IdgSalesActivityLog): AuditItem {
  const tone = asAuditTone(log.tone);
  return {
    id: `api-activity-${log.id}`,
    time: formatApiDateTime(log.createdAt),
    actor: tone,
    action: formatActivityAction(log.action || ""),
    detail: log.detail || "",
    tone,
  };
}

const initialOpportunities: Opportunity[] = [];

const initialAudit: AuditItem[] = [];

function formatCurrency(value: number | null | undefined, currency: Opportunity["currency"] = "GBP") {
  if (value === null || value === undefined) return "";

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function daysUntil(date: string): number | null {
  if (!date) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  if (Number.isNaN(end.getTime())) return null;
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / 86400000);
}

function formatDaysUntil(date: string) {
  const days = daysUntil(date);
  return days === null ? "" : `${days} days`;
}

function todayTime() {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: OpportunityStatus) {
  const styles: Record<OpportunityStatus, string> = {
    new: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    extracting: "border-indigo-400/30 bg-indigo-400/10 text-indigo-200",
    qualified: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
    needs_review: "border-amber-400/35 bg-amber-400/10 text-amber-100",
    rejected: "border-red-400/30 bg-red-400/10 text-red-100",
    validated: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    ready_salesforce: "border-violet-400/30 bg-violet-400/10 text-violet-100",
    pushed: "border-green-400/30 bg-green-400/10 text-green-100",
    push_failed: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  };
  return styles[status];
}

function sourceStatusClass(status: SourceStatus) {
  const styles: Record<SourceStatus, string> = {
    connected: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    limited: "border-amber-400/35 bg-amber-400/10 text-amber-100",
    needs_access: "border-slate-400/25 bg-slate-400/10 text-slate-200",
    error: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  };
  return styles[status];
}

function competitionClass(value: Competition) {
  const styles: Record<Competition, string> = {
    "": "",
    Low: "text-emerald-300",
    Medium: "text-amber-200",
    High: "text-rose-200",
  };
  return styles[value];
}

function createAudit(action: string, detail: string, tone: AuditTone = "info", actor = "IDG User"): AuditItem {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    time: `Today ${todayTime()}`,
    actor,
    action,
    detail,
    tone,
  };
}


function IconBadge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
        <Icon className="h-4 w-4 text-cyan-200" />
      </div>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-[12px] text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  detail,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-4 shadow-[0_18px_50px_-42px_rgba(34,211,238,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
          <p className="mt-2 truncate text-[24px] font-bold text-white">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-[12px] text-slate-400">{detail}</p>
    </div>
  );
}

function OpportunityStatusBadge({ status }: { status: OpportunityStatus }) {
  return <IconBadge className={statusClass(status)}>{statusLabels[status]}</IconBadge>;
}

export default function IDGSalesIntelligenceWorkerDemo() {
  const [activeView, setActiveView] = useState<"overview" | "pipeline" | "sources" | "review" | "salesforce" | "audit">(
    "overview",
  );
  const [sources, setSources] = useState(initialSources);
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [audit, setAudit] = useState(initialAudit);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OpportunityStatus>("all");
  const [scanning, setScanning] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [loadingApi, setLoadingApi] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const selectedOpportunity =
    opportunities.find((opportunity) => opportunity.id === selectedId) ?? opportunities[0] ?? null;

  const refreshActivityLogs = async () => {
    const response = await getIdgSalesActivityLogs(IDG_SALES_STATIC_AGENT_ID, { limit: 10 });
    const nextAudit = Array.isArray(response.activityLogs)
      ? response.activityLogs.filter(hasApiId).map(mapApiActivityLogToUi)
      : [];
    setAudit(nextAudit);
  };

  const refreshIdgSalesData = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      setLoadingApi(true);
    }

    try {
      const [sourcesResponse, opportunitiesResponse, activityLogsResponse] = await Promise.all([
        getIdgSalesSources(IDG_SALES_STATIC_AGENT_ID),
        getIdgSalesOpportunities(IDG_SALES_STATIC_AGENT_ID, { limit: "*" }),
        getIdgSalesActivityLogs(IDG_SALES_STATIC_AGENT_ID, { limit: 10 }),
      ]);

      const nextSources = Array.isArray(sourcesResponse.sources)
        ? sourcesResponse.sources.filter(hasApiId).map(mapApiSourceToUi)
        : [];
      const nextOpportunities = Array.isArray(opportunitiesResponse.opportunities)
        ? opportunitiesResponse.opportunities.filter(hasApiId).map(mapApiOpportunityToUi)
        : [];
      const nextAudit = Array.isArray(activityLogsResponse.activityLogs)
        ? activityLogsResponse.activityLogs.filter(hasApiId).map(mapApiActivityLogToUi)
        : [];

      setSources(nextSources);
      setOpportunities(nextOpportunities);
      setAudit(nextAudit);
      if (nextOpportunities.length > 0) {
        setSelectedId((current) =>
          nextOpportunities.some((opportunity) => opportunity.id === current)
            ? current
            : nextOpportunities[0].id,
        );
      } else {
        setSelectedId("");
      }
      setApiError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load local IDG Sales API.";
      setApiError(message);
      if (!options.silent) {
        toast.error(message);
      }
    } finally {
      setLoadingApi(false);
    }
  };

  useEffect(() => {
    void refreshIdgSalesData();
    // Static agent id and mapper functions are module constants for this temporary local integration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOpportunities = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return opportunities
      .filter((opportunity) => (statusFilter === "all" ? true : opportunity.status === statusFilter))
      .filter((opportunity) => {
        if (!cleanQuery) return true;
        return [
          opportunity.title,
          opportunity.buyer,
          opportunity.source,
          opportunity.category,
          opportunity.country,
          opportunity.region,
        ]
          .join(" ")
          .toLowerCase()
          .includes(cleanQuery);
      })
      .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
  }, [opportunities, query, statusFilter]);

  const metrics = useMemo(() => {
    const live = opportunities.filter((opportunity) => !["rejected", "pushed"].includes(opportunity.status));
    const qualified = opportunities.filter((opportunity) =>
      ["qualified", "needs_review", "validated", "ready_salesforce", "pushed"].includes(opportunity.status),
    );
    const review = opportunities.filter((opportunity) => opportunity.status === "needs_review");
    const validated = opportunities.filter((opportunity) =>
      ["validated", "ready_salesforce", "pushed"].includes(opportunity.status),
    );
    const deadlineRisk = opportunities.filter((opportunity) => {
      const days = daysUntil(opportunity.deadline);
      return days !== null && days >= 0 && days <= 21 && !["rejected", "pushed"].includes(opportunity.status);
    });

    return {
      newFound: opportunities.filter((opportunity) => opportunity.status === "new").length,
      qualified: qualified.length,
      review: review.length,
      validated: validated.length,
      pipelineValue: live.reduce((total, opportunity) => total + (opportunity.value ?? 0), 0),
      deadlineRisk: deadlineRisk.length,
    };
  }, [opportunities]);

  const addAudit = (item: AuditItem) => setAudit((current) => [item, ...current]);

  const handleSelectOpportunity = async (id: string) => {
    setSelectedId(id);
    if (!id) return;

    try {
      const response = await getIdgSalesOpportunity(IDG_SALES_STATIC_AGENT_ID, id);
      const detail = mapApiOpportunityToUi(response.opportunity);
      setOpportunities((current) =>
        current.map((opportunity) => (opportunity.id === id ? detail : opportunity)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load opportunity detail.";
      toast.error(message);
    }
  };

  const handleRunScan = async () => {
    if (scanning) return;
    setScanning(true);
    toast.info("Scanning UNGM through local Laravel API...");

    try {
      const result = await scanIdgSalesSource(IDG_SALES_STATIC_AGENT_ID, "ungm", {
        query: "security",
        page_size: 10,
        page_index: 0,
        active_only: true,
      });

      const scannedSource = hasApiId(result.source) ? mapApiSourceToUi(result.source) : null;
      const scannedOpportunities = Array.isArray(result.opportunities)
        ? result.opportunities.filter(hasApiId).map(mapApiOpportunityToUi)
        : [];

      if (scannedSource) {
        setSources((current) => {
          const withoutScanned = current.filter((source) => source.id !== scannedSource.id);
          return [scannedSource, ...withoutScanned];
        });
      }

      if (scannedOpportunities.length > 0) {
        setOpportunities((current) => {
          const scannedIds = new Set(scannedOpportunities.map((opportunity) => opportunity.id));
          return [...scannedOpportunities, ...current.filter((opportunity) => !scannedIds.has(opportunity.id))];
        });
        setSelectedId(scannedOpportunities[0].id);
      }

      void refreshActivityLogs().catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to refresh activity logs.";
        addAudit(createAudit("Activity log refresh failed", message, "warning", "Frontend"));
      });
      toast.success("UNGM scan complete.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNGM scan failed.";
      addAudit(createAudit("UNGM scan failed", message, "danger", "Laravel API"));
      toast.error(message);
    } finally {
      setScanning(false);
    }
  };



  const handleApprove = async (id: string) => {
    const opportunity = opportunities.find((item) => item.id === id);
    if (!opportunity) return;

    setProcessingId(id);
    try {
      const response = await reviewIdgSalesOpportunity(IDG_SALES_STATIC_AGENT_ID, id, {
        decision: "approved",
        notes: reviewNote,
      });
      const updatedOpportunity = mapApiOpportunityToUi(response.opportunity);
      setOpportunities((current) =>
        current.map((item) => (item.id === id ? updatedOpportunity : item)),
      );
      void refreshActivityLogs().catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to refresh activity logs.";
        addAudit(createAudit("Activity log refresh failed", message, "warning", "Frontend"));
      });
      toast.success("Opportunity validated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to validate opportunity.";
      addAudit(createAudit("Validation failed", message, "danger", "Laravel API"));
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const opportunity = opportunities.find((item) => item.id === id);
    if (!opportunity) return;

    setProcessingId(id);
    try {
      const response = await reviewIdgSalesOpportunity(IDG_SALES_STATIC_AGENT_ID, id, {
        decision: "rejected",
        notes: reviewNote,
      });
      const updatedOpportunity = mapApiOpportunityToUi(response.opportunity);
      setOpportunities((current) =>
        current.map((item) => (item.id === id ? updatedOpportunity : item)),
      );
      void refreshActivityLogs().catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to refresh activity logs.";
        addAudit(createAudit("Activity log refresh failed", message, "warning", "Frontend"));
      });
      toast.info("Opportunity rejected and kept searchable.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reject opportunity.";
      addAudit(createAudit("Rejection failed", message, "danger", "Laravel API"));
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };


  const handleRestore = async (id: string) => {
    const opportunity = opportunities.find((item) => item.id === id);
    if (!opportunity) return;

    setProcessingId(id);
    try {
      const response = await reviewIdgSalesOpportunity(IDG_SALES_STATIC_AGENT_ID, id, {
        decision: "needs_review",
        notes: reviewNote,
      });
      const updatedOpportunity = mapApiOpportunityToUi(response.opportunity);
      setOpportunities((current) =>
        current.map((item) => (item.id === id ? updatedOpportunity : item)),
      );
      void refreshActivityLogs().catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to refresh activity logs.";
        addAudit(createAudit("Activity log refresh failed", message, "warning", "Frontend"));
      });
      toast.success("Opportunity restored for review.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to restore opportunity.";
      addAudit(createAudit("Restore failed", message, "danger", "Laravel API"));
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  const views = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "pipeline", label: "Pipeline", icon: ListChecks },
    { id: "sources", label: "Sources", icon: Radar },
    { id: "review", label: "Review", icon: ClipboardCheck },
    { id: "salesforce", label: "Salesforce", icon: CloudUpload },
    { id: "audit", label: "Audit", icon: Activity },
  ] as const;

  return (
    <main className="min-h-screen bg-[#080C13] text-white">
      <div className="border-b border-white/[0.08] bg-[#0D1420]">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10">
                <img src="/qiko-icon.png" alt="Qiko" className="h-7 w-7 rounded-md" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-normal text-white sm:text-2xl">
                    IDG Sales Intelligence Worker
                  </h1>
                  <IconBadge className="border-emerald-300/25 bg-emerald-300/10 text-emerald-100">
                    Connected to Sales API
                  </IconBadge>
                  <IconBadge className="border-white/10 bg-white/[0.04] text-slate-300">
                    Agent {IDG_SALES_STATIC_AGENT_ID.slice(0, 8)}
                  </IconBadge>
                </div>
                <p className="mt-1 max-w-3xl text-[13px] leading-6 text-slate-400">
                  Discover tender opportunities, qualify them with AI, validate with a human reviewer, and push clean
                  records into Salesforce.
                </p>
                {apiError && (
                  <p className="mt-1 max-w-3xl text-[12px] leading-5 text-amber-200">
                    Local API error: {apiError}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void refreshIdgSalesData()}
                disabled={loadingApi}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/12 bg-white/[0.04] px-4 text-[13px] font-semibold text-slate-100 transition-colors hover:bg-white/[0.07] disabled:opacity-60"
              >
                {loadingApi ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {loadingApi ? "Loading API" : "Refresh API"}
              </button>
              <button
                type="button"
                onClick={handleRunScan}
                disabled={scanning}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 text-[13px] font-semibold text-[#06202A] transition-colors hover:bg-cyan-200 disabled:opacity-60"
              >
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
                {scanning ? "Scanning" : "Run Source Scan"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView("sources");
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/12 bg-white/[0.04] px-4 text-[13px] font-semibold text-slate-100 transition-colors hover:bg-white/[0.07]"
              >
                <DatabaseZap className="h-4 w-4" />
                View Sources
              </button>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-5">
            {[
              { label: "Discover", icon: Globe2, detail: "Portals and API" },
              { label: "Extract", icon: FileText, detail: "Normalize fields" },
              { label: "Qualify", icon: Sparkles, detail: "AI fit scoring" },
              { label: "Validate", icon: UserCheck, detail: "Human approval" },
              { label: "Salesforce", icon: CloudUpload, detail: "CRM push" },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06]">
                    <Icon className="h-3.5 w-3.5 text-cyan-200" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-white">{step.label}</p>
                    <p className="truncate text-[10px] text-slate-500">{step.detail}</p>
                  </div>
                  {index < 4 && <ChevronRight className="hidden h-4 w-4 text-slate-600 xl:block" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 overflow-x-auto">
          <div className="flex min-w-max gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] p-1">
            {views.map((view) => {
              const Icon = view.icon;
              const selected = activeView === view.id;
              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setActiveView(view.id)}
                  className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-[12px] font-semibold transition-colors ${
                    selected
                      ? "bg-white text-[#101824]"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {view.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeView === "overview" && (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <MetricCard
                label="New Found"
                value={String(metrics.newFound)}
                icon={DatabaseZap}
                tone="border-sky-300/25 bg-sky-300/10 text-sky-200"
                detail="Fresh tenders awaiting AI extraction."
              />
              <MetricCard
                label="Scanned"
                value={String(metrics.qualified)}
                icon={BadgeCheck}
                tone="border-cyan-300/25 bg-cyan-300/10 text-cyan-200"
                detail="Fit-scored opportunities in live workflow."
              />
              <MetricCard
                label="Needs Review"
                value={String(metrics.review)}
                icon={ClipboardCheck}
                tone="border-amber-300/30 bg-amber-300/10 text-amber-100"
                detail="Human action required before CRM."
              />
              <MetricCard
                label="Validated"
                value={String(metrics.validated)}
                icon={ShieldCheck}
                tone="border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                detail="Human approved opportunities."
              />
              <MetricCard
                label="Pipeline Value"
                value={formatCurrency(metrics.pipelineValue)}
                icon={CircleDollarSign}
                tone="border-violet-300/25 bg-violet-300/10 text-violet-100"
                detail="Open value before rejected or pushed."
              />
              <MetricCard
                label="Deadline Risk"
                value={String(metrics.deadlineRisk)}
                icon={Timer}
                tone="border-rose-300/25 bg-rose-300/10 text-rose-100"
                detail="Live tenders due inside 21 days."
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <SectionHeader
                    icon={TrendingUp}
                    title="Priority Opportunities"
                    subtitle="High-fit tenders sorted by deadline risk and commercial value"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveView("pipeline")}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/12 px-3 text-[12px] font-semibold text-slate-200 hover:bg-white/[0.05]"
                  >
                    Open Pipeline
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {opportunities
                    .filter((opportunity) => !["rejected", "pushed"].includes(opportunity.status))
                    .sort(
                      (a, b) =>
                        b.qualificationScore - a.qualificationScore ||
                        (daysUntil(a.deadline) ?? Number.MAX_SAFE_INTEGER) -
                          (daysUntil(b.deadline) ?? Number.MAX_SAFE_INTEGER),
                    )
                    .slice(0, 5)
                    .map((opportunity) => (
                      <button
                        key={opportunity.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(opportunity.id);
                          setActiveView("pipeline");
                        }}
                        className="grid w-full gap-3 rounded-lg border border-white/[0.07] bg-[#0F1724] p-3 text-left transition-colors hover:border-cyan-300/25 hover:bg-[#111C2C] md:grid-cols-[1fr_120px_120px_110px]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-white">{opportunity.title}</p>
                          <p className="mt-1 truncate text-[11px] text-slate-500">
                            {opportunity.buyer} | {opportunity.source}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-slate-500">Score</p>
                          <p className="mt-1 text-[13px] font-semibold text-cyan-100">
                            {opportunity.qualificationScore ? `${opportunity.qualificationScore}%` : "Pending"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-slate-500">Deadline</p>
                          <p className="mt-1 text-[13px] font-semibold text-amber-100">{formatDaysUntil(opportunity.deadline)}</p>
                        </div>
                        <div className="flex items-center md:justify-end">
                          <OpportunityStatusBadge status={opportunity.status} />
                        </div>
                      </button>
                    ))}
                </div>
              </section>

              <section className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
                <SectionHeader
                  icon={Activity}
                  title="Live Activity"
                  subtitle="Audit trail from ingestion, AI, human review, and Salesforce"
                />
                <div className="mt-4 space-y-3">
                  {audit.length > 0 ? (
                    audit.slice(0, 5).map((item) => (
                      <AuditRow key={item.id} item={item} />
                    ))
                  ) : (
                    <EmptyActivityState />
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeView === "pipeline" && (
          <PipelineView
            filteredOpportunities={filteredOpportunities}
            selectedOpportunity={selectedOpportunity}
            query={query}
            statusFilter={statusFilter}
            processingId={processingId}
            reviewNote={reviewNote}
            setQuery={setQuery}
            setStatusFilter={setStatusFilter}
            setSelectedId={handleSelectOpportunity}
            setReviewNote={setReviewNote}
            onApprove={handleApprove}
            onReject={handleReject}
            onRestore={handleRestore}
          />
        )}

        {activeView === "sources" && (
          <SourcesView
            sources={sources}
            scanning={scanning}
            onScan={handleRunScan}
          />
        )}

        {activeView === "review" && (
          <ReviewView
            opportunities={opportunities}
            processingId={processingId}
            reviewNote={reviewNote}
            setSelectedId={handleSelectOpportunity}
            setActiveView={setActiveView}
            setReviewNote={setReviewNote}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {activeView === "salesforce" && (
          <SalesforceView
            opportunities={opportunities}
            selectedOpportunity={selectedOpportunity}
            setSelectedId={handleSelectOpportunity}
          />
        )}

        {activeView === "audit" && (
          <section className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeader
                icon={Activity}
                title="Activity Log and Audit Trail"
                subtitle="Every material AI, user, source, and Salesforce action stays visible"
              />
              <IconBadge className="border-white/10 bg-white/[0.04] text-slate-300">{audit.length} events</IconBadge>
            </div>
            {audit.length > 0 ? (
              <div className="grid gap-3">
                {audit.map((item) => (
                  <AuditRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyActivityState />
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function PipelineView({
  filteredOpportunities,
  selectedOpportunity,
  query,
  statusFilter,
  processingId,
  reviewNote,
  setQuery,
  setStatusFilter,
  setSelectedId,
  setReviewNote,
  onApprove,
  onReject,
  onRestore,
}: {
  filteredOpportunities: Opportunity[];
  selectedOpportunity: Opportunity | null;
  query: string;
  statusFilter: "all" | OpportunityStatus;
  processingId: string | null;
  reviewNote: string;
  setQuery: (value: string) => void;
  setStatusFilter: (value: "all" | OpportunityStatus) => void;
  setSelectedId: (id: string) => void;
  setReviewNote: (note: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <SectionHeader icon={ListChecks} title="Opportunity Pipeline" subtitle="Search, filter, and move from ingestion to CRM push" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, buyer, source"
                className="h-9 w-full rounded-md border border-white/10 bg-[#0B111B] pl-9 pr-3 text-[12px] text-white outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-300/40 sm:w-64"
              />
            </label>
            <label className="relative block">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | OpportunityStatus)}
                className="h-9 w-full rounded-md border border-white/10 bg-[#0B111B] pl-9 pr-8 text-[12px] text-white outline-none transition-colors focus:border-cyan-300/40 sm:w-48"
              >
                <option value="all">All statuses</option>
                {statusOrder.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="grid gap-3 overflow-x-auto pb-2 lg:grid-cols-3 2xl:grid-cols-6">
          {pipelineColumns.map((status) => {
            const columnItems = filteredOpportunities.filter((opportunity) => opportunity.status === status);
            return (
              <div key={status} className="min-w-[230px] rounded-lg border border-white/[0.07] bg-[#0D1420] p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[11px] font-semibold text-slate-300">{statusLabels[status]}</p>
                  <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-400">
                    {columnItems.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {columnItems.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-white/[0.08] text-[11px] text-slate-600">
                      No items
                    </div>
                  ) : (
                    columnItems.map((opportunity) => (
                      <OpportunityCard
                        key={opportunity.id}
                        opportunity={opportunity}
                        selected={selectedOpportunity?.id === opportunity.id}
                        onClick={() => setSelectedId(opportunity.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border border-white/[0.07] bg-[#0D1420] p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold text-slate-300">Rejected and Failed</p>
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-400">
              {filteredOpportunities.filter((opportunity) => ["rejected", "push_failed"].includes(opportunity.status)).length}
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {filteredOpportunities
              .filter((opportunity) => ["rejected", "push_failed"].includes(opportunity.status))
              .map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  selected={selectedOpportunity?.id === opportunity.id}
                  onClick={() => setSelectedId(opportunity.id)}
                  compact
                />
              ))}
          </div>
        </div>
      </section>

      {selectedOpportunity ? (
        <OpportunityDetailPanel
          opportunity={selectedOpportunity}
          processingId={processingId}
          reviewNote={reviewNote}
          setReviewNote={setReviewNote}
          onApprove={onApprove}
          onReject={onReject}
          onRestore={onRestore}
        />
      ) : (
        <EmptyDetailPanel />
      )}
    </div>
  );
}

function OpportunityCard({
  opportunity,
  selected,
  onClick,
  compact = false,
}: {
  opportunity: Opportunity;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const deadlineDays = daysUntil(opportunity.deadline);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-md border p-3 text-left transition-colors ${
        selected
          ? "border-cyan-300/35 bg-cyan-300/10"
          : "border-white/[0.07] bg-white/[0.035] hover:border-white/15 hover:bg-white/[0.055]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-[12px] font-semibold leading-5 text-white">{opportunity.title}</p>
          <p className="mt-1 truncate text-[10px] text-slate-500">{opportunity.buyer}</p>
        </div>
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <OpportunityStatusBadge status={opportunity.status} />
        {!compact && (
          <IconBadge className="border-white/10 bg-white/[0.04] text-slate-300">
            {opportunity.qualificationScore ? `${opportunity.qualificationScore}%` : "No score"}
          </IconBadge>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
        <span className="truncate">{formatCurrency(opportunity.value, opportunity.currency)}</span>
        <span className={`text-right ${deadlineDays !== null && deadlineDays <= 14 ? "text-amber-200" : ""}`}>
          {deadlineDays === null ? "" : `${deadlineDays} days left`}
        </span>
      </div>
    </button>
  );
}

function EmptyDetailPanel() {
  return (
    <aside className="rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] p-8 text-center">
      <FileText className="mx-auto h-8 w-8 text-slate-600" />
      <p className="mt-3 text-[13px] font-semibold text-white">No opportunity selected</p>
      <p className="mt-1 text-[12px] leading-5 text-slate-500">
        The local API returned no opportunities. Run a UNGM scan or add data in Laravel to populate this workflow.
      </p>
    </aside>
  );
}

function OpportunityDetailPanel({
  opportunity,
  processingId,
  reviewNote,
  setReviewNote,
  onApprove,
  onReject,
  onRestore,
}: {
  opportunity: Opportunity;
  processingId: string | null;
  reviewNote: string;
  setReviewNote: (note: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const isProcessing = processingId === opportunity.id;
  const canApprove = opportunity.status === "qualified" || opportunity.status === "needs_review";
  const canRestore = opportunity.status === "rejected";

  return (
    <aside className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <OpportunityStatusBadge status={opportunity.status} />
          <h3 className="mt-3 text-[18px] font-semibold leading-7 text-white">{opportunity.title}</h3>
          <p className="mt-1 text-[12px] text-slate-400">
            {opportunity.buyer} | {opportunity.source}
          </p>
        </div>
        {opportunity.sourceUrl && (
          <a
            href={opportunity.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]"
            aria-label="Open source"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Value", value: formatCurrency(opportunity.value, opportunity.currency) },
          { label: "Deadline", value: formatDaysUntil(opportunity.deadline) },
          { label: "Country", value: opportunity.country },
          { label: "Competition", value: opportunity.competitorReadiness, className: competitionClass(opportunity.competitorReadiness) },
        ].map((item) => (
          <div key={item.label} className="rounded-md border border-white/[0.07] bg-[#0D1420] px-3 py-2">
            <p className="text-[10px] uppercase text-slate-500">{item.label}</p>
            <p className={`mt-1 truncate text-[12px] font-semibold text-white ${item.className ?? ""}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-md border border-white/[0.07] bg-[#0D1420] p-3">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
          <p className="text-[11px] font-semibold uppercase text-slate-400">AI Assessment</p>
        </div>
        <p className="text-[13px] leading-6 text-slate-300">{opportunity.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <IconBadge className="border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
            Score {opportunity.qualificationScore || "Pending"}
            {opportunity.qualificationScore ? "%" : ""}
          </IconBadge>
          <IconBadge className="border-violet-300/25 bg-violet-300/10 text-violet-100">
            Confidence {opportunity.confidence || "Pending"}
            {opportunity.confidence ? "%" : ""}
          </IconBadge>
          <IconBadge className="border-white/10 bg-white/[0.04] text-slate-300">{opportunity.recommendation}</IconBadge>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {opportunity.criteria.length > 0 ? (
          opportunity.criteria.map((criterion) => (
            <div key={criterion.name} className="rounded-md border border-white/[0.07] bg-[#0D1420] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold text-white">{criterion.name}</p>
                <span className="text-[12px] font-semibold text-cyan-100">{criterion.score}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full bg-cyan-300" style={{ width: `${criterion.score}%` }} />
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-400">{criterion.note}</p>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-white/[0.1] p-4 text-center text-[12px] text-slate-500">
            Criterion-level scoring is empty in the API response.
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <InfoList title="Missing Info" icon={NotebookPen} items={opportunity.missing} empty="No missing fields" tone="text-amber-200" />
        <InfoList title="Risks" icon={AlertTriangle} items={opportunity.risks} empty="No risk flags" tone="text-rose-200" />
      </div>

      <label className="mt-4 block">
        <span className="text-[11px] font-semibold uppercase text-slate-500">Review note or rejection reason</span>
        <textarea
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-md border border-white/10 bg-[#0B111B] px-3 py-2 text-[12px] leading-5 text-white outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-300/40"
        />
      </label>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {canApprove && (
          <>
            <button
              type="button"
              onClick={() => onApprove(opportunity.id)}
              disabled={isProcessing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-300 px-3 text-[12px] font-semibold text-[#062818] hover:bg-emerald-200"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Validate
            </button>
            <button
              type="button"
              onClick={() => onReject(opportunity.id)}
              disabled={isProcessing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-rose-300/25 bg-rose-300/10 px-3 text-[12px] font-semibold text-rose-100 hover:bg-rose-300/15"
            >
              <X className="h-4 w-4" />
              Reject
            </button>
          </>
        )}
        {canRestore && (
          <button
            type="button"
            onClick={() => onRestore(opportunity.id)}
            disabled={isProcessing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 text-[12px] font-semibold text-amber-100 hover:bg-amber-300/15"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Restore for Review
          </button>
        )}
      </div>
    </aside>
  );
}

function InfoList({
  title,
  icon: Icon,
  items,
  empty,
  tone,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
  empty: string;
  tone: string;
}) {
  return (
    <div className="rounded-md border border-white/[0.07] bg-[#0D1420] p-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${tone}`} />
        <p className="text-[11px] font-semibold uppercase text-slate-400">{title}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-slate-500">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item} className="text-[11px] leading-5 text-slate-400">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SourcesView({
  sources,
  scanning,
  onScan,
}: {
  sources: SourceConnector[];
  scanning: boolean;
  onScan: () => void;
}) {
  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader icon={Radar} title="Tender Source Integrations" subtitle="Source records returned by the local Laravel API" />
          <button
            type="button"
            onClick={onScan}
            disabled={scanning}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-cyan-300 px-3 text-[12px] font-semibold text-[#06202A] hover:bg-cyan-200 disabled:opacity-60"
          >
            {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radar className="h-3.5 w-3.5" />}
            Scan Connected Sources
          </button>
        </div>
        {sources.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sources.map((source) => (
              <div key={source.id} className="rounded-lg border border-white/[0.07] bg-[#0D1420] p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-white">{source.name}</p>
                    <p className="mt-1 text-[10px] uppercase text-slate-500">{source.type}</p>
                  </div>
                  <IconBadge className={sourceStatusClass(source.status)}>{source.status.replace("_", " ")}</IconBadge>
                </div>
                <div className="space-y-2 text-[11px] text-slate-400">
                  <p className="flex items-center gap-2">
                    <LockKeyhole className="h-3.5 w-3.5 text-slate-600" />
                    {source.auth}
                  </p>
                  <p className="flex items-center gap-2">
                    <Timer className="h-3.5 w-3.5 text-slate-600" />
                    {source.cadence}
                  </p>
                  <p className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-slate-600" />
                    Last scan: {source.lastScan}
                  </p>
                  <p className="flex items-center gap-2">
                    <FileCheck2 className="h-3.5 w-3.5 text-slate-600" />
                    {source.found} opportunities found
                  </p>
                </div>
                {source.error && (
                  <p className="mt-3 rounded-md border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-[11px] leading-5 text-rose-100">
                    {source.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/[0.1] p-10 text-center">
            <Radar className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-[13px] font-semibold text-white">No sources returned</p>
            <p className="mt-1 text-[12px] text-slate-500">The local API returned an empty source list.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function ReviewView({
  opportunities,
  processingId,
  reviewNote,
  setSelectedId,
  setActiveView,
  setReviewNote,
  onApprove,
  onReject,
}: {
  opportunities: Opportunity[];
  processingId: string | null;
  reviewNote: string;
  setSelectedId: (id: string) => void;
  setActiveView: (view: "overview" | "pipeline" | "sources" | "review" | "salesforce" | "audit") => void;
  setReviewNote: (note: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const reviewItems = opportunities.filter((opportunity) => ["qualified", "needs_review"].includes(opportunity.status));

  return (
    <section className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader icon={ClipboardCheck} title="Human Validation Queue" subtitle="Approve, reject, or inspect opportunities before Salesforce" />
        <IconBadge className="border-amber-300/25 bg-amber-300/10 text-amber-100">{reviewItems.length} waiting</IconBadge>
      </div>
      <label className="mb-4 block">
        <span className="text-[11px] font-semibold uppercase text-slate-500">Reusable review note</span>
        <textarea
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
          rows={2}
          className="mt-2 w-full resize-none rounded-md border border-white/10 bg-[#0B111B] px-3 py-2 text-[12px] text-white outline-none focus:border-cyan-300/40"
        />
      </label>
      <div className="grid gap-3 xl:grid-cols-2">
        {reviewItems.map((opportunity) => (
          <div key={opportunity.id} className="rounded-lg border border-white/[0.07] bg-[#0D1420] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <OpportunityStatusBadge status={opportunity.status} />
                <p className="mt-3 text-[14px] font-semibold text-white">{opportunity.title}</p>
                <p className="mt-1 text-[12px] text-slate-500">
                  {opportunity.buyer} | {formatCurrency(opportunity.value, opportunity.currency)}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[22px] font-bold text-cyan-100">{opportunity.qualificationScore}%</p>
                <p className="text-[10px] uppercase text-slate-500">AI fit score</p>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-6 text-slate-400">{opportunity.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onApprove(opportunity.id)}
                disabled={processingId === opportunity.id}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-300 px-3 text-[12px] font-semibold text-[#062818] hover:bg-emerald-200 disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" />
                Validate
              </button>
              <button
                type="button"
                onClick={() => onReject(opportunity.id)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-300/25 bg-rose-300/10 px-3 text-[12px] font-semibold text-rose-100 hover:bg-rose-300/15"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(opportunity.id);
                  setActiveView("pipeline");
                }}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-white/12 px-3 text-[12px] font-semibold text-slate-200 hover:bg-white/[0.05]"
              >
                <Eye className="h-3.5 w-3.5" />
                Inspect
              </button>
            </div>
          </div>
        ))}
      </div>
      {reviewItems.length === 0 && (
        <div className="rounded-lg border border-dashed border-white/[0.1] p-10 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-200" />
          <p className="mt-3 text-[13px] font-semibold text-white">Review queue is clear</p>
          <p className="mt-1 text-[12px] text-slate-500">Run a scan or add data in Laravel to continue the flow.</p>
        </div>
      )}
    </section>
  );
}

function SalesforceView({
  opportunities,
  selectedOpportunity,
  setSelectedId,
}: {
  opportunities: Opportunity[];
  selectedOpportunity: Opportunity | null;
  setSelectedId: (id: string) => void;
}) {
  const salesforceItems = opportunities.filter((opportunity) =>
    ["validated", "ready_salesforce", "push_failed", "pushed"].includes(opportunity.status),
  );
  const activeOpportunity =
    selectedOpportunity && salesforceItems.some((opportunity) => opportunity.id === selectedOpportunity.id)
      ? selectedOpportunity
      : salesforceItems[0] ?? null;

  if (!activeOpportunity) {
    return (
      <section className="rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] p-10 text-center">
        <CloudUpload className="mx-auto h-8 w-8 text-slate-600" />
        <p className="mt-3 text-[13px] font-semibold text-white">No Salesforce-ready opportunities</p>
        <p className="mt-1 text-[12px] text-slate-500">
          The local API returned no validated or pushed opportunities.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <section className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
        <SectionHeader icon={CloudUpload} title="Salesforce Push Queue" subtitle="Validated opportunities and sync results" />
        <div className="mt-4 space-y-2">
          {salesforceItems.map((opportunity) => (
            <button
              key={opportunity.id}
              type="button"
              onClick={() => setSelectedId(opportunity.id)}
              className={`w-full rounded-md border p-3 text-left transition-colors ${
                activeOpportunity.id === opportunity.id
                  ? "border-violet-300/35 bg-violet-300/10"
                  : "border-white/[0.07] bg-[#0D1420] hover:bg-white/[0.05]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-white">{opportunity.title}</p>
                  <p className="mt-1 truncate text-[10px] text-slate-500">{opportunity.buyer}</p>
                </div>
                <OpportunityStatusBadge status={opportunity.status} />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader icon={FileCheck2} title="Salesforce Fields" subtitle="Mapped fields and CRM sync status returned by the API" />
          {activeOpportunity.salesforceId && (
            <IconBadge className="border-emerald-300/25 bg-emerald-300/10 text-emerald-100">
              {activeOpportunity.salesforceId}
            </IconBadge>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { label: "Opportunity Name", value: activeOpportunity.title },
            { label: "Account / Buyer", value: activeOpportunity.buyer },
            { label: "Close Date", value: activeOpportunity.deadline },
            { label: "Amount", value: formatCurrency(activeOpportunity.value, activeOpportunity.currency) },
            { label: "Source Portal", value: activeOpportunity.source },
            { label: "Qualification Score", value: `${activeOpportunity.qualificationScore || 0}%` },
            { label: "AI Recommendation", value: activeOpportunity.recommendation },
            { label: "Reviewer", value: activeOpportunity.reviewer ?? "Not reviewed" },
          ].map((field) => (
            <div key={field.label} className="rounded-md border border-white/[0.07] bg-[#0D1420] px-3 py-2">
              <p className="text-[10px] uppercase text-slate-500">{field.label}</p>
              <p className="mt-1 truncate text-[12px] font-semibold text-white">{field.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-md border border-white/[0.07] bg-[#0D1420] p-3">
          <p className="text-[11px] font-semibold uppercase text-slate-500">AI Summary</p>
          <p className="mt-2 text-[12px] leading-6 text-slate-300">{activeOpportunity.summary}</p>
        </div>
        {activeOpportunity.salesforceError && (
          <div className="mt-4 rounded-md border border-rose-300/25 bg-rose-300/10 p-3 text-[12px] leading-6 text-rose-100">
            {activeOpportunity.salesforceError}
          </div>
        )}
        {activeOpportunity.salesforceId && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-300/25 bg-emerald-300/10 p-3 text-[12px] text-emerald-100">
            <Link2 className="h-4 w-4" />
            Salesforce Opportunity created: {activeOpportunity.salesforceId}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {activeOpportunity.status !== "pushed" && (
            <IconBadge className="border-amber-300/25 bg-amber-300/10 text-amber-100">
              Waiting for Salesforce status from API
            </IconBadge>
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyActivityState() {
  return (
    <div className="rounded-lg border border-dashed border-white/[0.1] p-6 text-center">
      <Activity className="mx-auto h-7 w-7 text-slate-600" />
      <p className="mt-3 text-[13px] font-semibold text-white">No activity logs returned</p>
      <p className="mt-1 text-[12px] text-slate-500">The local API returned an empty activity log list.</p>
    </div>
  );
}

function AuditRow({ item }: { item: AuditItem }) {
  const toneClass: Record<AuditTone, string> = {
    info: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    success: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    warning: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    danger: "border-rose-300/25 bg-rose-300/10 text-rose-100",
  };
  return (
    <div className="grid gap-3 rounded-lg border border-white/[0.07] bg-[#0D1420] p-3 sm:grid-cols-[120px_1fr_auto] sm:items-center">
      <div className="text-[11px] text-slate-500">{item.time}</div>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-white">{item.action}</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-400">{item.detail}</p>
      </div>
      <IconBadge className={toneClass[item.tone]}>{item.actor}</IconBadge>
    </div>
  );
}
