import { appFetch } from "@/data/appFetch";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Database, 
  FileJson, 
  Cpu, 
  Zap, 
  CheckCircle2, 
  XCircle,
  ArrowLeft,
  Download,
  RefreshCw,
  Server,
  Brain,
  TestTube,
  Package
} from "lucide-react";
import { toast } from "sonner";

// Training steps with visual info
const TRAINING_STEPS = [
  { 
    id: "queued", 
    label: "Queued", 
    description: "Waiting in queue...",
    icon: RefreshCw,
    color: "text-gray-400"
  },
  { 
    id: "cleaning", 
    label: "Cleaning Data", 
    description: "Removing duplicates and validating training examples",
    icon: Database,
    color: "text-blue-400"
  },
  { 
    id: "formatting", 
    label: "Formatting Data", 
    description: "Converting to JSONL format for LLaMA fine-tuning",
    icon: FileJson,
    color: "text-purple-400"
  },
  { 
    id: "finding_gpus", 
    label: "Finding GPUs", 
    description: "Allocating cloud GPU resources (A100/H100)",
    icon: Server,
    color: "text-orange-400"
  },
  { 
    id: "loading_model", 
    label: "Loading Model", 
    description: "Loading LLaMA 3.1 8B base model with Unsloth",
    icon: Brain,
    color: "text-cyan-400"
  },
  { 
    id: "training", 
    label: "Training", 
    description: "Running LoRA fine-tuning epochs",
    icon: Zap,
    color: "text-yellow-400"
  },
  { 
    id: "testing", 
    label: "Testing", 
    description: "Validating model outputs and quality",
    icon: TestTube,
    color: "text-green-400"
  },
  { 
    id: "packaging", 
    label: "Packaging", 
    description: "Creating downloadable model package",
    icon: Package,
    color: "text-pink-400"
  },
  { 
    id: "completed", 
    label: "Complete!", 
    description: "Your Custom AI is ready to download",
    icon: CheckCircle2,
    color: "text-emerald-400"
  },
];

interface FineTuningProgressProps {
  jobId?: number;
}

export function FineTuningProgress({ jobId }: FineTuningProgressProps) {
  const [, setLocation] = useLocation();
  
  // State for tracking progress
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"running" | "completed" | "failed">("running");
  const [epochProgress, setEpochProgress] = useState({ current: 0, total: 3 });
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [jobData, setJobData] = useState<{
    id: number;
    trainingDataCount: number;
    modelUrl?: string;
    error?: string;
  } | null>(null);

  // Simulate progress for demo (in production, this would poll the API)
  useEffect(() => {
    if (status !== "running") return;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 2;
        
        // Update current step based on progress
        if (newProgress < 5) setCurrentStepIndex(0);
        else if (newProgress < 15) setCurrentStepIndex(1);
        else if (newProgress < 25) setCurrentStepIndex(2);
        else if (newProgress < 35) setCurrentStepIndex(3);
        else if (newProgress < 45) setCurrentStepIndex(4);
        else if (newProgress < 80) {
          setCurrentStepIndex(5);
          // Update epoch progress
          const epochNum = Math.min(3, Math.floor((newProgress - 45) / 12) + 1);
          setEpochProgress({ current: epochNum, total: 3 });
        }
        else if (newProgress < 90) setCurrentStepIndex(6);
        else if (newProgress < 98) setCurrentStepIndex(7);
        else {
          setCurrentStepIndex(8);
          setStatus("completed");
          setJobData({
            id: jobId || 1,
            trainingDataCount: 14,
            modelUrl: "/api/fine-tuning/download/1",
          });
          return 100;
        }

        // Update estimated time
        const remainingPercent = 100 - newProgress;
        setEstimatedTimeRemaining(Math.round(remainingPercent * 0.3)); // ~30 seconds per percent

        return Math.min(newProgress, 100);
      });
    }, 1000);

    return () => clearInterval(progressInterval);
  }, [status, jobId]);

  // Poll for job status (in production)
  useEffect(() => {
    if (!jobId) return;

    const pollStatus = async () => {
      try {
        const response = await appFetch(`/api/trpc/fineTuning.status?input=${encodeURIComponent(JSON.stringify({ json: { jobId } }))}`);
        const data = await response.json();
        if (data.result?.data?.json) {
          const job = data.result.data.json;
          setProgress(job.progress || 0);
          if (job.status === "completed") {
            setStatus("completed");
            setCurrentStepIndex(8);
          } else if (job.status === "failed") {
            setStatus("failed");
          }
        }
      } catch (error) {
        console.error("Failed to poll job status:", error);
      }
    };

    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [jobId]);

  const currentStep = TRAINING_STEPS[currentStepIndex];
  const StepIcon = currentStep.icon;

  const handleDownload = async () => {
    toast.success("Download started", {
      description: "Your Custom AI package is being prepared...",
    });
    // In production, this would trigger the actual download
    setLocation("/dashboard/export-data");
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setLocation("/dashboard/train-worker")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Fine-Tuning Your Custom AI</h1>
          <p className="text-muted-foreground">
            Training your personalized AI model
          </p>
        </div>
      </div>

      {/* Main Progress Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader className="text-center pb-2">
          {/* Animated Icon */}
          <div className="mx-auto mb-4 relative">
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ${status === "running" ? "animate-pulse" : ""}`}>
              <StepIcon className={`h-12 w-12 ${currentStep.color} ${status === "running" && currentStepIndex === 5 ? "animate-spin" : ""}`} />
            </div>
            {status === "running" && (
              <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
            )}
          </div>
          
          <CardTitle className={`text-2xl ${currentStep.color}`}>
            {status === "failed" ? "Training Failed" : currentStep.label}
          </CardTitle>
          <CardDescription className="text-base">
            {status === "failed" ? jobData?.error || "An error occurred during training" : currentStep.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            {estimatedTimeRemaining !== null && status === "running" && (
              <p className="text-sm text-muted-foreground text-center">
                Estimated time remaining: {formatTime(estimatedTimeRemaining)}
              </p>
            )}
          </div>

          {/* Epoch Progress (during training step) */}
          {currentStepIndex === 5 && status === "running" && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                <span className="font-medium">Training Progress</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((epoch) => (
                  <div 
                    key={epoch}
                    className={`flex-1 h-2 rounded-full ${
                      epoch <= epochProgress.current 
                        ? "bg-yellow-400" 
                        : "bg-yellow-400/20"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Epoch {epochProgress.current} of {epochProgress.total}
              </p>
            </div>
          )}

          {/* Step Timeline */}
          <div className="space-y-1">
            <p className="text-sm font-medium mb-3">Training Pipeline</p>
            <div className="grid grid-cols-9 gap-1">
              {TRAINING_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;
                const isFailed = status === "failed" && index === currentStepIndex;
                
                return (
                  <div 
                    key={step.id}
                    className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                      isActive 
                        ? "bg-primary/10 scale-105" 
                        : isCompleted 
                          ? "bg-emerald-500/10" 
                          : "bg-muted/30"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isFailed
                        ? "bg-red-500/20"
                        : isActive 
                          ? "bg-primary/20" 
                          : isCompleted 
                            ? "bg-emerald-500/20" 
                            : "bg-muted"
                    }`}>
                      {isFailed ? (
                        <XCircle className="h-4 w-4 text-red-400" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Icon className={`h-4 w-4 ${isActive ? step.color : "text-muted-foreground"}`} />
                      )}
                    </div>
                    <span className={`text-[10px] mt-1 text-center leading-tight ${
                      isActive ? "text-foreground font-medium" : "text-muted-foreground"
                    }`}>
                      {step.label.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Completion Actions */}
          {status === "completed" && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6 text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-6 w-6 text-emerald-400" />
                <span className="text-lg font-semibold text-emerald-400">
                  Your Custom AI is Ready!
                </span>
              </div>
              <p className="text-muted-foreground">
                Your personalized LLaMA model has been trained on {jobData?.trainingDataCount || 14} examples.
                Download the package to run it locally on your Mac.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Custom AI
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/dashboard/fine-tuning-history")}
                >
                  View All Jobs
                </Button>
              </div>
            </div>
          )}

          {/* Failed State */}
          {status === "failed" && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <XCircle className="h-6 w-6 text-red-400" />
                <span className="text-lg font-semibold text-red-400">
                  Training Failed
                </span>
              </div>
              <p className="text-muted-foreground">
                {jobData?.error || "An error occurred during training. Please try again."}
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => setLocation("/dashboard/train-worker")}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => toast.info("Support contacted", { description: "We'll look into this issue." })}
                >
                  Contact Support
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Cpu className="h-8 w-8 text-blue-400" />
              <div>
                <p className="font-medium">Cloud GPUs</p>
                <p className="text-sm text-muted-foreground">A100/H100 via Modal</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-purple-400" />
              <div>
                <p className="font-medium">Base Model</p>
                <p className="text-sm text-muted-foreground">LLaMA 3.1 8B</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-orange-400" />
              <div>
                <p className="font-medium">Method</p>
                <p className="text-sm text-muted-foreground">LoRA with Unsloth</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What's happening?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Cleaning Data:</strong> We remove duplicates, validate formats, and ensure quality training examples.
          </p>
          <p>
            <strong className="text-foreground">LoRA Fine-tuning:</strong> Instead of retraining the entire model, we train a small "adapter" that captures your worker's unique style. This is faster and produces a smaller file (~50-200MB).
          </p>
          <p>
            <strong className="text-foreground">Unsloth:</strong> We use Unsloth to make training 2x faster and use 60% less memory, so your job completes quickly.
          </p>
          <p>
            <strong className="text-foreground">After Training:</strong> You'll get a download package with everything needed to run your Custom AI locally on your Mac using Ollama.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default FineTuningProgress;
