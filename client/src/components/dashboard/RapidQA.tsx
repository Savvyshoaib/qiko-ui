import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
  Target,
  Play,
  RotateCcw,
  User,
  Bot,
  RefreshCw,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface RapidQAProps {
  worker: {
    id: number;
    fullName: string | null;
    professionalTitle: string | null;
    categories?: string[] | null;
    typicalClients?: string | null;
    commonTasks?: string | null;
    tone?: string | null;
  };
  onUpdate: () => void;
}

interface CustomerQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
}

export default function RapidQA({ worker, onUpdate }: RapidQAProps) {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [questions, setQuestions] = useState<CustomerQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // tRPC mutations
  const generateQuestionsMutation = trpc.rapidQA.generateQuestions.useMutation();
  const saveMutation = trpc.trainingData.uploadBatch.useMutation();

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0;

  const handleStartSession = async () => {
    setIsLoadingQuestions(true);
    setSessionStarted(true);
    
    try {
      // Generate questions based on worker profile
      const result = await generateQuestionsMutation.mutateAsync({
        workerId: worker.id,
        count: 20,
      });
      
      setQuestions(result.questions);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setCurrentAnswer("");
      setSessionComplete(false);
    } catch (error) {
      toast.error("Failed to generate questions. Please try again.");
      setSessionStarted(false);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleGenerateMoreQuestions = async () => {
    setIsLoadingQuestions(true);
    try {
      const result = await generateQuestionsMutation.mutateAsync({
        workerId: worker.id,
        count: 10,
      });
      
      setQuestions(prev => [...prev, ...result.questions]);
      toast.success(`Added ${result.questions.length} more customer questions!`);
    } catch (error) {
      toast.error("Failed to generate more questions");
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleSaveAnswer = () => {
    if (!currentAnswer.trim()) {
      toast.error("Please provide a response before continuing");
      return;
    }

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: currentAnswer.trim(),
    }));

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer(answers[questions[currentQuestionIndex + 1]?.id] || "");
    } else {
      handleCompleteSession();
    }
  };

  const handleSkipQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer(answers[questions[currentQuestionIndex + 1]?.id] || "");
    } else {
      handleCompleteSession();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      if (currentAnswer.trim()) {
        setAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: currentAnswer.trim(),
        }));
      }
      setCurrentQuestionIndex(prev => prev - 1);
      setCurrentAnswer(answers[questions[currentQuestionIndex - 1]?.id] || "");
    }
  };

  const handleCompleteSession = async () => {
    setIsGenerating(true);
    
    const answeredQuestions = Object.entries(answers);
    
    if (answeredQuestions.length === 0) {
      toast.error("Please answer at least one question");
      setIsGenerating(false);
      return;
    }

    try {
      const conversations = answeredQuestions.map(([questionId, answer]) => {
        const question = questions.find(q => q.id === questionId);
        return {
          userMessage: question?.question || "",
          assistantResponse: answer,
          category: question?.category || "general",
        };
      });

      await saveMutation.mutateAsync({
        workerId: worker.id,
        conversations,
      });

      setSessionComplete(true);
      toast.success(`Saved ${conversations.length} training examples from your responses!`);
      onUpdate();
    } catch (error) {
      toast.error("Failed to save training data");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (sessionStarted && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentQuestionIndex, sessionStarted]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-emerald-500/20 text-emerald-400";
      case "medium": return "bg-amber-500/20 text-amber-400";
      case "hard": return "bg-red-500/20 text-red-400";
      default: return "bg-secondary text-muted-foreground";
    }
  };

  // Welcome screen before session starts
  if (!sessionStarted) {
    return (
      <div className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <Card className="qiko-card p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                Customer Simulation Training
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Practice responding to real customer questions as {worker.fullName || "your digital worker"} would.
                Your responses will train the AI to match your authentic tone and expertise.
              </p>
            </div>

            <div className="bg-secondary/50 rounded-lg p-6 mb-8">
              <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                How This Works
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">You'll see customer questions</div>
                    <div className="text-muted-foreground">
                      Based on your expertise as a {worker.professionalTitle || "professional"}, 
                      we'll simulate the types of questions your real customers ask.
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Respond as {worker.fullName || "your worker"}</div>
                    <div className="text-muted-foreground">
                      Type exactly how you would respond to this customer. 
                      Use your natural tone, expertise, and communication style.
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">AI learns your style</div>
                    <div className="text-muted-foreground">
                      Each response teaches the AI how you communicate, 
                      helping it replicate your authentic voice.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-lg">
                  {worker.fullName?.charAt(0) || "W"}
                </div>
                <div>
                  <div className="font-medium text-foreground">{worker.fullName || "Your Worker"}</div>
                  <div className="text-sm text-muted-foreground">{worker.professionalTitle}</div>
                  {worker.tone && (
                    <div className="text-xs text-primary mt-1">Tone: {worker.tone}</div>
                  )}
                </div>
              </div>
            </div>

            <Button 
              onClick={handleStartSession} 
              className="w-full qiko-btn-primary"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Customer Simulation
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Loading questions
  if (isLoadingQuestions && questions.length === 0) {
    return (
      <div className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <Card className="qiko-card p-8">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Generating Customer Questions...
              </h2>
              <p className="text-muted-foreground">
                Creating realistic questions based on your expertise as a {worker.professionalTitle || "professional"}
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Session complete
  if (sessionComplete) {
    return (
      <div className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <Card className="qiko-card p-8">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </motion.div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Training Session Complete!
              </h2>
              <p className="text-muted-foreground mb-6">
                You've added {Object.keys(answers).length} authentic responses to train your digital worker.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-primary">{Object.keys(answers).length}</div>
                  <div className="text-sm text-muted-foreground">Responses Captured</div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-emerald-400">{questions.length - Object.keys(answers).length}</div>
                  <div className="text-sm text-muted-foreground">Questions Skipped</div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={handleStartSession}
                  variant="outline"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Start New Session
                </Button>
                <Button 
                  onClick={() => {
                    setSessionStarted(false);
                    setSessionComplete(false);
                  }}
                  className="qiko-btn-primary"
                >
                  Done
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Active Q&A session
  return (
    <div className="flex-1 p-6 lg:p-8 overflow-auto">
      <div className="max-w-3xl mx-auto">
        {/* Progress Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
            <div className="text-sm text-muted-foreground">
              {Object.keys(answers).length} answered
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Customer Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion?.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="qiko-card p-6 mb-6">
              {/* Customer avatar and question */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-foreground">Customer</span>
                    <Badge className={getDifficultyColor(currentQuestion?.difficulty || "easy")}>
                      {currentQuestion?.difficulty}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {currentQuestion?.category}
                    </Badge>
                  </div>
                  <p className="text-lg text-foreground">
                    "{currentQuestion?.question}"
                  </p>
                </div>
              </div>

              {/* Response area */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-lg font-medium text-primary">
                  {worker.fullName?.charAt(0) || "W"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-foreground">{worker.fullName || "Your Worker"}</span>
                    <span className="text-xs text-muted-foreground">responding...</span>
                  </div>
                  <Textarea
                    ref={textareaRef}
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder={`Type how ${worker.fullName || "you"} would respond to this customer...`}
                    className="min-h-[150px] resize-none bg-secondary/30 border-secondary"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.metaKey) {
                        handleSaveAnswer();
                      }
                    }}
                  />
                  <div className="text-xs text-muted-foreground mt-2">
                    Press ⌘+Enter to save and continue
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleSkipQuestion}
              className="text-muted-foreground"
            >
              Skip
            </Button>
            <Button
              onClick={handleSaveAnswer}
              className="qiko-btn-primary"
              disabled={!currentAnswer.trim()}
            >
              {currentQuestionIndex === questions.length - 1 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Finish
                </>
              ) : (
                <>
                  Save & Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Generate more questions */}
        {currentQuestionIndex >= questions.length - 3 && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={handleGenerateMoreQuestions}
              disabled={isLoadingQuestions}
            >
              {isLoadingQuestions ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Generate More Questions
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
