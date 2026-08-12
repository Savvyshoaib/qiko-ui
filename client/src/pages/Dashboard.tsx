
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { 
  MessageSquare, 
  GraduationCap, 
  Settings, 
  User, 
  ChevronRight,
  Sparkles,
  Menu,
  X,
  Link2,
  BarChart3,
  DollarSign,
  CreditCard,
  Download,
  Target,
  Rocket,
  CalendarCheck,
  ArrowLeft,
  LayoutGrid,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import ChatWithWorker from "@/components/dashboard/ChatWithWorker";
import TrainWorker from "@/components/dashboard/TrainWorker";
import LoadData from "@/components/dashboard/LoadData";
import WorkerSettings from "@/components/dashboard/WorkerSettings";
import Connections from "@/components/dashboard/Connections";
import Performance from "@/components/dashboard/Performance";
import Commercials from "@/components/dashboard/Commercials";
import WorkerDashboard from "@/components/dashboard/WorkerDashboard";
import QikoAssistant from "@/components/QikoAssistant";
import RapidQA from "@/components/dashboard/RapidQA";
import ReadinessDashboard from "@/components/dashboard/ReadinessDashboard";
import SyntheticDataGenerator from "@/components/dashboard/SyntheticDataGenerator";
import TierSelection from "@/components/dashboard/TierSelection";
import ExportData from "@/components/dashboard/ExportData";
import { PublishWorker } from "@/components/dashboard/PublishWorker";
import WorkerOptimiser from "@/components/dashboard/WorkerOptimiser";
import { Bookings } from "@/components/dashboard/Bookings";
import { BookingDetail } from "@/components/dashboard/BookingDetail";
import FineTuningHistory from "@/components/dashboard/FineTuningHistory";
import FineTuningProgress from "@/components/dashboard/FineTuningProgress";

type DashboardView = "dashboard" | "chat" | "train" | "data" | "rapidqa" | "synthetic" | "readiness" | "pricing" | "export" | "publish" | "connections" | "commercials" | "performance" | "settings" | "optimiser" | "bookings" | "booking-detail" | "fine-tuning-history" | "fine-tuning-progress";



// Base sidebar items for all industries
const BASE_SIDEBAR_ITEMS = [
  { id: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
  { id: "chat" as const, label: "Chat with Worker", icon: MessageSquare },
  { id: "train" as const, label: "Train Worker", icon: GraduationCap },
  { id: "readiness" as const, label: "AI Engine", icon: Target },
  { id: "optimiser" as const, label: "Worker Optimiser", icon: Rocket },
];

// Travel & Leisure specific items
const TRAVEL_SIDEBAR_ITEMS = [
  { id: "bookings" as const, label: "Bookings", icon: CalendarCheck },
];

// Common items for all industries
const COMMON_SIDEBAR_ITEMS = [
  { id: "pricing" as const, label: "Plans & Pricing", icon: CreditCard },
  { id: "export" as const, label: "Export Data", icon: Download },
  { id: "connections" as const, label: "Connections", icon: Link2 },
  { id: "settings" as const, label: "Settings", icon: Settings },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const params = useParams<{ workerId?: string; view?: string }>();
  const workerId = params.workerId ? parseInt(params.workerId, 10) : undefined;
  const initialView = (params.view as DashboardView) || "dashboard";
  const [activeView, setActiveView] = useState<DashboardView>(initialView);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [suggestedRule, setSuggestedRule] = useState<any | null>(null);
  
  // Sync activeView with URL params
  useEffect(() => {
    if (params.view && params.view !== activeView) {
      setActiveView(params.view as DashboardView);
    }
  }, [params.view]);
  
  // Use workerId from URL if provided, otherwise fall back to default get
  const { data: worker, isLoading: workerLoading, refetch } = workerId 
    ? trpc.worker.getById.useQuery({ workerId })
    : trpc.worker.get.useQuery();

  if (workerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-lg qiko-gradient animate-pulse-glow flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-background" />
        </div>
      </div>
    );
  }

  if (!worker) {
    setLocation("/wizard");
    return null;
  }

  const workerName = worker.fullName 
    ? `${worker.fullName.split(" ")[0]}'s Worker`
    : "Your Digital Worker";

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <WorkerDashboard worker={worker} onUpdate={refetch} />;
      case "chat":
        return <ChatWithWorker worker={worker} />;
      case "train":
        return <TrainWorker worker={worker} onUpdate={refetch} suggestedRule={suggestedRule} />;
      case "data":
        return <LoadData worker={worker} onUpdate={refetch} />;
      case "rapidqa":
        return <RapidQA worker={worker} onUpdate={refetch} />;
      case "synthetic":
        return <SyntheticDataGenerator worker={worker} onUpdate={refetch} />;
      case "readiness":
        return <ReadinessDashboard worker={worker} onNavigate={setActiveView} />;
      case "pricing":
        return <TierSelection worker={worker} onUpdate={refetch} />;
      case "export":
        return <ExportData worker={worker} onUpdate={refetch} />;
      case "publish":
        return <PublishWorker workerId={worker.id} workerName={worker.fullName || "Your Worker"} />;
      case "connections":
        return <Connections worker={worker} onUpdate={refetch} onNavigate={setActiveView} />;
      case "commercials":
        return <Commercials workerId={worker.id} />;
      case "performance":
        return <Performance worker={worker} onUpdate={refetch} />;
      case "settings":
        return <WorkerSettings worker={worker} onUpdate={refetch} />;
      case "optimiser":
        return <WorkerOptimiser worker={worker} onNavigate={setActiveView} />;
      case "bookings":
        return <Bookings workerId={worker.id} onSelectBooking={(id) => {
          setSelectedBookingId(id);
          setActiveView("booking-detail");
        }} />;
      case "booking-detail":
        return selectedBookingId ? (
          <BookingDetail 
            bookingId={selectedBookingId} 
            onBack={() => setActiveView("bookings")} 
          />
        ) : (
          <Bookings workerId={worker.id} onSelectBooking={(id) => {
            setSelectedBookingId(id);
            setActiveView("booking-detail");
          }} />
        );
      case "fine-tuning-history":
        return <FineTuningHistory />;
      case "fine-tuning-progress":
        return <FineTuningProgress />;
      default:
        return <ChatWithWorker worker={worker} onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 qiko-sidebar flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo - click to go home */}
        <div className="p-6 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setLocation("/")}
          >
            <img 
              src="/qiko-logo.png" 
              alt="Qiko" 
              className="h-7 w-auto"
            />
          </div>
          <button 
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Back to Workers */}
        <div className="px-4 mb-4">
          <button
            onClick={() => setLocation("/workers")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full px-3 py-2 rounded-lg hover:bg-white/5"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>All Workers</span>
          </button>
        </div>

        {/* Worker Info */}
        <div className="px-4 mb-6">
          <div className="qiko-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="qiko-avatar">
                {worker.fullName?.charAt(0) || "W"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate text-sm">
                  {workerName}
                </p>
                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  worker.status === "ready" ? "status-ready" : 
                  worker.status === "error" ? "status-error" : "status-training"
                }`}>
                  {worker.status === "training" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
                  )}
                  {worker.status === "ready" ? "Ready" : 
                   worker.status === "error" ? "Error" : "Training"}
                </div>
              </div>
            </div>
            {worker.professionalTitle && (
              <p className="text-xs text-muted-foreground truncate mb-2">
                {worker.professionalTitle}
              </p>
            )}
            {/* Subscription Type Indicator */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                worker.planType === "premium" 
                  ? "bg-amber-500/20 text-amber-400" 
                  : "bg-cyan-500/20 text-cyan-400"
              }`}>
                {worker.planType === "premium" ? (
                  <><span className="text-amber-400">★</span> Premium</>
                ) : (
                  <><span className="text-cyan-400">⚡</span> Basic AI Model</>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3">
          <ul className="space-y-1">
            {[
              ...BASE_SIDEBAR_ITEMS,
              // Add Travel & Leisure specific items if worker is in that industry
              ...(worker?.industry === 'travel_leisure' ? TRAVEL_SIDEBAR_ITEMS : []),
              ...COMMON_SIDEBAR_ITEMS,
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id || 
                (item.id === 'bookings' && activeView === 'booking-detail');
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActiveView(item.id as DashboardView);
                      setSidebarOpen(false);
                    }}
                    className={`qiko-sidebar-item w-full relative ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 opacity-60" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {worker?.fullName || "Creator"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Digital Worker Creator
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md qiko-gradient flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-background" />
              </div>
              <span className="font-semibold text-sm">Qiko</span>
            </div>
            <div className="w-9" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Content Area */}
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          {renderContent()}
        </motion.div>
      </main>

      {/* Qiko AI Assistant */}
      <QikoAssistant
        context={activeView}
        workerId={worker.id}
        workerInfo={{
          name: worker.fullName || undefined,
          title: worker.professionalTitle || undefined,
          tone: worker.tone || undefined,
        }}
        recentWorkerChat={undefined}
        onRuleSaved={() => refetch()}
        onRuleSuggested={(rule) => {
          setSuggestedRule(rule);
          setActiveView("train");
        }}
      />
    </div>
  );
}
