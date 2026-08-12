import { useState, useMemo, useEffect } from "react";
// import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FollowUpRules as FollowUpRulesView } from "./FollowUpRules";
import ChatHistoryWorker from "./ChatHistoryWorker";
import type { CrmContact } from "@/lib/avatarApi";
import {
  ArrowLeft,
  Search,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  Sparkles,
  ChevronRight,
  PhoneCall,
  Send,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  User,
  Users,
  Loader2,
  FileText,
  Zap,
  Edit3,
  X,
  Check,
  Circle,
  ArrowRight,
  DollarSign,
} from "lucide-react";
import CallHistoryWorker from "./CallHistoryWorker";

// ============================================
// Types
// ============================================

interface CRMProps {
  workerId: number;
  /** Agent UUID for chat-history API: GET /avatar/{agentId}/chat-history */
  agentId?: string | null;
  onSelectBooking?: (bookingId: number) => void;
}

// ============================================
// Pipeline stages in order
// ============================================

const PIPELINE_STAGES = [
  { id: "new", label: "New", color: "bg-blue-500", textColor: "text-blue-400", bgLight: "bg-blue-500/10", border: "border-blue-500/30" },
  { id: "contacted", label: "Contacted", color: "bg-cyan-500", textColor: "text-cyan-400", bgLight: "bg-cyan-500/10", border: "border-cyan-500/30" },
  { id: "interested", label: "Interested", color: "bg-purple-500", textColor: "text-purple-400", bgLight: "bg-purple-500/10", border: "border-purple-500/30" },
  { id: "quoted", label: "Quoted", color: "bg-amber-500", textColor: "text-amber-400", bgLight: "bg-amber-500/10", border: "border-amber-500/30" },
  { id: "converted", label: "Converted", color: "bg-green-500", textColor: "text-green-400", bgLight: "bg-green-500/10", border: "border-green-500/30" },
  { id: "lost", label: "Lost", color: "bg-red-500/60", textColor: "text-red-400", bgLight: "bg-red-500/10", border: "border-red-500/30" },
] as const;

const STATUS_BADGE: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  contacted: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  interested: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  quoted: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  converted: "bg-green-500/15 text-green-400 border-green-500/25",
  lost: "bg-red-500/15 text-red-400 border-red-500/25",
};

const SENTIMENT_LABEL: Record<string, { label: string; color: string }> = {
  positive: { label: "Positive", color: "text-green-400" },
  neutral: { label: "Neutral", color: "text-slate-400" },
  negative: { label: "Negative", color: "text-red-400" },
  mixed: { label: "Mixed", color: "text-amber-400" },
};

const EVENT_ICONS: Record<string, { icon: typeof MessageSquare; color: string; label: string }> = {
  text_chat: { icon: MessageSquare, color: "text-cyan-400", label: "Chat" },
  chat: { icon: MessageSquare, color: "text-cyan-400", label: "Chat" },
  voice_call: { icon: PhoneCall, color: "text-purple-400", label: "Call" },
  email: { icon: Send, color: "text-blue-400", label: "Email" },
  booking: { icon: Calendar, color: "text-green-400", label: "Booking" },
  workflow: { icon: Zap, color: "text-amber-400", label: "Workflow" },
  system_action: { icon: AlertCircle, color: "text-slate-400", label: "System" },
};

const ACTION_ICONS: Record<string, typeof Phone> = {
  follow_up: Phone,
  send_info: FileText,
  create_booking: Calendar,
  schedule_call: PhoneCall,
  send_email: Send,
  custom: Sparkles,
};

// ============================================
// Helpers
// ============================================

function timeAgo(date: Date | string | null): string {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(cents: number | null, currency = "USD") {
  if (!cents) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(cents / 100);
}

// ============================================
// Pipeline Bar Component
// ============================================

function PipelineBar({
  stats,
  activeFilter,
  onFilter,
}: {
  stats: Record<string, number>;
  activeFilter: string | null;
  onFilter: (stage: string | null) => void;
}) {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-stretch gap-1 h-10">
      {PIPELINE_STAGES.map((stage, i) => {
        const count = stats[stage.id] || 0;
        const isActive = activeFilter === stage.id;
        const isLast = i === PIPELINE_STAGES.length - 1;

        return (
          <button
            key={stage.id}
            onClick={() => onFilter(isActive ? null : stage.id)}
            className={`relative flex items-center justify-center gap-1.5 px-3 rounded-md text-xs font-medium transition-all min-w-0
              ${count > 0 ? "flex-1" : "flex-none w-auto"}
              ${isActive
                ? `${stage.bgLight} ${stage.textColor} ring-1 ring-inset ${stage.border}`
                : count > 0
                  ? `${stage.bgLight} ${stage.textColor} hover:ring-1 hover:ring-inset hover:${stage.border}`
                  : "bg-white/[0.02] text-slate-600 hover:bg-white/[0.04]"
              }`}
          >
            <span className="font-bold text-sm tabular-nums">{count}</span>
            <span className="hidden sm:inline truncate">{stage.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// Contact Row Component
// ============================================

function ContactRow({
  contact,
  onClick,
}: {
  contact: any;
  onClick: () => void;
}) {
  const lastEvent = contact.lastEvent;
  const topAction = contact.topAction;
  const eventInfo = lastEvent ? EVENT_ICONS[lastEvent.type] || EVENT_ICONS.system_action : null;
  const ActionIcon = topAction ? ACTION_ICONS[topAction.actionType] || Sparkles : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left group border-b border-white/[0.04] last:border-b-0"
    >
      {/* Avatar + Status dot */}
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6366F1]/20 to-[#22D3EE]/20 flex items-center justify-center border border-white/10">
          <span className="text-xs font-semibold text-white/80">
            {contact.name ? contact.name.charAt(0).toUpperCase() : "?"}
          </span>
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0B1120] ${
          PIPELINE_STAGES.find(s => s.id === contact.status)?.color || "bg-slate-500"
        }`} />
      </div>

      {/* Name + Email + Last event */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
        <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-500" />
        <span className="text-sm font-medium text-white truncate">
            {contact.name || "Anonymous"}
          </span>
          {contact.estimatedValue > 0 && (
            <span className="text-[10px] text-green-400/70 font-medium tabular-nums">
              {formatCurrency(contact.estimatedValue, contact.currency)}
            </span>
          )}
        </div>
        {/* Second line: icon + name, icon + email, chat icon */}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400 min-w-0">
            <User className="w-3 h-3 shrink-0 text-slate-500" />
            <span className="truncate">{contact.name || "Anonymous"}</span>
          </span>
          {contact.email && (
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0">
              <Mail className="w-3 h-3 shrink-0 text-slate-500" />
              <span className="truncate">{contact.email}</span>
            </span>
          )}
        </div>
        {/* What happened: last event */}
        <div className="flex items-center gap-1.5 mt-0.5">
          {/* {eventInfo && lastEvent ? (
            <>
              <eventInfo.icon className={`w-3 h-3 ${eventInfo.color} shrink-0`} />
              <span className="text-[11px] text-slate-400 truncate">{lastEvent.summary}</span>
              <span className="text-[10px] text-slate-600 shrink-0">{timeAgo(lastEvent.timestamp)}</span>
            </>
          ) : contact.aiSummary ? (
            <span className="text-[11px] text-slate-400 truncate">{contact.aiSummary}</span>
          ) : (
            <span className="text-[11px] text-slate-500 italic">No interactions yet</span>
          )} */}
        </div>
      </div>

      {/* Next action */}
      <div className="shrink-0 flex items-center gap-2">
        {topAction ? (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium
            ${topAction.priority === "high" ? "bg-red-500/10 text-red-400" : "bg-white/5 text-slate-300"}`}
          >
            {ActionIcon && <ActionIcon className="w-3 h-3" />}
            <span className="max-w-[100px] truncate">{topAction.title}</span>
          </div>
        ) : contact.pendingActionsCount > 0 ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-medium">
            <Zap className="w-3 h-3" />
            {contact.pendingActionsCount}
          </div>
        ) : null}
        <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors" />
      </div>
    </button>
  );
}

// ============================================
// Contact Detail View
// ============================================

function ContactDetail({
  prospectId,
  workerId,
  onBack,
  onSelectBooking,
}: {
  prospectId: number;
  workerId: number;
  onBack: () => void;
  onSelectBooking?: (bookingId: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });

  const { data, isLoading, refetch } = () => {};
  const generateSummary = () => {};
  const updateAction = () => {}
  const updateContact = () => {}

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const { contact, timeline, actions, bookings, stats } = data;
  const pendingActions = actions.filter((a) => a.status === "pending");
  const sentimentInfo = SENTIMENT_LABEL[contact.sentiment || "neutral"];
  const stageInfo = PIPELINE_STAGES.find(s => s.id === contact.status);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0 text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white truncate">{contact.name || "Anonymous"}</h2>
            <Badge className={`text-[10px] ${STATUS_BADGE[contact.status || "new"]}`}>{contact.status}</Badge>
            {sentimentInfo && (
              <span className={`text-[10px] ${sentimentInfo.color}`}>{sentimentInfo.label}</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {[contact.email, contact.phone].filter(Boolean).join(" · ") || `Session ${contact.sessionId?.substring(0, 12)}...`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {contact.estimatedValue > 0 && (
            <span className="text-xs font-medium text-green-400 mr-2">
              {formatCurrency(contact.estimatedValue, contact.currency || "USD")}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => { setEditForm({ name: contact.name || "", email: contact.email || "", phone: contact.phone || "" }); setIsEditing(true); }} className="h-7 text-xs text-slate-400 hover:text-white">
            <Edit3 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Edit bar */}
      {isEditing && (
        <div className="px-5 py-2.5 bg-white/[0.03] border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Input placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-7 text-xs bg-white/5 border-white/10 flex-1" />
            <Input placeholder="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="h-7 text-xs bg-white/5 border-white/10 flex-1" />
            <Input placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="h-7 text-xs bg-white/5 border-white/10 flex-1" />
            <Button size="sm" onClick={() => updateContact.mutate({ prospectId: contact.id, name: editForm.name || undefined, email: editForm.email || undefined, phone: editForm.phone || undefined })} disabled={updateContact.isPending} className="h-7 text-xs bg-[#6366F1] hover:bg-[#5558E8]">
              <Check className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 text-xs text-slate-400">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Scrollable content: Summary → Actions → Timeline */}
      <div className="flex-1 overflow-y-auto">
        {/* AI Summary / Intent */}
        <div className="px-5 py-4 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#6366F1]" />
              <span className="text-xs font-medium text-slate-300">Intent & Summary</span>
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={() => generateSummary.mutate({ prospectId: contact.id })}
              disabled={generateSummary.isPending}
              className="h-6 text-[10px] text-slate-500 hover:text-white"
            >
              {generateSummary.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              {contact.aiSummary ? "Refresh" : "Generate"}
            </Button>
          </div>
          {contact.aiSummary ? (
            <div>
              <p className="text-xs text-slate-300 leading-relaxed">{contact.aiSummary}</p>
              {contact.keyTopics && (contact.keyTopics as string[]).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(contact.keyTopics as string[]).map((topic, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-[#6366F1]/10 text-[#6366F1]/80">
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">
              Click "Generate" to analyze all interactions and surface this contact's intent.
            </p>
          )}
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-4 px-5 py-2.5 border-b border-white/[0.04] text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{stats.messageCount} chats</span>
          <span className="flex items-center gap-1"><PhoneCall className="w-3 h-3" />{stats.voiceCallCount} calls</span>
          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{stats.emailCount} emails</span>
          {bookings.length > 0 && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{bookings.length} bookings</span>}
        </div>

        {/* Pending Actions — What needs to happen next */}
        {pendingActions.length > 0 && (
          <div className="px-5 py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-slate-300">Next Actions</span>
              <span className="text-[10px] text-slate-500">({pendingActions.length})</span>
            </div>
            <div className="space-y-1.5">
              {pendingActions.map((action) => {
                const Icon = ACTION_ICONS[action.actionType] || Sparkles;
                return (
                  <div key={action.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] group hover:border-white/10 transition-colors">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${action.priority === "high" ? "text-red-400" : action.priority === "medium" ? "text-amber-400" : "text-slate-400"}`} />
                    <span className="text-xs text-white flex-1 truncate">{action.title}</span>
                    {action.description && (
                      <span className="text-[10px] text-slate-500 max-w-[200px] truncate hidden sm:inline">{action.description}</span>
                    )}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => updateAction.mutate({ actionId: action.id, status: "done" })} className="p-1 rounded hover:bg-green-500/10 text-green-400" title="Done">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => updateAction.mutate({ actionId: action.id, status: "dismissed" })} className="p-1 rounded hover:bg-white/5 text-slate-500" title="Dismiss">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bookings (if any) */}
        {bookings.length > 0 && (
          <div className="px-5 py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-medium text-slate-300">Bookings</span>
            </div>
            <div className="space-y-1">
              {bookings.map((booking) => (
                <button
                  key={booking.id}
                  onClick={() => onSelectBooking?.(booking.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors text-left"
                >
                  <span className="text-xs text-white flex-1 truncate">{booking.tripTitle || booking.referenceNumber}</span>
                  <Badge className={`text-[9px] ${STATUS_BADGE[booking.status] || STATUS_BADGE.new}`}>{booking.status}</Badge>
                  {booking.totalValue > 0 && <span className="text-[10px] text-green-400/70 tabular-nums">{formatCurrency(booking.totalValue, booking.currency || "USD")}</span>}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Timeline — What happened */}
        <div className="px-5 py-3">
          <div className="flex items-center gap-1.5 mb-3">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-300">What Happened</span>
            <span className="text-[10px] text-slate-500">({timeline.length} events)</span>
          </div>
          {timeline.length === 0 ? (
            <div className="text-center py-6">
              <Clock className="w-6 h-6 text-slate-700 mx-auto mb-1.5" />
              <p className="text-xs text-slate-500">No interactions recorded yet</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-white/[0.06]" />
              <div className="space-y-0.5">
                {timeline.map((event, i) => {
                  const iconInfo = EVENT_ICONS[event.type] || EVENT_ICONS.system_action;
                  const Icon = iconInfo.icon;
                  return (
                    <div key={event.id} className="flex gap-3 py-2 relative">
                      <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 bg-[#0B1120] border border-white/[0.08] z-10 ${iconInfo.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white">{event.title}</span>
                          <span className="text-[10px] text-slate-600">{timeAgo(event.timestamp)}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{event.summary}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main CRM Component
// ============================================

export function CRM({ workerId, agentId, onSelectBooking }: CRMProps) {
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "call">("chat");
  const [crmView, setCrmView] = useState<"pipeline" | "rules">("pipeline");
  const [data, setData] = useState<any | null>(null);
  const [dashStats, setDashStats] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function loadCrm() {
      try {
        setIsLoading(true);
        const { getCrmData } = await import("@/lib/avatarApi");
        const res = await getCrmData(workerId, agentId ?? undefined);
        if (cancelled) return;
        setData(res);
        setDashStats(res.dashboard);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load CRM data:", err);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadCrm();
    return () => {
      cancelled = true;
    };
  }, [workerId, agentId]);

  // If a contact is selected in Chat tab, show chat history detail.
  if (activeTab === "chat" && selectedContact) {
    return (
      <>
      <ChatHistoryWorker
        contactName={selectedContact.name}
        contactEmail={selectedContact.email}
        messages={selectedContact.messages ?? []}
        onBack={() => setSelectedContact(null)}
      />
      </>
    );
  }

  // If rules view is active, show rules
  if (crmView === "rules") {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* View toggle */}
        <div className="px-5 pt-3 pb-0 flex items-center gap-1">
          <button
            onClick={() => setCrmView("pipeline")}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all text-slate-400 hover:text-white hover:bg-white/[0.04]"
          >
            Pipeline
          </button>
          <button
            onClick={() => setCrmView("rules")}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all bg-[#6366F1]/10 text-[#6366F1]"
          >
            Rules
          </button>
        </div>
        <FollowUpRulesView workerId={workerId} />
      </div>
    );
  }

  const contacts = data?.contacts || [];
  const total = data?.total || 0;

  // Filter contacts by search (name, email, phone)
  const searchLower = searchQuery.trim().toLowerCase();
  const filteredContacts = searchLower
    ? contacts.filter((c: CrmContact) => {
        const name = (c.name ?? "").toLowerCase();
        const email = (c.email ?? "").toLowerCase();
        const phone = (c.phone ?? "").toLowerCase();
        return name.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower);
      })
    : contacts;

  // Build pipeline counts from dashboard stats
  const pipelineCounts: Record<string, number> = {};
  if (dashStats?.statusBreakdown) {
    for (const [status, count] of Object.entries(dashStats.statusBreakdown as Record<string, number>)) {
      pipelineCounts[status] = count;
    }
  }

  // Calculate total pipeline value (from filtered list for display)
  const totalValue = filteredContacts.reduce((sum: number, c: CrmContact) => sum + (c.estimatedValue || 0), 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* View toggle + Header */}
      <div className="px-5 pt-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-1 mb-3">
          {/* <button
            onClick={() => setCrmView("pipeline")}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all bg-[#6366F1]/10 text-[#6366F1]"
          >
            Pipeline
          </button> */}
          {/* <button
            onClick={() => setCrmView("rules")}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all text-slate-400 hover:text-white hover:bg-white/[0.04]"
          >
            Rules
          </button> */}
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="w-full">
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant={activeTab === "chat" ? "default" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setActiveTab("chat")}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat History
              </Button>
              <Button
                type="button"
                variant={activeTab === "call" ? "default" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setActiveTab("call")}
                disabled={!agentId}
              >
                <Phone className="w-3.5 h-3.5" />
                Call History
              </Button>
            </div>
          </div>
        </div>

        {/* Pipeline Bar */}
        {/* <PipelineBar
          stats={pipelineCounts}
          activeFilter={stageFilter}
          onFilter={setStageFilter}
        /> */}

        {activeTab === "chat" ? (
          <>
          <h2 className="text-sm font-semibold text-white">Sales Pipeline</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""}
              {totalValue > 0 ? ` · ${formatCurrency(totalValue)} pipeline value` : ""}
            </p>
            
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-white/[0.03] border-white/[0.08] placeholder:text-slate-600"
            />
          </div>
          </>
        ) : null}
      </div>


      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "call" ? (
          <CallHistoryWorker agentId={agentId ?? ""} showHeader={false} />
        ) : isLoading ? (
          <div className="p-5 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-white/5" />
                <div className="flex-1">
                  <div className="h-3.5 bg-white/5 rounded w-28 mb-1.5" />
                  <div className="h-3 bg-white/[0.03] rounded w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Users className="w-10 h-10 text-slate-700 mb-2" />
            <h3 className="text-sm font-medium text-slate-400 mb-1">
              {searchQuery.trim() ? "No contacts match your search" : stageFilter ? `No ${stageFilter} contacts` : "No contacts yet"}
            </h3>
            <p className="text-[11px] text-slate-600 max-w-xs">
              {searchQuery.trim()
                ? "Try a different search or clear the box."
                : stageFilter
                  ? "Try a different filter or clear the selection."
                  : "Contacts appear here when prospects interact with your AI worker."}
            </p>
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div className="flex items-center gap-3 px-4 py-1.5 text-[10px] text-slate-600 uppercase tracking-wider border-b border-white/[0.04]">
              <div className="w-9" />
              <div className="flex-1">Contact / Last Interaction</div>
              <div className="shrink-0">Next Action</div>
              <div className="w-4" />
            </div>
            {filteredContacts.map((contact: CrmContact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                onClick={() => setSelectedContact(contact)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
