import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  Brain,
  Shield,
  Server,
  MessageSquare,
  Crown,
  Cpu,
  Settings,
  Upload,
  BookOpen,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Target,
  Sliders,
} from "lucide-react";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

type DashboardView = "chat" | "train" | "data" | "rapidqa" | "synthetic" | "readiness" | "pricing" | "export" | "connections" | "commercials" | "performance" | "settings" | "optimiser";

interface ReadinessDashboardProps {
  worker: {
    id: number;
    fullName: string | null;
    professionalTitle: string | null;
  };
  onNavigate: (view: DashboardView) => void;
}

// Simulated subscription status - in production this would come from user data
const isPremium = true; // TODO: In production, this would come from user subscription data
const RULE_LIMIT = 20;

// Feature definitions for progression display
interface Feature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  included: "entry" | "premium";
  action?: DashboardView;
  actionLabel?: string;
}

const ALL_FEATURES: Feature[] = [
  {
    id: "gpt4",
    name: "GPT-4 Turbo Engine",
    description: "Powerful AI that works immediately",
    icon: <Zap className="w-4 h-4" />,
    included: "entry",
    action: "chat",
    actionLabel: "Test",
  },
  {
    id: "rules",
    name: "Training Rules",
    description: "Up to 20 rules on Entry, unlimited on Premium",
    icon: <Settings className="w-4 h-4" />,
    included: "entry",
    action: "train",
    actionLabel: "Manage",
  },
  {
    id: "optimiser",
    name: "Worker Optimiser",
    description: "AI-powered suggestions to improve performance",
    icon: <TrendingUp className="w-4 h-4" />,
    included: "entry",
    action: "optimiser",
    actionLabel: "Optimise",
  },
  {
    id: "unlimited_rules",
    name: "Unlimited Training Rules",
    description: "No limits on customization",
    icon: <Sliders className="w-4 h-4" />,
    included: "premium",
    action: "train",
    actionLabel: "Manage",
  },
  {
    id: "qa_sessions",
    name: "Q&A Training Sessions",
    description: "Capture your authentic voice through interviews",
    icon: <Cpu className="w-4 h-4" />,
    included: "premium",
    action: "rapidqa",
    actionLabel: "Start",
  },
  {
    id: "data_upload",
    name: "Data Upload & Processing",
    description: "Train with emails, chat logs, and documents",
    icon: <Upload className="w-4 h-4" />,
    included: "premium",
    action: "data",
    actionLabel: "Upload",
  },
  {
    id: "analytics",
    name: "Advanced Analytics",
    description: "Deep insights into worker performance",
    icon: <BarChart3 className="w-4 h-4" />,
    included: "premium",
    action: "performance",
    actionLabel: "View",
  },
  {
    id: "custom_ai",
    name: "Build Custom AI",
    description: "Train a model that learns YOUR exact style",
    icon: <Brain className="w-4 h-4" />,
    included: "premium",
  },
];

export default function ReadinessDashboard({ worker, onNavigate }: ReadinessDashboardProps) {
  const [showWhyUpgrade, setShowWhyUpgrade] = useState(false);
  
  const { data: readiness, isLoading } = trpc.readiness.get.useQuery({
    workerId: worker.id,
  });

  const { data: allTrainingData } = trpc.trainingData.list.useQuery({
    workerId: worker.id,
    limit: 10000,
  });

  const { data: trainingRules } = trpc.trainingRules.list.useQuery({
    workerId: worker.id,
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const trainingData = allTrainingData || [];
  const rules = trainingRules || [];
  const rulesCount = rules.length;
  const rulesRemaining = Math.max(0, RULE_LIMIT - rulesCount);
  const atRuleLimit = rulesCount >= RULE_LIMIT;
  
  // Data for Premium users (Custom AI progress)
  const conversationCount = trainingData.filter((d: typeof trainingData[number]) => 
    d.source === 'chat_history'
  ).length;
  const qaCount = trainingData.filter((d: typeof trainingData[number]) => 
    d.source === 'rapid_qa'
  ).length;
  const uploadCount = trainingData.filter((d: typeof trainingData[number]) => 
    d.source === 'upload'
  ).length;
  
  const totalDataPoints = conversationCount + qaCount + uploadCount + rulesCount;
  const targetDataPoints = 500;
  const customAIProgress = Math.min(100, Math.round((totalDataPoints / targetDataPoints) * 100));

  // Split features by plan
  const entryFeatures = ALL_FEATURES.filter(f => f.included === "entry");
  const premiumFeatures = ALL_FEATURES.filter(f => f.included === "premium");

  // Entry Plan View (not Premium)
  if (!isPremium) {
    return (
      <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Your AI Engine</h1>
          <p className="text-muted-foreground">
            Your digital worker is powered by GPT-4 Turbo. Upgrade to Premium for more features.
          </p>
        </div>

        {/* Current Plan - GPT-4 with Actions */}
        <Card className="p-6 border-2 border-green-500/30 bg-green-500/5">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/20">
                <Zap className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">GPT-4 Turbo</h3>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Entry Plan • $ 20/mo</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                onClick={() => onNavigate("chat")}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Test Worker
              </Button>
              <Button 
                variant="outline" 
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                onClick={() => onNavigate("optimiser")}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Optimise Worker
              </Button>
            </div>
          </div>

          {/* Rule Usage */}
          <div className="p-4 bg-slate-800/50 rounded-lg mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Training Rules</span>
              <span className={`text-sm font-medium ${atRuleLimit ? 'text-orange-400' : 'text-green-400'}`}>
                {rulesCount} / {RULE_LIMIT} used
              </span>
            </div>
            <Progress 
              value={(rulesCount / RULE_LIMIT) * 100} 
              className={`h-2 ${atRuleLimit ? '[&>div]:bg-orange-500' : ''}`}
            />
            {atRuleLimit ? (
              <p className="text-xs text-orange-400 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Rule limit reached. Upgrade to Premium for unlimited rules.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                {rulesRemaining} rules remaining on Entry Plan
              </p>
            )}
          </div>
        </Card>

        {/* Feature Progression */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Feature Access
          </h3>
          
          {/* Entry Features - Unlocked */}
          <div className="space-y-3 mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Included in Entry Plan
            </p>
            {entryFeatures.map((feature) => (
              <div 
                key={feature.id}
                className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                    {feature.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{feature.name}</span>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                {feature.action && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                    onClick={() => onNavigate(feature.action!)}
                  >
                    {feature.actionLabel}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Premium Features - Locked */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-2">
              <Crown className="w-3 h-3 text-purple-400" />
              Unlock with Premium
            </p>
            {premiumFeatures.map((feature) => (
              <div 
                key={feature.id}
                className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg opacity-75"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    {feature.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{feature.name}</span>
                      <Lock className="w-3 h-3 text-purple-400" />
                    </div>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-purple-400 border-purple-500/30">
                  Premium
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Upgrade CTA */}
        <Card className="p-6 border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Crown className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold">Upgrade to Premium</h3>
                <p className="text-sm text-muted-foreground">
                  Unlock all features • $99/mo
                </p>
              </div>
            </div>
            <Button 
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => onNavigate("pricing")}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>

        {/* Why Upgrade - Expandable */}
        <Card className="p-5">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowWhyUpgrade(!showWhyUpgrade)}
          >
            <h3 className="font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              Why upgrade to Premium?
            </h3>
            {showWhyUpgrade ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          
          <AnimatePresence>
            {showWhyUpgrade && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 mt-5 border-t border-border/50">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-purple-500/10 flex-shrink-0">
                      <Sliders className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium">Unlimited customization</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        No limits on training rules — make your worker exactly how you want
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-purple-500/10 flex-shrink-0">
                      <Cpu className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium">Data acceleration</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Q&A sessions and data uploads to rapidly train your worker
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-purple-500/10 flex-shrink-0">
                      <Brain className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium">Build your own AI</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Train a custom model that learns YOUR exact communication style
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-purple-500/10 flex-shrink-0">
                      <Shield className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium">Own it forever</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Export and run anywhere — your AI, not rented
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    );
  }

  // Premium View - All features unlocked
  return (
    <div className="flex-1 p-6 lg:p-8 space-y-6 overflow-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Your AI Engine</h1>
        <p className="text-muted-foreground">
          Premium Plan active. All features unlocked.
        </p>
      </div>

      {/* Current Plan - Premium */}
      <Card className="p-6 border-2 border-purple-500/30 bg-purple-500/5">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/20">
              <Crown className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Premium Plan</h3>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  Active
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">All features unlocked • $99/mo</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              onClick={() => onNavigate("chat")}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Test Worker
            </Button>
            <Button 
              variant="outline" 
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              onClick={() => onNavigate("optimiser")}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Optimise Worker
            </Button>
          </div>
        </div>

        {/* Custom AI Progress */}
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              Custom AI Training Progress
            </span>
            <span className="text-sm font-medium text-purple-400">
              {totalDataPoints} / {targetDataPoints} data points
            </span>
          </div>
          <Progress value={customAIProgress} className="h-2 [&>div]:bg-purple-500" />
          <p className="text-xs text-muted-foreground mt-2">
            {customAIProgress >= 100 
              ? "Your Custom AI is ready! Contact support to activate."
              : `Add ${targetDataPoints - totalDataPoints} more data points to complete training.`
            }
          </p>
        </div>
      </Card>

      {/* All Features - Unlocked */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          All Features Unlocked
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ALL_FEATURES.map((feature) => (
            <div 
              key={feature.id}
              className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                  {feature.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{feature.name}</span>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
              {feature.action && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                  onClick={() => onNavigate(feature.action!)}
                >
                  {feature.actionLabel}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="p-5 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onNavigate("chat")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-cyan-400 mb-1">{conversationCount}</div>
          <div className="text-sm text-muted-foreground">Conversations</div>
        </Card>
        
        <Card 
          className="p-5 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onNavigate("train")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Settings className="w-5 h-5 text-green-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-green-400 mb-1">{rulesCount}</div>
          <div className="text-sm text-muted-foreground">Training Rules</div>
        </Card>
        
        <Card 
          className="p-5 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onNavigate("rapidqa")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Cpu className="w-5 h-5 text-purple-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-purple-400 mb-1">{qaCount}</div>
          <div className="text-sm text-muted-foreground">Q&A Sessions</div>
        </Card>
        
        <Card 
          className="p-5 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => onNavigate("data")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Upload className="w-5 h-5 text-orange-400" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-orange-400 mb-1">{uploadCount}</div>
          <div className="text-sm text-muted-foreground">Uploads</div>
        </Card>
      </div>
    </div>
  );
}
