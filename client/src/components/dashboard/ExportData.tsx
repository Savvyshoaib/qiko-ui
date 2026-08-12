import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { 
  Download,
  FileJson,
  Server,
  Lock,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Copy,
  FileCode,
  HardDrive,
  Laptop,
  Package,
  Sparkles,
  Terminal,
  Cpu,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JSZip from "jszip";

interface ExportDataProps {
  worker: {
    id: number;
    fullName: string | null;
  };
  onUpdate: () => void;
}

export default function ExportData({ worker, onUpdate }: ExportDataProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingCustomAI, setIsExportingCustomAI] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Get current subscription and readiness
  const { data: subscription } = trpc.subscription.get.useQuery({ workerId: worker.id });
  const { data: readiness } = trpc.readiness.get.useQuery({ workerId: worker.id });
  const { data: trainingDataCount } = trpc.trainingData.dataCount.useQuery({ workerId: worker.id });
  const { data: rulesData } = trpc.trainingRules.list.useQuery({ workerId: worker.id });

  const exportMutation = trpc.trainingData.export.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Export complete!", {
        description: `Downloaded ${data.filename}`,
      });
      setIsExporting(false);
    },
    onError: (error) => {
      toast.error(error.message || "Export failed");
      setIsExporting(false);
    },
  });

  // Use the exportForFineTuning from trainingData router
  const exportForFineTuningMutation = trpc.trainingData.exportForFineTuning.useMutation({
    onSuccess: async (data: {
      trainingData: string;
      modelfile: string;
      setupScript: string;
      readme: string;
      workerName: string;
      timestamp: string;
      stats: { totalExamples: number; conversationExamples: number; trainingRules: number };
    }) => {
      try {
        // Create a ZIP file with all the components
        const zip = new JSZip();
        
        // Add training data
        zip.file("training-data.jsonl", data.trainingData);
        
        // Add Modelfile
        zip.file("Modelfile", data.modelfile);
        
        // Add setup script
        zip.file("setup.sh", data.setupScript);
        
        // Add README
        zip.file("README.md", data.readme);
        
        // Generate the zip
        const zipBlob = await zip.generateAsync({ type: "blob" });
        
        // Download
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.workerName}-custom-ai-${data.timestamp}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success("Custom AI Package Downloaded!", {
          description: `Contains ${data.stats.totalExamples} training examples and setup files`,
        });
      } catch (err) {
        toast.error("Failed to create download package");
      }
      setIsExportingCustomAI(false);
      setExportProgress(0);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Export failed");
      setIsExportingCustomAI(false);
      setExportProgress(0);
    },
  });

  const handleExportJSONL = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    const interval = setInterval(() => {
      setExportProgress(prev => Math.min(prev + 20, 90));
    }, 200);

    try {
      await exportMutation.mutateAsync({
        workerId: worker.id,
        format: "jsonl",
      });
      setExportProgress(100);
    } finally {
      clearInterval(interval);
    }
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    const interval = setInterval(() => {
      setExportProgress(prev => Math.min(prev + 20, 90));
    }, 200);

    try {
      await exportMutation.mutateAsync({
        workerId: worker.id,
        format: "json",
      });
      setExportProgress(100);
    } finally {
      clearInterval(interval);
    }
  };

  const handleExportCustomAI = async () => {
    setIsExportingCustomAI(true);
    setExportProgress(0);
    
    const interval = setInterval(() => {
      setExportProgress(prev => Math.min(prev + 5, 90));
    }, 100);

    try {
      await exportForFineTuningMutation.mutateAsync({
        workerId: worker.id,
      });
      setExportProgress(100);
    } finally {
      clearInterval(interval);
    }
  };

  const isPremium = subscription?.tier === "premium" || subscription?.tier === "enterprise";
  const dataCount = trainingDataCount || 0;
  const rulesCount = rulesData?.filter(r => r.status === "active" && !r.isGroup).length || 0;
  const workerSlug = worker.fullName?.toLowerCase().replace(/\s/g, "-") || "my-worker";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Export Data
        </h1>
        <p className="text-muted-foreground">
          Download your training data or get your Custom AI to run locally on your Mac.
        </p>
      </div>

      <Tabs defaultValue="custom-ai">
        <TabsList className="mb-6">
          <TabsTrigger value="custom-ai">
            <Laptop className="w-4 h-4 mr-2" />
            Custom AI (Mac)
          </TabsTrigger>
          <TabsTrigger value="training">
            <FileJson className="w-4 h-4 mr-2" />
            Training Data
          </TabsTrigger>
        </TabsList>

        {/* Custom AI Tab - Main Feature */}
        <TabsContent value="custom-ai">
          <div className="space-y-6">
            {/* Hero Card */}
            <Card className="qiko-card p-8 bg-gradient-to-br from-purple-500/10 via-background to-cyan-500/10 border-purple-500/20">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      Premium Feature
                    </Badge>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    Download Your Custom AI
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Get a complete package to run your trained AI locally on your Mac. 
                    100% on-premise, no internet required after download. Your data stays yours.
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                      <div className="text-2xl font-bold text-foreground">{dataCount}</div>
                      <div className="text-sm text-muted-foreground">Training Examples</div>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                      <div className="text-2xl font-bold text-foreground">{rulesCount}</div>
                      <div className="text-sm text-muted-foreground">Active Rules</div>
                    </div>
                  </div>

                  {/* Progress indicator when exporting */}
                  {isExportingCustomAI && (
                    <div className="mb-6">
                      <Progress value={exportProgress} className="h-2 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Preparing your Custom AI package... {exportProgress}%
                      </p>
                    </div>
                  )}

                  {/* Download Button */}
                  {isPremium ? (
                    <Button 
                      size="lg" 
                      className="qiko-btn-primary"
                      onClick={handleExportCustomAI}
                      disabled={isExportingCustomAI || dataCount === 0}
                    >
                      {isExportingCustomAI ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Package className="w-5 h-5 mr-2" />
                      )}
                      Download Custom AI Package
                    </Button>
                  ) : (
                    <Button size="lg" variant="outline" disabled>
                      <Lock className="w-5 h-5 mr-2" />
                      Upgrade to Premium
                    </Button>
                  )}

                  {dataCount === 0 && (
                    <p className="text-sm text-amber-400 mt-3">
                      Add training data first to enable export
                    </p>
                  )}
                </div>

                {/* What's Included */}
                <div className="lg:w-80">
                  <div className="p-6 rounded-xl bg-background/80 border border-border">
                    <h3 className="font-semibold text-foreground mb-4">Package Includes:</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-foreground">training-data.jsonl</div>
                          <div className="text-xs text-muted-foreground">Your conversations + rules</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-foreground">Modelfile</div>
                          <div className="text-xs text-muted-foreground">Ollama configuration</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-foreground">setup.sh</div>
                          <div className="text-xs text-muted-foreground">One-click Mac installer</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-foreground">README.md</div>
                          <div className="text-xs text-muted-foreground">Complete setup guide</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* How It Works */}
            <Card className="qiko-card p-6">
              <h3 className="font-semibold text-foreground mb-6">How It Works</h3>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                    <Download className="w-6 h-6 text-purple-400" />
                  </div>
                  <h4 className="font-medium text-foreground mb-2">1. Download Package</h4>
                  <p className="text-sm text-muted-foreground">
                    Get your Custom AI as a ZIP file with everything you need
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                    <Terminal className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h4 className="font-medium text-foreground mb-2">2. Run Setup Script</h4>
                  <p className="text-sm text-muted-foreground">
                    Execute setup.sh to install Ollama and configure your model
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <Cpu className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h4 className="font-medium text-foreground mb-2">3. Chat Locally</h4>
                  <p className="text-sm text-muted-foreground">
                    Run your AI 100% on your Mac - no internet needed
                  </p>
                </div>
              </div>
            </Card>

            {/* Quick Commands */}
            <Card className="qiko-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Quick Commands</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                    1
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-1">Unzip and run setup:</div>
                    <div className="p-3 rounded-lg bg-secondary/50 font-mono text-sm flex items-center justify-between">
                      <code className="text-foreground">chmod +x setup.sh && ./setup.sh</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard("chmod +x setup.sh && ./setup.sh")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                    2
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-1">Chat with your AI:</div>
                    <div className="p-3 rounded-lg bg-secondary/50 font-mono text-sm flex items-center justify-between">
                      <code className="text-foreground">ollama run {workerSlug}</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(`ollama run ${workerSlug}`)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-start gap-3">
                  <Laptop className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground text-sm">Optimized for Apple Silicon</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Your M4 Max with 34GB RAM can run LLaMA 3.1 8B at full speed, 
                      or even 70B quantized. Perfect for local AI.
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Training Data Tab */}
        <TabsContent value="training">
          <div className="space-y-6">
            {/* Stats Overview */}
            <Card className="qiko-card p-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Training Examples</div>
                  <div className="text-2xl font-semibold text-foreground">{dataCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {dataCount >= 200 ? (
                      <span className="text-emerald-400">✓ Ready for fine-tuning</span>
                    ) : (
                      <span>Need {200 - dataCount} more for fine-tuning</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Active Rules</div>
                  <div className="text-2xl font-semibold text-foreground">{rulesCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Behavioral instructions
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Current Plan</div>
                  <div className="text-2xl font-semibold text-foreground capitalize">
                    {subscription?.tier || "Entry"}
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* JSONL Export */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="qiko-card p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <FileCode className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">JSONL Format</h3>
                      <p className="text-xs text-muted-foreground">For fine-tuning services</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 flex-1">
                    Export your training data in JSONL format, compatible with Together AI, 
                    OpenAI, and other fine-tuning platforms.
                  </p>

                  <div className="p-3 rounded-lg bg-secondary/50 mb-4 font-mono text-xs overflow-x-auto">
                    <code className="text-muted-foreground whitespace-nowrap">
                      {`{"messages":[{"role":"system",...},{"role":"user",...}]}`}
                    </code>
                  </div>

                  {isExporting && (
                    <div className="mb-4">
                      <Progress value={exportProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Preparing export... {exportProgress}%
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleExportJSONL}
                    disabled={isExporting || dataCount === 0}
                    className="w-full"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download JSONL
                  </Button>
                </Card>
              </motion.div>

              {/* JSON Export */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="qiko-card p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-emerald-500/20">
                      <FileJson className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">JSON Format</h3>
                      <p className="text-xs text-muted-foreground">Full dataset with metadata</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 flex-1">
                    Export your complete training dataset as a JSON file including metadata, 
                    categories, and quality scores.
                  </p>

                  <div className="p-3 rounded-lg bg-secondary/50 mb-4 font-mono text-xs overflow-x-auto">
                    <code className="text-muted-foreground whitespace-nowrap">
                      {`{"worker":{...},"examples":[...]}`}
                    </code>
                  </div>

                  <Button
                    onClick={handleExportJSON}
                    disabled={isExporting || dataCount === 0}
                    variant="outline"
                    className="w-full"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download JSON
                  </Button>
                </Card>
              </motion.div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
