import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  MessageSquare,
  User,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Streamdown } from "streamdown";
import MessageCopyButton from "@/components/chat/MessageCopyButton";
import { useMessageCopy } from "@/hooks/useMessageCopy";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function PublicChat() {
  const { slug } = useParams<{ slug: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { copiedMessageId, copyMessage } = useMessageCopy();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch worker by slug
  const { data: worker, isLoading: workerLoading, error: workerError } = trpc.worker.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  // Chat mutation
  const chatMutation = trpc.wip.publicSend.useMutation({
    onSuccess: (response) => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    },
    onError: () => {
      setIsTyping(false);
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    if (worker && inputRef.current) {
      inputRef.current.focus();
    }
  }, [worker]);

  const handleSend = () => {
    if (!input.trim() || !worker) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    chatMutation.mutate({
      workerId: worker.id,
      message: input.trim(),
      conversationHistory: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Loading state
  if (workerLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading chat...</p>
        </div>
      </div>
    );
  }

  // Error or not found state
  if (workerError || !worker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 bg-slate-800/50 border-slate-700 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Chat Not Found</h1>
          <p className="text-slate-400">
            This chat page doesn't exist or has been unpublished.
          </p>
        </Card>
      </div>
    );
  }

  const brandColor = worker.hostedBrandColor || "#06b6d4";
  const workerInitial = worker.fullName?.charAt(0) || "Q";

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${brandColor}10 0%, #0f172a 50%, #0f172a 100%)`,
      }}
    >
      {/* Header */}
      <header 
        className="border-b border-slate-700/50 backdrop-blur-sm"
        style={{ backgroundColor: `${brandColor}10` }}
      >
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: brandColor }}
            >
              {workerInitial}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                {worker.hostedTitle || `Chat with ${worker.fullName}`}
              </h1>
              <p className="text-sm text-slate-400">
                {worker.professionalTitle}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-3xl mx-auto w-full">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold"
                style={{ backgroundColor: brandColor }}
              >
                {workerInitial}
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                {worker.hostedTitle || `Chat with ${worker.fullName}`}
              </h2>
              <p className="text-slate-400 max-w-md mx-auto mb-6">
                {worker.hostedDescription || `Get expert advice from ${worker.fullName}, ${worker.professionalTitle}`}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {["What can you help me with?", "Tell me about yourself", "How does this work?"].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50"
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Message bubbles */}
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex items-start gap-3 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === "user"
                      ? "bg-slate-600"
                      : ""
                  }`}
                  style={message.role === "assistant" ? { backgroundColor: brandColor } : {}}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-white text-sm font-medium">{workerInitial}</span>
                  )}
                </div>
                <div
                  className={`group relative max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-slate-700 text-white"
                      : "bg-slate-800/80 text-slate-100 border border-slate-700/50"
                  }`}
                >
                  <MessageCopyButton
                    isCopied={copiedMessageId === message.id}
                    onCopy={() => copyMessage(message.id, message.content)}
                    className="bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white"
                  />
                  {message.role === "assistant" ? (
                    <Streamdown>{message.content}</Streamdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: brandColor }}
              >
                <span className="text-white text-sm font-medium">{workerInitial}</span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-700/50 p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${worker.fullName}...`}
              className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-1"
              style={{ "--tw-ring-color": brandColor } as React.CSSProperties}
              disabled={isTyping}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="text-white"
              style={{ backgroundColor: brandColor }}
            >
              {isTyping ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Powered by <span className="text-cyan-400">Qiko</span>
          </p>
        </div>
      </main>
    </div>
  );
}
