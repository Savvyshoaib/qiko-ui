import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

type AssistantContext = "dashboard" | "chat" | "train" | "data" | "rapidqa" | "synthetic" | "readiness" | "pricing" | "export" | "publish" | "connections" | "commercials" | "settings" | "general" | "performance" | "optimiser" | "bookings" | "booking-detail" | "fine-tuning-history" | "fine-tuning-progress";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ruleProposal?: RuleProposal;
}

interface RuleProposal {
  title: string;
  description: string;
  category: "response_style" | "tone" | "content" | "boundaries" | "behavior";
  pros: string;
  cons: string;
  originalRequest: string;
  status: "pending" | "accepted" | "rejected";
}

interface QikoAssistantProps {
  context: AssistantContext;
  workerId?: number;
  workerInfo?: {
    name?: string;
    title?: string;
    tone?: string;
  };
  recentWorkerChat?: {
    role: "user" | "assistant";
    content: string;
  }[];
  onRuleSaved?: () => void;
  onRuleSuggested?: (rule: RuleProposal) => void;
}

const CONTEXT_HINTS: Record<AssistantContext, string> = {
  dashboard: "Ask me about your business or performance metrics...",
  chat: "Tell me how to improve your worker's responses...",
  train: "Tell me a rule you want your worker to follow...",
  data: "Ask me what documents to upload...",
  rapidqa: "Ask me about the Q&A session...",
  synthetic: "Ask me about generating training data...",
  readiness: "Ask me about fine-tuning readiness...",
  pricing: "Ask me about plans and pricing...",
  export: "Ask me about exporting your training data...",
  publish: "Ask me about publishing your worker...",
  connections: "Ask me how to get API credentials...",
  commercials: "Ask me about revenue, users, or business metrics...",
  settings: "Ask me about any settings...",
  performance: "Ask me about your worker's performance...",
  optimiser: "Ask me about optimising your worker's performance...",
  bookings: "Ask me about managing bookings and itineraries...",
  "booking-detail": "Ask me about this booking or its items...",
  "fine-tuning-history": "Ask me about your fine-tuning jobs...",
  "fine-tuning-progress": "Ask me about the current training progress...",
  general: "How can I help you today?",
};

const CONTEXT_SUGGESTIONS: Record<AssistantContext, string[]> = {
  dashboard: [
    "How is my worker performing?",
    "What do the metrics mean?",
    "How can I improve revenue?",
  ],
  chat: [
    "Make responses shorter",
    "Ask fewer questions",
    "Be more direct",
    "Sound more friendly",
  ],
  train: [
    "Keep answers under 3 sentences",
    "Always ask a follow-up question",
    "Never discuss competitors",
    "Use bullet points for lists",
  ],
  data: [
    "What files work best?",
    "Should I upload FAQs?",
    "How much data is enough?",
  ],
  rapidqa: [
    "How long will this take?",
    "Can I skip questions?",
    "What makes a good answer?",
  ],
  synthetic: [
    "How does this work?",
    "Is the data quality good?",
    "How many should I generate?",
  ],
  readiness: [
    "What does 70% mean?",
    "How do I improve my score?",
    "When can I fine-tune?",
  ],
  pricing: [
    "What's included in Premium?",
    "How does on-prem work?",
    "Can I upgrade later?",
  ],
  export: [
    "What format should I use?",
    "How do I fine-tune?",
    "What is JSONL?",
  ],
  publish: [
    "What's the difference between Enterprise and Consumer?",
    "How do I embed the widget?",
    "Can I customize the chat page?",
  ],
  connections: [
    "How do I get a hotel API?",
    "Set up Google Calendar",
    "What APIs are available?",
  ],
  commercials: [
    "How can I increase revenue?",
    "What's my user growth rate?",
    "How do I reduce churn?",
  ],
  settings: [
    "How do I change the tone?",
    "What does each setting do?",
  ],
  performance: [
    "Why is latency high?",
    "How to reduce hallucinations?",
    "What does accuracy mean?",
  ],
  optimiser: [
    "How do I improve accuracy?",
    "What causes hallucinations?",
    "How can I boost performance?",
  ],
  bookings: [
    "How do I add a new booking?",
    "What are pending actions?",
    "How do I track payments?",
  ],
  "booking-detail": [
    "How do I add items to this booking?",
    "What actions should I complete?",
    "How do I send this to the customer?",
  ],
  "fine-tuning-history": [
    "What does each status mean?",
    "How long does training take?",
    "How do I download my model?",
  ],
  "fine-tuning-progress": [
    "How long will this take?",
    "What's happening now?",
    "Can I cancel?",
  ],
  general: [
    "How does Qiko work?",
    "Help me get started",
  ],
};

// Keywords that suggest the user wants to create a rule
const RULE_KEYWORDS = [
  "shorten", "shorter", "brief", "concise", "less",
  "longer", "more detail", "elaborate",
  "friendly", "formal", "casual", "professional",
  "don't", "never", "always", "must", "should",
  "stop", "avoid", "include", "add",
  "questions", "fewer questions", "more questions",
  "bullet", "list", "format",
  "tone", "style", "voice",
];

export default function QikoAssistant({ context, workerId, workerInfo, recentWorkerChat, onRuleSaved, onRuleSuggested }: QikoAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRule, setPendingRule] = useState<RuleProposal | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const chatMutation = trpc.assistant.chat.useMutation({
    onSuccess: (data) => {
      // Check if response contains a rule proposal
      const ruleProposal = parseRuleProposal(data.content, input) || undefined;
      
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: data.content,
          ruleProposal,
        },
      ]);
      
      if (ruleProposal) {
        setPendingRule(ruleProposal);
        onRuleSuggested?.(ruleProposal);
      }
      
      setIsLoading(false);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "I'm sorry, I encountered an error. Please try again.",
        },
      ]);
      setIsLoading(false);
    },
  });

  const createRuleMutation = trpc.trainingRules.create.useMutation({
    onSuccess: () => {
      toast.success("Rule saved to Training Rules!");
      if (workerId) {
        utils.trainingRules.list.invalidate({ workerId });
      }
      onRuleSaved?.();
      
      // Update the pending rule status in messages
      setMessages((prev) => 
        prev.map((msg) => {
          if (msg.ruleProposal && msg.ruleProposal.status === "pending") {
            return {
              ...msg,
              ruleProposal: { ...msg.ruleProposal, status: "accepted" as const },
            };
          }
          return msg;
        })
      );
      setPendingRule(null);
      
      // Add confirmation message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "I've saved this rule to your Training Rules. Your worker will now follow this guidance in all conversations. You can view and edit it in the Train Worker section.",
        },
      ]);
    },
    onError: (error) => {
      toast.error("Failed to save rule: " + error.message);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Check if user message looks like a rule request
  const isRuleRequest = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    return RULE_KEYWORDS.some(keyword => lowerMessage.includes(keyword)) ||
           (context === "chat" || context === "train");
  };

  // Parse rule proposal from assistant response
  const parseRuleProposal = (response: string, originalRequest: string): RuleProposal | null => {
    // Only parse if this looks like a rule discussion
    if (!isRuleRequest(originalRequest)) return null;
    
    // Check if the assistant acknowledged/understood the guidance
    if (response.length < 20) return null;

    // First, try to extract structured rule proposal from [RULE_PROPOSAL] tags
    const structuredMatch = response.match(/\[RULE_PROPOSAL\]([\s\S]*?)\[\/RULE_PROPOSAL\]/i);
    
    if (structuredMatch) {
      const proposalContent = structuredMatch[1];
      
      // Extract each field from the structured proposal
      const titleMatch = proposalContent.match(/Title:\s*(.+?)(?=\n|Description:|$)/i);
      const descMatch = proposalContent.match(/Description:\s*(.+?)(?=\n|Category:|$)/i);
      const categoryMatch = proposalContent.match(/Category:\s*(\w+)/i);
      const prosMatch = proposalContent.match(/Pros:\s*(.+?)(?=\n|Cons:|$)/i);
      const consMatch = proposalContent.match(/Cons:\s*(.+?)(?=\n|\[|$)/i);
      
      const title = titleMatch?.[1]?.trim() || generateRuleTitle(originalRequest);
      const description = descMatch?.[1]?.trim() || generateRuleDescription(originalRequest);
      
      // Parse category
      let category: RuleProposal["category"] = "response_style";
      const categoryStr = categoryMatch?.[1]?.toLowerCase() || "";
      if (categoryStr.includes("tone")) category = "tone";
      else if (categoryStr.includes("content")) category = "content";
      else if (categoryStr.includes("boundar")) category = "boundaries";
      else if (categoryStr.includes("behavior")) category = "behavior";
      else if (categoryStr.includes("response") || categoryStr.includes("style")) category = "response_style";
      
      return {
        title,
        description,
        category,
        pros: prosMatch?.[1]?.trim() || "Improves response quality based on your preferences",
        cons: consMatch?.[1]?.trim() || "May limit flexibility in some edge cases",
        originalRequest,
        status: "pending",
      };
    }
    
    // Fallback: Try to extract from less structured formats
    const titleMatch = response.match(/Title:\s*["']?([^"'\n]+)["']?/i) ||
                      response.match(/rule[:\s]+["']?([^"'\n]+)["']?/i);
    const descMatch = response.match(/Description:\s*["']?([^"'\n]+)["']?/i);
    
    // If we found at least a title in the response, use it
    if (titleMatch?.[1]) {
      const title = titleMatch[1].trim();
      const description = descMatch?.[1]?.trim() || generateRuleDescription(originalRequest);
      
      // Determine category based on content
      let category: RuleProposal["category"] = "response_style";
      const lowerRequest = originalRequest.toLowerCase();
      if (lowerRequest.includes("tone") || lowerRequest.includes("friendly") || lowerRequest.includes("formal")) {
        category = "tone";
      } else if (lowerRequest.includes("don't") || lowerRequest.includes("never") || lowerRequest.includes("avoid") || lowerRequest.includes("no need")) {
        category = "boundaries";
      } else if (lowerRequest.includes("always") || lowerRequest.includes("must") || lowerRequest.includes("should") || lowerRequest.includes("just")) {
        category = "behavior";
      } else if (lowerRequest.includes("include") || lowerRequest.includes("add") || lowerRequest.includes("mention") || lowerRequest.includes("remind")) {
        category = "content";
      }
      
      // Extract pros and cons
      const prosMatch = response.match(/Pros:\s*([^\n]+)/i) ||
                       response.match(/benefit[s]?[:\s]+([^\n]+)/i);
      const consMatch = response.match(/Cons:\s*([^\n]+)/i) ||
                       response.match(/trade-off[s]?[:\s]+([^\n]+)/i);
      
      return {
        title,
        description,
        category,
        pros: prosMatch?.[1]?.trim() || "Improves response quality based on your preferences",
        cons: consMatch?.[1]?.trim() || "May limit flexibility in some edge cases",
        originalRequest,
        status: "pending",
      };
    }
    
    // Last resort: generate from user request (but only if context suggests rule creation)
    if (context === "chat" || context === "train") {
      return {
        title: generateRuleTitle(originalRequest),
        description: generateRuleDescription(originalRequest),
        category: determineCategoryFromRequest(originalRequest),
        pros: "Improves response quality based on your preferences",
        cons: "May limit flexibility in some edge cases",
        originalRequest,
        status: "pending",
      };
    }
    
    return null;
  };
  
  const determineCategoryFromRequest = (request: string): RuleProposal["category"] => {
    const lowerRequest = request.toLowerCase();
    if (lowerRequest.includes("tone") || lowerRequest.includes("friendly") || lowerRequest.includes("formal")) {
      return "tone";
    } else if (lowerRequest.includes("don't") || lowerRequest.includes("never") || lowerRequest.includes("avoid") || lowerRequest.includes("no need")) {
      return "boundaries";
    } else if (lowerRequest.includes("always") || lowerRequest.includes("must") || lowerRequest.includes("should") || lowerRequest.includes("just")) {
      return "behavior";
    } else if (lowerRequest.includes("include") || lowerRequest.includes("add") || lowerRequest.includes("mention") || lowerRequest.includes("remind")) {
      return "content";
    }
    return "response_style";
  };

  const generateRuleTitle = (request: string): string => {
    const lowerRequest = request.toLowerCase();
    if (lowerRequest.includes("short")) return "Keep responses concise";
    if (lowerRequest.includes("question")) return "Adjust follow-up questions";
    if (lowerRequest.includes("friendly")) return "Use friendly tone";
    if (lowerRequest.includes("formal")) return "Maintain formal tone";
    if (lowerRequest.includes("bullet")) return "Use bullet point formatting";
    if (lowerRequest.includes("direct")) return "Be more direct";
    if (lowerRequest.includes("caddie")) return "Handle caddie cost communication";
    if (lowerRequest.includes("cash") || lowerRequest.includes("tip")) return "Remind about cash and tips";
    if (lowerRequest.includes("confirm") || lowerRequest.includes("total")) return "Confirm totals and summarize";
    const firstSentence = request.split(/[.!?]/)[0].trim();
    return firstSentence.length > 60 ? firstSentence.substring(0, 60) + "..." : firstSentence || "Custom response guideline";
  };

  const generateRuleDescription = (request: string): string => {
    return `When responding to users, ${request.toLowerCase().replace(/^(make|i want|please|can you)/, "").trim()}. Apply this consistently across all conversations.`;
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = input.trim();
    setInput("");
    setIsLoading(true);

    // Add context about rule creation if this looks like a rule request
    const enhancedContext = isRuleRequest(messageToSend) ? "train" : context;

    chatMutation.mutate({
      message: messageToSend,
      context: enhancedContext,
      workerInfo,
      recentWorkerChat,
    });
  };

  const handleAcceptRule = () => {
    if (!pendingRule || !workerId) {
      toast.error("Unable to save rule. Please try again.");
      return;
    }

    createRuleMutation.mutate({
      workerId,
      title: pendingRule.title,
      description: pendingRule.description,
      category: pendingRule.category,
      source: "q_assistant",
      originalRequest: pendingRule.originalRequest,
      prosExplained: pendingRule.pros,
      consExplained: pendingRule.cons,
      priority: 50,
    });
  };

  const handleRejectRule = () => {
    // Update the pending rule status in messages
    setMessages((prev) => 
      prev.map((msg) => {
        if (msg.ruleProposal && msg.ruleProposal.status === "pending") {
          return {
            ...msg,
            ruleProposal: { ...msg.ruleProposal, status: "rejected" as const },
          };
        }
        return msg;
      })
    );
    setPendingRule(null);
    
    // Add response
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "assistant",
        content: "No problem! Let me know if you'd like to adjust the rule or try something different.",
      },
    ]);
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Q Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full qiko-gradient shadow-lg shadow-primary/25 flex items-center justify-center cursor-pointer group"
            aria-label="Open Qiko Assistant"
          >
            <span className="text-2xl font-bold text-background">Q</span>
            <div className="absolute inset-0 rounded-full qiko-gradient opacity-0 group-hover:opacity-50 blur-xl transition-opacity" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] max-w-md"
            >
              <Card className="qiko-card border-primary/20 shadow-2xl shadow-primary/10 overflow-hidden">
                {/* Header */}
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl qiko-gradient flex items-center justify-center">
                        <span className="text-lg font-bold text-background">Q</span>
                      </div>
                      <div>
                        <CardTitle className="text-base">Qiko Assistant</CardTitle>
                        <p className="text-xs text-muted-foreground">Here to help</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {/* Messages */}
                  <ScrollArea className="h-80" ref={scrollRef}>
                    <div className="p-4 space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 rounded-2xl qiko-gradient mx-auto mb-4 flex items-center justify-center">
                            <span className="text-3xl font-bold text-background">Q</span>
                          </div>
                          <h3 className="font-semibold text-foreground mb-2">
                            Hi, I'm Q!
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            {CONTEXT_HINTS[context]}
                          </p>
                          
                          {/* Quick Suggestions */}
                          <div className="flex flex-wrap gap-2 justify-center">
                            {CONTEXT_SUGGESTIONS[context].map((suggestion) => (
                              <button
                                key={suggestion}
                                onClick={() => handleSuggestion(suggestion)}
                                className="px-3 py-1.5 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div key={message.id}>
                            <div
                              className={`flex ${
                                message.role === "user" ? "justify-end" : "justify-start"
                              }`}
                            >
                              {message.role === "assistant" && (
                                <div className="w-8 h-8 rounded-lg qiko-gradient flex items-center justify-center mr-2 flex-shrink-0">
                                  <span className="text-sm font-bold text-background">Q</span>
                                </div>
                              )}
                              <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                                  message.role === "user"
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-card border border-border rounded-bl-md"
                                }`}
                              >
                                {message.role === "assistant" ? (
                                  <div className="text-sm prose prose-sm prose-invert max-w-none">
                                    <Streamdown>{message.content}</Streamdown>
                                  </div>
                                ) : (
                                  <p className="text-sm">{message.content}</p>
                                )}
                              </div>
                            </div>

                            {/* Rule Proposal Card */}
                            {message.ruleProposal && message.ruleProposal.status === "pending" && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 ml-10"
                              >
                                <Card className="border-primary/30 bg-primary/5">
                                  <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-primary" />
                                      <span className="text-sm font-medium text-foreground">
                                        Ready to save this rule?
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground space-y-1">
                                      <p><strong>Rule:</strong> {message.ruleProposal.title}</p>
                                      <p className="text-green-400"><strong>Benefits:</strong> {message.ruleProposal.pros}</p>
                                      <p className="text-yellow-400"><strong>Trade-offs:</strong> {message.ruleProposal.cons}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        className="qiko-btn-primary flex-1"
                                        onClick={handleAcceptRule}
                                        disabled={createRuleMutation.isPending}
                                      >
                                        {createRuleMutation.isPending ? "Saving..." : "Lock it in"}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={handleRejectRule}
                                      >
                                        Not now
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            )}

                            {/* Accepted Rule Indicator */}
                            {message.ruleProposal && message.ruleProposal.status === "accepted" && (
                              <div className="mt-2 ml-10 flex items-center gap-2 text-xs text-green-400">
                                <CheckCircle2 className="w-3 h-3" />
                                Rule saved to Training Rules
                              </div>
                            )}

                            {/* Rejected Rule Indicator */}
                            {message.ruleProposal && message.ruleProposal.status === "rejected" && (
                              <div className="mt-2 ml-10 flex items-center gap-2 text-xs text-muted-foreground">
                                <AlertTriangle className="w-3 h-3" />
                                Rule not saved
                              </div>
                            )}
                          </div>
                        ))
                      )}

                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="w-8 h-8 rounded-lg qiko-gradient flex items-center justify-center mr-2 flex-shrink-0">
                            <span className="text-sm font-bold text-background">Q</span>
                          </div>
                          <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Tell me how to improve your worker..."
                        className="flex-1 bg-background/50"
                        disabled={isLoading}
                      />
                      <Button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        size="icon"
                        className="qiko-btn-primary h-10 w-10"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
