import { Fragment, useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useLocation, useParams } from "wouter";
import GlobalLayout from "@/components/GlobalLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RootState } from "@/store/index";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAvatarAgents } from "@/store/slices/avatarSlice";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Send,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  X,
  Zap,
  BarChart3,
  Shield,
  BookOpen,
  ListChecks,
  Activity,
  Globe,
  Lock,
  Sparkles,
  LayoutDashboard,
  Building2,
  Loader2,
  Radar,
  CloudUpload,
  ClipboardCheck,
  Columns3,
  Menu,
  Archive,
  History,
  Gavel,
} from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteRfpPack,
  groupRfpListItemsByPack,
  mapRfpFileToListItem,
  retryRfpIngest,
  uploadKnowledgeBaseFile,
  uploadRfpFilesToPack,
  evaluateUploadedRfpFiles,
  triggerAnswerByAiForEvaluatedFiles,
  type IDGKnowledgeBaseFile,
  type IDGRfpListItem,
  type IDGRfpPackGroup,
} from "@/lib/IDGApi";
import {
  fetchIdgRfpFiles,
  hasPendingPackByIdSync,
  IDG_RFP_FILES_POLL_INTERVAL_MS,
  IDG_RFP_PACK_POLL_INTERVAL_MS,
  isIdgRfpThunkSkipped,
  removeIdgRfpPackFromCache,
  rfpFilesNeedEvaluationPoll,
  syncEvaluatedRfpFilesAndPacks,
} from "@/store/slices/idgRfpSlice";
import {
  fetchIdgKnowledgeBaseFiles,
  IDG_KB_FILES_POLL_INTERVAL_MS,
  kbFilesNeedEvaluationPoll,
} from "@/store/slices/idgKnowledgeBaseSlice";
import RFPDetailView from "./RFPDetailView";
import { RfpPackStatusBadge } from "./RfpPackStatusBadge";
import { clearRfpWorkflowState } from "@/lib/rfpWorkflowStorage";
import PortfolioOverviewView from "./PortfolioOverviewView";
import AIInsightsView from "./AIInsightsView";
import SectionAssignmentView from "./SectionAssignmentView";

import { deleteQuestionAssignments, getQuestionAssignmentsDashboard, type QuestionAssignmentDashboardMember } from "@/lib/TeamApi";
import {
  fetchQuestionAssignments,
  getAssignedPackIdsForEmail,
  removeQuestionAssignmentsByPackId,
} from "@/store/slices/questionAssignmentsSlice";
import { fetchTeamMembers } from "@/store/slices/teamSlice";

import SalesIntelDashboard from "./sales-intelligence/SalesIntelDashboard";
import { SalesIntelPipelineWorkspace } from "./sales-intelligence/OpportunityListView";
import OpportunityIngestionView from "./sales-intelligence/OpportunityIngestionView";
import OpportunityReviewQueue from "./sales-intelligence/OpportunityReviewQueue";
import SalesforcePushLogView from "./sales-intelligence/SalesforcePushLogView";
import OpportunityArchiveView from "./sales-intelligence/OpportunityArchiveView";
import ActivityLogsView from "./sales-intelligence/ActivityLogsView";
import ScanHistoryView from "./sales-intelligence/ScanHistoryView";
import DecisionHistoryView from "./sales-intelligence/DecisionHistoryView";
import OpportunityDetailView from "./sales-intelligence/OpportunityDetailView";
import { SalesIntelProvider, useSalesIntelContext } from "./sales-intelligence/SalesIntelContext";
import { buildSalesIntelOutcomes } from "./sales-intelligence/useIdgSalesIntel";
import { OutcomesStrip, type Outcome } from "./sales-intelligence/OutcomesStrip";
import { SalesIntelNotificationProvider } from "./sales-intelligence/notifications/NotificationProvider";
import { NotificationBell } from "./sales-intelligence/notifications/NotificationBell";
import { NotificationHistoryView } from "./sales-intelligence/notifications/NotificationHistoryView";
import SalesIntelOverviewSkeleton from "./sales-intelligence/SalesIntelOverviewSkeleton";
import StudioWorkerChatPanel from "./StudioWorkerChatPanel";

import {
  STUDIO_SECTIONS,
  agentToStudioWorker,
  getStudioWorkerKey,
  isEssentialLivingWorker,
  isPreSalesWriterWorker,
  isSalesIntelligenceWorker,
  isStudioCockpitWorker,
  resolveStudioWorkerById,
  type StudioDashboardWorker,
} from "./studioSections";

interface UseCase {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: "active" | "available" | "coming_soon";
  tag?: string;
  /** Temporarily hide from sidebar navigation without removing the use case */
  hidden?: boolean;
}

interface WorkerCardMetric {
  value: string;
  label: string;
}

interface WorkerSummary {
  cardMetrics: WorkerCardMetric[];
  useCases: UseCase[];
  /** Show metric tiles at the bottom of the worker sidebar (default: true) */
  showSidebarMetrics?: boolean;
}

const WORKER_DATA: Record<string, WorkerSummary> = {
  sales: {
    cardMetrics: [
      { value: "2", label: "Active Bids" },
      { value: "68%", label: "Avg Readiness" },
      { value: "12.4 MB", label: "Data volume" },
      { value: "8 days", label: "Next Bid" },
    ],
    useCases: [
      // {
      //   id: "exec0",
      //   title: "Business Overview",
      //   description: "Leadership snapshot – outcomes, risks, and priorities",
      //   icon: LayoutDashboard,
      //   status: "active",
      //   tag: "OVERVIEW",
      // },
      // {
      //   id: "exec1",
      //   title: "AI Insights",
      //   description: "Trends, risks, recommendations, and suggested actions",
      //   icon: Sparkles,
      //   status: "active",
      //   tag: "INSIGHTS",
      // },
      {
        id: "uc1",
        title: "AI Response Generation",
        description: "Generate section-by-section RFP responses from knowledge base",
        icon: FileText,
        status: "active",
        tag: "DOCUMENT",
      },
      {
        id: "uc2",
        title: "Knowledge Base",
        description: "Manage and search your response library",
        icon: BookOpen,
        status: "active",
        tag: "MONITOR",
      },
      {
        id: "uc3",
        title: "Section Assignment",
        description: "Assign and track section ownership across team",
        icon: ListChecks,
        status: "active",
        tag: "LIST",
      },
      {
        id: "uc4",
        title: "Compliance Checker",
        description: "Validate responses against compliance requirements",
        icon: Shield,
        status: "coming_soon",
      },
      {
        id: "uc5",
        title: "Win/Loss Analysis",
        description: "Track outcomes and improve future responses",
        icon: BarChart3,
        status: "coming_soon",
      },
      {
        id: "uc6",
        title: "Teams Integration",
        description: "Notifications and collaboration via Microsoft Teams",
        icon: Globe,
        status: "coming_soon",
      },
    ],
  },
  sales_intelligence: {
    showSidebarMetrics: false,
    cardMetrics: [
      { value: "4", label: "New Found" },
      { value: "6", label: "Qualified" },
      { value: "2", label: "Awaiting Review" },
      { value: "£18.2M", label: "Pipeline Value" },
    ],
    useCases: [
      {
        id: "si0",
        title: "Overview",
        description: "Opportunity intelligence KPIs and recent activity",
        icon: LayoutDashboard,
        status: "active",
        tag: "DASHBOARD",
      },
      {
        id: "si1",
        title: "Opportunity Pipeline",
        description: "Track opportunities from ingestion through Salesforce push",
        icon: Columns3,
        status: "active",
        tag: "PIPELINE",
      },
      {
        id: "si2",
        title: "Ingestion",
        description: "Portal scans, sources, and manual opportunity upload",
        icon: Radar,
        status: "active",
        tag: "SOURCES",
      },
      {
        id: "si3",
        title: "Review Queue",
        description: "Human validation before Salesforce push",
        icon: ClipboardCheck,
        status: "active",
        tag: "REVIEW",
        hidden: true,
      },
      {
        id: "si4",
        title: "Salesforce Push Log",
        description: "Push status, errors, and audit history",
        icon: CloudUpload,
        status: "active",
        tag: "LOG",
      },
      {
        id: "si5",
        title: "Archive",
        description: "Archived opportunities and restore actions",
        icon: Archive,
        status: "active",
        tag: "ARCHIVE",
      },
      {
        id: "si6",
        title: "Activity Logs",
        description: "Chronological opportunity actions and status changes",
        icon: History,
        status: "active",
        tag: "AUDIT",
      },
      {
        id: "si7",
        title: "History Scan",
        description: "Historical UNGM/TED scan activity, status, and execution logs",
        icon: Radar,
        status: "active",
        tag: "SCANS",
      },
      {
        id: "si8",
        title: "Decision History",
        description: "Approval, rejection, and override audit trail",
        icon: Gavel,
        status: "active",
        tag: "AUDIT",
      },
    ],
  },
  finance: {
    cardMetrics: [
      { value: "2", label: "Active Bids" },
      { value: "68%", label: "Avg Readiness" },
      { value: "12.4 MB", label: "Data volume" },
      { value: "8 days", label: "Next Bid" },
    ],
    useCases: [
      {
        id: "uc1",
        title: "Financial Dashboard",
        description: "Portfolio KPIs, property performance, and vendor spend analysis",
        icon: BarChart3,
        status: "active",
        tag: "ANALYTICS",
      },
      {
        id: "uc2",
        title: "Finance Knowledge Base",
        description: "Uploaded financial workbooks and indexed portfolio data",
        icon: BookOpen,
        status: "active",
        tag: "DATA",
      },
      {
        id: "uc3",
        title: "Risk Review",
        description: "Property-level risk, outstanding balances, and margin review",
        icon: Shield,
        status: "available",
      },
    ],
  },
  research: {
    cardMetrics: [
      { value: "0", label: "Active Bids" },
      { value: "—", label: "Avg Readiness" },
      { value: "0.2 MB", label: "Data volume" },
      { value: "—", label: "Next Bid" },
    ],
    useCases: [
      {
        id: "uc1",
        title: "Market Research",
        description: "Competitors, pricing, positioning on demand",
        icon: Target,
        status: "active",
        tag: "RESEARCH",
      },
      {
        id: "uc2",
        title: "Source Monitoring",
        description: "Track sources for changes and new publications",
        icon: Activity,
        status: "active",
        tag: "MONITOR",
      },
      {
        id: "uc3",
        title: "Report Generation",
        description: "Formatted reports with citations and data tables",
        icon: FileText,
        status: "active",
        tag: "REPORT",
      },
      {
        id: "uc4",
        title: "Trend Analysis",
        description: "Emerging trends across monitored sources",
        icon: TrendingUp,
        status: "available",
      },
      {
        id: "uc5",
        title: "Regulatory Tracking",
        description: "Monitor regulatory changes for your industry",
        icon: Shield,
        status: "coming_soon",
      },
    ],
  },
};

function StudioWorkerCardSkeleton() {
  return (
    <div
      className="w-full rounded-2xl border border-white/[0.06] overflow-hidden"
      style={{
        background: "linear-gradient(165deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.005) 100%)",
      }}
    >
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3.5">
            <Skeleton className="h-11 w-11 rounded-xl bg-white/[0.06]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-44 bg-white/[0.06]" />
              <Skeleton className="h-3 w-28 bg-white/[0.04]" />
            </div>
          </div>
          <Skeleton className="h-5 w-16 rounded-full bg-white/[0.04]" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-lg bg-white/[0.04]" />
          ))}
        </div>
      </div>
      <div className="border-t border-white/[0.04] px-6 py-3.5 flex items-center justify-between">
        <Skeleton className="h-3 w-28 bg-white/[0.04]" />
        <Skeleton className="h-3 w-20 bg-white/[0.04]" />
      </div>
    </div>
  );
}

function StudioLandingSkeleton() {
  return (
    <div className="space-y-10">
      {["IDG Security", "Sales Intelligence", "Essential Living"].map((section) => (
        <section key={section}>
          <div className="mb-5 space-y-2">
            <Skeleton className="h-4 w-32 bg-white/[0.06]" />
            <Skeleton className="h-3 w-64 max-w-full bg-white/[0.04]" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <StudioWorkerCardSkeleton />
          </div>
        </section>
      ))}
    </div>
  );
}

function StudioWorkerCard({
  worker,
  variant,
  onClick,
}: {
  worker: StudioDashboardWorker;
  variant: "idg" | "sales_intelligence" | "essential_living";
  onClick: () => void;
}) {
  const summary = WORKER_DATA[getStudioWorkerKey(worker)] || WORKER_DATA.sales;
  const isEssentialLiving = variant === "essential_living";
  const isSalesIntel = variant === "sales_intelligence";
  const activeUseCases = summary.useCases.filter((uc) => uc.status === "active").length;

  const iconStyle = isEssentialLiving
    ? { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.15)" }
    : isSalesIntel
    ? { bg: "rgba(6,182,212,0.08)", border: "rgba(6,182,212,0.15)" }
    : { bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.15)" };

  const subtitle = isEssentialLiving
    ? "Property finance & portfolio analysis"
    : isSalesIntel
    ? "Opportunity intelligence & Salesforce push"
    : "Pre-sales & RFP responses";

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl border border-white/[0.06] hover:border-indigo-500/[0.3] hover:shadow-[0_0_60px_-15px_rgba(99,102,241,0.12)] transition-all duration-300 overflow-hidden"
      style={{
        background: "linear-gradient(165deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.005) 100%)",
      }}
    >
      <div className="px-6 pt-6 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: iconStyle.bg,
                border: `1px solid ${iconStyle.border}`,
              }}
            >
              {isEssentialLiving ? (
                <Building2 className="w-5 h-5 text-emerald-400" />
              ) : isSalesIntel ? (
                <Radar className="w-5 h-5 text-cyan-400" />
              ) : (
                <MessageSquare className="w-5 h-5 text-indigo-400" />
              )}
            </div>
            <div>
              <h3
                className="text-[15px] font-semibold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {worker.name || "Untitled Worker"}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {worker.professionalTitle || subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[9px] text-emerald-400/80 bg-emerald-400/[0.08] px-2.5 py-[3px] rounded-full font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
            <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {summary.cardMetrics.map((metric) => (
            <div
              key={metric.label}
              className="px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
            >
              <p
                className="text-[17px] font-bold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {metric.value}
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/[0.04] px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-indigo-400/60" />
          <span className="text-[10px] text-slate-500">{activeUseCases} active use cases</span>
        </div>
        <span className="text-[10px] text-slate-600">Last active 2h ago</span>
      </div>
    </button>
  );
}

export default function StudioDashboard() {
  const [, setLocation] = useLocation();
  const params = useParams<{ workerId?: string }>();
  const dispatch = useAppDispatch();
  const { agents, loading, agentsLoaded } = useAppSelector((state) => state.avatar);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | number | null>(null);
  const isLoadingAgents = !agentsLoaded || (loading.agents && agents.length === 0);

  useEffect(() => {
    void dispatch(fetchAvatarAgents());
  }, [dispatch]);

  const studioWorkers: StudioDashboardWorker[] = useMemo(() => {
    return (agents ?? [])
      .filter((agent: any) => Boolean(agent?.studio_linked))
      .map((agent: any) => agentToStudioWorker(agent));
  }, [agents]);

  const preSalesWriterWorkers = useMemo(
    () => studioWorkers.filter(isPreSalesWriterWorker),
    [studioWorkers]
  );

  const salesIntelligenceWorkers = useMemo(
    () => studioWorkers.filter(isSalesIntelligenceWorker),
    [studioWorkers]
  );

  const essentialLivingWorkers = useMemo(
    () => studioWorkers.filter(isEssentialLivingWorker),
    [studioWorkers]
  );

  useEffect(() => {
    if (!params.workerId || isLoadingAgents) {
      if (!params.workerId) {
        setSelectedWorkerId(null);
      }
      return;
    }

    const worker = resolveStudioWorkerById(params.workerId, studioWorkers);
    if (!worker) return;

    if (isEssentialLivingWorker(worker)) {
      setLocation(`/app/studio/${worker.id}/user-dashboard`);
      return;
    }

    setSelectedWorkerId(worker.id);
  }, [params.workerId, studioWorkers, setLocation, isLoadingAgents]);

  const selectedWorker = selectedWorkerId
    ? resolveStudioWorkerById(selectedWorkerId, studioWorkers)
    : null;

  if (isLoadingAgents) {
    return (
      <GlobalLayout activeSection="studio">
        <div className="flex-1 flex min-h-screen flex-col overflow-y-auto bg-[#050810]">
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-12 py-6 sm:py-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-10">
              <div className="space-y-2">
                <Skeleton className="h-8 w-28 bg-white/[0.06]" />
                <Skeleton className="h-4 w-72 max-w-full bg-white/[0.04]" />
              </div>
              <Skeleton className="h-10 w-36 rounded-xl bg-white/[0.06]" />
            </div>
            <StudioLandingSkeleton />
          </div>
        </div>
      </GlobalLayout>
    );
  }

  if (selectedWorker && isStudioCockpitWorker(selectedWorker)) {
    return (
      <WorkerCockpit
        worker={selectedWorker}
        onBack={() => {
          setSelectedWorkerId(null);
          setLocation("/app/studio");
        }}
      />
    );
  }

  const idgSection = STUDIO_SECTIONS.find((section) => section.id === "idg")!;
  const salesIntelligenceSection = STUDIO_SECTIONS.find((section) => section.id === "sales_intelligence")!;
  const essentialLivingSection = STUDIO_SECTIONS.find((section) => section.id === "essential_living")!;

  return (
    <GlobalLayout activeSection="studio">
      <div className="flex-1 flex min-h-screen flex-col overflow-y-auto bg-[#050810]">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-12 py-6 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-10">
            <div>
              <h1
                className="text-2xl font-bold text-white tracking-[-0.02em]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Studio
              </h1>
              <p className="text-[13px] text-slate-500 mt-1">
                Your deployed workers, ready to manage and use
              </p>
            </div>
            <button
              onClick={() => setLocation("/app/workers")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-[13px] font-semibold hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/15"
            >
              <Plus className="w-4 h-4" />
              Deploy Worker
            </button>
          </div>

          <div className="space-y-10">
            {preSalesWriterWorkers.length > 0 ? (
            <section>
              <div className="mb-5">
                <h2
                  className="text-[15px] font-semibold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {idgSection.title}
                </h2>
                <p className="mt-1 text-[12px] text-slate-500">{idgSection.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {preSalesWriterWorkers.map((worker) => (
                  <StudioWorkerCard
                    key={worker.id}
                    worker={worker}
                    variant="idg"
                    onClick={() => setLocation(`/app/studio/${worker.id}`)}
                  />
                ))}
              </div>
            </section>
            ) : null}

            {salesIntelligenceWorkers.length > 0 ? (
            <section>
              <div className="mb-5">
                <h2
                  className="text-[15px] font-semibold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {salesIntelligenceSection.title}
                </h2>
                <p className="mt-1 text-[12px] text-slate-500">{salesIntelligenceSection.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {salesIntelligenceWorkers.map((worker) => (
                  <StudioWorkerCard
                    key={worker.id}
                    worker={worker}
                    variant="sales_intelligence"
                    onClick={() => setLocation(`/app/studio/${worker.id}`)}
                  />
                ))}
              </div>
            </section>
            ) : null}

            {essentialLivingWorkers.length > 0 ? (
            <section>
              <div className="mb-5">
                <h2
                  className="text-[15px] font-semibold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {essentialLivingSection.title}
                </h2>
                <p className="mt-1 text-[12px] text-slate-500">{essentialLivingSection.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {essentialLivingWorkers.map((worker) => (
                  <StudioWorkerCard
                    key={worker.id}
                    worker={worker}
                    variant="essential_living"
                    onClick={() => setLocation(`/app/studio/${worker.id}/user-dashboard`)}
                  />
                ))}
              </div>
            </section>
            ) : null}

            {studioWorkers.length === 0 ? (
              <div
                className="flex flex-col items-center rounded-3xl border border-white/[0.06] px-6 py-20 text-center"
                style={{ background: "rgba(255,255,255,0.015)" }}
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/15 bg-indigo-500/[0.06]">
                  <Bot className="h-8 w-8 text-indigo-400/80" />
                </div>
                <h3
                  className="mb-2 text-[16px] font-semibold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  No workers deployed yet
                </h3>
                <p className="mb-7 max-w-md text-[13px] leading-relaxed text-slate-500">
                  Create a worker, publish it to Studio, and it will appear here ready for RFP responses,
                  opportunity intelligence, or finance workflows.
                </p>
                <button
                  type="button"
                  onClick={() => setLocation("/app/workers")}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-indigo-500/15 transition-all hover:bg-indigo-400"
                >
                  <Plus className="h-4 w-4" />
                  Deploy Worker
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </GlobalLayout>
  );
}

function WorkerCockpit({
  worker,
  onBack,
}: {
  worker: StudioDashboardWorker;
  onBack: () => void;
}) {
  const dispatch = useAppDispatch();
  const { agents } = useAppSelector((state) => state.avatar);
  const authUser = useAppSelector((state) => state.auth.userInfo);
  const authUserId =
    authUser?.id ??
    (typeof authUser?.user_id === "string" || typeof authUser?.user_id === "number"
      ? authUser.user_id
      : null);
  const workerKey = getStudioWorkerKey(worker);
  const summary = WORKER_DATA[workerKey] || WORKER_DATA.sales;
  const isSalesWriter = workerKey === "sales";
  const isSalesIntelWorker = workerKey === "sales_intelligence";
  const isSalesWorker = isSalesWriter || isSalesIntelWorker;
  const visibleUseCases = summary.useCases.filter((uc) => !uc.hidden);
  const overviewUseCases = visibleUseCases.filter((uc) => uc.id.startsWith("exec") || uc.id.startsWith("si0"));
  const operationalUseCases = visibleUseCases.filter((uc) => !uc.id.startsWith("exec") && !uc.id.startsWith("si0"));
  const [activeUseCase, setActiveUseCase] = useState<string | null>(() =>
    isSalesWriter ? "uc1" : isSalesIntelWorker ? "si0" : null
  );
  const [aiResponseTabFocusToken, setAiResponseTabFocusToken] = useState(0);

  const effectiveUseCaseId =
    activeUseCase ?? (isSalesWriter ? "uc1" : isSalesIntelWorker ? "si0" : null);
  const isAiResponseTabActive = isSalesWriter && effectiveUseCaseId === "uc1";

  const focusAiResponseTab = useCallback(() => {
    setAiResponseTabFocusToken((token) => token + 1);
  }, []);

  const [assignmentMembers, setAssignmentMembers] = useState<QuestionAssignmentDashboardMember[]>([]);
  const [isAssignmentDashboardLoading, setIsAssignmentDashboardLoading] = useState(false);
  const agentId = String(worker.id);

  const loadAssignmentDashboard = useCallback(async () => {
    if (!agentId.trim()) return;

    setIsAssignmentDashboardLoading(true);
    try {
      const response = await getQuestionAssignmentsDashboard(agentId);
      console.log("[question-assignments/dashboard]", response);
      setAssignmentMembers(response.data?.members ?? []);
    } catch (error) {
      console.error("[question-assignments/dashboard]", error);
    } finally {
      setIsAssignmentDashboardLoading(false);
    }
  }, [agentId]);

  const [chatOpen, setChatOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationHistoryOpen, setNotificationHistoryOpen] = useState(false);
  const isMobile = useIsMobile();
  const [selectedReviewOpportunityId, setSelectedReviewOpportunityId] = useState<string | null>(null);
  const studioAgent = useMemo(
    () =>
      (agents ?? []).find(
        (agent) =>
          String(agent.agent_unique_id ?? "") === agentId || String(agent.id ?? "") === agentId
      ),
    [agents, agentId]
  );
  const chatUserName = studioAgent?.user_name?.trim() || authUser?.user_name?.trim() || "";
  const chatEmail = studioAgent?.email?.trim() || authUser?.email?.trim() || "";

  useEffect(() => {
    if (isMobile) {
      setChatOpen(false);
    }
  }, [isMobile]);

  const closeMobileSidebar = () => setSidebarOpen(false);

  const handleOperationalUseCaseSelect = (uc: UseCase, isActive: boolean) => {
    const isLocked = uc.status === "coming_soon";
    if (isLocked) {
      toast.info(`${uc.title} – coming soon`);
      return;
    }
    setNotificationHistoryOpen(false);
    // Keep the current tab when it's already active (don't fall back to Overview).
    if (isActive) {
      if (uc.id === "uc1" && isSalesWriter) {
        focusAiResponseTab();
      }
      closeMobileSidebar();
      return;
    }
    if (uc.id === "uc3" && isSalesWorker) {
      void loadAssignmentDashboard();
    }
    if (uc.id === "uc1" && isSalesWriter) {
      setActiveUseCase(uc.id);
      focusAiResponseTab();
      closeMobileSidebar();
      return;
    }
    setActiveUseCase(uc.id);
    closeMobileSidebar();
  };

  const sidebarContent = (
    <>
      <div className="px-4 py-4">
        {isSalesWorker && overviewUseCases.length > 0 && (
          <>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-3 px-2">
              Overview
            </p>
            <div className="space-y-1 mb-4">
              {overviewUseCases.map((uc) => {
                const Icon = uc.icon;
                const isActive = activeUseCase === uc.id;
                return (
                  <button
                    key={uc.id}
                    onClick={() => {
                      setNotificationHistoryOpen(false);
                      setActiveUseCase(uc.id);
                      closeMobileSidebar();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      isActive
                        ? "bg-indigo-500/[0.12] border border-indigo-500/[0.25] text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                    <div className="flex-1 min-w-0 leading-none">
                      <span className={`text-[12px] font-medium block truncate leading-tight ${isActive ? "text-white" : ""}`}>
                        {uc.title}
                      </span>
                      {uc.tag && (
                        <span className="mt-1 block text-[9px] font-medium leading-none text-slate-600">{uc.tag}</span>
                      )}
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-3 px-2">
          Use Cases
        </p>
        <div className="space-y-1">
          {operationalUseCases.map((uc) => {
            const Icon = uc.icon;
            const isActive = activeUseCase === uc.id;
            const isLocked = uc.status === "coming_soon";

            return (
              <button
                key={uc.id}
                onClick={() => handleOperationalUseCaseSelect(uc, isActive)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  isActive
                    ? "bg-indigo-500/[0.12] border border-indigo-500/[0.25] text-white"
                    : isLocked
                    ? "text-slate-600 cursor-not-allowed opacity-50"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-indigo-400" : isLocked ? "text-slate-700" : "text-slate-500"
                  }`}
                />
                <div className="flex-1 min-w-0 leading-none">
                  <span
                    className={`text-[12px] font-medium block truncate leading-tight ${
                      isActive ? "text-white" : ""
                    }`}
                  >
                    {uc.title}
                  </span>
                  {uc.tag && !isLocked && (
                    <span className="mt-1 block text-[9px] font-medium leading-none text-slate-600">
                      {uc.tag}
                    </span>
                  )}
                </div>
                {isLocked && <Lock className="w-3 h-3 text-slate-700 shrink-0" />}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {summary.showSidebarMetrics !== false && (
        <div className="mt-auto border-t border-white/[0.04] px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            {summary.cardMetrics.map((metric) => (
              <div key={metric.label} className="px-2.5 py-2 rounded-lg bg-white/[0.02]">
                <p className="text-[14px] font-bold text-white">{metric.value}</p>
                <p className="text-[9px] text-slate-600">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const chatPanelProps = {
    agentId,
    workerName: worker.name,
    userName: chatUserName,
    email: chatEmail,
    onClose: () => setChatOpen(false),
  };

  const cockpit = (
    <div className="flex h-screen flex-col bg-[#050810]">
      {isSalesWriter ? <KnowledgeBaseFilesPoller agentId={agentId} /> : null}
      {isSalesWriter ? <IdgRfpPackSyncPoller agentId={agentId} /> : null}
      {isSalesWriter ? (
        <IdgRfpFilesTabFetcher
          agentId={agentId}
          isActive={isAiResponseTabActive}
          focusToken={aiResponseTabFocusToken}
        />
      ) : null}
      <div
        className="h-13 shrink-0 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5"
        style={{ background: "rgba(8,12,20,0.97)" }}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] text-slate-400 hover:text-white lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[12px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Studio</span>
          </button>
          <div className="hidden sm:block w-px h-5 bg-white/[0.06]" />
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.12)",
              }}
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <h2
              className="truncate max-w-[120px] sm:max-w-none text-[14px] font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {worker.name || "Untitled"}
            </h2>
            <span className="hidden sm:flex text-[9px] text-emerald-400/80 bg-emerald-400/[0.08] px-2 py-[2px] rounded font-semibold uppercase tracking-wider items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSalesIntelWorker ? (
            <NotificationBell
              onViewAll={() => setNotificationHistoryOpen(true)}
              onNavigate={(useCaseId) => {
                setNotificationHistoryOpen(false);
                setActiveUseCase(useCaseId);
                closeMobileSidebar();
              }}
            />
          ) : null}
          {isSalesWorker ? (
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                chatOpen
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06]"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div
          className="hidden lg:flex lg:w-[240px] shrink-0 border-r border-white/[0.06] flex-col overflow-y-auto"
          style={{ background: "rgba(8,12,20,0.5)" }}
        >
          {sidebarContent}
        </div>

        {sidebarOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={closeMobileSidebar}
              aria-hidden
            />
            <div
              className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col overflow-y-auto border-r border-white/[0.06] lg:hidden"
              style={{ background: "rgba(8,12,20,0.98)" }}
            >
              {sidebarContent}
            </div>
          </>
        ) : null}

        <div className="flex-1 min-w-0 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          {notificationHistoryOpen && isSalesIntelWorker ? (
            <NotificationHistoryView
              onBack={() => setNotificationHistoryOpen(false)}
              onNavigate={(useCaseId) => {
                setNotificationHistoryOpen(false);
                setActiveUseCase(useCaseId);
                closeMobileSidebar();
              }}
            />
          ) : activeUseCase || isSalesWorker ? (
            isSalesIntelWorker ? (
              <SalesIntelProvider agentId={agentId}>
                <SalesIntelWorkspace
                  useCase={
                    summary.useCases.find((uc) => uc.id === activeUseCase) ??
                    summary.useCases.find((uc) => uc.id === "si0")!
                  }
                  agentId={agentId}
                  selectedReviewOpportunityId={selectedReviewOpportunityId}
                  onSelectReviewOpportunity={setSelectedReviewOpportunityId}
                  onNavigateToUseCase={(useCaseId) => {
                    setNotificationHistoryOpen(false);
                    setActiveUseCase(useCaseId);
                    closeMobileSidebar();
                  }}
                />
              </SalesIntelProvider>
            ) : (
              <UseCaseWorkspace
                useCase={
                  summary.useCases.find((uc) => uc.id === activeUseCase) ??
                  summary.useCases.find((uc) => uc.id === "uc1")!
                }
                workerKey={workerKey}
                agentId={agentId}
                selectedReviewOpportunityId={selectedReviewOpportunityId}
                onSelectReviewOpportunity={setSelectedReviewOpportunityId}
                onOpenOverview={() => {
                  setActiveUseCase("uc1");
                  focusAiResponseTab();
                }}
                onOpenInsights={() => setActiveUseCase("uc2")}
                assignmentMembers={assignmentMembers}
                isAssignmentDashboardLoading={isAssignmentDashboardLoading}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-5">
                <Target className="w-7 h-7 text-slate-600" />
              </div>
              <h3
                className="text-[15px] font-semibold text-white mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Select a use case
              </h3>
              <p className="text-[12px] text-slate-500 max-w-xs text-center">
                Choose a use case from the menu on the left to get started.
              </p>
            </div>
          )}
        </div>

        {chatOpen && isSalesWorker ? (
          <>
            <div className="hidden lg:flex">
              <StudioWorkerChatPanel {...chatPanelProps} />
            </div>
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setChatOpen(false)}
                aria-hidden
              />
              <div className="relative ml-auto flex h-full w-full max-w-[340px] flex-col">
                <StudioWorkerChatPanel {...chatPanelProps} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );

  if (isSalesIntelWorker) {
    return (
      <SalesIntelNotificationProvider agentId={agentId} userId={authUserId}>
        {cockpit}
      </SalesIntelNotificationProvider>
    );
  }

  return cockpit;
}

const USE_CASE_OUTCOMES: Record<string, Outcome[]> = {
  "AI Response Generation": [
    { value: "9", label: "Drafts Made Submission-Ready", trend: "in review workflow", trendUp: true },
    { value: "4.8 days", label: "Avg Draft Turnaround", trend: "upload to review-ready", trendUp: true },
    { value: "18", label: "Sections Awaiting Team Review", trend: "Team Review Queue", trendUp: true },
    { value: "12", label: "RFPs finalized", trend: "submitted to client", trendUp: true },
  ],
  "Knowledge Base": [
    { value: "14", label: "Geographies Covered", trend: "locations with approved knowledge", trendUp: true },
    { value: "7/9", label: "Categories Ready for Drafting", trend: "reusable sources, no critical flags", trendUp: true },
    { value: "3.2x", label: "Faster First Drafts", trend: "vs 6.3-day manual baseline", trendUp: true },
  ],
  "Section Assignment": [
    { value: "4", label: "Team Members Active", trend: "with section ownership", trendUp: true },
    { value: "14", label: "Total Sections Assigned", trend: "across active RFPs", trendUp: true },
    { value: "4", label: "Sections Completed", trend: "ready for submission", trendUp: true },
    { value: "10", label: "Sections Pending", trend: "still in progress", trendUp: false },
  ],
  "Compliance Checker": [
    { value: "82%", label: "Mandatory Coverage", trend: "requirements addressed", trendUp: true },
    { value: "3", label: "Disqualifier Risks", trend: "pass/fail gaps", trendUp: false },
    { value: "18/24", label: "Evidence Attached", trend: "required items linked", trendUp: true },
    { value: "5", label: "Docs Missing/Expired", trend: "needs attention", trendUp: false },
  ],
  "Win/Loss Analysis": [
    { value: "18", label: "Submitted Bids Tracked", trend: "outcome tracking on", trendUp: true },
    { value: "11", label: "Known Outcomes", trend: "won/lost recorded", trendUp: true },
    { value: "4", label: "Lessons Added to KB", trend: "post-bid improvements", trendUp: true },
    { value: "Pricing", label: "Top Gap", trend: "most common loss reason", trendUp: false },
  ],
  Overview: [
    { value: "4", label: "New Opportunities Found", trend: "since last portal scan", trendUp: true },
    { value: "6", label: "Qualified Opportunities", trend: "AI + human validated", trendUp: true },
    { value: "2", label: "Awaiting Review", trend: "human validation queue", trendUp: false },
    { value: "1", label: "Rejected", trend: "no bid / declined", trendUp: false },
    { value: "£18.2M", label: "Pipeline Value Identified", trend: "active opportunities", trendUp: true },
  ],
  "Opportunity Pipeline": [
    { value: "10", label: "Total in Pipeline", trend: "all stages", trendUp: true },
    { value: "2", label: "Pushed to Salesforce", trend: "successfully synced", trendUp: true },
    { value: "5", label: "Upcoming Deadlines", trend: "within 14 days", trendUp: false },
    { value: "Today", label: "Last Portal Scan", trend: "Contracts Finder + FTS", trendUp: true },
  ],
  Ingestion: [
    { value: "3", label: "Active Sources", trend: "2 portals + manual", trendUp: true },
    { value: "10", label: "Opportunities Ingested", trend: "all time", trendUp: true },
    { value: "1", label: "New from Last Scan", trend: "ready to qualify", trendUp: true },
  ],
  "Review Queue": [
    { value: "2", label: "Awaiting Validation", trend: "qualified opportunities", trendUp: false },
    { value: "4", label: "Validated This Week", trend: "approved for push", trendUp: true },
  ],
  "Salesforce Push Log": [
    { value: "2", label: "Successful Pushes", trend: "synced to SF", trendUp: true },
    { value: "2", label: "Failed Attempts", trend: "needs retry", trendUp: false },
  ],
  Archive: [
    { value: "4", label: "Archived Opportunities", trend: "kept for reference", trendUp: false },
    { value: "2", label: "Restored This Month", trend: "returned to pipeline", trendUp: true },
    { value: "1", label: "No-bid Archives", trend: "capacity / fit", trendUp: false },
  ],
  "Activity Logs": [
    { value: "12", label: "Events Logged", trend: "last 7 days", trendUp: true },
    { value: "4", label: "Status Changes", trend: "pipeline transitions", trendUp: true },
    { value: "2", label: "Sync Failures", trend: "needs attention", trendUp: false },
    { value: "3", label: "Human Reviews", trend: "approve / reject", trendUp: true },
  ],
  "History Scan": [
    { value: "0", label: "Recent Scans", trend: "UNGM + TED", trendUp: true },
    { value: "0%", label: "Success Rate", trend: "from scan-history API", trendUp: true },
  ],
  "Decision History": [
    { value: "0", label: "Approvals", trend: "from decision-history API", trendUp: true },
    { value: "0", label: "Rejections", trend: "audit trail", trendUp: false },
    { value: "0", label: "Overrides", trend: "restored for review", trendUp: true },
  ],
};

function SalesIntelWorkspace({
  useCase,
  agentId,
  selectedReviewOpportunityId,
  onSelectReviewOpportunity,
  onNavigateToUseCase,
}: {
  useCase: UseCase;
  agentId: string;
  selectedReviewOpportunityId?: string | null;
  onSelectReviewOpportunity?: (id: string | null) => void;
  onNavigateToUseCase?: (useCaseId: string) => void;
}) {
  const salesIntel = useSalesIntelContext();
  const outcomes =
    buildSalesIntelOutcomes(useCase.title, salesIntel) ?? USE_CASE_OUTCOMES[useCase.title];

  if (salesIntel.loading && !salesIntel.initialized) {
    if (useCase.id === "si0") {
      return <SalesIntelOverviewSkeleton />;
    }
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (salesIntel.error && !salesIntel.initialized) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-10 text-center">
        <p className="text-[14px] font-semibold text-red-200">Failed to load sales intelligence data</p>
        <p className="mt-2 text-[12px] text-red-300/80">{salesIntel.error}</p>
        <button
          type="button"
          onClick={() => void salesIntel.refresh()}
          className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-indigo-400"
        >
          Retry
        </button>
      </div>
    );
  }

  if (selectedReviewOpportunityId && useCase.id === "si3") {
    return (
      <OpportunityDetailView
        agentId={agentId}
        opportunityId={selectedReviewOpportunityId}
        onBack={() => onSelectReviewOpportunity?.(null)}
      />
    );
  }

  if (useCase.id === "si0") {
    return (
      <div>
        {outcomes && <OutcomesStrip title={useCase.title} outcomes={outcomes} />}
        <SalesIntelDashboard
          agentId={agentId}
          onGoToIngestion={onNavigateToUseCase ? () => onNavigateToUseCase("si2") : undefined}
        />
      </div>
    );
  }
  if (useCase.id === "si1") {
    return (
      <div>
        {outcomes && <OutcomesStrip title={useCase.title} outcomes={outcomes} />}
        <SalesIntelPipelineWorkspace
          agentId={agentId}
          onGoToIngestion={onNavigateToUseCase ? () => onNavigateToUseCase("si2") : undefined}
        />
      </div>
    );
  }
  if (useCase.id === "si2") {
    return (
      <div>
        {outcomes && <OutcomesStrip title={useCase.title} outcomes={outcomes} />}
        <OpportunityIngestionView agentId={agentId} />
      </div>
    );
  }
  if (useCase.id === "si3") {
    return (
      <div>
        {outcomes && <OutcomesStrip title={useCase.title} outcomes={outcomes} />}
        <OpportunityReviewQueue
          agentId={agentId}
          onSelectOpportunity={(id) => onSelectReviewOpportunity?.(id)}
        />
      </div>
    );
  }
  if (useCase.id === "si4") {
    return (
      <div>
        {outcomes && <OutcomesStrip title={useCase.title} outcomes={outcomes} />}
        <SalesforcePushLogView agentId={agentId} />
      </div>
    );
  }
  if (useCase.id === "si5") {
    return (
      <div>
        {outcomes && <OutcomesStrip title={useCase.title} outcomes={outcomes} />}
        <OpportunityArchiveView agentId={agentId} />
      </div>
    );
  }
  if (useCase.id === "si6") {
    return (
      <div>
        {outcomes && <OutcomesStrip title={useCase.title} outcomes={outcomes} />}
        <ActivityLogsView agentId={agentId} />
      </div>
    );
  }
  if (useCase.id === "si7") {
    return (
      <div>
        {outcomes && <OutcomesStrip title={useCase.title} outcomes={outcomes} />}
        <ScanHistoryView agentId={agentId} />
      </div>
    );
  }
  if (useCase.id === "si8") {
    return (
      <div>
        {outcomes && <OutcomesStrip title={useCase.title} outcomes={outcomes} />}
        <DecisionHistoryView agentId={agentId} />
      </div>
    );
  }

  return null;
}

function UseCaseWorkspace({
  useCase,
  workerKey,
  agentId,
  selectedReviewOpportunityId,
  onSelectReviewOpportunity,
  onOpenOverview,
  onOpenInsights,
  assignmentMembers = [],
  isAssignmentDashboardLoading = false,
}: {
  useCase: UseCase;
  workerKey: string;
  agentId: string;
  selectedReviewOpportunityId?: string | null;
  onSelectReviewOpportunity?: (id: string | null) => void;
  onOpenOverview?: () => void;
  onOpenInsights?: () => void;
  assignmentMembers?: QuestionAssignmentDashboardMember[];
  isAssignmentDashboardLoading?: boolean;
}) {
  const Icon = useCase.icon;
  const outcomes = USE_CASE_OUTCOMES[useCase.title];

  if (useCase.id === "exec0" && workerKey === "sales") {
    return <PortfolioOverviewView onOpenInsights={onOpenInsights} />;
  }

  if (useCase.id === "exec1" && workerKey === "sales") {
    return <AIInsightsView onOpenOverview={onOpenOverview} />;
  }

  if (useCase.id === "uc1" && workerKey === "sales") {
    return (
      <div>
        {outcomes && <OutcomesStrip title={useCase.title} outcomes={outcomes} />}
        <RFPListView />
      </div>
    );
  }

  if (useCase.id === "uc2") {
    return (
      <div>
        {outcomes && <OutcomesStrip title={useCase.title} outcomes={outcomes} />}
        <KnowledgeBaseView />
      </div>
    );
  }

  if (useCase.id === "uc3" && workerKey === "sales") {
    return (
      <div>
        {outcomes && <OutcomesStrip title={useCase.title} outcomes={outcomes} />}
        <SectionAssignmentView
          members={assignmentMembers}
          isLoading={isAssignmentDashboardLoading}
          agentUniqueId={agentId}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {outcomes && <OutcomesStrip title={useCase.title} outcomes={outcomes} />}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/[0.15] flex items-center justify-center">
          <Icon className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2
            className="text-[16px] font-semibold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {useCase.title}
          </h2>
          <p className="text-[12px] text-slate-500">{useCase.description}</p>
        </div>
      </div>

      <div
        className="rounded-xl border border-white/[0.06] p-6"
        style={{ background: "rgba(255,255,255,0.015)" }}
      >
        <p className="text-[13px] text-slate-400 leading-relaxed">
          This use case is active. Select it to start working, or use the chat to ask questions
          about how it works.
        </p>
      </div>
    </div>
  );
}

const KB_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Technical Architecture": "Security solution design, systems, sites, and operations setup.",
  "Security & Compliance": "Licences, standards, risk controls, ethics, and legal compliance.",
  "Service Delivery": "Guarding, protection, K9, training, and operational delivery.",
  "Case Studies": "Similar security projects, missions, outcomes, and client proof.",
  "Pricing & Commercial": "Rates, costs, mobilisation, contract terms, and payment details.",
  "Team & Resources": "Guards, supervisors, managers, trainers, vehicles, and equipment.",
  "SLAs & Support": "Response times, reporting, escalation, and 24/7 support.",
  "Innovation & R&D": "New security tools, tracking, training, and risk intelligence.",
  "Sustainability": "Ethical operations, local impact, staff welfare, and ESG.",
};

const KB_MODAL_CATEGORIES = Object.keys(KB_CATEGORY_DESCRIPTIONS);

const KB_MODAL_FIELD_CLASS =
  "w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-[14px] text-white outline-none focus:border-indigo-400/60 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60";

const KB_MODAL_SELECT_CLASS =
  "w-full appearance-none rounded-xl border border-white/[0.12] bg-white/[0.04] py-2.5 pl-4 pr-10 text-[14px] text-white outline-none focus:border-indigo-400/60 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60";

function formatKnowledgeCategoryLabel(category: string | null | undefined): string {
  return category?.trim() ?? "";
}

type KnowledgeCategoryGroup = {
  category: string;
  description: string;
  itemCount: number;
};

function groupKnowledgeBaseFilesByCategory(files: IDGKnowledgeBaseFile[]): KnowledgeCategoryGroup[] {
  const groups = new Map<string, { description: string; itemCount: number }>();

  for (const file of files) {
    const category = formatKnowledgeCategoryLabel(file.category);
    if (!category) continue;

    const description = file.description?.trim() ?? "";
    const existing = groups.get(category);

    if (existing) {
      existing.itemCount += 1;
      if (!existing.description && description) {
        existing.description = description;
      }
    } else {
      groups.set(category, { description, itemCount: 1 });
    }
  }

  return Array.from(groups.entries())
    .map(([category, { description, itemCount }]) => ({
      category,
      description,
      itemCount,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

const RFP_ACCEPTED_FILE_TYPES =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const RFP_ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

const KB_ACCEPTED_FILE_TYPES =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const KB_ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

function RFPListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-xl border border-white/[0.06] px-5 py-4"
          style={{ background: "rgba(255,255,255,0.015)" }}
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg bg-white/[0.06]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48 bg-white/[0.06]" />
            <Skeleton className="h-3 w-72 bg-white/[0.04]" />
          </div>
          <Skeleton className="h-8 w-16 rounded-lg bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}

function RfpPackRows({
  packs,
  deletingPackId,
  retryingFileId,
  onSelect,
  onUpload,
  onDelete,
  onRetry,
}: {
  packs: IDGRfpPackGroup[];
  deletingPackId: string | null;
  retryingFileId: string | null;
  onSelect: (fileId: string) => void;
  onUpload: (pack: IDGRfpPackGroup, event: MouseEvent) => void;
  onDelete: (pack: IDGRfpPackGroup, event: MouseEvent) => void | Promise<void>;
  onRetry: (fileId: string) => void | Promise<void>;
}) {
  if (packs.length === 0) return null;

  return (
    <div className="space-y-3">
      {packs.map((pack) => (
        <div
          key={pack.packId}
          className="group flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5 rounded-xl border border-white/[0.06] hover:border-indigo-500/[0.2] transition-all cursor-pointer"
          style={{ background: "rgba(255,255,255,0.015)" }}
          onClick={() => onSelect(pack.primaryFileId)}
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-500/[0.06] border border-indigo-500/[0.1] flex items-center justify-center shrink-0">
            <FileText className="w-4.5 h-4.5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <h4
                className="text-[13px] font-semibold text-white truncate"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {pack.name}
              </h4>
              {pack.status !== "in_progress" && (
                <RfpPackStatusBadge
                  status={pack.status}
                  retryFileId={pack.retryFileId}
                  isRetrying={Boolean(pack.retryFileId && retryingFileId === pack.retryFileId)}
                  onRetry={onRetry}
                />
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              {pack.fileCount > 1 && (
                <span className="text-[11px] text-indigo-400/80">
                  {pack.fileCount} documents
                </span>
              )}
              {pack.category && (
                <span className="text-[11px] text-slate-500">{pack.category}</span>
              )}
              {pack.categoryDescription && (
                <span className="text-[11px] text-slate-500">{pack.categoryDescription}</span>
              )}
              {pack.country && (
                <span className="text-[11px] text-slate-500">
                  <Clock className="w-3 h-3 inline mr-1 opacity-60" />
                  {pack.country}
                </span>
              )}
              {pack.sections > 0 && (
                <span className="text-[11px] text-slate-500">
                  {pack.complete}/{pack.sections} sections
                </span>
              )}
              {pack.isEvaluated && (
                <span className="text-[11px] text-emerald-400/80">Evaluated</span>
              )}
            </div>
            {pack.fileCount > 1 && (
              <p className="mt-1 truncate text-[10px] text-slate-600">
                {pack.files.map((file) => file.name).join(" · ")}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={(event) => onUpload(pack, event)}
            className="shrink-0 rounded-lg border border-transparent p-2 text-slate-600 opacity-100 sm:opacity-0 transition-all hover:border-indigo-500/20 hover:bg-indigo-500/10 hover:text-indigo-400 group-hover:opacity-100"
            aria-label={`Add document to ${pack.name}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={(event) => void onDelete(pack, event)}
            disabled={deletingPackId === pack.packId}
            className="shrink-0 rounded-lg border border-transparent p-2 text-slate-600 opacity-100 sm:opacity-0 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Delete ${pack.name}`}
          >
            {deletingPackId === pack.packId ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            type="button"
            className="text-[11px] text-indigo-400 font-medium opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-1 self-end sm:self-auto"
          >
            Open <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function RFPListView() {
  const params = useParams<{ workerId?: string }>();
  const agentId = params.workerId?.trim() ?? "";
  const dispatch = useAppDispatch();
  const filesEntry = useAppSelector((state) => state.idgRfp.filesByAgentId[agentId]);
  const authUserEmail = useAppSelector((state) => state.auth.userInfo?.email ?? "");
  const assignmentsBySectionId = useAppSelector((state) => state.questionAssignments.assignmentsBySectionId);
  const [selectedRFP, setSelectedRFP] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadPackId, setUploadPackId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshingListAfterUpload, setIsRefreshingListAfterUpload] = useState(false);
  const [deletingPackId, setDeletingPackId] = useState<string | null>(null);
  const [retryingFileId, setRetryingFileId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const filesNeedEvaluationPoll = useMemo(
    () => rfpFilesNeedEvaluationPoll(filesEntry?.files ?? []),
    [filesEntry?.files]
  );

  useEffect(() => {
    if (!agentId || !filesNeedEvaluationPoll) return;

    let cancelled = false;
    let inFlight = false;
    let intervalId: number | null = null;

    const stopPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const pollFiles = async () => {
      if (cancelled || inFlight) return;

      inFlight = true;
      try {
        const result = await dispatch(fetchIdgRfpFiles({ agentId, force: true, silent: true }));
        if (cancelled) return;

        if (fetchIdgRfpFiles.fulfilled.match(result)) {
          const files = result.payload.files ?? [];
          void triggerAnswerByAiForEvaluatedFiles(files);
          void dispatch(syncEvaluatedRfpFilesAndPacks({ agentId }));
          if (!rfpFilesNeedEvaluationPoll(files)) {
            stopPolling();
          }
        }
      } finally {
        inFlight = false;
      }
    };

    void pollFiles();
    intervalId = window.setInterval(() => {
      void pollFiles();
    }, IDG_RFP_FILES_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [agentId, dispatch, filesNeedEvaluationPoll]);

  useEffect(() => {
    setSelectedRFP(null);
  }, [agentId]);

  useEffect(() => {
    void dispatch(fetchQuestionAssignments({ force: true }));
    void dispatch(fetchTeamMembers({ force: true }));
  }, [dispatch]);

  const rfpPacks = useMemo(
    () => groupRfpListItemsByPack((filesEntry?.files ?? []).map((file) => mapRfpFileToListItem(file))),
    [filesEntry?.files]
  );

  const assignedPackIds = useMemo(
    () => getAssignedPackIdsForEmail(assignmentsBySectionId, authUserEmail),
    [assignmentsBySectionId, authUserEmail]
  );

  const { outstandingRfpPacks, otherRfpPacks } = useMemo(() => {
    const outstanding = rfpPacks.filter((pack) => {
      const packId = pack.packId.trim();
      return Boolean(packId && assignedPackIds.has(packId));
    });

    return { outstandingRfpPacks: outstanding, otherRfpPacks: rfpPacks };
  }, [assignedPackIds, rfpPacks]);

  const hasAssignedRfpPacks = outstandingRfpPacks.length > 0;

  const isLoading = Boolean(
    filesEntry?.loading || (Boolean(agentId) && !filesEntry?.loaded)
  );
  const showListSkeleton =
    isRefreshingListAfterUpload ||
    Boolean(filesEntry?.loading) ||
    (rfpPacks.length === 0 && isLoading);
  const selectedPack = rfpPacks.find(
    (pack) => pack.primaryFileId === selectedRFP || pack.files.some((file) => file.id === selectedRFP)
  );

  const handleRetryIngest = useCallback(
    async (fileId: string) => {
      if (!fileId.trim() || retryingFileId) return;

      setRetryingFileId(fileId);
      try {
        await retryRfpIngest(fileId);
        toast.success("Retry started. Parsing will resume shortly.");
        if (agentId) {
          await dispatch(fetchIdgRfpFiles({ agentId, force: true, silent: true }));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to retry ingest.");
      } finally {
        setRetryingFileId(null);
      }
    },
    [agentId, dispatch, retryingFileId]
  );

  if (selectedRFP && selectedPack) {
    return (
      <RFPDetailView
        fileId={selectedPack.primaryFileId}
        packId={selectedPack.packId}
        agentId={agentId}
        packFileCount={selectedPack.fileCount}
        rfpName={selectedPack.name}
        documentFileName={selectedPack.primary.fileName}
        onBack={() => setSelectedRFP(null)}
      />
    );
  }

  const isPackUpload = Boolean(uploadPackId);

  const resetModal = () => {
    setIsModalOpen(false);
    setUploadPackId(null);
    setTitle("");
    setDescription("");
    setSelectedFiles([]);
  };

  const openNewRfpModal = () => {
    setUploadPackId(null);
    setIsModalOpen(true);
  };

  const openPackUploadModal = (pack: IDGRfpPackGroup, event: MouseEvent) => {
    event.stopPropagation();
    const packId = pack.packId?.trim();
    if (!packId) {
      toast.error("Pack ID not found for this RFP.");
      return;
    }
    setUploadPackId(packId);
    setTitle("");
    setDescription("");
    setSelectedFiles([]);
    setIsModalOpen(true);
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList?.length) return;

    const nextFiles = Array.from(fileList);
    const validFiles = nextFiles.filter((file) =>
      RFP_ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)),
    );

    if (validFiles.length < nextFiles.length) {
      toast.error("Only PDF and DOCX files are supported.");
    }

    if (validFiles.length === 0) return;

    setSelectedFiles((current) => {
      const existingKeys = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const merged = [...current];
      for (const file of validFiles) {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          merged.push(file);
        }
      }
      return merged;
    });
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleUploadDocument = async () => {
    if (!agentId) {
      toast.error("Unable to upload: worker ID is missing from the URL.");
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file to upload.");
      return;
    }

    const uploadingToExistingPack = Boolean(uploadPackId);

    setIsUploading(true);
    if (!uploadingToExistingPack) {
      setIsRefreshingListAfterUpload(true);
    }
    try {
      const sharedTitle = title.trim();
      const sharedDescription = description.trim() || undefined;
      const uploadedCount = selectedFiles.length;

      let uploadResponse;
      if (isPackUpload) {
        uploadResponse = await uploadRfpFilesToPack({
          agentId,
          packTitle: sharedTitle,
          files: selectedFiles,
          packId: uploadPackId ?? undefined,
        });
      } else {
        const packTitle =
          sharedTitle ||
          stripFileExtension(selectedFiles[0].name) ||
          selectedFiles[0].name;

        uploadResponse = await uploadRfpFilesToPack({
          agentId,
          packTitle,
          documentContext: sharedDescription,
          files: selectedFiles,
        });
      }

      resetModal();

      const refreshResult = await dispatch(
        fetchIdgRfpFiles({
          agentId,
          force: true,
          silent: uploadingToExistingPack,
        })
      );
      if (fetchIdgRfpFiles.rejected.match(refreshResult) && !isIdgRfpThunkSkipped(refreshResult)) {
        toast.error(refreshResult.error.message || "Failed to refresh RFP list.");
      } else if (fetchIdgRfpFiles.fulfilled.match(refreshResult)) {
        void dispatch(syncEvaluatedRfpFilesAndPacks({ agentId }));
      }

      toast.success(
        isPackUpload
          ? uploadedCount === 1
            ? "Document uploaded successfully."
            : `${uploadedCount} documents uploaded to this RFP pack.`
          : uploadedCount === 1
            ? "RFP uploaded successfully."
            : `RFP pack created with ${uploadedCount} documents.`,
      );

      void evaluateUploadedRfpFiles(agentId, uploadResponse)
        .then(() => dispatch(fetchIdgRfpFiles({ agentId, force: true, silent: true })))
        .then((result) => {
          if (fetchIdgRfpFiles.fulfilled.match(result)) {
            const files = result.payload.files ?? [];
            void triggerAnswerByAiForEvaluatedFiles(files);
            void dispatch(syncEvaluatedRfpFilesAndPacks({ agentId }));
          }
        })
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : "Failed to evaluate uploaded RFP file(s).";
          toast.error(message);
        });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload documents";
      toast.error(message);
    } finally {
      setIsUploading(false);
      if (!uploadingToExistingPack) {
        setIsRefreshingListAfterUpload(false);
      }
    }
  };

  const handleDeletePack = async (pack: IDGRfpPackGroup, event: MouseEvent) => {
    event.stopPropagation();
    if (!agentId) {
      toast.error("Unable to delete: worker ID is missing from the URL.");
      return;
    }

    const packId = pack.packId?.trim();
    if (!packId) {
      toast.error("Pack ID not found for this RFP.");
      return;
    }

    setDeletingPackId(packId);
    try {
      const response = await deleteRfpPack(packId);
      dispatch(removeIdgRfpPackFromCache({ agentId, packId }));
      clearRfpWorkflowState(agentId, packId);
      if (pack.files.some((file) => file.id === selectedRFP)) {
        setSelectedRFP(null);
      }
      toast.success(response.message || "RFP pack removed.");
      void deleteQuestionAssignments(packId)
        .then(() => {
          dispatch(removeQuestionAssignmentsByPackId(packId));
        })
        .catch(() => {});
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete RFP pack.";
      toast.error(message);
    } finally {
      setDeletingPackId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2
            className="text-[16px] font-semibold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            AI Response Generation
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5">Your active RFPs and proposals</p>
        </div>
        <button
          onClick={openNewRfpModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-500 text-white text-[12px] font-semibold hover:bg-indigo-400 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New RFP
        </button>
      </div>

      {showListSkeleton ? (
        <RFPListSkeleton />
      ) : rfpPacks.length === 0 ? (
        <div
          className="rounded-xl border border-white/[0.06] p-10 text-center"
          style={{ background: "rgba(255,255,255,0.015)" }}
        >
          <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/[0.15] flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="text-[14px] font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
            No RFP documents yet
          </h3>
          <p className="mt-1 text-[12px] text-slate-500">
            Upload your first RFP to start the response generation workflow.
          </p>
          <button
            onClick={openNewRfpModal}
            className="mt-5 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-500 text-white text-[12px] font-semibold hover:bg-indigo-400 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New RFP
          </button>
        </div>
      ) : hasAssignedRfpPacks ? (
        <div className="space-y-8">
          <div>
            <h3
              className="mb-4 text-[14px] font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              RFPs you have outstanding actions on
            </h3>
            <RfpPackRows
              packs={outstandingRfpPacks}
              deletingPackId={deletingPackId}
              retryingFileId={retryingFileId}
              onSelect={setSelectedRFP}
              onUpload={openPackUploadModal}
              onDelete={handleDeletePack}
              onRetry={handleRetryIngest}
            />
          </div>

          <div>
            <h3
              className="mb-4 text-[14px] font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              All RFPs
            </h3>
            <RfpPackRows
              packs={otherRfpPacks}
              deletingPackId={deletingPackId}
              retryingFileId={retryingFileId}
              onSelect={setSelectedRFP}
              onUpload={openPackUploadModal}
              onDelete={handleDeletePack}
              onRetry={handleRetryIngest}
            />
          </div>
        </div>
      ) : (
        <RfpPackRows
          packs={rfpPacks}
          deletingPackId={deletingPackId}
          retryingFileId={retryingFileId}
          onSelect={setSelectedRFP}
          onUpload={openPackUploadModal}
          onDelete={handleDeletePack}
          onRetry={handleRetryIngest}
        />
      )}

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open && !isUploading) resetModal();
        }}
      >
        <DialogContent
          className="max-w-lg overflow-hidden bg-[#0D1B2A] border-white/10 text-white"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-white">{isPackUpload ? "Upload Document" : "New RFP"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {isPackUpload
                ? "Upload additional documents to this RFP pack."
                : "Upload one or more RFP documents to start the response workflow."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-w-0 space-y-4">
              {!isPackUpload && (
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-slate-300">
                  RFP Title {selectedFiles.length > 1 ? "(optional — file names will be used)" : ""}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., NHS Security Framework 2026"
                  disabled={isUploading}
                  className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-[14px] text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              )}

              {!isPackUpload && (
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-slate-300">Document Context</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this RFP or proposal..."
                  rows={3}
                  disabled={isUploading}
                  className="w-full resize-none rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-[14px] text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label className="text-[12px] font-medium text-slate-300">
                    {isPackUpload ? "Upload Document" : "Upload Documents"}
                  </label>
                  {selectedFiles.length > 0 ? (
                    <span className="text-[10px] font-medium text-indigo-300/80">
                      {selectedFiles.length} selected
                    </span>
                  ) : null}
                </div>
                <label
                  className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-6 text-center transition-colors ${
                    selectedFiles.length > 0 ? "py-5" : "py-8"
                  } ${
                    isUploading
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer hover:border-indigo-400/30 hover:bg-white/[0.05]"
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    accept={RFP_ACCEPTED_FILE_TYPES}
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      handleFilesSelected(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <Upload className="mb-2.5 h-5 w-5 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-200">Click to upload documents</p>
                  <p className="mt-1 text-[11px] text-slate-500">PDF, DOCX</p>
                </label>

                {selectedFiles.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <ul className="max-h-[220px] min-w-0 space-y-1.5 overflow-y-auto overflow-x-hidden p-2">
                      {selectedFiles.map((file, index) => (
                        <li
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          className="flex min-w-0 items-center gap-2.5 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-indigo-500/15 bg-indigo-500/10">
                            <FileText className="h-3.5 w-3.5 text-indigo-400" />
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="truncate text-[12px] font-medium text-white" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {(file.size / (1024 * 1024)).toFixed(1)} MB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedFile(index)}
                            disabled={isUploading}
                            className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Remove ${file.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

          </div>

          <DialogFooter>
            <button
              onClick={resetModal}
              disabled={isUploading}
              className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleUploadDocument()}
              disabled={isUploading || selectedFiles.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-[#072b35] transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isUploading
                ? "Uploading..."
                : isPackUpload
                  ? selectedFiles.length > 1
                    ? `Upload ${selectedFiles.length} files`
                    : "Upload"
                  : selectedFiles.length > 1
                    ? `Add RFP (${selectedFiles.length} files)`
                    : "Add RFP"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KnowledgeBaseSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-white/[0.06] px-4 py-3.5"
          style={{ background: "rgba(255,255,255,0.015)" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <Skeleton className="h-3.5 w-28 bg-white/[0.06]" />
            <Skeleton className="h-3 w-12 bg-white/[0.04]" />
          </div>
          <Skeleton className="h-3 w-full bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}

function IdgRfpFilesTabFetcher({
  agentId,
  isActive,
  focusToken,
}: {
  agentId: string;
  isActive: boolean;
  focusToken: number;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!agentId.trim() || !isActive) return;

    const isReloadFetch = focusToken === 0;
    void dispatch(
      fetchIdgRfpFiles({
        agentId,
        force: true,
        silent: !isReloadFetch,
      })
    ).then((result) => {
      if (fetchIdgRfpFiles.fulfilled.match(result)) {
        void dispatch(syncEvaluatedRfpFilesAndPacks({ agentId }));
      }
    });
    // focusToken bumps on tab re-select; isActive covers tab switch and page reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, dispatch, isActive, focusToken]);

  return null;
}

function IdgRfpPackSyncPoller({ agentId }: { agentId: string }) {
  const dispatch = useAppDispatch();
  const files = useAppSelector((state) => state.idgRfp.filesByAgentId[agentId]?.files ?? []);
  const idgRfpState = useAppSelector((state) => state.idgRfp);
  const hasPackSyncPending = useMemo(
    () => hasPendingPackByIdSync(files, { idgRfp: idgRfpState } as RootState, agentId),
    [files, idgRfpState, agentId]
  );

  useEffect(() => {
    if (!agentId.trim() || !hasPackSyncPending) return;

    let cancelled = false;
    let inFlight = false;
    let intervalId: number | null = null;

    const stopPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const pollPacks = async () => {
      if (cancelled || inFlight) return;

      inFlight = true;
      try {
        await dispatch(syncEvaluatedRfpFilesAndPacks({ agentId }));
      } finally {
        inFlight = false;
      }
    };

    void pollPacks();
    intervalId = window.setInterval(() => {
      void pollPacks();
    }, IDG_RFP_PACK_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [agentId, dispatch, hasPackSyncPending]);

  return null;
}

function KnowledgeBaseFilesPoller({ agentId }: { agentId: string }) {
  const dispatch = useAppDispatch();
  const filesEntry = useAppSelector((state) => state.idgKnowledgeBase.filesByAgentId[agentId]);
  const needsPoll = useMemo(
    () => Boolean(filesEntry?.loaded) && kbFilesNeedEvaluationPoll(filesEntry?.files ?? []),
    [filesEntry?.files, filesEntry?.loaded]
  );

  useEffect(() => {
    if (!agentId.trim() || !needsPoll) return;

    let cancelled = false;
    let inFlight = false;
    let intervalId: number | null = null;

    const stopPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const pollFiles = async () => {
      if (cancelled || inFlight) return;

      inFlight = true;
      try {
        const result = await dispatch(
          fetchIdgKnowledgeBaseFiles({ agentId, force: true, silent: true })
        );
        if (cancelled) return;

        if (fetchIdgKnowledgeBaseFiles.fulfilled.match(result)) {
          if (!kbFilesNeedEvaluationPoll(result.payload.files ?? [])) {
            stopPolling();
          }
        }
      } finally {
        inFlight = false;
      }
    };

    void pollFiles();
    intervalId = window.setInterval(() => {
      void pollFiles();
    }, IDG_KB_FILES_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [agentId, dispatch, needsPoll]);

  return null;
}

function KnowledgeBaseView() {
  const params = useParams<{ workerId?: string }>();
  const agentId = params.workerId?.trim() ?? "";
  const dispatch = useAppDispatch();
  const filesEntry = useAppSelector((state) => state.idgKnowledgeBase.filesByAgentId[agentId]);
  const files = filesEntry?.files ?? [];
  const isLoading = Boolean(filesEntry?.loading && !filesEntry?.loaded);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [contextDocument, setContextDocument] = useState("");
  const [contextFiles, setContextFiles] = useState<File[]>([]);

  const categoryGroups = useMemo(() => groupKnowledgeBaseFilesByCategory(files), [files]);

  useEffect(() => {
    if (!agentId || filesEntry?.loaded) return;
    void dispatch(fetchIdgKnowledgeBaseFiles({ agentId }));
  }, [agentId, dispatch, filesEntry?.loaded]);

  const refreshKnowledgeBaseFiles = useCallback(async () => {
    if (!agentId) return;
    await dispatch(fetchIdgKnowledgeBaseFiles({ agentId, force: true }));
  }, [agentId, dispatch]);

  const resetModal = () => {
    setIsModalOpen(false);
    setCategoryId("");
    setContextDocument("");
    setContextFiles([]);
  };

  const handleContextFilesSelected = (fileList: FileList | null) => {
    if (isSubmitting || !fileList?.length) return;

    const nextFiles = Array.from(fileList);
    const validFiles = nextFiles.filter((file) =>
      KB_ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)),
    );

    if (validFiles.length < nextFiles.length) {
      toast.error("Only PDF and DOCX files are supported.");
    }

    if (validFiles.length === 0) return;

    setContextFiles((current) => {
      const existingKeys = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const merged = [...current];
      for (const file of validFiles) {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          merged.push(file);
        }
      }
      return merged;
    });
  };

  const handleRemoveContextFile = (index: number) => {
    if (isSubmitting) return;
    setContextFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleAddResponse = async () => {
    if (!agentId) {
      toast.error("Unable to upload: worker ID is missing from the URL.");
      return;
    }

    if (!categoryId) {
      toast.error("Please select a category.");
      return;
    }

    if (!contextDocument.trim()) {
      toast.error("Please enter document context.");
      return;
    }

    if (contextFiles.length === 0) {
      toast.error("Please upload at least one file.");
      return;
    }

    setIsSubmitting(true);
    try {
      const category = categoryId.trim();
      const description = contextDocument.trim();

      const categoryDescription = KB_CATEGORY_DESCRIPTIONS[category] ?? "";

      const uploadedFileCount = contextFiles.length;

      await uploadKnowledgeBaseFile({
        agentId,
        category,
        categoryDescription,
        title: category,
        description,
        files: contextFiles,
      });

      resetModal();

      try {
        await refreshKnowledgeBaseFiles();
      } catch (refreshError) {
        const message =
          refreshError instanceof Error
            ? refreshError.message
            : "Failed to refresh knowledge base.";
        toast.error(message);
      }

      toast.success(
        uploadedFileCount === 1
          ? "Knowledge added successfully."
          : `${uploadedFileCount} knowledge items added successfully.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add knowledge.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2
            className="text-[16px] font-semibold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Knowledge Base
          </h2>
          {/* <p className="text-[12px] text-slate-500 mt-0.5">
            {categorizedFileCount} approved items across {categoryGroups.length} categories
          </p> */}
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-300 text-[12px] font-medium hover:bg-white/[0.06] transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Knowledge
        </button>
      </div>

      {isLoading ? (
        <KnowledgeBaseSkeleton />
      ) : categoryGroups.length === 0 ? (
        <div
          className="rounded-xl border border-white/[0.06] p-10 text-center"
          style={{ background: "rgba(255,255,255,0.015)" }}
        >
          <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/[0.15] flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="text-[14px] font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
            No knowledge base files yet
          </h3>
          <p className="mt-1 text-[12px] text-slate-500">
            Add documents and context to help your agent answer with accurate, up-to-date information.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-5 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-500 text-white text-[12px] font-semibold hover:bg-indigo-400 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Knowledge
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categoryGroups.map((group) => (
            <div
              key={group.category}
              className="cursor-default px-4 py-3.5 rounded-xl border border-white/[0.06] transition-all"
              style={{ background: "rgba(255,255,255,0.015)" }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-[12px] font-medium text-white truncate">{group.category}</h4>
                <span className="text-[10px] text-slate-600 shrink-0">
                  {group.itemCount} {group.itemCount === 1 ? "item" : "items"}
                </span>
              </div>
              {group.description ? (
                <p className="text-[10px] text-slate-500 line-clamp-2">{group.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) resetModal();
        }}
      >
        <DialogContent
          className="max-w-lg overflow-hidden bg-[#0D1B2A] border-white/10 text-white"
          showCloseButton={!isSubmitting}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <BookOpen className="h-5 w-5 text-cyan-400" />
              Add Knowledge
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a category, context, and supporting documents to your knowledge base.
            </DialogDescription>
          </DialogHeader>

          <div className="min-w-0 space-y-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-slate-300">Category</label>
              <div className="relative">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={isSubmitting}
                  className={KB_MODAL_SELECT_CLASS}
                >
                  <option value="" className="bg-[#0D1B2A] text-slate-400">
                    Select a category
                  </option>
                  {KB_MODAL_CATEGORIES.map((category) => (
                    <option key={category} value={category} className="bg-[#0D1B2A]">
                      {category}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-slate-300">Document Context</label>
              <textarea
                value={contextDocument}
                onChange={(e) => setContextDocument(e.target.value)}
                placeholder="Brief context about the category"
                rows={3}
                disabled={isSubmitting}
                className={`${KB_MODAL_FIELD_CLASS} resize-none placeholder:text-slate-500`}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-slate-300">Upload</label>
              <label
                className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-6 py-8 text-center transition-colors ${
                  isSubmitting
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:bg-white/[0.05]"
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept={KB_ACCEPTED_FILE_TYPES}
                  className="hidden"
                  disabled={isSubmitting}
                  onChange={(e) => {
                    handleContextFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />
                <Upload className="mb-3 h-5 w-5 text-slate-400" />
                <p className="text-sm font-semibold text-slate-200">Click to upload documents</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  PDF, DOCX
                </p>
              </label>

              {contextFiles.length > 0 && (
                <ul className="mt-3 max-h-[180px] min-w-0 space-y-2 overflow-y-auto overflow-x-hidden pr-1">
                  {contextFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-cyan-400" />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p
                          className="truncate text-[12px] font-medium text-white"
                          title={file.name}
                        >
                          {file.name}
                        </p>
                        <p className="truncate text-[10px] text-slate-500">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveContextFile(index)}
                        disabled={isSubmitting}
                        className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={resetModal}
              disabled={isSubmitting}
              className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleAddResponse()}
              disabled={
                isSubmitting ||
                !categoryId ||
                !contextDocument.trim() ||
                contextFiles.length === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-[#072b35] transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
