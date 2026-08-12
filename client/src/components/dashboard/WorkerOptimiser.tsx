import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { 
  Activity,
  TrendingUp,
  Timer,
  Target,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  Zap,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Brain,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

type DashboardView = "chat" | "train" | "data" | "rapidqa" | "synthetic" | "readiness" | "pricing" | "export" | "connections" | "commercials" | "performance" | "settings" | "optimiser";

interface WorkerOptimiserProps {
  worker: {
    id: number;
    fullName: string | null;
    professionalTitle: string | null;
  };
  onNavigate: (view: DashboardView) => void;
}

interface Finding {
  id: string;
  type: "warning" | "suggestion" | "success";
  title: string;
  description: string;
  action?: string;
  actionView?: DashboardView;
  impact: "high" | "medium" | "low";
}

export default function WorkerOptimiser({ worker, onNavigate }: WorkerOptimiserProps) {
  const { data: performanceMetrics, refetch } = () => {}
  /* trpc.performance.getLatest.useQuery(
    { workerId: worker.id }
  ); */

  const { data: trainingData } = () => {}
  /* trpc.trainingData.list.useQuery({
    workerId: worker.id,
    limit: 10000,
  }); */

  const { data: trainingRules } = () => {}
  /* trpc.trainingRules.list.useQuery({
    workerId: worker.id,
  }); */

  // Use refetch to regenerate metrics
  const handleRefresh = () => {
    refetch();
  };

  // Calculate metrics
  const accuracy = performanceMetrics?.accuracyScore || 85;
  const latency = performanceMetrics?.avgLatencyMs || 450;
  const hallucination = performanceMetrics?.hallucinationScore || 13;
  const totalRequests = performanceMetrics?.totalRequests || 1070;
  const thumbsUp = performanceMetrics?.thumbsUp || 416;
  const thumbsDown = performanceMetrics?.thumbsDown || 59;
  const satisfaction = thumbsUp + thumbsDown > 0 
    ? Math.round((thumbsUp / (thumbsUp + thumbsDown)) * 100) 
    : 86;

  const trainingDataCount = trainingData?.length || 0;
  const rulesCount = trainingRules?.length || 0;

  // Generate findings based on metrics
  const findings: Finding[] = [];

  // Accuracy findings
  if (accuracy < 80) {
    findings.push({
      id: "low-accuracy",
      type: "warning",
      title: "Accuracy Below Target",
      description: `Your worker's accuracy is ${accuracy}%, below the 80% target. Add more training examples to improve.`,
      action: "Add Training Data",
      actionView: "readiness",
      impact: "high",
    });
  } else if (accuracy >= 90) {
    findings.push({
      id: "high-accuracy",
      type: "success",
      title: "Excellent Accuracy",
      description: `Your worker is performing at ${accuracy}% accuracy - above industry average.`,
      impact: "low",
    });
  }

  // Hallucination findings
  if (hallucination > 15) {
    findings.push({
      id: "high-hallucination",
      type: "warning",
      title: "High Hallucination Rate",
      description: `${hallucination}% of responses may contain inaccurate information. Add more factual training data.`,
      action: "Add Knowledge Data",
      actionView: "readiness",
      impact: "high",
    });
  }

  // Training data findings
  if (trainingDataCount < 50) {
    findings.push({
      id: "low-training-data",
      type: "suggestion",
      title: "Limited Training Data",
      description: `Only ${trainingDataCount} training examples. Adding more will improve response quality.`,
      action: "Upload More Data",
      actionView: "readiness",
      impact: "medium",
    });
  }

  // Rules findings
  if (rulesCount === 0) {
    findings.push({
      id: "no-rules",
      type: "suggestion",
      title: "No Training Rules Set",
      description: "Training rules help enforce consistent behavior. Add rules via the Q assistant.",
      action: "Add Rules",
      actionView: "train",
      impact: "medium",
    });
  } else if (rulesCount >= 5) {
    findings.push({
      id: "good-rules",
      type: "success",
      title: "Training Rules Active",
      description: `${rulesCount} training rules are actively shaping your worker's responses.`,
      impact: "low",
    });
  }

  // Latency findings
  if (latency > 1000) {
    findings.push({
      id: "high-latency",
      type: "warning",
      title: "Slow Response Times",
      description: `Average response time is ${latency}ms. Consider upgrading to Premium for faster responses.`,
      action: "View Plans",
      actionView: "pricing",
      impact: "medium",
    });
  }

  // Satisfaction findings
  if (satisfaction < 80) {
    findings.push({
      id: "low-satisfaction",
      type: "warning",
      title: "User Satisfaction Below Target",
      description: `${satisfaction}% satisfaction rate. Review negative feedback to identify improvement areas.`,
      action: "View Feedback",
      actionView: "performance",
      impact: "high",
    });
  }

  // Sort findings by impact
  const sortedFindings = findings.sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  });

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "text-red-400 bg-red-500/20";
      case "medium": return "text-yellow-400 bg-yellow-500/20";
      case "low": return "text-green-400 bg-green-500/20";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "warning": return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case "suggestion": return <Lightbulb className="w-5 h-5 text-blue-400" />;
      case "success": return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Worker Optimiser</h1>
          <p className="text-muted-foreground">
            Monitor performance and get recommendations to improve your AI worker.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Metrics
        </Button>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Accuracy */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Target className="w-5 h-5 text-green-400" />
            </div>
            <Badge variant={accuracy >= 85 ? "default" : "destructive"} className="text-xs">
              {accuracy >= 90 ? "Excellent" : accuracy >= 80 ? "Good" : "Needs Work"}
            </Badge>
          </div>
          <div className="text-3xl font-bold text-green-400 mb-1">{accuracy}%</div>
          <div className="text-sm text-muted-foreground">Accuracy Score</div>
          <Progress value={accuracy} className="h-1.5 mt-3" />
        </Card>

        {/* Latency */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Timer className="w-5 h-5 text-blue-400" />
            </div>
            <Badge variant={latency < 500 ? "default" : latency < 1000 ? "secondary" : "destructive"} className="text-xs">
              {latency < 500 ? "Fast" : latency < 1000 ? "OK" : "Slow"}
            </Badge>
          </div>
          <div className="text-3xl font-bold text-blue-400 mb-1">{latency}ms</div>
          <div className="text-sm text-muted-foreground">Avg Response Time</div>
          <Progress value={Math.max(0, 100 - (latency / 20))} className="h-1.5 mt-3" />
        </Card>

        {/* Satisfaction */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <ThumbsUp className="w-5 h-5 text-purple-400" />
            </div>
            <Badge variant={satisfaction >= 85 ? "default" : satisfaction >= 75 ? "secondary" : "destructive"} className="text-xs">
              {satisfaction >= 85 ? "Great" : satisfaction >= 75 ? "OK" : "Low"}
            </Badge>
          </div>
          <div className="text-3xl font-bold text-purple-400 mb-1">{satisfaction}%</div>
          <div className="text-sm text-muted-foreground">User Satisfaction</div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3 text-green-400" /> {thumbsUp}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsDown className="w-3 h-3 text-red-400" /> {thumbsDown}
            </span>
          </div>
        </Card>

        {/* Total Requests */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
            </div>
            <Badge variant="outline" className="text-xs">
              +12%
            </Badge>
          </div>
          <div className="text-3xl font-bold text-cyan-400 mb-1">{totalRequests.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total Requests</div>
          <div className="text-xs text-muted-foreground mt-3">
            Last 30 days
          </div>
        </Card>
      </div>

      {/* Hallucination & Response Quality */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Brain className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold">Hallucination Detection</h3>
              <p className="text-sm text-muted-foreground">Responses flagged as potentially inaccurate</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-orange-400">{hallucination}%</div>
            <div className="flex-1">
              <Progress value={100 - hallucination} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Target: &lt;10%</span>
                <span>{hallucination <= 10 ? "✓ On target" : "Needs improvement"}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold">Training Status</h3>
              <p className="text-sm text-muted-foreground">Data and rules powering your worker</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-emerald-400">{trainingDataCount}</div>
              <div className="text-sm text-muted-foreground">Training Examples</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{rulesCount}</div>
              <div className="text-sm text-muted-foreground">Active Rules</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Findings & Recommendations */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold">Optimisation Findings</h3>
              <p className="text-sm text-muted-foreground">
                {sortedFindings.filter(f => f.type !== "success").length} areas to improve
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {sortedFindings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p>Your worker is performing optimally!</p>
              <p className="text-sm">No issues detected at this time.</p>
            </div>
          ) : (
            sortedFindings.map((finding, index) => (
              <motion.div
                key={finding.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`p-4 ${finding.type === "success" ? "bg-green-500/5 border-green-500/20" : finding.type === "warning" ? "bg-yellow-500/5 border-yellow-500/20" : "bg-blue-500/5 border-blue-500/20"}`}>
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5">
                      {getTypeIcon(finding.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{finding.title}</h4>
                        <Badge className={`text-xs ${getImpactColor(finding.impact)}`}>
                          {finding.impact} impact
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {finding.description}
                      </p>
                    </div>
                    {finding.action && finding.actionView && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onNavigate(finding.actionView!)}
                        className="shrink-0"
                      >
                        {finding.action}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </Card>

      {/* Boost Performance CTA */}
      <Card className="p-6 bg-gradient-to-br from-purple-500/10 via-background to-cyan-500/10 border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Want Better Performance?</h3>
              <p className="text-sm text-muted-foreground">
                Upgrade to Premium for custom fine-tuning, faster responses, and advanced analytics.
              </p>
            </div>
          </div>
          <Button 
            className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600"
            onClick={() => onNavigate('pricing')}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Upgrade Plan
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
