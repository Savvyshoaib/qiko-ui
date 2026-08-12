import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import GlobalLayout from "@/components/GlobalLayout";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { clearChatHistory, getChatHistory, sendFinancialChat } from "@/lib/ELApi";
import {
  ArrowLeft,
  Send,
  Loader2,
  MessageSquare,
  Trash2,
  History,
} from "lucide-react";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export default function StudioChat() {
  const { workerId: wParam } = useParams<{ workerId: string }>();
  const workerIdStr = wParam ?? "worker";
  const [, setLocation] = useLocation();
  const worker = useMemo(
    () => ({
      name: `Worker ${workerIdStr.slice(0, 6)}`,
      professionalTitle: "API Chat",
      headline: "Ask questions about your uploaded financial data.",
      status: "ready" as const,
    }),
    [workerIdStr]
  );

  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [sendPending, setSendPending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadHistory = async () => {
    if (!workerIdStr) return;
    try {
      const response = await getChatHistory(workerIdStr, 100);
      const mapped = response.history.map((h, index) => ({
        id: Number(`${h.timestamp}${index}`),
        role: h.role,
        content: h.content,
        createdAt: new Date(h.timestamp),
      })) as Message[];
      setLocalMessages(mapped);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load history.");
    }
  };

  useEffect(() => {
    void loadHistory();
  }, [workerIdStr]);

  const handleSend = async () => {
    if (!input.trim() || sendPending) return;
    if (!workerIdStr) {
      toast.error("Missing worker ID.");
      return;
    }
    const msg = input.trim();
    setInput("");
    const userId = Date.now();
    setLocalMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: msg, createdAt: new Date() },
    ]);
    setSendPending(true);
    try {
      const response = await sendFinancialChat({ agent_unique_id: workerIdStr, message: msg });
      setLocalMessages((prev) => [
        ...prev,
        {
          id: userId + 1,
          role: "assistant",
          content: response.reply,
          createdAt: new Date(),
        },
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message.");
    } finally {
      setSendPending(false);
    }
  };

  const handleClear = async () => {
    if (!workerIdStr) {
      toast.error("Missing worker ID.");
      return;
    }
    await clearChatHistory(workerIdStr);
    setLocalMessages([]);
    toast.success("Chat history cleared");
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages, sendPending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const allMessages: Message[] = localMessages;

  return (
    <GlobalLayout activeSection="studio">
      <div className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <div className="border-b border-white/5 bg-[#060a14]/95 backdrop-blur sticky top-0 z-30 px-6 py-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation("/app/studio")}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-slate-400" />
              </button>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366F1]/20 to-[#A78BFA]/20 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-[#6366F1]" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white" style={{ fontFamily: "Satoshi, sans-serif" }}>
                  {worker.name}
                </h1>
                <p className="text-[11px] text-slate-500">{worker.professionalTitle}</p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-red-400 transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 min-h-0 flex">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {allMessages.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6366F1]/20 to-[#A78BFA]/20 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-7 h-7 text-[#6366F1]" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Chat with {worker.name}</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">{worker.headline}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["What can you help me with?", "Tell me about yourself", "What's your expertise?"].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className="px-3 py-1.5 text-xs text-slate-300 bg-[#0a0f1a] border border-white/10 rounded-full hover:border-[#6366F1]/30 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              allMessages.map((msg) => (
                <div
                  key={`${msg.id}-${msg.createdAt.getTime()}`}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-[#6366F1] text-white"
                        : "bg-[#0a0f1a] border border-white/5 text-slate-200"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}

            {sendPending && (
              <div className="flex justify-start">
                <div className="bg-[#0a0f1a] border border-white/5 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
          <aside
            className={`border-l border-white/5 bg-[#060a14] transition-all ${historyOpen ? "w-80 p-4" : "w-14 p-2"}`}
          >
            <button
              onClick={() => setHistoryOpen((prev) => !prev)}
              className="w-full mb-3 p-2 rounded-lg hover:bg-white/5 text-slate-300 flex items-center justify-center gap-2"
            >
              <History className="w-4 h-4" />
              {historyOpen ? "History" : ""}
            </button>
            {historyOpen && (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {localMessages.map((msg) => (
                  <div key={`history-${msg.id}`} className="rounded-lg border border-white/5 bg-[#0a0f1a] p-2">
                    <p className="text-[10px] uppercase text-slate-500">{msg.role}</p>
                    <p className="text-xs text-slate-300 line-clamp-2">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>

        {/* Input */}
        {worker.status === "ready" && (
          <div className="border-t border-white/5 bg-[#060a14] px-6 py-4">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={`Message ${worker.name}...`}
                className="flex-1 bg-[#0a0f1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#6366F1]/50 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sendPending}
                className="p-3 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-xl transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </GlobalLayout>
  );
}
