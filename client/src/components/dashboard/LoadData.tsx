import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  FileText, 
  Trash2, 
  CheckCircle2,
  Loader2,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  X,
  Eye,
  Sparkles,
  HelpCircle,
  Mail,
  MessagesSquare,
  Headphones,
  FileQuestion,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

interface LoadDataProps {
  worker: {
    id: number;
    fullName: string | null;
    professionalTitle?: string | null;
  };
  onUpdate: () => void;
}

interface ParsedConversation {
  userMessage: string;
  assistantResponse: string;
  category?: string;
}

type UploadStep = "instructions" | "upload" | "processing" | "preview" | "complete";

const DATA_EXAMPLES = [
  {
    icon: Mail,
    title: "Email Threads",
    description: "Copy-paste email conversations with clients",
    example: `Client: Hi, I'm looking for a honeymoon resort in the Maldives. Budget around $500/night.

You: Congratulations on your upcoming wedding! For a honeymoon at that budget, I'd recommend the Anantara Veli - it offers stunning overwater villas with private pools starting at $480/night. The resort has an adults-only policy which makes it perfect for couples.`,
  },
  {
    icon: MessagesSquare,
    title: "Chat Logs",
    description: "WhatsApp, Slack, or other chat conversations",
    example: `Customer: What's the best time to visit Maldives?

You: The best time is November to April - that's the dry season with calm seas and plenty of sunshine. December-January is peak season with highest prices. If you want good weather but fewer crowds, try November or early April.`,
  },
  {
    icon: Headphones,
    title: "Support Tickets",
    description: "Customer service or support conversations",
    example: `Ticket: I booked the wrong dates for my stay at Soneva Fushi. Can I change them?

Response: I'd be happy to help you modify your booking. Soneva Fushi typically allows date changes up to 14 days before arrival with no penalty. Let me check availability for your preferred dates and I'll get back to you within the hour.`,
  },
  {
    icon: FileQuestion,
    title: "FAQ Responses",
    description: "Common questions and your expert answers",
    example: `Q: Do I need a visa for the Maldives?

A: Most nationalities receive a free 30-day tourist visa on arrival - you just need a valid passport with 6+ months validity and proof of onward travel. No advance visa application needed for tourism.`,
  },
];

export default function LoadData({ worker, onUpdate }: LoadDataProps) {
  const [uploadStep, setUploadStep] = useState<UploadStep>("instructions");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [parsedData, setParsedData] = useState<ParsedConversation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [uploadedCount, setUploadedCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [expandedExample, setExpandedExample] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // tRPC mutations
  const uploadMutation = trpc.trainingData.uploadBatch.useMutation({
    onSuccess: (data) => {
      setUploadedCount(data.count);
      setUploadStep("complete");
      toast.success(`Successfully imported ${data.count} conversation examples`);
      onUpdate();
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
      setUploadStep("preview");
    },
  });

  const extractMutation = trpc.trainingData.extractConversations.useMutation({
    onSuccess: (data) => {
      setParsedData(data.conversations);
      setIsProcessing(false);
      setUploadStep("preview");
      if (data.conversations.length === 0) {
        toast.error("No conversations could be extracted. Please check your data format.");
      } else {
        toast.success(`Found ${data.conversations.length} conversation examples`);
      }
    },
    onError: (error) => {
      toast.error(`Extraction failed: ${error.message}`);
      setIsProcessing(false);
      setUploadStep("upload");
    },
  });

  const parsePdfMutation = trpc.trainingData.parsePdf.useMutation({
    onSuccess: (data) => {
      setRawText(data.text);
      setProcessingStatus(`Extracted text from ${data.pageCount} page(s). Now analyzing...`);
      // Continue to extract conversations from the PDF text
      extractMutation.mutate({
        workerId: worker.id,
        rawText: data.text,
        workerContext: {
          name: worker.fullName || "Professional",
          title: worker.professionalTitle || "Expert",
        },
      });
    },
    onError: (error) => {
      toast.error(`PDF parsing failed: ${error.message}`);
      setIsProcessing(false);
      setUploadStep("upload");
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File is too large (max 50MB)");
      return;
    }

    setSelectedFile(file);
    
    // Check if it's a PDF - handle differently
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      // For PDFs, we'll process on the server side
      // Just store the file for now, text will be extracted during processData
      setRawText('[PDF file selected - text will be extracted during processing]');
    } else {
      // For text files, read directly
      const content = await file.text();
      setRawText(content);
    }
  };

  const processData = async () => {
    // Check if we have a PDF file to process
    const isPdf = selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf'));
    
    if (isPdf) {
      // Process PDF on server
      setIsProcessing(true);
      setUploadStep("processing");
      setProcessingStatus("Extracting text from PDF...");
      
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string)?.split(',')[1];
        if (base64) {
          parsePdfMutation.mutate({
            workerId: worker.id,
            base64Content: base64,
          });
        } else {
          toast.error("Failed to read PDF file");
          setIsProcessing(false);
          setUploadStep("upload");
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read PDF file");
        setIsProcessing(false);
        setUploadStep("upload");
      };
      reader.readAsDataURL(selectedFile);
      return;
    }
    
    const textToProcess = rawText.trim();
    if (!textToProcess || textToProcess.startsWith('[PDF file selected')) {
      toast.error("Please paste some text or upload a file");
      return;
    }

    setIsProcessing(true);
    setProcessingStatus("Analyzing your data...");
    setUploadStep("processing");

    // Use AI to extract conversations
    extractMutation.mutate({
      workerId: worker.id,
      rawText: textToProcess,
      workerContext: {
        name: worker.fullName || "Professional",
        title: worker.professionalTitle || "Expert",
      },
    });
  };

  const handleUpload = () => {
    if (parsedData.length === 0) {
      toast.error("No conversations to upload");
      return;
    }

    uploadMutation.mutate({
      workerId: worker.id,
      conversations: parsedData.map(conv => ({
        userMessage: conv.userMessage,
        assistantResponse: conv.assistantResponse,
        category: conv.category,
      })),
    });
  };

  const removeConversation = (index: number) => {
    setParsedData(prev => prev.filter((_, i) => i !== index));
  };

  const resetUpload = () => {
    setUploadStep("instructions");
    setSelectedFile(null);
    setRawText("");
    setParsedData([]);
    setIsProcessing(false);
    setUploadedCount(0);
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              Upload Training Data
            </h1>
            <p className="text-muted-foreground">
              Add your real conversations to train your AI worker
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelp(!showHelp)}
          >
            <HelpCircle className="w-4 h-4 mr-1.5" />
            Help
          </Button>
        </div>

        {/* Help Panel */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="qiko-card p-6 mb-6 border-primary/30">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-2">What makes good training data?</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Real conversations</strong> - Actual exchanges with clients work best</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Your authentic voice</strong> - How YOU respond, not generic answers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Variety</strong> - Different types of questions and scenarios</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Complete exchanges</strong> - Both the question AND your response</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Remove sensitive info</strong> - Names, emails, phone numbers</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step: Instructions */}
        {uploadStep === "instructions" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* What to upload */}
            <Card className="qiko-card p-6 mb-6">
              <h2 className="text-lg font-medium text-foreground mb-4">
                What can you upload?
              </h2>
              <p className="text-muted-foreground mb-6">
                Any text containing conversations between you and your clients. We'll automatically extract the Q&A pairs.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DATA_EXAMPLES.map((example, index) => {
                  const Icon = example.icon;
                  const isExpanded = expandedExample === index;
                  
                  return (
                    <div
                      key={index}
                      className="border border-border/50 rounded-lg overflow-hidden"
                    >
                      <button
                        className="w-full p-4 flex items-center gap-3 text-left hover:bg-secondary/50 transition-colors"
                        onClick={() => setExpandedExample(isExpanded ? null : index)}
                      >
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{example.title}</p>
                          <p className="text-sm text-muted-foreground">{example.description}</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-border/50"
                          >
                            <div className="p-4 bg-secondary/30">
                              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Example format:</p>
                              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono bg-background/50 p-3 rounded-lg">
                                {example.example}
                              </pre>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Get started button */}
            <div className="flex justify-center">
              <Button
                className="qiko-btn-primary"
                size="lg"
                onClick={() => setUploadStep("upload")}
              >
                I understand, let's upload
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step: Upload */}
        {uploadStep === "upload" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="qiko-card p-6 mb-6">
              <h2 className="text-lg font-medium text-foreground mb-2">
                Paste or upload your conversations
              </h2>
              <p className="text-muted-foreground mb-6">
                Paste text directly, or upload a file (TXT, CSV, JSON, PDF, DOCX). We'll extract the conversations automatically.
              </p>

              {/* Text input area */}
              <div className="mb-6">
                <Textarea
                  placeholder={`Paste your conversations here...

Example:
Customer: What resort do you recommend for a family trip?

You: For families, I highly recommend the Soneva Fushi. They have amazing kids' programs, spacious villas, and the food is incredible. The "no news, no shoes" philosophy really helps everyone unwind.`}
                  className="min-h-[200px] font-mono text-sm"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted-foreground">or upload a file</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* File drop zone */}
              <div
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                  ${isDragging 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50 hover:bg-secondary/30"
                  }
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".txt,.csv,.json,.pdf,.docx,.doc"
                  onChange={handleFileInputChange}
                />
                
                <div className="w-12 h-12 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
                
                <p className="text-foreground font-medium mb-1">
                  {selectedFile ? selectedFile.name : "Drop file here or click to browse"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports TXT, CSV, JSON, PDF, DOCX (max 50MB)
                </p>
              </div>

              {/* Selected file indicator */}
              {selectedFile && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-sm text-foreground">{selectedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setRawText("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setUploadStep("instructions")}
              >
                Back
              </Button>
              <Button
                className="qiko-btn-primary"
                onClick={processData}
                disabled={!rawText.trim()}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Extract Conversations
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step: Processing */}
        {uploadStep === "processing" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="qiko-card p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 mx-auto mb-6 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h2 className="text-xl font-medium text-foreground mb-2">
                Extracting conversations...
              </h2>
              <p className="text-muted-foreground mb-6">
                Our AI is analyzing your text to find Q&A pairs
              </p>
              <Progress value={50} className="max-w-xs mx-auto" />
            </Card>
          </motion.div>
        )}

        {/* Step: Preview */}
        {uploadStep === "preview" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="qiko-card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium text-foreground">
                    Review extracted conversations
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {parsedData.length} conversation{parsedData.length !== 1 ? "s" : ""} found. Remove any that don't look right.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadStep("upload")}
                >
                  Add more
                </Button>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {parsedData.map((conv, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border border-border/50 rounded-lg p-4 group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Customer</p>
                            <p className="text-sm text-foreground">{conv.userMessage}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Your Response</p>
                            <p className="text-sm text-foreground">{conv.assistantResponse}</p>
                          </div>
                          {conv.category && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground">
                              {conv.category}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeConversation(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setUploadStep("upload")}
              >
                Back
              </Button>
              <Button
                className="qiko-btn-primary"
                onClick={handleUpload}
                disabled={parsedData.length === 0 || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save {parsedData.length} conversation{parsedData.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step: Complete */}
        {uploadStep === "complete" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="qiko-card p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 mx-auto mb-6 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-medium text-foreground mb-2">
                Successfully imported!
              </h2>
              <p className="text-muted-foreground mb-6">
                {uploadedCount} conversation{uploadedCount !== 1 ? "s" : ""} added to your training data
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={resetUpload}
                >
                  Upload more
                </Button>
                <Button
                  className="qiko-btn-primary"
                  onClick={onUpdate}
                >
                  Done
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
