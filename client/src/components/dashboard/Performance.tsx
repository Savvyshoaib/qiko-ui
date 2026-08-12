import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  Zap, 
  Brain, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Server,
  Cpu,
  Sparkles,
  ArrowUpRight,
  BarChart3,
  X,
} from "lucide-react";
import { useState } from "react";
import { DigitalWorker } from "../../../../drizzle/schema";

interface PerformanceProps {
  worker: DigitalWorker;
  onUpdate?: () => void;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  onClick?: () => void;
  color?: "cyan" | "green" | "yellow" | "red" | "purple";
}

function MetricCard({ title, value, subtitle, icon, trend, trendValue, onClick, color = "cyan" }: MetricCardProps) {
  const colorClasses = {
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
    green: "from-green-500/20 to-green-500/5 border-green-500/30",
    yellow: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
    red: "from-red-500/20 to-red-500/5 border-red-500/30",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
  };

  const iconColorClasses = {
    cyan: "text-cyan-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
    purple: "text-purple-400",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`cursor-pointer`}
    >
      <Card className={`bg-gradient-to-br ${colorClasses[color]} border qiko-card hover:border-primary/50 transition-all`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg bg-background/50 ${iconColorClasses[color]}`}>
              {icon}
            </div>
            {trend && (
              <div className={`flex items-center gap-1 text-xs ${
                trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-muted-foreground"
              }`}>
                {trend === "up" ? <TrendingUp className="w-3 h-3" /> : trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
                {trendValue}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground/70">{subtitle}</p>}
          </div>
          {onClick && (
            <div className="mt-3 flex items-center text-xs text-primary">
              View details <ChevronRight className="w-3 h-3 ml-1" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface DrillDownModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function DrillDownModal({ title, isOpen, onClose, children }: DrillDownModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[80vh] overflow-auto"
        >
          <Card className="qiko-card border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <CardTitle className="text-lg">{title}</CardTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {children}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Performance({ worker, onUpdate }: PerformanceProps) {
  const [drillDown, setDrillDown] = useState<string | null>(null);
  
  // Fetch demo metrics
  const { data: metrics } = trpc.performance.generateDemoMetrics.useQuery(
    { workerId: worker.id },
    { enabled: !!worker.id }
  );

  // Calculate aggregated stats from metrics
  const latestMetric = metrics?.[0];
  const avgLatency = metrics?.length 
    ? Math.round(metrics.reduce((sum, m) => sum + (m.avgLatencyMs || 0), 0) / metrics.length)
    : 0;
  const avgAccuracy = metrics?.length
    ? Math.round(metrics.reduce((sum, m) => sum + (m.accuracyScore || 0), 0) / metrics.length)
    : 0;
  const avgHallucination = metrics?.length
    ? Math.round(metrics.reduce((sum, m) => sum + (m.hallucinationScore || 0), 0) / metrics.length)
    : 0;
  const totalRequests = metrics?.reduce((sum, m) => sum + (m.totalRequests || 0), 0) || 0;
  const totalThumbsUp = metrics?.reduce((sum, m) => sum + (m.thumbsUp || 0), 0) || 0;
  const totalThumbsDown = metrics?.reduce((sum, m) => sum + (m.thumbsDown || 0), 0) || 0;
  const satisfactionRate = totalThumbsUp + totalThumbsDown > 0
    ? Math.round((totalThumbsUp / (totalThumbsUp + totalThumbsDown)) * 100)
    : 0;

  const hasTrainingBoost = metrics?.some(m => m.trainingBoostAvailable === 1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Performance Dashboard</h1>
          <p className="text-muted-foreground">Monitor your digital worker's performance and quality metrics</p>
        </div>
        {hasTrainingBoost && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex-shrink-0"
          >
            <Button className="qiko-btn-primary gap-2">
              <Sparkles className="w-4 h-4" />
              Training Boost Available
            </Button>
          </motion.div>
        )}
      </div>

      {/* Environment & Model Info */}
      <Card className="qiko-card border-primary/20">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-green-400" />
              <span className="text-sm text-muted-foreground">Environment:</span>
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                {latestMetric?.environment || "Production"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-muted-foreground">Model:</span>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                {latestMetric?.modelType || "GPT-4 Turbo"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Version:</span>
              <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                {latestMetric?.modelVersion || "qiko-v2.1"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Latency"
          value={`${avgLatency}ms`}
          subtitle="Response time"
          icon={<Clock className="w-5 h-5" />}
          trend={avgLatency < 400 ? "up" : "down"}
          trendValue={avgLatency < 400 ? "Fast" : "Slow"}
          color={avgLatency < 400 ? "green" : avgLatency < 700 ? "yellow" : "red"}
          onClick={() => setDrillDown("latency")}
        />
        <MetricCard
          title="Accuracy Score"
          value={`${avgAccuracy}%`}
          subtitle="Response quality"
          icon={<Target className="w-5 h-5" />}
          trend={avgAccuracy > 85 ? "up" : "down"}
          trendValue={avgAccuracy > 85 ? "+2.3%" : "-1.2%"}
          color={avgAccuracy > 85 ? "green" : avgAccuracy > 70 ? "yellow" : "red"}
          onClick={() => setDrillDown("accuracy")}
        />
        <MetricCard
          title="Hallucination Score"
          value={`${avgHallucination}%`}
          subtitle="Lower is better"
          icon={<Brain className="w-5 h-5" />}
          trend={avgHallucination < 15 ? "up" : "down"}
          trendValue={avgHallucination < 15 ? "Low risk" : "Monitor"}
          color={avgHallucination < 10 ? "green" : avgHallucination < 20 ? "yellow" : "red"}
          onClick={() => setDrillDown("hallucination")}
        />
        <MetricCard
          title="Total Requests"
          value={totalRequests.toLocaleString()}
          subtitle="Last 30 days"
          icon={<Activity className="w-5 h-5" />}
          trend="up"
          trendValue="+12%"
          color="cyan"
          onClick={() => setDrillDown("requests")}
        />
      </div>

      {/* Quality & Satisfaction Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quality Scores */}
        <Card className="qiko-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Accuracy</span>
                <span className="text-foreground font-medium">{avgAccuracy}%</span>
              </div>
              <Progress value={avgAccuracy} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Relevance</span>
                <span className="text-foreground font-medium">{latestMetric?.relevanceScore || 88}%</span>
              </div>
              <Progress value={latestMetric?.relevanceScore || 88} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hallucination Risk</span>
                <span className="text-foreground font-medium">{avgHallucination}%</span>
              </div>
              <Progress value={100 - avgHallucination} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* User Satisfaction */}
        <Card className="qiko-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              User Satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <div className="relative">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-muted/20"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="url(#gradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${satisfactionRate * 3.52} 352`}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-foreground">{satisfactionRate}%</span>
                  <span className="text-xs text-muted-foreground">Satisfaction</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-muted-foreground">{totalThumbsUp} positive</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-muted-foreground">{totalThumbsDown} negative</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Boost Section */}
      {hasTrainingBoost && (
        <Card className="qiko-card border-primary/30 bg-gradient-to-r from-primary/10 to-purple-500/10">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Training Boost Available</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Based on recent performance, we've identified opportunities to improve your worker's accuracy.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {latestMetric?.suggestedImprovements?.map((improvement, i) => (
                      <Badge key={i} variant="outline" className="bg-background/50">
                        {improvement}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button className="qiko-btn-primary gap-2 flex-shrink-0">
                Apply Boost <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Latency Drill-Down Modal */}
      <DrillDownModal
        title="Latency Analysis"
        isOpen={drillDown === "latency"}
        onClose={() => setDrillDown(null)}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/20">
              <p className="text-2xl font-bold text-foreground">{avgLatency}ms</p>
              <p className="text-xs text-muted-foreground">Average</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/20">
              <p className="text-2xl font-bold text-foreground">{latestMetric?.p95LatencyMs || 650}ms</p>
              <p className="text-xs text-muted-foreground">P95</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/20">
              <p className="text-2xl font-bold text-foreground">{latestMetric?.p99LatencyMs || 950}ms</p>
              <p className="text-xs text-muted-foreground">P99</p>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Latency Trend (Last 7 Days)</h4>
            <div className="h-32 flex items-end gap-1">
              {metrics?.slice(0, 7).reverse().map((m, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-primary to-primary/50 rounded-t"
                  style={{ height: `${Math.min((m.avgLatencyMs || 0) / 10, 100)}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </DrillDownModal>

      {/* Accuracy Drill-Down Modal */}
      <DrillDownModal
        title="Accuracy Analysis"
        isOpen={drillDown === "accuracy"}
        onClose={() => setDrillDown(null)}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Overall Accuracy</span>
              <span className="text-xl font-bold text-foreground">{avgAccuracy}%</span>
            </div>
            <Progress value={avgAccuracy} className="h-3" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-5 h-5 text-green-400 mb-2" />
              <p className="text-lg font-bold text-foreground">{Math.round(totalRequests * avgAccuracy / 100)}</p>
              <p className="text-xs text-muted-foreground">Accurate responses</p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400 mb-2" />
              <p className="text-lg font-bold text-foreground">{Math.round(totalRequests * (100 - avgAccuracy) / 100)}</p>
              <p className="text-xs text-muted-foreground">Need improvement</p>
            </div>
          </div>
        </div>
      </DrillDownModal>

      {/* Hallucination Drill-Down Modal */}
      <DrillDownModal
        title="Hallucination Analysis"
        isOpen={drillDown === "hallucination"}
        onClose={() => setDrillDown(null)}
      >
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-muted/20">
            <div className="flex items-center gap-3 mb-3">
              <Brain className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium text-foreground">Hallucination Risk Score</p>
                <p className="text-xs text-muted-foreground">Lower is better</p>
              </div>
            </div>
            <div className="text-4xl font-bold text-foreground mb-2">{avgHallucination}%</div>
            <Progress value={100 - avgHallucination} className="h-2" />
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">What this means</h4>
            <p className="text-sm text-muted-foreground">
              {avgHallucination < 10 
                ? "Excellent! Your worker rarely generates unverified information."
                : avgHallucination < 20
                ? "Good performance. Consider adding more training rules to further reduce risk."
                : "Monitor closely. Adding specific domain knowledge can help reduce hallucinations."}
            </p>
          </div>
        </div>
      </DrillDownModal>

      {/* Requests Drill-Down Modal */}
      <DrillDownModal
        title="Request Volume"
        isOpen={drillDown === "requests"}
        onClose={() => setDrillDown(null)}
      >
        <div className="space-y-6">
          <div className="text-center p-6 rounded-lg bg-muted/20">
            <p className="text-4xl font-bold text-foreground">{totalRequests.toLocaleString()}</p>
            <p className="text-muted-foreground">Total requests in 30 days</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Daily Volume (Last 7 Days)</h4>
            <div className="space-y-2">
              {metrics?.slice(0, 7).reverse().map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16">
                    {new Date(m.periodStart).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <div className="flex-1 h-6 bg-muted/20 rounded overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-purple-500 rounded"
                      style={{ width: `${Math.min((m.totalRequests || 0) * 2, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground w-12 text-right">
                    {m.totalRequests}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DrillDownModal>
    </div>
  );
}
