import GlobalLayout from "@/components/GlobalLayout";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Zap,
  ArrowRight,
  Bot,
  Plus,
  Sparkles,
  Brain,
  Lightbulb,
  Target,
  Clock,
  ChevronRight,
  Star,
  Rocket,
  Coffee,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAvatarAgents } from "@/store/slices/avatarSlice";
import { toTitleFromSlug } from "@/lib/stringUtils";
import WorkerCtaButton from "@/components/dashboard/WorkerCtaButton";
import UpgradeLimitButton from "@/components/dashboard/UpgradeLimitButton";
import { WORKER_LIMIT } from "@/constants/brand";
import { usePushPermissionPromptOnApp } from "@/lib/promptNotificationPermission";

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 1000, delay: number = 0) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // console.log("setTimeout 5");
    const timeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, started]);

  return count;
}

// Compact stat with clean bar visualization
function CompactStat({ 
  label, 
  value, 
  suffix = "",
  trend,
  color,
  bars,
  delay = 0 
}: {
  label: string;
  value: number;
  suffix?: string;
  trend?: number;
  color: string;
  bars?: number[];
  delay?: number;
}) {
  const animatedValue = useAnimatedCounter(value, 1000, delay);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // console.log("setTimeout 6");
    const timeout = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <div 
      className="flex flex-col gap-2"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
        {trend !== undefined && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white">{animatedValue.toLocaleString()}</span>
        <span className="text-sm text-slate-400">{suffix}</span>
      </div>
      {bars && (
        <div className="flex items-end gap-0.5 h-6">
          {bars.map((bar, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${bar}%`,
                background: color,
                opacity: 0.3 + (i / bars.length) * 0.7,
                transform: visible ? 'scaleY(1)' : 'scaleY(0)',
                transformOrigin: 'bottom',
                transition: `transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay + i * 50}ms`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// AI Insight card
function InsightCard({ 
  icon: Icon, 
  title, 
  description, 
  action,
  color,
  delay = 0 
}: {
  icon: any;
  title: string;
  description: string;
  action?: string;
  color: string;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <div 
      className="flex items-start gap-3 p-3 rounded-xl group cursor-pointer hover:bg-white/5 transition-colors"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-10px)',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      {action && (
        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 mt-1" />
      )}
    </div>
  );
}

// Fun worker avatar with emoji and animations
function FunWorkerCard({ 
  worker, 
  onClick, 
  delay,
  index
}: { 
  worker: any; 
  onClick: () => void; 
  delay: number;
  index: number;
}) {
  const [visible, setVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // console.log("setTimeout 7");
    const timeout = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  // Fun emojis and colors for workers
  const funConfigs = [
    { emoji: '🚀', gradient: 'from-violet-500 to-purple-600', bg: 'rgba(139, 92, 246, 0.1)' },
    { emoji: '⚡', gradient: 'from-amber-400 to-orange-500', bg: 'rgba(251, 191, 36, 0.1)' },
    { emoji: '🎯', gradient: 'from-emerald-400 to-teal-500', bg: 'rgba(52, 211, 153, 0.1)' },
    { emoji: '💎', gradient: 'from-cyan-400 to-blue-500', bg: 'rgba(34, 211, 238, 0.1)' },
    { emoji: '🔥', gradient: 'from-red-400 to-pink-500', bg: 'rgba(248, 113, 113, 0.1)' },
    { emoji: '✨', gradient: 'from-indigo-400 to-violet-500', bg: 'rgba(129, 140, 248, 0.1)' },
  ];

  const config = funConfigs[index % funConfigs.length];
  const isReady = worker.status === 'ready';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full text-left group"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div 
        className="relative overflow-hidden rounded-2xl p-4 transition-all duration-300"
        style={{
          background: isHovered ? config.bg : 'rgba(255,255,255,0.02)',
          border: `1px solid ${isHovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
          // transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Fun animated avatar */}
          <div 
            className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-xl`}
            style={{
              transform: isHovered ? 'rotate(-5deg) scale(1.1)' : 'rotate(0deg) scale(1)',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: isHovered ? `0 8px 24px ${config.bg}` : 'none'
            }}
          >
            <span style={{ 
              transform: isHovered ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.3s ease'
            }}>
              {config.emoji}
            </span>
            {/* Status indicator */}
            <div 
              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#0a0f1a] ${
                isReady ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              style={{
                boxShadow: isReady ? '0 0 8px rgba(52, 211, 153, 0.6)' : '0 0 8px rgba(251, 191, 36, 0.6)'
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate group-hover:text-[#22D3EE] transition-colors">
                {worker.agent_name || "Worker"}
              </h3>
              {isReady && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
            </div>
            <p className="text-xs text-slate-400 truncate">
              {toTitleFromSlug(worker.industry) || "AI Assistant"}
            </p>
          </div>

          <ArrowRight 
            className="w-4 h-4 text-slate-500 group-hover:text-[#22D3EE] transition-all shrink-0"
            style={{
              transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
              transition: 'transform 0.3s ease'
            }}
          />
        </div>

        {/* Fun hover sparkle effect */}
        {isHovered && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-ping"
                style={{
                  left: `${20 + i * 30}%`,
                  top: `${30 + i * 20}%`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

export default function AppDashboard() {
  const [, setLocation] = useLocation();
  const dispatch = useAppDispatch();
  // const workers = useAppSelector((state) => (state as any).avatar?.agents ?? []);
  // const { subscribed } = useAppSelector((state) => state?.auth?.subscription ?? { subscribed: false });
  const workerLimitRaw = useAppSelector(
    (state) =>
      (state.auth.subscription as { subscription?: { worker_limit?: unknown } } | null)?.subscription
        ?.worker_limit
  );
  // const isLoading = useAppSelector((state) => (state as any).avatar?.loading?.agents ?? false);
  const workers = useAppSelector((state) => state.avatar.agents);
  const subscription = useAppSelector((state) => state.auth.subscription);
  const subscribed = subscription?.subscribed;
  const isLoading = useAppSelector((state) => state.avatar.loading.agents);
  const [mounted, setMounted] = useState(false);

  // On /app only: first click/key triggers the same browser prompt as notifications "Enable".
  usePushPermissionPromptOnApp(true);

  const workerLimit =
    typeof workerLimitRaw === "number"
      ? workerLimitRaw
      : typeof workerLimitRaw === "string"
      ? Number(workerLimitRaw)
      : WORKER_LIMIT;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (workers.length > 0) return;
    dispatch(fetchAvatarAgents());
  }, [workers.length, dispatch]);

  const activeWorkers = workers;
  const totalWorkers = activeWorkers.length;
  const readyWorkers = activeWorkers.filter((w: any) => w?.status === "ready").length;
  const trainingWorkers = activeWorkers.filter((w: any) => w?.status === "training").length;
  const industries = activeWorkers.map((w: any) => w?.industry).filter((v: any) => typeof v === "string" && v.trim().length > 0);
  const totalIndustries = new Set(industries).size;

  const isSubscribed = subscribed === true || subscribed === "true";

  const DASHBOARD_STATS = {
    totalWorkers: isSubscribed ? totalWorkers : 0,
    totalIndustries: isSubscribed ? totalIndustries : 0,
    readyWorkers: isSubscribed ? readyWorkers : 0,
    trainingWorkers: isSubscribed ? trainingWorkers : 0,
  };

  const readinessPercent = totalWorkers > 0 ? Math.round((readyWorkers / totalWorkers) * 100) : 0;
  const remainingCapacity = Math.max(0, workerLimit - totalWorkers);

  const insights = [
    (trainingWorkers > 0 && isSubscribed)
      ? {
          icon: Lightbulb,
          title: `${trainingWorkers} worker${trainingWorkers > 1 ? "s" : ""} still training`,
          description: "Open Workers to finish setup and add more examples for faster readiness.",
          color: "#F59E0B",
        }
      : (isSubscribed ? {
          icon: Lightbulb,
          title: "All workers are ready",
          description: "Great job. Your team is fully ready to handle conversations.",
          color: "#10B981",
        } : {
          icon: Lightbulb,
          title: "Upgrade your plan to add more workers",
          description: "Upgrade your plan to add more workers and start training your workers.",
          color: "#10B981",
        }),
    (totalWorkers === 0 || !isSubscribed)
      ? {
          icon: Target,
          title: "Start with your first worker",
          description: "Create one worker to begin collecting conversations and performance insights.",
          color: "#22D3EE",
        }
      : {
          icon: Target,
          title: `${readinessPercent}% of workers are ready`,
          description:
            remainingCapacity > 0
              ? `${remainingCapacity} slot${remainingCapacity > 1 ? "s" : ""} left on your current limit.`
              : subscribed
              ? "You are at plan capacity. Contact support to expand your worker limit."
              : "Upgrade your plan to add more workers.",
          color: "#10B981",
        },
  ];

  // Mock bar data
  const conversationBars = [30, 45, 35, 60, 50, 75, 65, 80, 70, 90, 85, 95];
  const accuracyBars = [70, 75, 72, 80, 78, 85, 82, 88, 86, 92, 90, 94];

  return (
    <GlobalLayout activeSection="dashboard">
      <div className="p-6 lg:p-8 overflow-y-auto h-full">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div 
            className="mb-8"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#22D3EE] flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Command Center</h1>
                <p className="text-sm text-slate-400">Your AI workforce at a glance</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Stats & Insights */}
            <div className="lg:col-span-2 space-y-6">
              {/* Compact Stats Row */}
              <div 
                className="grid grid-cols-2 md:grid-cols-4 gap-6 p-5 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <CompactStat
                  label="Workers"
                  value={DASHBOARD_STATS?.totalWorkers}
                  // trend={12}
                  color="#6366F1"
                  delay={100}
                />
                <CompactStat
                  label="Industries"
                  value={DASHBOARD_STATS.totalIndustries}
                  // suffix="sec avg"
                  // trend={-15}
                  color="#F59E0B"
                  delay={400}
                />
                <CompactStat
                  label="Ready"
                  value={DASHBOARD_STATS.readyWorkers}
                  // suffix="this week"
                  // trend={23}
                  color="#10B981"
                  bars={conversationBars}
                  delay={200}
                />
                <CompactStat
                  label="Training"
                  value={DASHBOARD_STATS.trainingWorkers}
                  // suffix="%"
                  // trend={3}
                  color="#ffb900"
                  bars={accuracyBars}
                  delay={300}
                />
              </div>

              {/* AI Insights Section */}
              <div 
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(10px)',
                  transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s'
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-[#6366F1]" />
                  <h2 className="text-sm font-semibold text-white">AI Insights</h2>
                  {/* <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#6366F1]/20 text-[#6366F1]">
                    {insights.length} new
                  </span> */}
                </div>
                
                <div className="space-y-1">
                  {insights.map((insight, index) => (
                    <InsightCard
                      key={insight.title}
                      icon={insight.icon}
                      title={insight.title}
                      description={insight.description}
                      color={insight.color}
                      delay={500 + index * 100}
                    />
                  ))}
                  {/* <InsightCard
                    icon={Zap}
                    title="Response time improved"
                    description="Average response is now 1.6s, down from 2.1s last week"
                    color="#22D3EE"
                    delay={700}
                  /> */}
                </div>
              </div>

              {/* Quick Actions */}
              {/* <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: MessageSquare, label: 'Chat', desc: 'Test your AI', color: '#22D3EE', path: '/app/workers' },
                  { icon: Brain, label: 'Train', desc: 'Add knowledge', color: '#6366F1', path: '/app/workers' },
                  { icon: TrendingUp, label: 'Analytics', desc: 'View metrics', color: '#10B981', path: '/app/workers' },
                ].map((action, i) => (
                  <button
                    key={action.label}
                    onClick={() => setLocation(action.path)}
                    className="p-4 rounded-xl text-center group transition-all hover:scale-105"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? 'translateY(0)' : 'translateY(10px)',
                      transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.3 + i * 0.1}s`
                    }}
                  >
                    <div 
                      className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ background: `${action.color}15` }}
                    >
                      <action.icon className="w-5 h-5" style={{ color: action.color }} />
                    </div>
                    <p className="text-sm font-medium text-white">{action.label}</p>
                    <p className="text-xs text-slate-500">{action.desc}</p>
                  </button>
                ))}
              </div> */}
            </div>

            {/* Right Column - Workers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white">Your Workers</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400">
                    {readyWorkers} ready
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLocation("/app/workers")}
                  className="text-xs text-slate-400 hover:text-white h-7 px-2"
                >
                  View all
                  <ArrowRight className="ml-1 w-3 h-3" />
                </Button>
              </div>
                
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div 
                      key={i} 
                      className="h-20 rounded-2xl animate-pulse"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    />
                  ))}
                </div>
              ) : (activeWorkers.length === 0 || !isSubscribed ) ? (
                <div 
                  className="text-center py-10 px-4 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(34, 211, 238, 0.05))',
                    border: '1px dashed rgba(99, 102, 241, 0.3)'
                  }}
                >
                  <div className="text-4xl mb-3">🤖</div>
                  <h3 className="text-base font-semibold text-white mb-2">No workers yet</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Create your first AI worker
                  </p>
                  {isLoading ? (
                    <p className="text-xs text-slate-400">Loading workers...</p>
                  ) : (
                    <WorkerCtaButton
                      workersCount={activeWorkers.length}
                      subscribed={Boolean(subscribed)}
                      onCreate={() => setLocation("/onboarding")}
                      onUpgrade={() => setLocation("/app/pricing")}
                      size="sm"
                      createButtonClassName="bg-gradient-to-r from-[#6366F1] to-[#22D3EE] hover:from-[#818CF8] hover:to-[#22D3EE] text-white font-medium rounded-xl"
                      createIconClassName="mr-1 h-4 w-4"
                      upgradeButtonClassName="bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl"
                      upgradeIconClassName="mr-1 h-4 w-4"
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {activeWorkers.slice(0, 4).map((worker: any, index: number) => (
                    <FunWorkerCard
                      key={worker.id}
                      worker={worker}
                      onClick={() => setLocation(`/app/workers/${worker.agent_unique_id}`)}
                      delay={800 + index * 100}
                      index={index}
                    />
                  ))}
                  {/* Create new worker */}
                  {activeWorkers.length < workerLimit ? (
                    <button
                      onClick={() => setLocation("/onboarding")}
                      className="w-full p-4 rounded-2xl border border-dashed border-white/10 hover:border-[#6366F1]/50 hover:bg-[#6366F1]/5 transition-all group"
                      style={{
                        opacity: mounted ? 1 : 0,
                        transform: mounted ? 'translateY(0)' : 'translateY(10px)',
                        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 1.2s'
                      }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-[#6366F1]/20 flex items-center justify-center transition-colors">
                          <Plus className="w-4 h-4 text-slate-400 group-hover:text-[#6366F1]" />
                        </div>
                        <span className="text-sm text-slate-400 group-hover:text-white transition-colors">
                          New Worker
                        </span>
                      </div>
                    </button>
                  ) : (
                    <UpgradeLimitButton
                      onClick={() => setLocation("/app/pricing")}
                      mounted={mounted}
                    />
                  )}
                </div>
              )}

              {/* Fun tip */}
              <div 
                className="p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(34, 211, 238, 0.05))',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(10px)',
                  transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 1.3s'
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="text-xs text-white font-medium">Pro tip</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Train your worker with real conversations for best results
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlobalLayout>
  );
}
