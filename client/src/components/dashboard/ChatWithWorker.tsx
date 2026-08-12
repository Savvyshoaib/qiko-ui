import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, AlertCircle, RefreshCw, Info, Phone, Lock, Crown, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { sendAvatarMessage, deleteChatHistory, type AvatarAgentDetail } from "@/lib/avatarApi";
import { aiChatAssistantMarkdownClassName } from "@/lib/aiChatMarkdownClasses";
import WorkerCallView from "@/components/dashboard/WorkerCallView";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addMessage, clearMessages, type ChatMessage } from "@/store/slices/chatSlice";
import WithPermission from "@/_core/components/WithPermission";
import ChatTypingIndicator from "@/components/chat/ChatTypingIndicator";
import MessageCopyButton from "@/components/chat/MessageCopyButton";
import { useMessageCopy } from "@/hooks/useMessageCopy";

type DashboardView =
  | "chat" | "train" | "data" | "rapidqa" | "synthetic"
  | "readiness" | "pricing" | "export" | "connections"
  | "commercials" | "performance" | "settings" | "optimiser";

interface ChatWithWorkerProps {
  worker: AvatarAgentDetail;
  onNavigate?: (view: DashboardView) => void;
}

export default function ChatWithWorker({ worker, onNavigate }: ChatWithWorkerProps) {
  const worker1 = { ...worker, status: 'ready' }; // WIP status

  const dispatch = useAppDispatch();
  const [showCallPanel, setShowCallPanel] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const { copiedMessageId, copyMessage } = useMessageCopy();

  const workerName = worker1.fullName?.split(" ")[0] || "Worker";
  const agentId = worker1.agent_id || "";
  const workerChatId = String(worker1.agent_id || worker1.id || "");
  const messagesByWorker = useAppSelector((state) => state.chat.messagesByWorker[workerChatId]);
  const messages = messagesByWorker ?? [];

  const handleOpenCall = () => {
    if (!agentId) {
      toast.error("Worker not ready for voice");
      return;
    }
    setShowCallPanel(true);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    dispatch(addMessage({ workerId: workerChatId, message: userMessage }));
    setInput("");
    setIsSending(true);
    setSendError(null);

    try {
      const response = await sendAvatarMessage(
        {
          agent_unique_id: worker1.agent_id || '',
          user_name: worker1.user_name || '',
          message: userMessage.content,
          email: worker1.email || ''
        },
        worker1.agent_id || ''
      );

      dispatch(
        addMessage({
          workerId: workerChatId,
          message: {
            id: Date.now() + 1,
            role: "assistant",
            content: response?.data?.[0]?.reply || "No response from assistant.",
            createdAt: new Date().toISOString(),
          },
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send message"
      setSendError(msg);
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRefresh = async () => {
    dispatch(clearMessages({ workerId: workerChatId }));
    
    // Delete chat history from API
    try {
      await deleteChatHistory(worker1.agent_id || worker1.id);
      toast.success("Chat history cleared");
    } catch (error) {
      console.error("Failed to clear chat history:", error);
      toast.error("Failed to clear chat history");
    }
  };

  // Worker not ready state
  if (worker1.status !== "ready") {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl qiko-gradient flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
            <Send className="w-10 h-10 text-background" />
          </div>
          <h2 className="text-xl font-semibold mb-3 text-foreground">
            Worker is still training
          </h2>
          <p className="text-muted-foreground mb-6">
            Your digital worker is being configured. You'll be able to chat once training is complete.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border/50 bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="qiko-avatar w-10 h-10 text-sm">
              {workerName.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Chat with {workerName}
              </h1>
              <p className="text-xs text-muted-foreground">
                Test your digital worker by having a conversation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WithPermission permissionType="editor">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenCall}
              disabled={!agentId}
              className="gap-1.5 text-slate-300 hover:bg-slate-700 hover:text-white md:gap-1.5"
              title="Open voice call"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Call</span>
            </Button>
            </WithPermission>
            <WithPermission permissionType="editor">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="gap-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">New Chat</span>
            </Button>
            </WithPermission>
          </div>
        </div>
      </div>

      {/* Call sheet – open from right, same as public chat / test chat */}
      {agentId && (
        <Sheet open={showCallPanel} onOpenChange={setShowCallPanel}>
          <SheetContent
            side="right"
            className="w-full max-w-md p-0 bg-slate-900 border-slate-700"
            onInteractOutside={(event) => event.preventDefault()}
          >
            <SheetTitle className="sr-only">Voice call with {workerName}</SheetTitle>
            <WorkerCallView
              workerId={agentId}
              worker={worker}
              onBack={() => setShowCallPanel(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Chat Messages */}
      <div className="flex-1 min-h-0 max-h-[calc(100vh-485px)] overflow-y-auto p-6" ref={scrollRef}>
        <div className={`max-w-3xl mx-auto ${messages.length === 0 ? "h-full flex items-center justify-center" : "space-y-4"}`}>
          {messages.length === 0 && (
            <>
            <div className="text-center">
              <div className="w-16 h-16 rounded-xl qiko-gradient flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Start a conversation</h2>
              <p className="text-muted-foreground">
                Ask your digital worker anything about their expertise.
              </p>
            </div>
            {/* <div className="flex flex-col items-center justify-center h-full py-8">
              <div className="mb-8 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 flex items-start gap-3 max-w-lg">
                <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-cyan-100 font-medium">You're testing your AI Agent</p>
                  <p className="text-slate-400 mt-1">
                    Try different questions to see how your worker responds.
                  </p>
                </div>
              </div>
            </div> */}
            </>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="qiko-avatar mr-3 flex-shrink-0 w-8 h-8 text-xs">
                    {workerName.charAt(0)}
                  </div>
                )}
                <div
                  className={`max-w-[min(92%,36rem)] min-w-0 sm:max-w-[80%] relative ${
                    message.role === "user"
                      ? "chat-bubble-user"
                      : "chat-bubble-assistant"
                  } px-4 py-3 rounded-2xl`}
                >
                  <MessageCopyButton
                    isCopied={copiedMessageId === message.id}
                    onCopy={() => copyMessage(message.id, message.content)}
                  />
                  {message.role === "assistant" ? (<>
                      <div className="[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_li]:my-1">
                        <Streamdown>{message.content}</Streamdown>
                      </div>
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isSending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="qiko-avatar mr-3 flex-shrink-0 w-8 h-8 text-xs">
                {workerName.charAt(0)}
              </div>
              <ChatTypingIndicator />
            </motion.div>
          )}

          {/* Error state */}
          {sendError && (
            <div className="flex items-center gap-2 text-destructive text-sm p-3 rounded-lg bg-destructive/10">
              <AlertCircle className="w-4 h-4" />
              {sendError}
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 border-t border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-center bg-muted/50 rounded-xl p-2 border border-border/50">
            <WithPermission permissionType="editor" className="flex-1">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isSending}
              rows={1}
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-slate-500 min-h-[40px] max-h-[150px] resize-none overflow-y-auto"
            />
            </WithPermission>
            
            <WithPermission permissionType="editor" showLock={false}>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              size="sm"
              className="qiko-btn-primary px-4 rounded-lg"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
           </WithPermission>
          </div>
        </div>
      </div>
    </div>
  );
}
