import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Loader2, AlertCircle, Bot } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setChatUserInfo } from "@/store/slices/authSlice";
import { Streamdown } from "streamdown";
import { sendPublicAvatarMessage, getPublicAvatarAgentDetail, AvatarAgentDetail } from "@/lib/avatarApi";
import WorkerCallView from "@/components/dashboard/WorkerCallView";
import StartCallButton from "@/components/public/StartCallButton";
import ChatTypingIndicator from "@/components/chat/ChatTypingIndicator";
import MessageCopyButton from "@/components/chat/MessageCopyButton";
import { useMessageCopy } from "@/hooks/useMessageCopy";

/** Set to false to hide the call option on the public chat page. Can be overridden by URL ?call=0 or ?call=1 */
const CALL_OPTION_ENABLED = true;

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

function useCallEnabled(): boolean {
  return useState(() => {
    if (typeof window === "undefined") return CALL_OPTION_ENABLED;
    const q = new URLSearchParams(window.location.search).get("call");
    if (q === "0") return false;
    if (q === "1") return true;
    return CALL_OPTION_ENABLED;
  })[0];
}

export default function PublicChatPage() {
  const { workerId } = useParams<{ workerId: string }>();
  const dispatch = useAppDispatch();
  const userInfo = useAppSelector((state) => state.auth.userInfo);
  const callEnabled = useCallEnabled();
  const [showCallPanel, setShowCallPanel] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [worker, setWorker] = useState<AvatarAgentDetail | null>(null);
  const [workerLoading, setWorkerLoading] = useState(true);
  const [workerError, setWorkerError] = useState(false);
  const [userEmail, setUserEmail] = useState<string>(userInfo?.email ?? "");
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const { copiedMessageId, copyMessage } = useMessageCopy();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const emailToUse = worker?.email || userEmail;
  const needsEmail = !worker?.email && !userEmail;

  // Default userEmail from Redux userInfo
  useEffect(() => {
    if (userInfo?.email && !userEmail) {
      setUserEmail(userInfo.email);
    }
  }, [userInfo?.email]);

  // Auto-scroll to bottom
  useEffect(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [messages, isLoading]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch worker details by user_name
  useEffect(() => {
    if (!workerId) return;

    const fetchWorker = async () => {
      setWorkerLoading(true);
      setWorkerError(false);
      try {
        const data = await getPublicAvatarAgentDetail(workerId);
        setWorker(data);
      } catch (err) {
        console.error(err);
        setWorkerError(true);
      } finally {
        setWorkerLoading(false);
      }
    };

    fetchWorker();
  }, [workerId]);

  const handleSaveEmail = () => {
    if (emailInput.trim()) {
      const nextEmail = emailInput.trim();
      const nextName = nameInput.trim();
      const nextPhone = phoneInput.trim();

      setUserEmail(nextEmail);
              dispatch(
                setChatUserInfo({
          ...(userInfo ?? {}),
          email: nextEmail,
          ...(nextName ? { name: nextName } : {}),
          ...(nextPhone ? { phone: nextPhone } : {}),
        })
      );

      setEmailInput("");
      setNameInput("");
      setPhoneInput("");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !emailToUse) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    console.log("Sending message to worker:", worker);

    try {
      const response = await sendPublicAvatarMessage(
        {
          agent_unique_id: worker?.agent_id || workerId,
          message: userMessage.content,
          email: emailToUse,
        },
        (worker?.agent_id || workerId)
      );

      console.log("Response:", response);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: response?.data?.reply || "Sorry, I didn't get a response.",
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : "This agent is not ready. Only ready agents can be chatted with publicly.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  };

  if (workerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!workerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="p-8 text-center bg-slate-800/50 border-slate-700 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">AI Assistant Not Found</h2>
          <p className="text-slate-400">
            The AI assistant you're looking for doesn't exist or is no longer available.
          </p>
        </Card>
      </div>
    );
  }

  const workerName = worker?.agent_name || "AI Assistant";
  const workerTagline = worker?.professionalTitle
    ? `Your AI-powered ${worker?.professionalTitle}`
    : "Your AI Assistant";

  if (needsEmail) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="px-6 pt-6 pb-2 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-base font-semibold text-white leading-snug">
                    Chat with {workerName}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {workerTagline}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Share your details below to begin chatting.
              </p>
            </div>
            <div className="px-6 pb-6 space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">Name</label>
                <Input
                  type="text"
                  placeholder="Your name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEmail()}
                  className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">Phone (optional)</label>
                <Input
                  type="tel"
                  placeholder="+1 555 000 0000"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                />
              </div>
              <Button
                onClick={handleSaveEmail}
                disabled={!emailInput.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 mt-2"
              >
                Start chat
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-white">{workerName}</h1>
            <p className="text-xs text-slate-400">{workerTagline}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {callEnabled && worker && (worker.agent_id || workerId) && (
              <StartCallButton onClick={() => setShowCallPanel(true)} />
            )}
            {/* <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Online
            </span> */}
          </div>
        </div>
      </header>

      {/* Worker call sheet – when call option is enabled */}
      {callEnabled && workerId && (
        <Sheet open={showCallPanel} onOpenChange={setShowCallPanel}>
          <SheetContent
            side="right"
            className="w-full max-w-md p-0 bg-slate-900 border-slate-700"
            onInteractOutside={(event) => event.preventDefault()}
          >
            <WorkerCallView
              workerId={workerId}
              worker={worker}
              onBack={() => setShowCallPanel(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Chat Area */}
      {messages.length === 0 ? (
        <div className="flex-1 min-h-0 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-cyan-500/20">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Hi! I'm {workerName}
            </h2>
            <p className="text-slate-400 max-w-md mx-auto mb-8">
              {worker?.professionalTitle
                ? `I'm an AI assistant specialized in ${worker?.professionalTitle.toLowerCase()}. How can I help you today?`
                : "I'm here to help answer your questions. How can I assist you today?"}
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`group relative max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white"
                        : "bg-slate-800/80 text-slate-100 border border-slate-700/50"
                    }`}
                  >
                    <MessageCopyButton
                      isCopied={copiedMessageId === message.id}
                      onCopy={() => copyMessage(message.id, message.content)}
                      className="bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white"
                    />
                    {message.role === "assistant" ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <div className="[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_li]:my-1">
                          <Streamdown>{message.content}</Streamdown>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <ChatTypingIndicator />
              </motion.div>
            )}
            <div ref={messagesEndRef} className="pb-[100px]" />
          </div>
        </ScrollArea>
      )}

     
     
      {/* Input Area */}
      <div className="sticky bottom-0 bg-slate-900/80 backdrop-blur-xl border-t border-slate-700/50 p-4">
        <div className="max-w-4xl mx-auto">
        {!needsEmail && (
          <div className="flex gap-3 bg-slate-800/50 rounded-2xl p-2 border border-slate-700/50">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleTextareaInput}
              placeholder="Type your message..."
              // disabled={isLoading || !worker}
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-slate-500 min-h-[40px] max-h-[150px] resize-none overflow-y-auto"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || needsEmail}
              size="icon"
              className="bg-gradient-to-r from-cyan-600 to-cyan-500 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}


          <p className="text-center text-xs text-slate-500 mt-2">
            Powered by <span className="text-cyan-400">Qiko</span>
          </p>
        </div>
      </div>
      {needsEmail && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-[#050810]/80 backdrop-blur-md" />
          <div className="relative w-full max-w-md">
            <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
              <div className="absolute -top-16 -left-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -right-10 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
            </div>
            <div className="relative rounded-3xl bg-slate-950/80 border border-slate-800/80 shadow-2xl shadow-black/40">
              <div className="px-6 pt-6 pb-2 text-center">
                <div className="mb-4">
                  <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    Qiko
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-white mb-1">Start a chat</h2>
                <p className="text-sm text-slate-400">
                  Share your details to begin chatting with this expert.
                </p>
              </div>
              <div className="px-6 pb-6 space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">Name</label>
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEmail()}
                    className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">Phone (optional)</label>
                  <Input
                    type="tel"
                    placeholder="+1 555 000 0000"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                  />
                </div>
                <Button
                  onClick={handleSaveEmail}
                  disabled={!emailInput.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white border-0 mt-2"
                >
                  Start chat
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
