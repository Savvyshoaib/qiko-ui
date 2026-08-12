import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import GlobalLayout from "@/components/GlobalLayout";
import WorkerCtaButton from "@/components/dashboard/WorkerCtaButton";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAvatarAgents } from "@/store/slices/avatarSlice";
import { WORKER_LIMIT } from "@/constants/brand";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BookOpen,
  Clock,
  Database,
  FileText,
  ListChecks,
  Loader2,
  MessageSquare,
  Store,
  Star,
  Shield,
  Trophy,
  TrendingUp,
  Crown,
  Target,
  Rocket,
  Zap,
  FlaskConical,
  Radar,
} from "lucide-react";
import { toast } from "sonner";
import {
  agentToStudioWorker,
  isEssentialLivingWorker,
  isPreSalesWriterWorker,
  isSalesIntelligenceWorker,
  type StudioDashboardWorker,
} from "@/pages/studio-dashboard/studioSections";

function getRank(count: number) {
  if (count >= 10) return { title: "AI Mogul", icon: Crown, color: "text-amber-400", bg: "bg-amber-400/10" };
  if (count >= 5) return { title: "Team Lead", icon: Trophy, color: "text-purple-400", bg: "bg-purple-400/10" };
  if (count >= 3) return { title: "Rising Builder", icon: TrendingUp, color: "text-cyan-400", bg: "bg-cyan-400/10" };
  if (count >= 1) return { title: "First Hire", icon: Star, color: "text-emerald-400", bg: "bg-emerald-400/10" };
  return { title: "Getting Started", icon: Target, color: "text-slate-400", bg: "bg-slate-400/10" };
}


type StudioWorker = StudioDashboardWorker;

type UseCaseStatus = "active" | "available" | "coming_soon";

type StudioUseCase = {
  title: string;
  description: string;
  icon: typeof MessageSquare;
  status: UseCaseStatus;
  tag?: string;
};

type WorkerSummary = {
  inProgress: number;
  sections: string;
  knowledgeBase: number | string;
  nextDeadline: string;
  useCases: StudioUseCase[];
};

const WORKER_SUMMARIES: Record<string, WorkerSummary> = {
  sales: {
    inProgress: 2,
    sections: "7/12",
    knowledgeBase: 847,
    nextDeadline: "8 days",
    useCases: [
      {
        title: "AI Response Generation",
        description: "Generate section-by-section RFP responses from the knowledge base",
        icon: FileText,
        status: "active",
        tag: "DOCUMENT",
      },
      {
        title: "Knowledge Base",
        description: "Manage and search your response library",
        icon: BookOpen,
        status: "active",
        tag: "MONITOR",
      },
      {
        title: "Section Assignment",
        description: "Assign and track section ownership across the team",
        icon: ListChecks,
        status: "active",
        tag: "LIST",
      },
    ],
  },
  sales_intel: {
    inProgress: 2,
    sections: "6/10",
    knowledgeBase: "—",
    nextDeadline: "6 days",
    useCases: [
      {
        title: "Opportunity Pipeline",
        description: "Track tenders from ingestion through Salesforce push",
        icon: Target,
        status: "active",
        tag: "PIPELINE",
      },
      {
        title: "Review Queue",
        description: "Human validation before Salesforce sync",
        icon: ListChecks,
        status: "active",
        tag: "REVIEW",
      },
      {
        title: "Ingestion Sources",
        description: "Portal scans and manual opportunity upload",
        icon: Radar,
        status: "active",
        tag: "SOURCES",
      },
    ],
  },
  finance: {
    inProgress: 2,
    sections: "7/12",
    knowledgeBase: 847,
    nextDeadline: "8 days",
    useCases: [
      {
        title: "Financial Dashboard",
        description: "Portfolio KPIs, property performance, and vendor spend analysis",
        icon: BarChart3,
        status: "active",
        tag: "ANALYTICS",
      },
      {
        title: "Finance Knowledge Base",
        description: "Uploaded financial workbooks and indexed portfolio data",
        icon: BookOpen,
        status: "active",
        tag: "DATA",
      },
      {
        title: "Risk Review",
        description: "Property-level risk, outstanding balances, and margin review",
        icon: Shield,
        status: "available",
      },
    ],
  },
  worker: {
    inProgress: 0,
    sections: "-",
    knowledgeBase: 234,
    nextDeadline: "-",
    useCases: [
      {
        title: "Worker Chat",
        description: "Use this deployed worker in Studio",
        icon: MessageSquare,
        status: "active",
        tag: "CHAT",
      },
      {
        title: "Knowledge Base",
        description: "Review worker documents, FAQs, and training data",
        icon: Database,
        status: "active",
        tag: "DATA",
      },
      {
        title: "Activity Review",
        description: "Track worker usage and operational performance",
        icon: TrendingUp,
        status: "available",
      },
    ],
  },
};

function getWorkerSummary(worker: StudioWorker): WorkerSummary {
  if (isSalesIntelligenceWorker(worker)) {
    return WORKER_SUMMARIES.sales_intel;
  }
  if (isPreSalesWriterWorker(worker)) {
    return WORKER_SUMMARIES.sales;
  }
  if (isEssentialLivingWorker(worker)) {
    return WORKER_SUMMARIES.finance;
  }
  const haystack = `${worker.name} ${worker.professionalTitle} ${worker.template}`.toLowerCase();
  if (
    haystack.includes("pre-sales") ||
    haystack.includes("rfp") ||
    haystack.includes("proposal")
  ) {
    return WORKER_SUMMARIES.sales;
  }
  if (
    haystack.includes("finance") ||
    haystack.includes("financial") ||
    haystack.includes("analyst") ||
    haystack.includes("property")
  ) {
    return WORKER_SUMMARIES.finance;
  }
  return WORKER_SUMMARIES.worker;
}

export default function StudioHome() {
  const [, setLocation] = useLocation();
  const dispatch = useAppDispatch();
  const { agents, loading } = useAppSelector((state) => state.avatar);
  const subscription = useAppSelector((state) => state.auth.subscription);
  const subscribed = Boolean(subscription?.subscribed);
  const studioWorkers: StudioWorker[] = useMemo(
    () =>
      (agents ?? [])
        .filter((a: any) => Boolean(a?.studio_linked ))  // EL_CHANGE_KEY
        .map((agent: any) => agentToStudioWorker(agent)),
    [agents]
  );
  const isLoading = loading?.agents ?? false;
  const totalAgentWorkers = Array.isArray(agents) ? agents.length : 0;

  useEffect(() => {
    dispatch(fetchAvatarAgents());
  }, [dispatch]);

  const handleWorkerClick = (worker: StudioWorker) => {
    if (isEssentialLivingWorker(worker)) {
      setLocation(`/app/studio/${worker.id}/user-dashboard`);
      return;
    }
    setLocation(`/app/studio/${worker.id}`);
  };

  const totalWorkers = studioWorkers.length;
  const inTraining = 0;
  const rank = getRank(totalWorkers);
  const RankIcon = rank.icon;

  return (
    <GlobalLayout activeSection="studio">
      <div className="flex-1 flex flex-col overflow-y-auto bg-[#080C14]">
        {isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10 lg:py-10">
            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Studio
                  </span>
                </div>
                <h1
                  className="text-2xl font-bold tracking-[-0.02em] text-white lg:text-3xl"
                  style={{ fontFamily: "Satoshi, sans-serif" }}
                >
                  Your deployed workers
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                  Manage workers that have been pushed to Studio. Open a worker to use its live dashboard and workspace.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => toast.info("Marketplace coming soon — hire and trade workers")}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-xs font-medium text-slate-400 transition-all hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-slate-200"
                >
                  <Store className="h-3.5 w-3.5" />
                  Marketplace
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-slate-500">Soon</span>
                </button>
                <WorkerCtaButton
                  workersCount={totalAgentWorkers}
                  workerLimit={WORKER_LIMIT}
                  subscribed={subscribed}
                  onCreate={() => setLocation("/onboarding?returnTo=%2Fapp%2Fstudio")}
                  onUpgrade={() => setLocation("/app/pricing")}
                  size="sm"
                  createButtonClassName="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/15 transition-all hover:bg-indigo-400"
                  createIconClassName="h-3.5 w-3.5"
                  upgradeButtonClassName="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-semibold text-black shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400"
                  upgradeIconClassName="h-3.5 w-3.5"
                />
              </div>
            </div>



            {totalWorkers === 0 ? (
              <div className="flex flex-col items-center rounded-3xl border border-white/[0.06] bg-white/[0.02] px-6 py-20 text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                  <Bot className="h-8 w-8 text-slate-600" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-white" style={{ fontFamily: "Satoshi, sans-serif" }}>
                  No workers deployed
                </h3>
                <p className="mb-7 max-w-sm text-sm leading-relaxed text-slate-500">
                  Build a worker, train it on your data, then push it to Studio when it is ready to use.
                </p>
                <button
                  onClick={() => setLocation("/app/workers")}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-400"
                >
                  <Rocket className="h-4 w-4" />
                  Build & Deploy Worker
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {studioWorkers.map((worker) => {
                  const summary = getWorkerSummary(worker);
                  const activeUseCases = summary.useCases.filter((useCase) => useCase.status === "active").length;
                  const isResearcher = worker.template === "researcher";
               
                  return (
                    <button
                      key={worker.id}
                      onClick={() => handleWorkerClick(worker)}
                      className="group text-left rounded-2xl border border-white/[0.06] hover:border-indigo-500/[0.3] hover:shadow-[0_0_60px_-15px_rgba(99,102,241,0.12)] transition-all duration-300 overflow-hidden"
                      style={{ background: "linear-gradient(165deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.005) 100%)" }}
                    >
                      {/* Card header */}
                      <div className="px-6 pt-6 pb-4">
                        <div className="flex items-start justify-between mb-5">
                          <div className="flex items-center gap-3.5">
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center"
                              style={{
                                background: isResearcher ? "rgba(34,211,238,0.08)" : "rgba(99,102,241,0.08)",
                                border: `1px solid ${isResearcher ? "rgba(34,211,238,0.15)" : "rgba(99,102,241,0.15)"}`,
                              }}
                            >
                              {isResearcher
                                ? <FlaskConical className="w-5 h-5 text-cyan-400" />
                                : <MessageSquare className="w-5 h-5 text-indigo-400" />
                              }
                            </div>
                            <div>
                              <h3 className="text-[15px] font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
                                {worker.name || "Untitled Worker"}
                              </h3>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {worker.professionalTitle || (isResearcher ? "Research & analysis" : "Pre-sales & RFP responses")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-emerald-400/80 bg-emerald-400/[0.08] px-2.5 py-[3px] rounded-full font-semibold uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors" />
                          </div>
                        </div>
  
                        {/* 4 Metrics */}
                        <div className="grid grid-cols-4 gap-3">
                          <div className="px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <p className="text-[17px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                              {summary.inProgress}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-0.5">In Progress</p>
                          </div>
                          <div className="px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <p className="text-[17px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                              {summary.sections}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-0.5">Sections</p>
                          </div>
                          <div className="px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <p className="text-[17px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                              {summary.knowledgeBase}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-0.5">KB Responses</p>
                          </div>
                          <div className="px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <p className="text-[17px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                              {summary.nextDeadline}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-0.5">Next Deadline</p>
                          </div>
                        </div>
                      </div>
  
                      {/* Card footer — use case tags */}
                      <div className="border-t border-white/[0.04] px-6 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3 h-3 text-indigo-400/60" />
                          <span className="text-[10px] text-slate-500">{activeUseCases} active use cases</span>
                        </div>
                        <span className="text-[10px] text-slate-600">Last active 2h ago</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </GlobalLayout>
  );
}
