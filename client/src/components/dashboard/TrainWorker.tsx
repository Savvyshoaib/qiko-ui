import { appFetch } from "@/data/appFetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  BookOpen, 
  MessageSquare, 
  Sparkles,
  Pause,
  Play,
  Archive,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Folder,
  Clock,
  CheckCircle2,
  Search,
  X,
  Bot,
  User,
  Zap,
  Cpu,
  ArrowRight,
  Lock,
  Crown,
  AlertCircle,
  Download,
  MessageCircle,
  FileUp,
  Wand2,
  AlertTriangle,
  Rocket,
  Info,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface TrainWorkerProps {
  worker: {
    id: number;
    fullName: string | null;
    professionalTitle: string | null;
    categories: unknown;
  };
  onUpdate: () => void;
  suggestedRule?: {
    title: string;
    description: string;
    category: RuleCategory;
    pros: string;
    cons: string;
    originalRequest: string;
  };
}

type RuleCategory = "response_style" | "tone" | "content" | "boundaries" | "behavior" | "rule" | "prompt" | "guardrail";

// Plan limits
const RULE_LIMIT = 20;
const isPremium = true; // TODO: In production, this would come from user subscription data
const OPTIMAL_TRAINING_DATA = 500;
const MIN_TRAINING_DATA = 1; // Lowered for testing - change back to 50 for production

type RuleStatus = "active" | "paused" | "archived";
type RuleSource = "manual" | "q_assistant" | "chat";

interface TrainingRule {
  id: number;
  workerId: number;
  creatorId: number;
  title: string;
  description: string;
  category: RuleCategory;
  source: RuleSource;
  originalRequest: string | null;
  prosExplained: string | null;
  consExplained: string | null;
  status: RuleStatus;
  priority: number | null;
  isGroup: number | null;
  groupId: number | null;
  sortOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const CATEGORY_CONFIG: Record<RuleCategory, { label: string; color: string; icon: React.ReactNode }> = {
  response_style: { label: "Style", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30", icon: <MessageSquare className="w-3 h-3" /> },
  tone: { label: "Tone", color: "bg-purple-500/10 text-purple-400 border-purple-500/30", icon: <Sparkles className="w-3 h-3" /> },
  content: { label: "Content", color: "bg-green-500/10 text-green-400 border-green-500/30", icon: <BookOpen className="w-3 h-3" /> },
  boundaries: { label: "Boundaries", color: "bg-red-500/10 text-red-400 border-red-500/30", icon: <Folder className="w-3 h-3" /> },
  behavior: { label: "Behavior", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", icon: <Zap className="w-3 h-3" /> },
  rule: { label: "Rule", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: <BookOpen className="w-3 h-3" /> },
  prompt: { label: "Prompt", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30", icon: <MessageSquare className="w-3 h-3" /> },
  guardrail: { label: "Guardrail", color: "bg-orange-500/10 text-orange-400 border-orange-500/30", icon: <Folder className="w-3 h-3" /> },
};

const SOURCE_CONFIG: Record<RuleSource, { label: string; icon: React.ReactNode; color: string }> = {
  manual: { label: "Manual", icon: <User className="w-3 h-3" />, color: "text-slate-400" },
  q_assistant: { label: "Q Assistant", icon: <Bot className="w-3 h-3" />, color: "text-cyan-400" },
  chat: { label: "Chat", icon: <MessageSquare className="w-3 h-3" />, color: "text-purple-400" },
};

export default function TrainWorker({ worker, onUpdate, suggestedRule }: TrainWorkerProps) {
  const [, setLocation] = useLocation();
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [editingRule, setEditingRule] = useState<TrainingRule | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["q_assistant", "manual", "chat"]));
  const [addingToGroup, setAddingToGroup] = useState<number | null>(null);
  const [showSuggestedRule, setShowSuggestedRule] = useState(!!suggestedRule);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form state
  const [formTitle, setFormTitle] = useState(suggestedRule?.title || "");
  const [formDescription, setFormDescription] = useState(suggestedRule?.description || "");
  const [formCategory, setFormCategory] = useState<RuleCategory>(suggestedRule?.category || "content");
  const [formPriority, setFormPriority] = useState(50);
  const [formGroupId, setFormGroupId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Fetch rules
  const { data: rules, isLoading } = trpc.trainingRules.list.useQuery(
    { workerId: worker.id },
    { enabled: !!worker.id }
  );

  // Fetch training data count for AI progression
  const { data: trainingDataCount } = trpc.trainingData.dataCount.useQuery(
    { workerId: worker.id },
    { enabled: !!worker.id }
  );

  // Fine-tuning config
  const fineTuneConfig = {
    baseModel: "unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit",
    minExamples: 1, // Lowered for testing
    recommendedExamples: 200,
    optimalExamples: 500,
    defaultEpochs: 3,
    defaultLearningRate: "2e-4",
    defaultLoraRank: 16,
    defaultLoraAlpha: 16,
  };
  
  // Fine-tuning state
  const [activeFineTuneJob, setActiveFineTuneJob] = useState<{
    id: number;
    workerId: number;
    status: string;
    progress: number;
    currentStep: string;
    trainingDataCount: number;
    modelUrl?: string;
    error?: string;
  } | null>(null);
  const [isStartingFineTune, setIsStartingFineTune] = useState(false);
  
  // Start fine-tuning function
  const startFineTuning = async (epochs: number) => {
    setIsStartingFineTune(true);
    try {
      const response = await appFetch('/api/trpc/fineTuning.start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { workerId: worker.id, epochs } }),
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'Failed to start fine-tuning');
      }
      toast.success('Fine-tuning started!', {
        description: data.result?.data?.json?.message || 'Your Custom AI is being trained.',
      });
      // Navigate to fine-tuning progress page
      setLocation('/dashboard/fine-tuning-progress');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to start fine-tuning', {
        description: errorMessage,
      });
    } finally {
      setIsStartingFineTune(false);
    }
  };
  
  const startFineTuningMutation = {
    mutate: (data: { workerId: number; epochs?: number }) => {
      startFineTuning(data.epochs || 3);
    },
    isPending: isStartingFineTune,
  };

  // State for fine-tuning dialog
  const [showFineTuneDialog, setShowFineTuneDialog] = useState(false);
  const [fineTuneEpochs, setFineTuneEpochs] = useState(3);

  // Organize rules by source (auto-grouping)
  const { rulesBySource, customGroups, stats } = useMemo(() => {
    if (!rules) return { 
      rulesBySource: { q_assistant: [], manual: [], chat: [] }, 
      customGroups: [],
      stats: { total: 0, active: 0, bySource: { q_assistant: 0, manual: 0, chat: 0 }, byCategory: {} as Record<string, number> }
    };
    
    // Filter by search
    const filterRule = (r: TrainingRule) => {
      if (r.status === "archived") return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return r.title.toLowerCase().includes(query) || r.description.toLowerCase().includes(query);
      }
      return true;
    };
    
    // Get custom groups (user-created groups)
    const groupHeaders = rules.filter(r => r.isGroup === 1 && r.status !== "archived");
    const customGroupsWithRules = groupHeaders.map(group => ({
      ...group,
      rules: rules.filter(r => r.groupId === group.id && r.status !== "archived" && filterRule(r))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    }));
    
    // Get ungrouped rules by source
    const ungroupedRules = rules.filter(r => !r.isGroup && !r.groupId && r.status !== "archived" && filterRule(r));
    
    const bySource = {
      q_assistant: ungroupedRules.filter(r => r.source === "q_assistant"),
      manual: ungroupedRules.filter(r => r.source === "manual"),
      chat: ungroupedRules.filter(r => r.source === "chat"),
    };
    
    // Calculate stats
    const activeRules = rules.filter(r => r.status !== "archived" && !r.isGroup);
    const categoryCount: Record<string, number> = {};
    activeRules.forEach(r => {
      categoryCount[r.category] = (categoryCount[r.category] || 0) + 1;
    });
    
    return { 
      rulesBySource: bySource, 
      customGroups: customGroupsWithRules,
      stats: {
        total: activeRules.length,
        active: activeRules.filter(r => r.status === "active").length,
        bySource: {
          q_assistant: bySource.q_assistant.length + customGroupsWithRules.reduce((acc, g) => acc + g.rules.filter(r => r.source === "q_assistant").length, 0),
          manual: bySource.manual.length + customGroupsWithRules.reduce((acc, g) => acc + g.rules.filter(r => r.source === "manual").length, 0),
          chat: bySource.chat.length + customGroupsWithRules.reduce((acc, g) => acc + g.rules.filter(r => r.source === "chat").length, 0),
        },
        byCategory: categoryCount,
      }
    };
  }, [rules, searchQuery]);

  // Mutations
  const createRule = trpc.trainingRules.create.useMutation({
    onSuccess: () => {
      utils.trainingRules.list.invalidate({ workerId: worker.id });
      toast.success(isAddingGroup ? "Group created" : "Rule created");
      resetForm();
      setIsAddingRule(false);
      setIsAddingGroup(false);
      setAddingToGroup(null);
      onUpdate();
    },
    onError: (error) => {
      toast.error("Failed: " + error.message);
    },
  });

  const updateRule = trpc.trainingRules.update.useMutation({
    onSuccess: () => {
      utils.trainingRules.list.invalidate({ workerId: worker.id });
      toast.success("Updated");
      setEditingRule(null);
      resetForm();
      onUpdate();
    },
    onError: (error) => {
      toast.error("Failed: " + error.message);
    },
  });

  const deleteRule = trpc.trainingRules.delete.useMutation({
    onSuccess: () => {
      utils.trainingRules.list.invalidate({ workerId: worker.id });
      toast.success("Deleted");
      onUpdate();
    },
    onError: (error) => {
      toast.error("Failed: " + error.message);
    },
  });

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormCategory("content");
    setFormPriority(50);
    setFormGroupId(null);
    setAddingToGroup(null);
  };

  const handleSubmit = () => {
    if (!formTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!isAddingGroup && !formDescription.trim()) {
      toast.error("Description is required");
      return;
    }
    
    createRule.mutate({
      workerId: worker.id,
      title: formTitle.trim(),
      description: isAddingGroup ? "" : formDescription.trim(),
      category: formCategory,
      source: "manual",
      priority: formPriority,
      isGroup: isAddingGroup ? 1 : 0,
      groupId: formGroupId || undefined,
    });
  };

  const handleUpdateRule = () => {
    if (!editingRule) return;
    updateRule.mutate({
      ruleId: editingRule.id,
      workerId: worker.id,
      title: formTitle.trim(),
      description: formDescription.trim(),
      category: formCategory,
      priority: formPriority,
      groupId: formGroupId,
    });
  };

  const handleToggleStatus = (rule: TrainingRule) => {
    updateRule.mutate({
      ruleId: rule.id,
      workerId: worker.id,
      status: rule.status === "active" ? "paused" : "active",
    });
  };

  const handleArchive = (rule: TrainingRule) => {
    updateRule.mutate({
      ruleId: rule.id,
      workerId: worker.id,
      status: "archived",
    });
  };

  const openEditDialog = (rule: TrainingRule) => {
    setEditingRule(rule);
    setFormTitle(rule.title);
    setFormDescription(rule.description);
    setFormCategory(rule.category);
    setFormPriority(rule.priority || 50);
    setFormGroupId(rule.groupId);
    setIsAddingRule(true);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleAcceptSuggestedRule = () => {
    if (!suggestedRule) return;
    createRule.mutate({
      workerId: worker.id,
      title: suggestedRule.title,
      description: suggestedRule.description,
      category: suggestedRule.category,
      source: "q_assistant",
      originalRequest: suggestedRule.originalRequest,
      prosExplained: suggestedRule.pros,
      consExplained: suggestedRule.cons,
    });
    setShowSuggestedRule(false);
  };

  // Training data progress calculations
  const dataCount = trainingDataCount || 0;
  const progressPercent = Math.min(100, (dataCount / OPTIMAL_TRAINING_DATA) * 100);
  const canDeploy = dataCount >= MIN_TRAINING_DATA;
  const isOptimal = dataCount >= OPTIMAL_TRAINING_DATA;

  // Compact rule row component
  const RuleRow = ({ rule }: { rule: TrainingRule }) => (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/30 transition-colors group text-xs border-b border-border/30 last:border-0">
      <button
        onClick={() => handleToggleStatus(rule)}
        className={`w-2 h-2 rounded-full flex-shrink-0 ${rule.status === "active" ? "bg-green-400" : "bg-yellow-400"}`}
        title={rule.status === "active" ? "Active" : "Paused"}
      />
      <span className="flex-1 truncate text-foreground/90">{rule.title}</span>
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${CATEGORY_CONFIG[rule.category].color}`}>
        {CATEGORY_CONFIG[rule.category].label}
      </Badge>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => openEditDialog(rule)} className="p-1 hover:bg-accent rounded" title="Edit">
          <Edit2 className="w-3 h-3 text-muted-foreground" />
        </button>
        <button onClick={() => handleArchive(rule)} className="p-1 hover:bg-accent rounded" title="Archive">
          <Archive className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );

  // Source group component
  const SourceGroup = ({ source, rules: sourceRules, icon, label, color }: { 
    source: string; 
    rules: TrainingRule[]; 
    icon: React.ReactNode; 
    label: string;
    color: string;
  }) => {
    if (sourceRules.length === 0) return null;
    const isExpanded = expandedGroups.has(source);
    
    return (
      <div className="border border-border/50 rounded-lg overflow-hidden bg-card/50">
        <button
          onClick={() => toggleGroup(source)}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/30 transition-colors"
        >
          <span className={color}>{icon}</span>
          <span className="text-sm font-medium flex-1 text-left">{label}</span>
          <Badge variant="secondary" className="text-[10px] h-5">{sourceRules.length}</Badge>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
        {isExpanded && (
          <div className="border-t border-border/30">
            {sourceRules.map(rule => <RuleRow key={rule.id} rule={rule} />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Train Worker
        </h1>
        <p className="text-muted-foreground">
          Shape your AI's behavior with rules and build towards your Custom AI model.
        </p>
      </div>

      {/* Section 1: AI Engine Progress */}
      <Card className="qiko-card mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">AI Engine Progress</h2>
          </div>

          {/* Visual Progress Flow */}
          <div className="flex items-center justify-between mb-6 px-4">
            {/* GPT-4 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mb-2">
                <Sparkles className="w-7 h-7 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-foreground">GPT-4</span>
              <span className="text-xs text-emerald-400">Active Now</span>
            </div>

            {/* Arrow with progress */}
            <div className="flex-1 mx-4 relative">
              <div className="h-1 bg-slate-700 rounded-full">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="absolute top-3 left-0 right-0 flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span className="text-amber-400">{MIN_TRAINING_DATA} min</span>
                <span className="text-emerald-400">{OPTIMAL_TRAINING_DATA} optimal</span>
              </div>
            </div>

            {/* Custom AI */}
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 border-2 transition-all ${
                canDeploy 
                  ? 'bg-purple-500/20 border-purple-500' 
                  : 'bg-slate-800 border-slate-600'
              }`}>
                <Cpu className={`w-7 h-7 ${canDeploy ? 'text-purple-400' : 'text-slate-500'}`} />
              </div>
              <span className="text-sm font-medium text-foreground">Custom AI</span>
              <span className={`text-xs ${canDeploy ? 'text-purple-400' : 'text-slate-500'}`}>
                {canDeploy ? 'Ready' : 'Training'}
              </span>
            </div>
          </div>

          {/* Stats and Fine-tuning */}
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-bold text-foreground">{dataCount}</span>
                <span className="text-sm text-muted-foreground">/ {OPTIMAL_TRAINING_DATA} training examples</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {isOptimal ? (
                  <span className="text-emerald-400">✓ Optimal training data reached</span>
                ) : canDeploy ? (
                  <span className="text-amber-400">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Minimum reached - {OPTIMAL_TRAINING_DATA - dataCount} more for optimal results
                  </span>
                ) : (
                  <span>{MIN_TRAINING_DATA - dataCount} more examples needed to start fine-tuning</span>
                )}
              </p>
            </div>
            
            {/* Fine-tuning buttons */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/dashboard/fine-tuning-history")}
                className="text-muted-foreground hover:text-foreground"
              >
                <Clock className="w-4 h-4 mr-1" />
                View History
              </Button>
              <Button 
                className={canDeploy ? "qiko-btn-primary" : ""}
                variant={canDeploy ? "default" : "outline"}
                disabled={!canDeploy || startFineTuningMutation.isPending}
                onClick={() => setShowFineTuneDialog(true)}
              >
                <Rocket className="w-4 h-4 mr-2" />
                {startFineTuningMutation.isPending ? "Starting..." : canDeploy ? "Start Fine-tuning" : "Not Ready"}
              </Button>
            </div>
          </div>

          {/* Warning for early fine-tuning */}
          {canDeploy && !isOptimal && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-400">Early Fine-tuning Warning</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can start fine-tuning now, but your Custom AI will perform better with more training data. 
                    Consider reaching {OPTIMAL_TRAINING_DATA} examples for optimal results.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Data Quality Message */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 rounded-lg border border-purple-500/20">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">More Data = Better AI</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Every conversation, every Q&A session, and every document you add makes your Custom AI smarter, 
                  more accurate, and more aligned with your business. <span className="text-purple-400">The best models are trained on 500+ examples.</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Data Acceleration - Unlock faster training */}
      <Card className="qiko-card mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold">Accelerate Your Training</h2>
              {!isPremium && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Premium</Badge>}
            </div>
            {!isPremium && (
              <Button variant="outline" size="sm" onClick={() => setLocation("/dashboard/plans")}>
                <Crown className="w-4 h-4 mr-2 text-amber-400" />
                Unlock
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Don't wait months for customer conversations. <span className="text-amber-400 font-medium">Generate high-quality training data 10x faster</span> with 
            these powerful tools and reach your Custom AI goals in days, not months.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Q&A Sessions */}
            <div 
              className={`p-4 rounded-lg border transition-all ${
                isPremium 
                  ? 'border-border hover:border-primary/50 cursor-pointer hover:bg-accent/30' 
                  : 'border-border/50 hover:border-amber-500/30 cursor-pointer'
              }`}
              onClick={() => {
                if (isPremium) {
                  setLocation("/dashboard/qa-sessions");
                } else {
                  setLocation("/dashboard/plans");
                }
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${isPremium ? 'bg-cyan-500/20' : 'bg-slate-800'}`}>
                  <MessageCircle className={`w-5 h-5 ${isPremium ? 'text-cyan-400' : 'text-slate-500'}`} />
                </div>
                {!isPremium && <Lock className="w-4 h-4 text-amber-400" />}
              </div>
              <h3 className="font-medium text-foreground mb-1">Q&A Sessions</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Rapid-fire customer simulations. Answer questions as your worker would.
              </p>
              <p className="text-xs text-cyan-400">~50 examples per session</p>
            </div>

            {/* Data Upload */}
            <div 
              className={`p-4 rounded-lg border transition-all ${
                isPremium 
                  ? 'border-border hover:border-primary/50 cursor-pointer hover:bg-accent/30' 
                  : 'border-border/50 hover:border-amber-500/30 cursor-pointer'
              }`}
              onClick={() => {
                if (isPremium) {
                  setLocation("/dashboard/data-upload");
                } else {
                  setLocation("/dashboard/plans");
                }
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${isPremium ? 'bg-purple-500/20' : 'bg-slate-800'}`}>
                  <FileUp className={`w-5 h-5 ${isPremium ? 'text-purple-400' : 'text-slate-500'}`} />
                </div>
                {!isPremium && <Lock className="w-4 h-4 text-amber-400" />}
              </div>
              <h3 className="font-medium text-foreground mb-1">Data Upload</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Upload PDFs, chat logs, and documents to extract training data.
              </p>
              <p className="text-xs text-purple-400">~100 examples per document</p>
            </div>

            {/* Synthetic Generation */}
            <div 
              className={`p-4 rounded-lg border transition-all ${
                isPremium 
                  ? 'border-border hover:border-primary/50 cursor-pointer hover:bg-accent/30' 
                  : 'border-border/50 hover:border-amber-500/30 cursor-pointer'
              }`}
              onClick={() => {
                if (isPremium) {
                  setLocation("/dashboard/synthetic");
                } else {
                  setLocation("/dashboard/plans");
                }
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${isPremium ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
                  <Wand2 className={`w-5 h-5 ${isPremium ? 'text-emerald-400' : 'text-slate-500'}`} />
                </div>
                {!isPremium && <Lock className="w-4 h-4 text-amber-400" />}
              </div>
              <h3 className="font-medium text-foreground mb-1">Synthetic Generation</h3>
              <p className="text-xs text-muted-foreground mb-2">
                AI-generated training pairs based on your worker's profile and rules.
              </p>
              <p className="text-xs text-emerald-400">~200 examples in minutes</p>
            </div>
          </div>

          {!isPremium && (
            <div className="mt-4 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
              <div className="flex items-center gap-3">
                <Rocket className="w-6 h-6 text-amber-400" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Reach 500 examples in one afternoon</p>
                  <p className="text-sm text-muted-foreground">
                    Premium users typically build their Custom AI in <span className="text-amber-400">1-2 days</span> instead of waiting months for organic data.
                  </p>
                </div>
                <Button className="qiko-btn-primary" onClick={() => setLocation("/dashboard/plans")}>
                  Upgrade Now
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Training Rules */}
      <Card className="qiko-card mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Training Rules</h2>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => { setIsAddingGroup(true); setIsAddingRule(true); }}>
                <FolderPlus className="w-3 h-3" /> Group
              </Button>
              <Button 
                size="sm" 
                className="qiko-btn-primary h-8 text-xs gap-1" 
                onClick={() => {
                  if (!isPremium && stats.total >= RULE_LIMIT) {
                    toast.error("Rule limit reached! Upgrade to Premium for unlimited rules.");
                    return;
                  }
                  setIsAddingGroup(false); 
                  setIsAddingRule(true);
                }}
              >
                <Plus className="w-3 h-3" /> Rule
              </Button>
            </div>
          </div>
          
          {/* Rule Limit Progress (Entry Plan only) */}
          {!isPremium && (
            <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Training Rules</span>
                <span className={`text-sm font-medium ${stats.total >= RULE_LIMIT ? 'text-orange-400' : 'text-green-400'}`}>
                  {stats.total} / {RULE_LIMIT} used
                </span>
              </div>
              <Progress 
                value={(stats.total / RULE_LIMIT) * 100} 
                className="h-2"
              />
              {stats.total >= RULE_LIMIT ? (
                <p className="text-xs text-orange-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Rule limit reached. Upgrade to Premium for unlimited rules.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">
                  {RULE_LIMIT - stats.total} rules remaining on Entry Plan
                </p>
              )}
            </div>
          )}
          
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-accent/30 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-foreground">{stats.total}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Total Rules</div>
            </div>
            <div className="bg-cyan-500/10 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-cyan-400">{stats.bySource.q_assistant}</div>
              <div className="text-[10px] text-cyan-400/70 uppercase">From Q</div>
            </div>
            <div className="bg-purple-500/10 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-purple-400">{stats.bySource.chat}</div>
              <div className="text-[10px] text-purple-400/70 uppercase">From Chat</div>
            </div>
            <div className="bg-slate-500/10 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-slate-400">{stats.bySource.manual}</div>
              <div className="text-[10px] text-slate-400/70 uppercase">Manual</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Suggested Rule */}
          {showSuggestedRule && suggestedRule && (
            <Card className="border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 mb-4">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span className="text-xs font-medium text-cyan-400">Suggested by Q</span>
                    </div>
                    <p className="text-sm font-medium truncate">{suggestedRule.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{suggestedRule.description}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button size="sm" className="qiko-btn-primary h-7 text-xs" onClick={handleAcceptSuggestedRule}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowSuggestedRule(false)}>Dismiss</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rules List */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading rules...</div>
          ) : (
            <div className="space-y-3">
              {/* Custom Groups */}
              {customGroups.map(group => (
                <Collapsible key={group.id} open={expandedGroups.has(`group-${group.id}`)} onOpenChange={() => toggleGroup(`group-${group.id}`)}>
                  <div className="border border-border/50 rounded-lg overflow-hidden bg-card/50">
                    <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/30 transition-colors">
                      <Folder className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium flex-1 text-left">{group.title}</span>
                      <Badge variant="secondary" className="text-[10px] h-5">{group.rules.length}</Badge>
                      {expandedGroups.has(`group-${group.id}`) ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border/30">
                        {group.rules.map(rule => <RuleRow key={rule.id} rule={rule} />)}
                        {group.rules.length === 0 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">No rules in this group</div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}

              {/* Source Groups */}
              <SourceGroup 
                source="q_assistant" 
                rules={rulesBySource.q_assistant} 
                icon={SOURCE_CONFIG.q_assistant.icon}
                label="From Q Assistant"
                color={SOURCE_CONFIG.q_assistant.color}
              />
              <SourceGroup 
                source="chat" 
                rules={rulesBySource.chat} 
                icon={SOURCE_CONFIG.chat.icon}
                label="From Chat"
                color={SOURCE_CONFIG.chat.color}
              />
              <SourceGroup 
                source="manual" 
                rules={rulesBySource.manual} 
                icon={SOURCE_CONFIG.manual.icon}
                label="Manual Rules"
                color={SOURCE_CONFIG.manual.color}
              />

              {/* Empty State */}
              {stats.total === 0 && customGroups.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No rules yet. Use the Q assistant or add rules manually.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddingRule} onOpenChange={(open) => { setIsAddingRule(open); if (!open) { resetForm(); setEditingRule(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingRule ? "Edit Rule" : isAddingGroup ? "New Group" : "New Rule"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Title</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={isAddingGroup ? "e.g., Marriott Properties" : "e.g., Always include pricing"}
                className="h-8 text-sm"
              />
            </div>
            {!isAddingGroup && (
              <div>
                <label className="text-xs font-medium mb-1 block">Description</label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What should the worker do?"
                  rows={3}
                  className="text-sm"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Category</label>
                <Select value={formCategory} onValueChange={(v) => setFormCategory(v as RuleCategory)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="response_style">Response Style</SelectItem>
                    <SelectItem value="tone">Tone</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="boundaries">Boundaries</SelectItem>
                    <SelectItem value="behavior">Behavior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Priority (0-100)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formPriority}
                  onChange={(e) => setFormPriority(parseInt(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setIsAddingRule(false); resetForm(); setEditingRule(null); }}>
              Cancel
            </Button>
            <Button size="sm" className="qiko-btn-primary" onClick={editingRule ? handleUpdateRule : handleSubmit}>
              {editingRule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fine-tuning Dialog */}
      <Dialog open={showFineTuneDialog} onOpenChange={setShowFineTuneDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-purple-400" />
              Start Fine-tuning
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Data Warning */}
            {dataCount < OPTIMAL_TRAINING_DATA && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-400">More data recommended</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You have {dataCount} training examples. For best results, we recommend at least {OPTIMAL_TRAINING_DATA} examples. 
                      Your Custom AI will still work, but may be less accurate.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Training Examples</span>
                <span className={`font-medium ${dataCount < 200 ? 'text-orange-400' : dataCount < OPTIMAL_TRAINING_DATA ? 'text-yellow-400' : 'text-green-400'}`}>{dataCount}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Training Rules</span>
                <span className="font-medium text-foreground">{stats.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Base Model</span>
                <span className="font-medium text-foreground">LLaMA 3.1 8B</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-xs font-medium">Training Rounds</label>
                <div className="group relative">
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-muted-foreground w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg">
                    <p className="font-medium text-foreground mb-1">What are training rounds?</p>
                    <p>Think of it like studying for an exam. More rounds = the AI reviews your data more times, learning patterns better. 3 rounds is usually the sweet spot between speed and quality.</p>
                  </div>
                </div>
              </div>
              <Select value={fineTuneEpochs.toString()} onValueChange={(v) => setFineTuneEpochs(parseInt(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 round (fastest, basic learning)</SelectItem>
                  <SelectItem value="2">2 rounds</SelectItem>
                  <SelectItem value="3">3 rounds (recommended)</SelectItem>
                  <SelectItem value="5">5 rounds (thorough learning)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-purple-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-purple-400">Estimated Time: 15-30 minutes</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fine-tuning runs on cloud GPUs. You'll be notified when your Custom AI is ready to download.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowFineTuneDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="qiko-btn-primary" 
              onClick={async () => {
                try {
                  // Call the actual fine-tuning API
                  const response = await appFetch('/api/trpc/fineTuning.start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      json: {
                        workerId: worker.id,
                        epochs: fineTuneEpochs,
                      }
                    }),
                  });
                  const result = await response.json();
                  if (result.error) {
                    toast.error("Failed to start fine-tuning", {
                      description: result.error.json?.message || result.error.message || "Please try again later.",
                    });
                    setShowFineTuneDialog(false);
                    return;
                  }
                  // Success - navigate to progress page
                  toast.success("Fine-tuning job started!", {
                    description: "Navigating to training progress...",
                  });
                  setShowFineTuneDialog(false);
                  setLocation('/dashboard/fine-tuning-progress');
                } catch (error) {
                  toast.error("Failed to start fine-tuning", {
                    description: "Please check your connection and try again.",
                  });
                  setShowFineTuneDialog(false);
                }
              }}
            >
              <Rocket className="w-4 h-4 mr-2" />
              Start Fine-tuning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
