import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Brain, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Download, 
  Trash2,
  ChevronRight,
  Sparkles,
  Database,
  Calendar,
  Timer,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { toast } from "sonner";

// Mock data for demonstration - will be replaced with real tRPC queries
type FineTuneJob = {
  id: number;
  workerId: number;
  status: "pending" | "preparing" | "training" | "completed" | "failed" | "cancelled";
  progress: number;
  currentStep: string;
  trainingDataCount: number;
  epochs: number;
  learningRate: string;
  loraRank: number;
  baseModel: string;
  modelUrl?: string;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
};

const mockJobs: FineTuneJob[] = [
  {
    id: 1,
    workerId: 1,
    status: "completed",
    progress: 100,
    currentStep: "Training complete",
    trainingDataCount: 342,
    epochs: 3,
    learningRate: "2e-4",
    loraRank: 16,
    baseModel: "Meta-Llama-3.1-8B-Instruct",
    modelUrl: "https://storage.example.com/models/worker-1-v1.safetensors",
    createdAt: new Date("2026-01-10T14:30:00"),
    startedAt: new Date("2026-01-10T14:32:00"),
    completedAt: new Date("2026-01-10T15:45:00"),
  },
  {
    id: 2,
    workerId: 1,
    status: "training",
    progress: 67,
    currentStep: "Training epoch 2/3",
    trainingDataCount: 456,
    epochs: 3,
    learningRate: "2e-4",
    loraRank: 16,
    baseModel: "Meta-Llama-3.1-8B-Instruct",
    createdAt: new Date("2026-01-13T10:00:00"),
    startedAt: new Date("2026-01-13T10:02:00"),
  },
  {
    id: 3,
    workerId: 1,
    status: "failed",
    progress: 23,
    currentStep: "Error during training",
    trainingDataCount: 89,
    epochs: 3,
    learningRate: "2e-4",
    loraRank: 16,
    baseModel: "Meta-Llama-3.1-8B-Instruct",
    error: "Insufficient training data quality. Please review your training examples.",
    createdAt: new Date("2026-01-08T09:15:00"),
    startedAt: new Date("2026-01-08T09:17:00"),
  },
];

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  preparing: { label: "Preparing", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Loader2 },
  training: { label: "Training", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Brain },
  completed: { label: "Completed", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: XCircle },
};

function formatDuration(start: Date, end?: Date): string {
  const endTime = end || new Date();
  const diffMs = endTime.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m`;
  }
  return `${diffMins}m`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FineTuningHistory() {
  const [, setLocation] = useLocation();
  const [jobs] = useState<FineTuneJob[]>(mockJobs);
  const [cancelJobId, setCancelJobId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    console.log("setTimeout 16");
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    toast.success("Job list refreshed");
  };

  const handleCancelJob = async (jobId: number) => {
    // In production, this would call the tRPC mutation
    toast.success("Job cancelled", {
      description: `Fine-tuning job #${jobId} has been cancelled.`,
    });
    setCancelJobId(null);
  };

  const handleDownload = async (job: FineTuneJob) => {
    if (!job.modelUrl) {
      toast.error("Model not available", {
        description: "The model file is not ready for download.",
      });
      return;
    }
    
    toast.success("Download started", {
      description: "Your Custom AI package is being prepared...",
    });
    
    // In production, this would trigger the actual download
    // For now, redirect to export page
    setLocation("/dashboard/export");
  };

  const activeJob = jobs.find(j => j.status === "training" || j.status === "preparing" || j.status === "pending");
  const completedJobs = jobs.filter(j => j.status === "completed");
  const failedJobs = jobs.filter(j => j.status === "failed" || j.status === "cancelled");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/dashboard/train")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Train Worker
            </Button>
          </div>
          <h1 className="text-2xl font-semibold">Fine-Tuning History</h1>
          <p className="text-muted-foreground mt-1">
            Track your Custom AI training jobs and download completed models.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button 
            className="qiko-btn-primary"
            onClick={() => setLocation("/dashboard/train")}
          >
            <Rocket className="w-4 h-4 mr-2" />
            New Training Job
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Database className="w-4 h-4" />
            <span className="text-sm">Total Jobs</span>
          </div>
          <p className="text-2xl font-semibold">{jobs.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Completed</span>
          </div>
          <p className="text-2xl font-semibold text-emerald-400">{completedJobs.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <Brain className="w-4 h-4" />
            <span className="text-sm">In Progress</span>
          </div>
          <p className="text-2xl font-semibold text-purple-400">{activeJob ? 1 : 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">Failed</span>
          </div>
          <p className="text-2xl font-semibold text-red-400">{failedJobs.length}</p>
        </div>
      </div>

      {/* Active Job */}
      {activeJob && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Brain className="w-6 h-6 text-purple-400 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-400">Training in Progress</h3>
                <p className="text-sm text-muted-foreground">Job #{activeJob.id}</p>
              </div>
            </div>
            <Badge className={statusConfig[activeJob.status].color}>
              {statusConfig[activeJob.status].label}
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{activeJob.currentStep}</span>
              <span className="text-purple-400 font-medium">{activeJob.progress}%</span>
            </div>
            <Progress value={activeJob.progress} className="h-2" />
            
            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-purple-500/20">
              <div>
                <p className="text-xs text-muted-foreground">Training Examples</p>
                <p className="font-medium">{activeJob.trainingDataCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Epochs</p>
                <p className="font-medium">{activeJob.epochs}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Base Model</p>
                <p className="font-medium text-sm">{activeJob.baseModel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-medium">{activeJob.startedAt ? formatDuration(activeJob.startedAt) : "—"}</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button 
              variant="outline" 
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={() => setCancelJobId(activeJob.id)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel Job
            </Button>
          </div>
        </div>
      )}

      {/* Job List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All Jobs</h2>
        
        {jobs.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Fine-Tuning Jobs Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start training your Custom AI from the Train Worker page.
            </p>
            <Button onClick={() => setLocation("/dashboard/train")}>
              <Sparkles className="w-4 h-4 mr-2" />
              Start Training
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const StatusIcon = statusConfig[job.status].icon;
              const isActive = job.status === "training" || job.status === "preparing" || job.status === "pending";
              
              return (
                <div 
                  key={job.id}
                  className={`bg-card border rounded-lg p-4 transition-colors ${
                    isActive ? "border-purple-500/30" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        job.status === "completed" ? "bg-emerald-500/20" :
                        job.status === "failed" ? "bg-red-500/20" :
                        isActive ? "bg-purple-500/20" : "bg-muted"
                      }`}>
                        <StatusIcon className={`w-5 h-5 ${
                          job.status === "completed" ? "text-emerald-400" :
                          job.status === "failed" ? "text-red-400" :
                          isActive ? "text-purple-400 animate-pulse" : "text-muted-foreground"
                        }`} />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Job #{job.id}</span>
                          <Badge className={statusConfig[job.status].color}>
                            {statusConfig[job.status].label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(job.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            {job.trainingDataCount} examples
                          </span>
                          {job.startedAt && (
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {formatDuration(job.startedAt, job.completedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {job.status === "completed" && (
                        <Button 
                          size="sm"
                          className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                          onClick={() => handleDownload(job)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                      {job.status === "failed" && job.error && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-400"
                          onClick={() => toast.error("Error Details", { description: job.error })}
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          View Error
                        </Button>
                      )}
                      {isActive && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => setCancelJobId(job.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  
                  {/* Progress bar for active jobs */}
                  {isActive && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{job.currentStep}</span>
                        <span className="text-purple-400">{job.progress}%</span>
                      </div>
                      <Progress value={job.progress} className="h-1.5" />
                    </div>
                  )}
                  
                  {/* Error message for failed jobs */}
                  {job.status === "failed" && job.error && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-sm text-red-400 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        {job.error}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelJobId !== null} onOpenChange={() => setCancelJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Fine-Tuning Job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the training process. Any progress will be lost and you'll need to start a new job.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Training</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-500 hover:bg-red-600"
              onClick={() => cancelJobId && handleCancelJob(cancelJobId)}
            >
              Cancel Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
