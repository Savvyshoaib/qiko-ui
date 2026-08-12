import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Streamdown } from "streamdown";
import { aiChatAssistantMarkdownClassName } from "@/lib/aiChatMarkdownClasses";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export default function TestChat() {
  const { workerId } = useParams<{ workerId: string }>();
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const workerIdNum = parseInt(workerId || "0");

  const { data: worker, isLoading: workerLoading } = trpc.worker.getById.useQuery(
    { workerId: workerIdNum },
    { enabled: workerIdNum > 0 }
  );

  const { data: chatHistory, isLoading: historyLoading } = trpc.chat.history.useQuery(
    { workerId: workerIdNum },
    { enabled: workerIdNum > 0 && worker?.status === "ready" }
  );

  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: (response) => {
      setLocalMessages((prev) => [
        ...prev,
        {
          id: response.id,
          role: "assistant",
          content: response.content,
          createdAt: new Date(response.createdAt),
        },
      ]);
    },
  });

  // Sync chat history
  useEffect(() => {
    if (chatHistory) {
      setLocalMessages(
        chatHistory.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          createdAt: new Date(msg.createdAt),
        }))
      );
    }
  }, [chatHistory]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages, sendMutation.isPending]);

  const handleSend = async () => {
    if (!input.trim() || sendMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: input.trim(),
      createdAt: new Date(),
    };

    setLocalMessages((prev) => [...prev, userMessage]);
    setInput("");

    sendMutation.mutate({
      workerId: workerIdNum,
      message: userMessage.content,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (workerLoading || historyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Worker not found</h2>
          <p className="text-muted-foreground mb-4">
            The digital worker you're looking for doesn't exist.
          </p>
          <Button onClick={() => setLocation("/dashboard")}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const workerName = worker.fullName
    ? `${worker.fullName.split(" ")[0]} – ${worker.professionalTitle || "Digital Worker"}`
    : "Your Digital Worker";

  // Show training message if not ready
  if (worker.status !== "ready") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
          <div className="container py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg qiko-gradient flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-foreground">{workerName}</h1>
                  <span className="text-xs status-training px-2 py-0.5 rounded-full">
                    Training
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="p-8 text-center max-w-md">
            <div className="w-16 h-16 rounded-xl qiko-gradient flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Worker is still training</h2>
            <p className="text-muted-foreground mb-4">
              Your digital worker is still being configured. You'll be able to test it once it's ready.
            </p>
            <Button variant="outline" onClick={() => setLocation("/dashboard")}>
              Back to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg qiko-gradient flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">{workerName}</h1>
                <span className="text-xs status-ready px-2 py-0.5 rounded-full">
                  Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Test Mode Banner */}
      <div className="bg-primary/10 border-b border-primary/20 py-2 px-4">
        <div className="container">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-primary" />
            <span className="font-medium text-primary">You're testing your AI Agent</span>
            <span className="text-muted-foreground">
              This is a sandbox to test how your digital worker responds. Try different questions to see how it handles various scenarios.
              Use the Q assistant (bottom right) to refine responses or add training rules.
            </span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="container max-w-3xl mx-auto py-6 space-y-4">
          {localMessages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-xl qiko-gradient flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Start a conversation</h2>
              <p className="text-muted-foreground">
                Ask your digital worker anything about {worker.categories?.[0] || "their expertise"}.
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {localMessages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[min(92%,36rem)] min-w-0 sm:max-w-[85%] md:max-w-[75%] px-4 py-3 ${
                    message.role === "user"
                      ? "chat-bubble-user"
                      : "chat-bubble-assistant"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className={aiChatAssistantMarkdownClassName}>
                      <Streamdown>{message.content}</Streamdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {sendMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="chat-bubble-assistant px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-4">
        <div className="container max-w-3xl mx-auto">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={sendMutation.isPending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sendMutation.isPending}
              size="icon"
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
