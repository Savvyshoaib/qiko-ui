"use client";

import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import GlobalLayout from "@/components/GlobalLayout";
import { DisplayDate } from "@/components/DisplayDate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, 
  Bot, 
  Sparkles, 
  ChevronRight,
  Zap,
  Crown,
  MessageSquare,
  Clock,
  GraduationCap,
  Target,
  Rocket,
  Link2,
  Download,
  Settings,
  ChevronDown,
  Plane,
  Building2,
  Briefcase,
  Heart,
  Scale,
  MoreHorizontal,
  ArrowLeft,
  Users,
  Trash2,
  AlertTriangle,
  Brain,
  Lock,
  Loader2,
  Phone,
  ArrowDownFromLine,
  ArrowUpFromLine,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { shallowEqual } from "react-redux";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { 
  fetchAvatarAgents, 
  fetchAvatarAgentDetail, 
  deleteAvatarAgent,
  clearSelectedAgent,
  updateAgentStudioLinked
} from "@/store/slices/avatarSlice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// Worker detail imports
import ChatWithWorker from "@/components/dashboard/ChatWithWorker";
import SimpleTrainWorker from "@/components/dashboard/SimpleTrainWorker";
import ReadinessDashboard from "@/components/dashboard/ReadinessDashboard";
import WorkerOptimiser from "@/components/dashboard/WorkerOptimiser";
import { Bookings } from "@/components/dashboard/Bookings";
import { BookingDetail } from "@/components/dashboard/BookingDetail";
import Connections from "@/components/dashboard/Connections";
import ExportData from "@/components/dashboard/ExportData";
import WorkerSettings from "@/components/dashboard/WorkerSettings";
import WorkerDashboard from "@/components/dashboard/WorkerDashboard";
import WorkerCallView from "@/components/dashboard/WorkerCallView";
import { CRM } from "@/components/dashboard/CRM";
import WorkerIntegrationLabels from "@/components/dashboard/WorkerIntegrationLabels";
import WorkerDetailSkeleton from "@/components/dashboard/WorkerDetailSkeleton";
import { set } from "date-fns";
import { toast } from "sonner";
import VoiceSettings from "@/components/dashboard/VoiceSettings";
import CallHistoryWorker from "@/components/dashboard/CallHistoryWorker";
import { WORKER_LIMIT } from "@/constants/brand";
import { isDefaultAgentSpecialization, toggleAgentStudioLinked } from "@/lib/avatarApi";
import WithPermission from "@/_core/components/WithPermission";

type WorkerView =
  | "overview"
  | "chat"
  | "train"
  | "call"
  | "ai-engine"
  | "optimiser"
  | "crm"
  | "bookings"
  | "booking-detail"
  | "connections"
  | "export"
  | "settings"
  | "voice";


const WORKER_TABS = [
  { id: "overview" as const, label: "Overview", icon: Sparkles },
  { id: "chat" as const, label: "Chat", icon: MessageSquare },
  // { id: "call" as const, label: "Call", icon: Phone },
  { id: "train" as const, label: "Train", icon: GraduationCap },
  // { id: "optimiser" as const, label: "Optimiser", icon: Rocket, soon: true },
  { id: "crm" as const, label: "CRM", icon: Users },
  // { id: "bookings" as const, label: "Bookings", icon: CalendarCheck },
  // { id: "connections" as const, label: "Connections", icon: Link2, soon: true  },
  { id: "export" as const, label: "Export", icon: Download, soon: true  },
  { id: "voice" as const, label: "Connections", icon: Link2 },
  { id: "settings" as const, label: "Settings", icon: Settings },
];

// const WORKER_LIMIT = 10;

const INDUSTRY_CATEGORIES: Record<string, { label: string; icon: typeof Plane; bgColor: string; borderColor: string; textColor: string }> = {
  pre_sales_writer_worker: {
    label: "Pre Sales Writer Worker",
    icon: MessageSquare,
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30",
    textColor: "text-indigo-400",
  },
  sales_intelligence: {
    label: "Sales Intelligence Worker",
    icon: Target,
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    textColor: "text-cyan-400",
  },
  financial_analyst: {
    label: "Financial Analyst",
    icon: Search,
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-400",
  },
  travel_leisure: { label: "Travel & Leisure", icon: Plane, bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30", textColor: "text-cyan-400" },
  real_estate: { label: "Real Estate", icon: Building2, bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30", textColor: "text-emerald-400" },
  financial_services: { label: "Financial Services", icon: Briefcase, bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30", textColor: "text-amber-400" },
  healthcare: { label: "Healthcare", icon: Heart, bgColor: "bg-rose-500/10", borderColor: "border-rose-500/30", textColor: "text-rose-400" },
  legal: { label: "Legal", icon: Scale, bgColor: "bg-violet-500/10", borderColor: "border-violet-500/30", textColor: "text-violet-400" },
  wealth_management: { label: "Wealth Management", icon: Briefcase, bgColor: "bg-indigo-500/10", borderColor: "border-indigo-500/30", textColor: "text-indigo-400" },
  other: { label: "Other", icon: Sparkles, bgColor: "bg-slate-500/10", borderColor: "border-slate-500/30", textColor: "text-slate-400" },
};

function normalizeWorkerIndustryKey(industry?: string | null): string {
  const trimmed = industry?.trim();
  if (!trimmed) return "other";
  return trimmed.toLowerCase().replace(/[\s-]+/g, "_");
}

function formatIndustrySlugLabel(slug: string): string {
  return slug
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getIndustryCategory(industryKey: string) {
  const normalized = normalizeWorkerIndustryKey(industryKey);
  if (INDUSTRY_CATEGORIES[normalized]) {
    return INDUSTRY_CATEGORIES[normalized];
  }
  if (normalized === "other") {
    return INDUSTRY_CATEGORIES.other;
  }
  return {
    label: formatIndustrySlugLabel(normalized),
    icon: Sparkles,
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30",
    textColor: "text-slate-400",
  };
}

export default function WorkersPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ workerId?: string; view?: string }>();
  const dispatch = useAppDispatch();
  
  // Redux state
  const { agents, selectedAgent, loading } = useAppSelector((state) => state.avatar);
  // const { subscribed } = useAppSelector((state) => state?.auth?.subscription ?? { subscribed: false });
  const canAccessStudioToggle = useAppSelector(
    (state) => Boolean((state.studioUser.data as any)?.data?.studio?.can_access)
  );
  const canAccessPropertyFinance = canAccessStudioToggle;
  const workerLimitRaw = useAppSelector(
    (state) =>
      (state.auth.subscription as { subscription?: { worker_limit?: unknown } } | null)?.subscription
        ?.worker_limit
  );
  const workerLimit =
    typeof workerLimitRaw === "number"
      ? workerLimitRaw
      : typeof workerLimitRaw === "string"
      ? Number(workerLimitRaw)
      : WORKER_LIMIT;
  const subscription = useAppSelector((state) => state.auth.subscription);
  const subscribed = subscription?.subscribed;

  // console.log("agents", agents);
  // Subscribed display values so header/identity card update in realtime when settings are saved
  const workerIdentityDisplay = useAppSelector(
    (state) => {
      const a = state.avatar.selectedAgent;
      
      // const toTitleCase = (str: string) =>
      //   str
      //     .toLowerCase()
      //     .split(' ')
      //     .map(word => word?.charAt(0).toUpperCase() + word?.slice(1))
      //     .join(' ');
      
      const name = a?.name || a?.fullName || a?.full_name || a?.agent_name || "Worker";
      const headline = (a?.headline || a?.professionalTitle || "AI Assistant");

      return {
        name: name,
        headline: headline,
      };
    },
    shallowEqual
  );
  
  const selectedWorkerKey = params.workerId ?? null; // can be id OR username
  const selectedWorkerId =
    selectedWorkerKey && /^\d+$/.test(selectedWorkerKey)
      ? parseInt(selectedWorkerKey, 10)
      : null;
  const initialView = (params.view as WorkerView) || "overview";
  
  // Get chat_status from query parameters and manage state
  const searchParams = new URLSearchParams(window.location.search);
  const initialChatStatus = searchParams.get('chat_status');
  const [chatStatus, setChatStatus] = useState<string | null>(initialChatStatus);
  const [isStickyTabsScrolled, setIsStickyTabsScrolled] = useState(false);

  // State for TRPC worker detail
  const [activeView, setActiveView] = useState<WorkerView>(initialView);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

  const [selectedModel, setSelectedModel] = useState<"gpt" | "custom">("gpt");
  const [isTrainingModel, setIsTrainingModel] = useState(false);
  const [customModelTrained, setCustomModelTrained] = useState(false);

  const [workerToDelete, setWorkerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [studioToggleLoadingByAgent, setStudioToggleLoadingByAgent] = useState<Record<string, boolean>>({});
  
  const confirmDelete = async () => {
    if (!workerToDelete) return;

    try {
      await dispatch(deleteAvatarAgent(workerToDelete.id)).unwrap();
      toast.success("Avatar deleted successfully");
      // Close modal
      setWorkerToDelete(null);
    } catch (error: any) {
      console.error("Delete failed:", error);
      toast.error(error.message || "Failed to delete avatar");
    }
  };
  
  const handleDeleteClick = (e: React.MouseEvent, workerId: string, workerName: string) => {
    e.stopPropagation();
    setWorkerToDelete({ id: workerId, name: workerName });
  };

  const isWorkerPublishedToStudio = (worker: any): boolean => {
    return Boolean((worker as { studio_linked?: boolean })?.studio_linked);
  };

  const canShowStudioToggleForWorker = (worker: any): boolean => {
    return !isDefaultAgentSpecialization(worker?.specialization);
  };

  const handlePublishToggle = async (e: React.MouseEvent, worker: any) => {
    e.stopPropagation();
    const agentId = String(worker?.agent_unique_id ?? "").trim();
    if (!agentId) {
      toast.error("Unable to update Studio state for this worker");
      return;
    }
    if (studioToggleLoadingByAgent[agentId]) {
      return;
    }

    try {
      setStudioToggleLoadingByAgent((prev) => ({ ...prev, [agentId]: true }));
      const nextStudioLinked = (worker as { studio_linked?: boolean })?.studio_linked !== true;
      const response = await toggleAgentStudioLinked(agentId, nextStudioLinked);
      dispatch(updateAgentStudioLinked({ agentId, studio_linked: nextStudioLinked }));
      toast.success(response.message || "Studio state updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update Studio state");
    } finally {
      setStudioToggleLoadingByAgent((prev) => {
        const next = { ...prev };
        delete next[agentId];
        return next;
      });
    }
  };
 
// Function to load worker by id OR username using Redux
const loadWorker = async (workerKey: string) => {
  try {
    // If URL param is numeric id, resolve username from the agents list first
    if (/^\d+$/.test(workerKey)) {
      const id = parseInt(workerKey, 10);
      const agent = agents.find((w) => w.id === id.toString());
      const username = agent?.user_name;
      if (!username) throw new Error("Worker not found");
      await dispatch(fetchAvatarAgentDetail(username)).unwrap();
      return;
    }

    // Otherwise treat it as username
    await dispatch(fetchAvatarAgentDetail(workerKey)).unwrap();
  } catch (err: any) {
    console.error(err);
    toast.error(err.message || "Failed to fetch worker details");
  }
};

// Load on selectedWorkerId change
useEffect(() => {
  if (selectedWorkerKey) {
    loadWorker(selectedWorkerKey);
  } else {
    // Clear selected agent when navigating away
    dispatch(clearSelectedAgent());
  }
}, [selectedWorkerKey]);

// ✅ Replacement for refetchWorker
const refetchWorker = (newStatus?: string) => {
  if (newStatus) {
    setChatStatus(newStatus);
    // Update URL with new chat_status
    const currentView = activeView === "overview" ? "" : `/${activeView}`;
    setLocation(`/app/workers/${selectedWorkerKey}${currentView}?chat_status=${newStatus}`);
  }
  // if (selectedWorkerKey) loadWorker(selectedWorkerKey);
};


  useEffect(() => {
    if (!selectedWorkerId) {
      // Fetch agents using Redux
      dispatch(fetchAvatarAgents());
    }
  }, [selectedWorkerId, dispatch]);

  useEffect(() => {
    if (params.view) {
      setActiveView(params.view as WorkerView);
    }
  }, [params.view]);

  // Update chatStatus when URL changes
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const newChatStatus = searchParams.get('chat_status');
    if (newChatStatus !== chatStatus) {
      setChatStatus(newChatStatus);
    }
  }, [window.location.search]);

  useEffect(() => {
    const SCROLLED_ON_AT = 120;
    const SCROLLED_OFF_AT = 80;

    const onScroll = () => {
      const y = window.scrollY || 0;
      setIsStickyTabsScrolled((prev) => {
        // Use hysteresis to avoid sticky class flipping on/off rapidly
        // when layout shifts around the threshold.
        if (prev) return y > SCROLLED_OFF_AT;
        return y > SCROLLED_ON_AT;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSelectWorker = (workerId: string, chatStatus?: string) => {
    if (chatStatus) {
      setLocation(`/app/workers/${workerId}?chat_status=${chatStatus}`);
    } else {
      setLocation(`/app/workers/${workerId}`);
    }
    setActiveView("overview");
  };

  const handleTabChange = (view: WorkerView) => {
    setActiveView(view);
    if (selectedWorkerKey) {
      const url = chatStatus 
        ? `/app/workers/${selectedWorkerKey}/${view}?chat_status=${chatStatus}`
        : `/app/workers/${selectedWorkerKey}/${view}`;
      setLocation(url);
    }
  };

  const handleBackToList = () => {
    setLocation("/app/workers");
  };

  const renderWorkerContent = () => {
    if (!selectedAgent) return null;

    switch (activeView) {
      case "overview":
        return <WorkerDashboard worker={selectedAgent} onUpdate={refetchWorker} />;
      case "chat":
        return <ChatWithWorker worker={selectedAgent} />;
      case "call":
        return <WorkerCallView workerId={selectedWorkerKey!} worker={selectedAgent} />;
      case "train":
        return (
          <SimpleTrainWorker
            worker={selectedAgent}
            onUpdate={refetchWorker}
            canAccessPropertyFinance={canAccessPropertyFinance}
          />
        );
      case "ai-engine":
        return <ReadinessDashboard worker={selectedAgent} onNavigate={(v) => setActiveView(v as WorkerView)} />;
      case "optimiser":
        return <WorkerOptimiser worker={selectedAgent} onNavigate={(v) => setActiveView(v as WorkerView)} />;
      case "crm":
        return (
          <>      
          <CRM
            workerId={Number(selectedAgent?.id) || 0}
            agentId={selectedAgent?.agent_id ?? undefined}
            onSelectBooking={(id) => {
              setSelectedBookingId(id);
              setActiveView("booking-detail");
            }}
          />
          </>
        );
      case "bookings":
        return (
          <Bookings
            workerId={selectedAgent?.id}
            onSelectBooking={(id) => {
              setSelectedBookingId(id);
              setActiveView("booking-detail");
            }}
          />
        );
      case "booking-detail":
        return selectedBookingId ? (
          <BookingDetail bookingId={selectedBookingId} onBack={() => setActiveView("bookings")} />
        ) : null;
      case "connections":
        return <Connections worker={selectedAgent} onUpdate={refetchWorker} onNavigate={(v) => setActiveView(v as WorkerView)} />;
      case "voice":
        return <VoiceSettings worker={selectedAgent} onUpdate={refetchWorker} />;
      case "export":
        return <ExportData worker={selectedAgent} onUpdate={refetchWorker} />;
      case "settings":
        return <WorkerSettings worker={{ ...selectedAgent, chat_status: chatStatus }} onUpdate={refetchWorker} />;
      default:
        return <WorkerDashboard worker={selectedAgent} onUpdate={refetchWorker} />;
    }
  };

  // ✅ For Avatar API worker list - use Redux state
  const activeWorkers = agents;
  const isWorkersLoading = loading.agents;
  // const hasReachedWorkerLimit = !subscribed || (activeWorkers.length >= WORKER_LIMIT);
  const hasReachedWorkerLimit = () => {
    if(!subscribed || (activeWorkers.length >= workerLimit)) {
      return true
    }

    if(!subscribed || (activeWorkers.length >= workerLimit)) {
      return 'CONTACT'
    }
    return false
  }

  const renderWorkerCtaButton = ({
    createButtonSize = "default",
    createButtonClassName,
  }: {
    createButtonSize?: "default" | "lg";
    createButtonClassName: string;
  }) => {
    if (isWorkersLoading) {
      return (
        <div
          className={`animate-pulse rounded-xl bg-white/10 ${
            createButtonSize === "lg" ? "h-11 w-40" : "h-10 w-32"
          }`}
        />
      );
    }

    if (hasReachedWorkerLimit()) {
      return (
        <Button
          onClick={() => setLocation("/app/pricing")}
          className="bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl shadow-lg shadow-amber-500/30"
        >
          <Crown className="mr-2 h-4 w-4" />
          {hasReachedWorkerLimit() === "CONTACT" ? "Contact for more" : "Upgrade Now"}
        </Button>
      );
    }

    return (
      <Button
        onClick={() => setLocation("/onboarding")}
        size={createButtonSize}
        className={createButtonClassName}
      >
        <Plus className={`mr-2 ${createButtonSize === "lg" ? "h-5 w-5" : "h-4 w-4"}`} />
        Create Worker
      </Button>
    );
  };

  // Group workers by industry (each worker has industry key)
  const workersByIndustry = activeWorkers.reduce<Record<string, typeof activeWorkers>>((acc, worker) => {
    const industry = normalizeWorkerIndustryKey((worker as { industry?: string }).industry);
    if (!acc[industry]) acc[industry] = [];
    acc[industry].push(worker);
    return acc;
  }, {});

  // If a workerId is present → show worker detail view
  if (selectedWorkerKey) {
    if (loading.selectedAgent) {
      return (
        <GlobalLayout activeSection="workers">
          <WorkerDetailSkeleton />
        </GlobalLayout>
      );
    }

    return (
      <GlobalLayout activeSection="workers">
        <div className="flex flex-col h-full">
          {/* Worker Header & Tabs */}
          <div className={`bg-[#0a0f1a]/80  border-b border-white/5 relative ${isStickyTabsScrolled ? "" : "backdrop-blur-xl"}`}>
            <div className="px-6 py-4 flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBackToList}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                All Workers
              </Button>
              {/* <h1 className="text-lg font-bold text-white">{selectedAgent?.fullName || selectedAgent?.full_name || selectedAgent?.user_name}</h1> */}
            </div>

            
            {/* Worker Identity Card – uses workerIdentityDisplay so name/headline update in realtime after save */}
            <div className="_WorkerIdentityCard px-6 py-4 bg-gradient-to-r from-slate-800/30 to-slate-700/20">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg"
                >
                  {workerIdentityDisplay.name.charAt(0) || "W"}
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-white">{workerIdentityDisplay.name}</h1>
                  <p className="text-sm text-slate-400">{workerIdentityDisplay.headline}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline"
                    className={`${
                      selectedAgent?.agent_status === 'ready' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${selectedAgent?.agent_status === 'ready' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    {selectedAgent?.agent_status === 'ready' ? 'Ready' : 'Training'}
                  </Badge>
                  {selectedAgent?.planType === 'premium' && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                      <Crown className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
              </div>
            </div>


            {/* AI Command Centre */}
            <div className="px-4 sm:px-6 py-4 border-t border-white/5">
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex w-max sm:w-full items-stretch gap-3 sm:gap-6 pr-2 sm:pr-0">
                {/* GPT-4 Option */}
                <button
                  onClick={() => setSelectedModel('gpt')}
                  className={`relative group rounded-xl p-3 sm:p-4 transition-all duration-200 min-w-[155px] sm:min-w-0 sm:flex-1 ${
                    selectedModel === 'gpt'
                      ? 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                      : 'bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedModel === 'gpt' 
                        ? 'bg-gradient-to-br from-emerald-500 to-cyan-500' 
                        : 'bg-slate-700'
                    }`}>
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className={`font-semibold text-sm sm:text-base ${
                          selectedModel === 'gpt' ? 'text-white' : 'text-slate-300'
                        }`}>Qiko-Sonic</span>
                        {selectedModel === 'gpt' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-emerald-500/30 text-emerald-300 shrink-0">ACTIVE</span>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-400">Instant • No setup</p>
                    </div>
                  </div>
                  {selectedModel === 'gpt' && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>

                {/* Custom Model Option */}
                <button
                 disabled={true}
                  // onClick={() => setSelectedModel('custom')}
                  className={`relative group rounded-xl p-3 sm:p-4 transition-all duration-200 min-w-[155px] sm:min-w-0 sm:flex-1 ${
                    selectedModel === 'custom'
                      ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 shadow-lg shadow-purple-500/10'
                      : 'bg-white/[0.01]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedModel === 'custom' 
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                        : 'bg-slate-700'
                    }`}>
                      <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className={`font-semibold text-sm sm:text-base ${
                          selectedModel === 'custom' ? 'text-white' : 'text-slate-300'
                        }`}>Custom{" "}
                          <span className="text-[9px] sm:text-[10px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 whitespace-nowrap">COMING SOON</span>
                        </span>
                        {selectedModel === 'custom' && customModelTrained && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/30 text-purple-300">TRAINED</span>
                        )}
                        {selectedModel === 'custom' && !customModelTrained && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/30 text-amber-300">SETUP</span>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-400">Fine-tuned • Your data</p>
                    </div>
                  </div>
                  {selectedModel === 'custom' && customModelTrained && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  )}
                </button>
              </div>
              </div>
              
              {/* Custom model setup prompt */}
              {selectedModel === 'custom' && !customModelTrained && (
                <div className="mt-3 flex items-center justify-between px-1">
                  <p className="text-xs text-slate-400">Train a custom model on your expertise</p>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30"
                    onClick={() => handleTabChange('train')}
                  >
                    Setup Training <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>

            {/* Worker-specific tabs */}
            <div className={`px-4 sm:px-6 border-t border-white/5 sticky-block-div ${isStickyTabsScrolled ? "sticky-block-div-scrolled" : ""}`}>
              <div className="overflow-x-auto scrollbar-hide py-2">
                <div className="flex w-max items-center gap-2">
                {WORKER_TABS.filter(tab => {
                  // Hide bookings tab unless travel industry
                  // if (tab.id === 'bookings' && selectedWorker.industry !== 'travel_leisure') return false;
                  // Hide export tab when GPT model is selected (can only export custom models)
                  if (tab.id === 'export' && selectedModel === 'gpt') return false;
                  return true;
                }).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeView === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`
                        inline-flex h-10 items-center gap-2 rounded-xl px-3 sm:px-4
                        text-[13px] sm:text-sm font-medium whitespace-nowrap flex-shrink-0
                        transition-all duration-200
                        ${isActive
                          ? 'bg-slate-800/80 text-white shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span className="leading-none">{tab.label}</span>
                       {tab.soon && (
                        <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 shrink-0">
  PRO
</span>
                      )}
                    </button>
                  );
                })}
                </div>
              </div>
            </div>
 
          </div>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={`worker-${selectedWorkerKey}-${activeView}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {renderWorkerContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </GlobalLayout>
    );
  }

  // ✅ /app/workers list view
  return (
    <GlobalLayout activeSection="workers">
      <div className="flex h-full flex-col">
        <div className="relative flex flex-col gap-4 border-b border-white/5 bg-[#0a0f1a]/80 px-4 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "Satoshi, sans-serif", background: "linear-gradient(135deg, #ffffff 0%, #6366F1 50%, #22D3EE 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Your Workers
            </h1>
            <p className="text-sm text-slate-400">
              {(activeWorkers.length && subscribed) ? activeWorkers.length : 0} active avatar{activeWorkers.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex w-full items-center justify-start gap-3 sm:w-auto sm:justify-end">
            {renderWorkerCtaButton({
              createButtonClassName:
                "bg-gradient-to-r from-[#6366F1] to-[#22D3EE] text-white font-medium rounded-xl shadow-lg shadow-[#6366F1]/20",
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          
          {loading.agents ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (activeWorkers.length === 0 || !subscribed) ? (
            <div className="max-w-xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 px-6 rounded-3xl border border-dashed border-white/10"
                style={{ background: "rgba(99, 102, 241, 0.05)" }}
              >
                <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(34, 211, 238, 0.2))", boxShadow: "0 0 60px rgba(99, 102, 241, 0.3)" }}>
                  <Bot className="h-10 w-10 text-[#22D3EE]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Create your first worker</h3>
                <p className="text-slate-400 mb-8 max-w-sm mx-auto">Build an AI worker that knows your expertise and can handle client conversations 24/7.</p>
                {renderWorkerCtaButton({
                  createButtonSize: "lg",
                  createButtonClassName:
                    "bg-gradient-to-r from-[#6366F1] to-[#22D3EE] hover:from-[#818CF8] hover:to-[#22D3EE] text-white font-semibold rounded-xl shadow-lg shadow-[#6366F1]/30",
                })}
              </motion.div>
            </div>
          ) : (
            <div className="mx-auto max-w-6xl space-y-8 sm:space-y-10">
              {Object.entries(workersByIndustry)
                .sort(([a], [b]) => {
                  if (a === "other") return 1;
                  if (b === "other") return -1;
                  return 0;
                })
                .map(([industry, industryWorkers], categoryIndex) => {
                const category = getIndustryCategory(industry);
                const CategoryIcon = category.icon;

                return (
                  <motion.div
                    key={industry}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: categoryIndex * 0.1 }}
                  >
                    {/* Category Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl ${category.bgColor} ${category.borderColor} border flex items-center justify-center`}>
                        <CategoryIcon className={`w-5 h-5 ${category.textColor}`} />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">{category.label}</h2>
                        <p className="text-xs text-slate-500">{industryWorkers.length} worker{industryWorkers.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>

                    {/* Workers grid for this industry */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {industryWorkers.map((worker, index) => (
                        <motion.div
                          key={worker.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: categoryIndex * 0.1 + index * 0.05 }}
                          whileHover={{ scale: 1.02, y: -4 }}
                          onClick={() => handleSelectWorker(worker.agent_unique_id ?? String(worker.id), worker.status)}
                          className="cursor-pointer group"
                        >
                          <Card className="bg-[#0a0f1a]/80 backdrop-blur-xl border border-white/10 overflow-hidden relative py-2">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-purple-500" />
                            <CardContent className="p-5 flex items-start gap-4">
                            <div
                                className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold
                                  bg-gradient-to-br ${
                                    (worker as any)?.industry === "other"
                                      ? "from-slate-500 to-gray-500"
                                      : "from-cyan-500 to-blue-500"
                                  } text-white
                                  shadow-lg group-hover:shadow-xl transition-shadow
                                `}
                              >
                                {worker?.agent_name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-white capitalize truncate group-hover:text-[#22D3EE] transition-colors">
                                  {worker?.agent_name}
                                </h3>
                                {/* <p className="text-sm text-slate-400 truncate mb-3">{worker?.industry}</p> */}
                                <div className="flex items-center gap-1 flex-wrap">
                                  <Badge
                                    className={`text-xs capitalize ${
                                      worker?.status === "ready"
                                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                    }`}
                                  >
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full mr-0.5 ${
                                        worker?.status === "ready" ? "bg-emerald-400" : "bg-amber-400"
                                      }`}
                                    />
                                    {worker?.status}
                                  </Badge>
                                  {/* <WorkerIntegrationLabels
                                    workerDetail={worker}
                                  /> */}
                                </div>
                                <DisplayDate
                                  value={worker?.created_at}
                                  prefix="Created: "
                                  className="text-sm text-slate-400 truncate mb-1 text-xs"
                                />
                               
                              </div>
                              <div className="flex items-center gap-1">

                                    {canAccessStudioToggle && canShowStudioToggleForWorker(worker) && <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={Boolean(studioToggleLoadingByAgent[String(worker?.agent_unique_id ?? "")])}
                                      className={`h-8 w-8 transition-all ${
                                        isWorkerPublishedToStudio(worker)
                                          ? 'text-emerald-400 hover:text-amber-400 hover:bg-amber-500/10'
                                          : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                                      }`}
                                      onClick={(e) => handlePublishToggle(e, worker)}
                                      title={isWorkerPublishedToStudio(worker) ? 'Remove from Studio' : 'Push to Studio'}
                                    >
                                      {studioToggleLoadingByAgent[String(worker?.agent_unique_id ?? "")] ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : isWorkerPublishedToStudio(worker) ? (
                                        <ArrowDownFromLine className="h-4 w-4" />
                                      ) : (
                                        <ArrowUpFromLine className="h-4 w-4" />
                                      )}
                                    </Button>}
                              


                              <WithPermission showChildren={false}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                  onClick={(e) => handleDeleteClick(e, worker?.agent_unique_id ?? "", worker?.agent_name ?? worker?.user_name ?? "")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                </WithPermission>
                                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-[#22D3EE] group-hover:translate-x-1 transition-all flex-shrink-0" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!workerToDelete} onOpenChange={() => setWorkerToDelete(null)}>
        <AlertDialogContent className="bg-[#0a0f1a] border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Delete Worker
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete <span className="text-white font-medium">{workerToDelete?.name}</span>? 
              This action cannot be undone. All associated data including chat history, training rules, and connections will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={loading.delete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {loading.delete ? "Deleting..." : "Delete Worker"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GlobalLayout>
  );
}
