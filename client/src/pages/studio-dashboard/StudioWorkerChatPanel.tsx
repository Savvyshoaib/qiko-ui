import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { sendAvatarMessage } from "@/lib/avatarApi";
import { aiChatAssistantMarkdownClassName } from "@/lib/aiChatMarkdownClasses";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addMessage, type ChatMessage } from "@/store/slices/chatSlice";

const THINKING_PHRASES = ["Thinking...", "Generating...", "Analyzing...", "Processing...", "Reviewing..."];

function extractAssistantReply(response: unknown): string {
  const payload = response as { data?: Array<{ reply?: string }>; reply?: string; message?: string };
  const fromData = payload?.data?.[0]?.reply;
  if (typeof fromData === "string" && fromData.trim()) return fromData.trim();
  if (typeof payload?.reply === "string" && payload.reply.trim()) return payload.reply.trim();
  if (typeof payload?.message === "string" && payload.message.trim()) return payload.message.trim();
  return "No response from assistant.";
}

function formatMessageTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default function StudioWorkerChatPanel({
  agentId,
  workerName,
  userName,
  email,
  onClose,
}: {
  agentId: string;
  workerName: string;
  userName?: string;
  email?: string;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const workerChatId = agentId.trim();
  const messages = useAppSelector((state) => state.chat.messagesByWorker[workerChatId] ?? []);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [thinkingPhrase, setThinkingPhrase] = useState(THINKING_PHRASES[0]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const displayName = workerName?.split(" ")[0] || "Worker";
  const canSend = Boolean(input.trim()) && !isSending;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending, thinkingPhrase]);

  useEffect(() => {
    if (!isSending) return;

    let index = 0;
    setThinkingPhrase(THINKING_PHRASES[0]);
    const intervalId = window.setInterval(() => {
      index = (index + 1) % THINKING_PHRASES.length;
      setThinkingPhrase(THINKING_PHRASES[index]);
    }, 1800);

    return () => window.clearInterval(intervalId);
  }, [isSending]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending || !workerChatId) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    dispatch(addMessage({ workerId: workerChatId, message: userMessage }));
    setInput("");
    setIsSending(true);

    try {
      const response = await sendAvatarMessage(
        {
          agent_unique_id: workerChatId,
          user_name: userName?.trim() || "",
          message: trimmed,
          email: email?.trim() || "",
        },
        workerChatId
      );

      dispatch(
        addMessage({
          workerId: workerChatId,
          message: {
            id: Date.now() + 1,
            role: "assistant",
            content: extractAssistantReply(response),
            createdAt: new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message.";
      toast.error(message);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <div
      className="flex h-full w-full shrink-0 flex-col border-l border-white/[0.08] lg:w-[340px]"
      style={{
        background: "linear-gradient(180deg, #0B101C 0%, #080C14 100%)",
      }}
    >
      <div
        className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3"
        style={{ background: "rgba(8,12,20,0.85)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-500/25 bg-indigo-500/10">
            <Bot className="h-4 w-4 text-indigo-400" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0B101C] bg-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
              Chat with {displayName}
            </p>
            <p className="text-[10px] text-slate-500">AI assistant · online</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-slate-300"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        style={{
          background:
            "radial-gradient(circle at top, rgba(99,102,241,0.06) 0%, transparent 42%), transparent",
        }}
      >
        {messages.length === 0 && !isSending ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-2 text-center">
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/20"
              style={{ background: "rgba(99,102,241,0.08)" }}
            >
              <Sparkles className="h-6 w-6 text-indigo-400/90" />
            </div>
            <p className="text-[13px] font-semibold text-white">Start a conversation</p>
            <p className="mt-2 max-w-[220px] text-[11px] leading-relaxed text-slate-500">
              Ask about RFPs, document uploads, section progress, or anything in your workflow.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {message.role === "assistant" ? (
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
                  <Bot className="h-3.5 w-3.5 text-indigo-400" />
                </div>
              ) : (
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-[10px] font-bold uppercase text-cyan-300">
                  You
                </div>
              )}
              <div className={`max-w-[78%] min-w-0 ${message.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`px-3.5 py-2.5 shadow-sm ${
                    message.role === "user"
                      ? "rounded-2xl rounded-tr-md border border-indigo-400/25 bg-gradient-to-br from-indigo-500/25 to-indigo-600/10 text-[12px] text-white"
                      : "rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.04] text-[12px] text-slate-200"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className={`${aiChatAssistantMarkdownClassName} text-[12px] leading-relaxed`}>
                      <Streamdown>{message.content}</Streamdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  )}
                </div>
                <span className="mt-1 px-1 text-[9px] text-slate-600">{formatMessageTime(message.createdAt)}</span>
              </div>
            </div>
          ))
        )}

        {isSending ? (
          <div className="flex gap-2">
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
              <Bot className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <div className="rounded-2xl rounded-tl-md border border-indigo-500/15 bg-indigo-500/[0.06] px-3.5 py-2.5">
              <div className="flex items-center gap-2.5 text-[12px] text-indigo-200/80">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                <span className="animate-pulse">{thinkingPhrase}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className="shrink-0 border-t border-white/[0.06] p-3"
        style={{ background: "rgba(8,12,20,0.92)" }}
      >
        <div className="studio-worker-chat-composer rounded-xl border border-white/[0.08] bg-white/[0.025]">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask something..."
            disabled={isSending}
            rows={2}
            className="studio-worker-chat-textarea max-h-28 min-h-[52px] w-full resize-none border-0 bg-transparent px-3.5 pt-3 pb-1 text-[12px] leading-relaxed text-white shadow-none outline-none ring-0 placeholder:text-slate-600 focus:border-0 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="flex flex-col gap-2 px-2.5 pb-2.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="hidden pl-1 text-[9px] text-slate-600 sm:inline">Enter to send · Shift+Enter for new line</span>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSend}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                canSend
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-400"
                  : "bg-white/[0.04] text-slate-600"
              } disabled:cursor-not-allowed`}
              aria-label="Send message"
            >
              {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
