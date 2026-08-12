import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { 
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  Settings2,
  MessageSquare,
  RefreshCw,
  Download,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface SyntheticDataGeneratorProps {
  worker: {
    id: number;
    fullName: string | null;
    professionalTitle: string | null;
    tone: string | null;
    categories?: string[] | null;
    typicalClients?: string | null;
    commonTasks?: string | null;
  };
  onUpdate: () => void;
}

interface GeneratedExample {
  id: string;
  userMessage: string;
  assistantResponse: string;
  category: string;
  quality: "pending" | "approved" | "rejected";
}

const SCENARIO_CATEGORIES = [
  { id: "greeting", label: "Greetings & Introductions", count: 20 },
  { id: "expertise", label: "Expertise Questions", count: 30 },
  { id: "pricing", label: "Pricing & Business", count: 25 },
  { id: "objections", label: "Objection Handling", count: 25 },
  { id: "difficult", label: "Difficult Situations", count: 20 },
  { id: "closing", label: "Closing & Follow-up", count: 15 },
  { id: "edge_cases", label: "Edge Cases & Boundaries", count: 20 },
  { id: "technical", label: "Technical Questions", count: 25 },
  { id: "emotional", label: "Emotional Support", count: 20 },
];

export default function SyntheticDataGenerator({ worker, onUpdate }: SyntheticDataGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExamples, setGeneratedExamples] = useState<GeneratedExample[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["greeting", "expertise", "pricing"]);
  const [examplesPerCategory, setExamplesPerCategory] = useState(10);
  const [activeTab, setActiveTab] = useState("configure");
  const [generationProgress, setGenerationProgress] = useState(0);

  // tRPC mutations
  const generateMutation = trpc.trainingData.generateSynthetic.useMutation({
    onSuccess: (data) => {
      const newExamples: GeneratedExample[] = data.examples.map((ex: any, idx: number) => ({
        id: `gen-${Date.now()}-${idx}`,
        userMessage: ex.userMessage,
        assistantResponse: ex.assistantResponse,
        category: ex.category,
        quality: "pending" as const,
      }));
      setGeneratedExamples(prev => [...prev, ...newExamples]);
      setGenerationProgress(prev => prev + 1);
    },
  });

  const saveMutation = trpc.trainingData.uploadBatch.useMutation({
    onSuccess: (data) => {
      toast.success(`Saved ${data.count} training examples!`);
      onUpdate();
    },
  });

  const handleGenerate = async () => {
    if (selectedCategories.length === 0) {
      toast.error("Please select at least one category");
      return;
    }

    setIsGenerating(true);
    setGeneratedExamples([]);
    setGenerationProgress(0);
    setActiveTab("review");

    try {
      // Generate examples for each selected category
      for (const category of selectedCategories) {
        await generateMutation.mutateAsync({
          workerId: worker.id,
          category,
          count: examplesPerCategory,
        });
      }
      toast.success(`Generated ${selectedCategories.length * examplesPerCategory} examples!`);
    } catch (error) {
      toast.error("Failed to generate examples. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = (id: string) => {
    setGeneratedExamples(prev =>
      prev.map(ex => ex.id === id ? { ...ex, quality: "approved" as const } : ex)
    );
  };

  const handleReject = (id: string) => {
    setGeneratedExamples(prev =>
      prev.map(ex => ex.id === id ? { ...ex, quality: "rejected" as const } : ex)
    );
  };

  const handleDelete = (id: string) => {
    setGeneratedExamples(prev => prev.filter(ex => ex.id !== id));
  };

  const handleSaveApproved = async () => {
    const approved = generatedExamples.filter(ex => ex.quality === "approved");
    if (approved.length === 0) {
      toast.error("No approved examples to save");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        workerId: worker.id,
        conversations: approved.map(ex => ({
          userMessage: ex.userMessage,
          assistantResponse: ex.assistantResponse,
          category: ex.category,
        })),
      });
      // Remove saved examples
      setGeneratedExamples(prev => prev.filter(ex => ex.quality !== "approved"));
    } catch (error) {
      toast.error("Failed to save examples");
    }
  };

  const approvedCount = generatedExamples.filter(ex => ex.quality === "approved").length;
  const pendingCount = generatedExamples.filter(ex => ex.quality === "pending").length;
  const rejectedCount = generatedExamples.filter(ex => ex.quality === "rejected").length;

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Synthetic Data Generator
          </h1>
          <p className="text-muted-foreground">
            Use AI to generate realistic conversation examples based on {worker.fullName || "your worker"}'s profile and expertise.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="configure">
              <Settings2 className="w-4 h-4 mr-2" />
              Configure
            </TabsTrigger>
            <TabsTrigger value="review">
              <Eye className="w-4 h-4 mr-2" />
              Review ({generatedExamples.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configure">
            {/* Worker Profile Summary */}
            <Card className="qiko-card p-6 mb-6">
              <h3 className="font-medium text-foreground mb-4">Worker Profile</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <span className="ml-2 text-foreground">{worker.fullName || "Not set"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Title:</span>
                  <span className="ml-2 text-foreground">{worker.professionalTitle || "Not set"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tone:</span>
                  <span className="ml-2 text-foreground">{worker.tone || "Not set"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Expertise:</span>
                  <span className="ml-2 text-foreground">
                    {worker.categories?.join(", ") || "Not set"}
                  </span>
                </div>
              </div>
              {(!worker.fullName || !worker.tone) && (
                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>Complete your worker profile for better quality examples</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Category Selection */}
            <Card className="qiko-card p-6 mb-6">
              <h3 className="font-medium text-foreground mb-4">Select Categories</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose which types of conversations to generate. More categories = more diverse training data.
              </p>
              <div className="grid md:grid-cols-3 gap-3">
                {SCENARIO_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedCategories.includes(cat.id)
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <div className="font-medium text-sm">{cat.label}</div>
                    <div className="text-xs mt-1 opacity-70">~{cat.count} scenarios</div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Generation Settings */}
            <Card className="qiko-card p-6 mb-6">
              <h3 className="font-medium text-foreground mb-4">Generation Settings</h3>
              <div className="space-y-6">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    Examples per category: {examplesPerCategory}
                  </Label>
                  <Slider
                    value={[examplesPerCategory]}
                    onValueChange={([val]) => setExamplesPerCategory(val)}
                    min={5}
                    max={30}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>5</span>
                    <span>30</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-secondary/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total examples to generate:</span>
                    <span className="text-lg font-medium text-primary">
                      {selectedCategories.length * examplesPerCategory}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedCategories.length} categories × {examplesPerCategory} examples each
                  </div>
                </div>
              </div>
            </Card>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || selectedCategories.length === 0}
              className="w-full qiko-btn-primary"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating... ({generationProgress}/{selectedCategories.length})
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate {selectedCategories.length * examplesPerCategory} Examples
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="review">
            {generatedExamples.length === 0 ? (
              <Card className="qiko-card p-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Examples Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Configure your settings and generate examples to review them here.
                </p>
                <Button variant="outline" onClick={() => setActiveTab("configure")}>
                  Go to Configure
                </Button>
              </Card>
            ) : (
              <>
                {/* Stats Bar */}
                <div className="flex items-center gap-4 mb-6">
                  <Badge variant="outline" className="text-emerald-400 border-emerald-400/50">
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    {approvedCount} Approved
                  </Badge>
                  <Badge variant="outline" className="text-amber-400 border-amber-400/50">
                    <Eye className="w-3 h-3 mr-1" />
                    {pendingCount} Pending
                  </Badge>
                  <Badge variant="outline" className="text-red-400 border-red-400/50">
                    <ThumbsDown className="w-3 h-3 mr-1" />
                    {rejectedCount} Rejected
                  </Badge>
                  <div className="flex-1" />
                  {approvedCount > 0 && (
                    <Button
                      onClick={handleSaveApproved}
                      disabled={saveMutation.isPending}
                      className="qiko-btn-primary"
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Save {approvedCount} Approved
                    </Button>
                  )}
                </div>

                {/* Examples List */}
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {generatedExamples.map((example) => (
                      <motion.div
                        key={example.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card className={`qiko-card p-4 ${
                          example.quality === "approved" ? "border-emerald-500/30" :
                          example.quality === "rejected" ? "border-red-500/30 opacity-50" :
                          ""
                        }`}>
                          <div className="flex items-start justify-between mb-3">
                            <Badge variant="secondary" className="text-xs">
                              {example.category}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {example.quality === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleApprove(example.id)}
                                    className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                  >
                                    <ThumbsUp className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleReject(example.id)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  >
                                    <ThumbsDown className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(example.id)}
                                className="text-muted-foreground hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="p-3 rounded-lg bg-primary/10">
                              <div className="text-xs text-primary mb-1 font-medium">User:</div>
                              <div className="text-sm text-foreground">{example.userMessage}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-secondary">
                              <div className="text-xs text-muted-foreground mb-1 font-medium">
                                {worker.fullName || "Worker"}:
                              </div>
                              <div className="text-sm text-foreground">{example.assistantResponse}</div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
