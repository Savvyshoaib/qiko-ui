"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, User } from "lucide-react";
import type { ChatMessageItem } from "@/lib/avatarApi";
import { Streamdown } from "streamdown";

export interface ChatHistoryWorkerProps {
  contactName: string;
  contactEmail?: string;
  /** Messages from the current chat object (no API call) */
  messages: ChatMessageItem[];
  onBack: () => void;
}

function formatMessageTime(createdAt: string): string {
  try {
    const d = new Date(createdAt);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return createdAt;
  }
}

export default function ChatHistoryWorker({
  contactName,
  contactEmail,
  messages,
  onBack,
}: ChatHistoryWorkerProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0a0f1a]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white truncate">{contactName}</h2>
          {contactEmail && (
            <p className="text-[11px] text-slate-500 truncate">{contactEmail}</p>
          )}
        </div>
      </div>

      {/* Content: all messages from messages[] */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm text-slate-400">No messages in this conversation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isUser = msg.sender?.type === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex max-w-[85%] sm:max-w-[75%] gap-2 ${
                      isUser ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isUser
                          ? "bg-indigo-500/20 text-indigo-400"
                          : "bg-cyan-500/20 text-cyan-400"
                      }`}
                    >
                      {isUser ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                    </div>
                    <div
                      className={`rounded-xl px-3 py-2 ${
                        isUser
                          ? "bg-indigo-500/20 text-white border border-indigo-500/30"
                          : "bg-white/[0.06] text-slate-200 border border-white/[0.08]"
                      }`}
                    >
                      <p className="text-xs font-medium text-slate-400 mb-0.5">
                        {msg.sender?.agent_name ?? (isUser ? "User" : "Worker")}
                      </p>
                      <div className="text-sm break-words leading-relaxed [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-1 [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-white/20 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1 [&_code]:text-xs">
                        <Streamdown>{msg.message}</Streamdown>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {formatMessageTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
