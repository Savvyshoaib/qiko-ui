import { getResearchMock, isMockDataEnabled } from "@/data/services";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import GlobalLayout from "@/components/GlobalLayout";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import {
  Star,
  X as DismissIcon,
  ArrowRight,
  Loader2,
  Send,
  Settings,
  ExternalLink,
  Clock,
  Flame,
  TrendingUp,
  Minus,
  MessageCircle,
  Zap,
  Globe,
  ArrowLeft,
  Sparkles,
  Eye,
  FileText,
  Rss,
  User,
  Quote,
  Notebook,
  Trash2,
  Plus,
  StickyNote,
  RotateCcw,
} from "lucide-react";

/** tRPC bypass — replace with API when backend is wired. */
type FeedItem = {
  id: number;
  title: string;
  summary: string;
  priority?: string;
  status?: "starred" | "dismissed" | string;
  publishedAt?: string;
  createdAt?: string;
  topics?: string[];
  sourceName?: string;
  sourceUrl?: string;
  content?: string;
  deepDiveContent?: string;
};

type InsightRow = {
  id: number;
  text: string;
  note?: string;
  articleTitle?: string;
  sourceUrl?: string;
  groupLabel?: string | null;
};

const researchFeed = (
  isMockDataEnabled()
    ? getResearchMock().feed
    : {
        items: [],
        config: { lastRunAt: new Date().toISOString() },
        profile: {
          name: "Researcher",
          title: "",
          specialism: "",
          topics: [] as string[],
        },
        insights: [],
      }
) as {
  items: FeedItem[];
  config: { lastRunAt: string };
  profile: {
    name: string;
    title: string;
    specialism: string;
    topics: string[];
  };
  insights: InsightRow[];
};
const MOCK_FEED_ITEMS: FeedItem[] = researchFeed.items ?? [];
const MOCK_CONFIG = researchFeed.config ?? { lastRunAt: new Date().toISOString() };
const MOCK_PROFILE = researchFeed.profile ?? {
  name: "Alex Researcher",
  title: "Principal Analyst",
  specialism: "",
  topics: [] as string[],
};
const MOCK_INSIGHTS: InsightRow[] = researchFeed.insights ?? [];

/* ─── Priority Badge ─── */
function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    urgent: { icon: Flame, color: "text-red-400", bg: "bg-red-500/10 border border-red-500/20", label: "Breaking" },
    high: { icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10 border border-amber-500/20", label: "Trending" },
    normal: { icon: Minus, color: "text-slate-400", bg: "", label: "" },
    low: { icon: Minus, color: "text-slate-500", bg: "", label: "" },
  };
  const c = config[priority] || config.normal;
  if (priority === "normal" || priority === "low") return null;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.color} ${c.bg}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

/* ─── Time helpers ─── */
function timeAgo(date: string | Date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function groupByTime(items: any[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const groups: { label: string; items: any[] }[] = [
    { label: "Today", items: [] },
    { label: "This Week", items: [] },
    { label: "Earlier", items: [] },
  ];
  items.forEach((item) => {
    const d = new Date(item.publishedAt || item.createdAt);
    if (d >= today) groups[0].items.push(item);
    else if (d >= weekAgo) groups[1].items.push(item);
    else groups[2].items.push(item);
  });
  return groups.filter((g) => g.items.length > 0);
}

function topicGradient(topic: string): string {
  const gradients = [
    "from-indigo-600/30 to-purple-600/20",
    "from-cyan-600/30 to-blue-600/20",
    "from-emerald-600/30 to-teal-600/20",
    "from-amber-600/30 to-orange-600/20",
    "from-rose-600/30 to-pink-600/20",
    "from-violet-600/30 to-fuchsia-600/20",
  ];
  let hash = 0;
  for (let i = 0; i < topic.length; i++) hash = topic.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

/* ─── Chat message type ─── */
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/* ─── Right panel modes ─── */
type RightPanel = "chat" | "detail" | "notebook";

/* ─── Main Component ─── */
export default function ResearchFeed() {
  const params = useParams<{ workerId: string }>();
  const [, setLocation] = useLocation();
  const workerId = Number(params.workerId);

  // State
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>("notebook");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activeTopicFilter, setActiveTopicFilter] = useState<string | null>(null);
  const [insightText, setInsightText] = useState("");
  const [insightNote, setInsightNote] = useState("");
  const [insightGroup, setInsightGroup] = useState("");
  const [showInsightForm, setShowInsightForm] = useState(false);
  const [insightFromArticle, setInsightFromArticle] = useState<any>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editingGroupLabel, setEditingGroupLabel] = useState<{ id: number; current: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Template check (mock: always researcher; non-researcher redirect kept for when API returns)
  const templateData = { template: "researcher" as const };
  const templateLoading = false;

  useEffect(() => {
    if (!templateLoading && templateData && templateData.template !== "researcher") {
      setLocation(`/app/studio/${workerId}/chat`);
    }
  }, [templateData, templateLoading, workerId, setLocation]);

  const isResearcher = templateData.template === "researcher";

  const [items, setItems] = useState<FeedItem[]>(MOCK_FEED_ITEMS);
  const [config, setConfig] = useState(MOCK_CONFIG);
  const profile = MOCK_PROFILE;
  const [insights, setInsights] = useState<InsightRow[]>(MOCK_INSIGHTS);
  const isLoading = false;

  const [scanPending, setScanPending] = useState(false);
  const [deepDivePending, setDeepDivePending] = useState(false);
  const [chatPending, setChatPending] = useState(false);
  const [saveInsightPending, setSaveInsightPending] = useState(false);

  const starItem = {
    mutate: ({ id }: { id: number }) => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, status: i.status === "starred" ? undefined : "starred" } : i
        )
      );
      setSelectedItem((s: FeedItem | null) =>
        s?.id === id ? { ...s, status: s.status === "starred" ? undefined : "starred" } : s
      );
    },
  };

  const dismissItem = {
    mutate: ({ id }: { id: number }) => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "dismissed" } : i)));
      setSelectedItem((s: FeedItem | null) => (s?.id === id ? null : s));
      setRightPanel((rp) => (rp === "detail" ? "notebook" : rp));
    },
  };

  const deepDive = {
    isPending: deepDivePending,
    mutate: ({ id }: { id: number }) => {
      setDeepDivePending(true);
      window.setTimeout(() => {
        const analysis =
          "## Deep dive (mock)\n\nKey themes, risks, and follow-up questions for your notebook.\n\n*(Wire `trpc.research.deepDive` when the API is ready.)*";
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, deepDiveContent: analysis } : i))
        );
        setSelectedItem((s: FeedItem | null) => (s?.id === id ? { ...s, deepDiveContent: analysis } : s));
        setDeepDivePending(false);
      }, 800);
    },
  };

  const runScan = {
    isPending: scanPending,
    mutate: ({ workerId: _wid }: { workerId: number }) => {
      setScanPending(true);
      window.setTimeout(() => {
        setConfig((c) => ({ ...c, lastRunAt: new Date().toISOString() }));
        toast.success("Scan complete (mock)");
        setScanPending(false);
      }, 700);
    },
  };

  const chatMutation = {
    isPending: chatPending,
    mutate: ({ workerId: _w, message }: { workerId: number; message: string }) => {
      setChatPending(true);
      window.setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: `_(mock)_ Quick take on: **${message.slice(0, 120)}${message.length > 120 ? "…" : ""}** — connect the chat API for real replies.`,
          },
        ]);
        setChatPending(false);
      }, 500);
    },
  };

  const clearChatMut = {
    isPending: false as boolean,
    mutate: ({ workerId: _w }: { workerId: number }) => {
      setChatMessages([]);
      toast.success("Chat cleared");
    },
  };

  const saveInsightMut = {
    isPending: saveInsightPending,
    mutate: (payload: {
      workerId: number;
      text: string;
      note?: string;
      articleId?: number;
      articleTitle?: string;
      sourceUrl?: string;
      groupLabel?: string;
    }) => {
      setSaveInsightPending(true);
      window.setTimeout(() => {
        setInsights((prev) => {
          const nextId = prev.length ? Math.max(...prev.map((i) => i.id)) + 1 : 1;
          return [
            ...prev,
            {
              id: nextId,
              text: payload.text,
              note: payload.note,
              articleTitle: payload.articleTitle,
              sourceUrl: payload.sourceUrl,
              groupLabel: payload.groupLabel || null,
            },
          ];
        });
        setInsightText("");
        setInsightNote("");
        setInsightGroup("");
        setInsightFromArticle(null);
        setShowInsightForm(false);
        setSaveInsightPending(false);
        toast.success("Insight saved to notebook");
      }, 200);
    },
  };

  const removeInsightMut = {
    mutate: ({ id }: { id: number }) => {
      setInsights((prev) => prev.filter((i) => i.id !== id));
      toast.success("Insight removed");
    },
  };

  const updateInsightMut = {
    mutate: ({ id, groupLabel }: { id: number; groupLabel: string | null }) => {
      setInsights((prev) =>
        prev.map((i) => (i.id === id ? { ...i, groupLabel: groupLabel || undefined } : i))
      );
      setEditingGroupLabel(null);
      toast.success("Note updated");
    },
  };

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Extract all topics
  const allTopics = useMemo(() => {
    if (!items) return [];
    const topicMap = new Map<string, number>();
    items.forEach((item: any) => {
      if (item.topics && Array.isArray(item.topics)) {
        item.topics.forEach((t: string) => topicMap.set(t, (topicMap.get(t) || 0) + 1));
      }
    });
    return Array.from(topicMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([topic, count]) => ({ topic, count }));
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!items) return [];
    const visible = items.filter((i: any) => i.status !== "dismissed");
    if (!activeTopicFilter) return visible;
    return visible.filter(
      (i: any) => i.topics && Array.isArray(i.topics) && i.topics.includes(activeTopicFilter)
    );
  }, [items, activeTopicFilter]);

  const grouped = groupByTime(filteredItems);

  // Hero item
  const heroItem = useMemo(() => {
    if (!filteredItems.length) return null;
    return (
      filteredItems.find((i: any) => i.priority === "urgent") ||
      filteredItems.find((i: any) => i.priority === "high") ||
      filteredItems[0]
    );
  }, [filteredItems]);

  const insightCount = insights?.length || 0;

  // Chat handler
  const handleChat = useCallback(() => {
    if (!chatInput.trim() || chatPending) return;
    const msg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatInput("");
    chatMutation.mutate({ workerId, message: msg });
  }, [chatInput, chatPending, workerId]);

  // Open detail panel
  const openDetail = (item: FeedItem) => {
    setSelectedItem(item);
    setRightPanel("detail");
  };

  // Quick actions
  const handleStar = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    starItem.mutate({ id });
  };
  const handleDismiss = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    dismissItem.mutate({ id });
  };

  // Save insight from article
  const handleSaveInsightFromArticle = (article: any) => {
    setInsightFromArticle(article);
    setInsightText(article.summary || "");
    setInsightNote("");
    setInsightGroup("");
    setShowInsightForm(true);
    setRightPanel("notebook");
  };

  // Save insight (submit)
  const handleSubmitInsight = () => {
    if (!insightText.trim()) return;
    saveInsightMut.mutate({
      workerId,
      text: insightText.trim(),
      note: insightNote.trim() || undefined,
      articleId: insightFromArticle?.id,
      articleTitle: insightFromArticle?.title,
      sourceUrl: insightFromArticle?.sourceUrl,
      groupLabel: insightGroup.trim() || undefined,
    });
  };

  // Group insights by topic
  const groupedInsights = useMemo(() => {
    if (!insights || insights.length === 0) return [];
    const groups = new Map<string, any[]>();
    const ungrouped: any[] = [];
    insights.forEach((insight: any) => {
      if (insight.groupLabel) {
        if (!groups.has(insight.groupLabel)) groups.set(insight.groupLabel, []);
        groups.get(insight.groupLabel)!.push(insight);
      } else {
        ungrouped.push(insight);
      }
    });
    const result: { label: string; items: any[] }[] = [];
    groups.forEach((items, label) => result.push({ label, items }));
    result.sort((a, b) => a.label.localeCompare(b.label));
    if (ungrouped.length > 0) result.push({ label: "", items: ungrouped });
    return result;
  }, [insights]);

  // Existing group labels for autocomplete
  const existingGroups = useMemo(() => {
    if (!insights) return [];
    const labels = new Set<string>();
    insights.forEach((i: any) => { if (i.groupLabel) labels.add(i.groupLabel); });
    return Array.from(labels).sort();
  }, [insights]);

  const toggleGroupCollapse = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };


  // Suggested chat prompts
  const suggestedPrompts = useMemo(() => {
    return [
      "What's the biggest story today?",
      "Summarise today's feed",
      "Any market-moving news?",
      "What should I write about?",
    ];
  }, []);

  return (
    <GlobalLayout activeSection="studio">
      <div className="flex h-[calc(100vh-0px)] overflow-hidden">
        {/* ─── Main Feed Area ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/5 bg-[#050810]/90 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation("/app/studio")}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-base font-bold text-white leading-tight" style={{ fontFamily: "Satoshi, sans-serif" }}>
                  Research Feed
                </h1>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Clock className="w-2.5 h-2.5" />
                  {config?.lastRunAt ? timeAgo(config.lastRunAt) : "Not yet scanned"}
                  {filteredItems.length > 0 && (
                    <span className="ml-1">· {filteredItems.length} items</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => runScan.mutate({ workerId })}
                disabled={runScan.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#6366F1] to-[#22D3EE] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {runScan.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {runScan.isPending ? "Scanning..." : "Scan"}
              </button>

              <button
                onClick={() => setLocation(`/app/studio/${workerId}/config`)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-white/10 mx-0.5" />
              {/* Notebook icon — navigates to full-page notebook */}
              <button
                onClick={() => setLocation(`/app/studio/${workerId}/notebook`)}
                className="relative p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                title="Notebook"
              >
                <Notebook className="w-4 h-4" />
                {insightCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-[8px] font-bold text-white flex items-center justify-center">
                    {insightCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setRightPanel(rightPanel === "chat" ? "notebook" : "chat")}
                className={`p-2 rounded-lg transition-colors ${rightPanel === "chat" ? "text-[#22D3EE] bg-[#22D3EE]/10" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                title="Chat"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ─── Researcher Identity Header ─── */}
          {profile && (
            <div className="px-5 py-3 border-b border-white/5 bg-gradient-to-r from-[#0a0f1a] to-[#050810]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#22D3EE] flex items-center justify-center">
                  <User className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white" style={{ fontFamily: "Satoshi, sans-serif" }}>
                      {profile.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">{profile.title}</span>
                  </div>
                  {profile.specialism ? (
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-lg truncate">{profile.specialism}</p>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {profile.topics.slice(0, 4).map((t: string) => (
                        <span key={t} className="text-[9px] font-medium text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Topic Filter Tabs */}
          {allTopics.length > 0 && (
            <div className="flex items-center gap-1.5 px-5 py-2 border-b border-white/5 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTopicFilter(null)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${
                  !activeTopicFilter ? "bg-white text-[#050810]" : "text-slate-400 bg-white/5 hover:bg-white/10"
                }`}
              >
                All
                <span className="ml-1 opacity-60">{items?.filter((i: any) => i.status !== "dismissed").length || 0}</span>
              </button>
              {allTopics.map(({ topic, count }) => (
                <button
                  key={topic}
                  onClick={() => setActiveTopicFilter(activeTopicFilter === topic ? null : topic)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${
                    activeTopicFilter === topic ? "bg-white text-[#050810]" : "text-slate-400 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {topic}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Feed Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-[#6366F1]/20 border-t-[#6366F1] animate-spin" />
                  <Sparkles className="w-5 h-5 text-[#22D3EE] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-sm text-slate-400">Loading your feed...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366F1]/20 to-[#22D3EE]/20 flex items-center justify-center mb-5">
                  <Globe className="w-8 h-8 text-[#22D3EE]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "Satoshi, sans-serif" }}>
                  No research yet
                </h3>
                <p className="text-slate-400 text-sm mb-6 max-w-sm text-center">
                  Configure your topics and sources, then hit Scan to get your first curated feed.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setLocation(`/app/studio/${workerId}/config`)}
                    className="px-5 py-2.5 bg-[#6366F1] text-white rounded-lg text-sm font-semibold hover:bg-[#5558E6] transition-colors"
                  >
                    Configure Research
                  </button>
                  <button
                    onClick={() => runScan.mutate({ workerId })}
                    disabled={runScan.isPending}
                    className="px-5 py-2.5 border border-white/10 text-white rounded-lg text-sm font-semibold hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    {runScan.isPending ? "Scanning..." : "Quick Scan"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-5 max-w-5xl">
                {/* Hero Card */}
                {heroItem && (
                  <div
                    onClick={() => openDetail(heroItem)}
                    className={`group relative mb-6 rounded-2xl overflow-hidden cursor-pointer border transition-all ${
                      selectedItem?.id === heroItem.id ? "border-[#6366F1]/50 ring-1 ring-[#6366F1]/20" : "border-white/5 hover:border-white/15"
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${heroItem.topics?.[0] ? topicGradient(heroItem.topics[0]) : "from-indigo-600/20 to-purple-600/10"}`} />
                    <div className="absolute inset-0 bg-[#050810]/60" />
                    <div className="relative p-6 lg:p-8">
                      <div className="flex items-center gap-2 mb-3">
                        <PriorityBadge priority={heroItem.priority ?? "normal"} />
                        <span className="text-[11px] text-slate-400 font-medium">{heroItem.sourceName || "Web"}</span>
                        <span className="text-[11px] text-slate-500">·</span>
                        <span className="text-[11px] text-slate-500">
                          {timeAgo(heroItem.publishedAt ?? heroItem.createdAt ?? new Date().toISOString())}
                        </span>
                        {heroItem.status === "starred" && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 ml-auto" />}
                      </div>
                      <h2 className="text-xl lg:text-2xl font-bold text-white mb-3 leading-tight max-w-3xl" style={{ fontFamily: "Satoshi, sans-serif" }}>
                        {heroItem.title}
                      </h2>
                      <p className="text-sm text-slate-300 leading-relaxed max-w-2xl line-clamp-3 mb-4">{heroItem.summary}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1.5">
                          {(Array.isArray(heroItem.topics) ? heroItem.topics : []).slice(0, 3).map((t: string) => (
                            <span key={t} className="text-[10px] font-medium text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">{t}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSaveInsightFromArticle(heroItem); }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Save insight to notebook"
                          >
                            <Quote className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => handleStar(e, heroItem.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition-colors opacity-0 group-hover:opacity-100">
                            <Star className={`w-3.5 h-3.5 ${heroItem.status === "starred" ? "fill-amber-400 text-amber-400" : ""}`} />
                          </button>
                          <span className="text-[11px] text-[#22D3EE] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            Read more <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid Cards */}
                {grouped.map((group) => {
                  const groupGridItems = group.items.filter((i: any) => i.id !== heroItem?.id);
                  if (groupGridItems.length === 0) return null;
                  return (
                    <div key={group.label} className="mb-6">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{group.label}</h3>
                        <div className="flex-1 h-px bg-white/5" />
                        <span className="text-[10px] text-slate-600">{groupGridItems.length} items</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {groupGridItems.map((item: any) => (
                          <div
                            key={item.id}
                            onClick={() => openDetail(item)}
                            className={`group relative rounded-xl border p-4 cursor-pointer transition-all ${
                              selectedItem?.id === item.id
                                ? "border-[#6366F1]/50 bg-[#6366F1]/5 ring-1 ring-[#6366F1]/20"
                                : "border-white/5 bg-[#0a0f1a] hover:border-white/15 hover:bg-[#0c1120]"
                            }`}
                          >
                            <div className={`absolute top-0 left-4 right-4 h-px bg-gradient-to-r ${item.topics?.[0] ? topicGradient(item.topics[0]) : "from-white/5 to-transparent"}`} />
                            <div className="flex items-center gap-2 mb-2.5">
                              <PriorityBadge priority={item.priority ?? "normal"} />
                              <span className="text-[10px] text-slate-500 font-medium">{item.sourceName || "Web"}</span>
                              <span className="text-[10px] text-slate-600">
                                {timeAgo(item.publishedAt ?? item.createdAt ?? new Date().toISOString())}
                              </span>
                              {item.status === "starred" && <Star className="w-3 h-3 text-amber-400 fill-amber-400 ml-auto" />}
                            </div>
                            <h4 className="text-sm font-bold text-white mb-2 leading-snug line-clamp-2" style={{ fontFamily: "Satoshi, sans-serif" }}>
                              {item.title}
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-3">{item.summary}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex gap-1">
                                {(Array.isArray(item.topics) ? item.topics : []).slice(0, 2).map((t: string) => (
                                  <span key={t} className="text-[9px] font-medium text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{t}</span>
                                ))}
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSaveInsightFromArticle(item); }}
                                  className="p-1 rounded text-slate-500 hover:text-amber-400 transition-colors"
                                  title="Save insight"
                                >
                                  <Quote className="w-3 h-3" />
                                </button>
                                <button onClick={(e) => handleStar(e, item.id)} className="p-1 rounded text-slate-500 hover:text-amber-400 transition-colors">
                                  <Star className={`w-3 h-3 ${item.status === "starred" ? "fill-amber-400 text-amber-400" : ""}`} />
                                </button>
                                <button onClick={(e) => handleDismiss(e, item.id)} className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors">
                                  <DismissIcon className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Scan prompt */}
                {filteredItems.length > 0 && (
                  <div className="text-center py-8 border-t border-white/5 mt-4">
                    <p className="text-xs text-slate-500 mb-3">
                      {config?.lastRunAt ? `Last scanned ${timeAgo(config.lastRunAt)}` : "Run a scan to get fresh results"}
                    </p>
                    <button
                      onClick={() => runScan.mutate({ workerId })}
                      disabled={runScan.isPending}
                      className="text-xs text-[#22D3EE] hover:underline disabled:opacity-50"
                    >
                      {runScan.isPending ? "Scanning..." : "Scan for updates →"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Panel ─── */}
        <div className="w-[400px] border-l border-white/5 flex flex-col bg-[#070b14] overflow-hidden">
          {/* Panel header tabs */}
          <div className="flex items-center border-b border-white/5">
            {selectedItem && (
              <button
                onClick={() => setRightPanel("detail")}
                className={`flex-1 py-2.5 text-[11px] font-semibold text-center transition-colors ${
                  rightPanel === "detail" ? "text-white border-b-2 border-[#6366F1]" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Eye className="w-3.5 h-3.5 inline mr-1" />
                Article
              </button>
            )}
            <button
              onClick={() => setRightPanel("notebook")}
              className={`flex-1 py-2.5 text-[11px] font-semibold text-center transition-colors ${
                rightPanel === "notebook" ? "text-amber-400 border-b-2 border-amber-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Notebook className="w-3.5 h-3.5 inline mr-1" />
              Notebook
              {insightCount > 0 && <span className="ml-1 text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{insightCount}</span>}
            </button>
            <button
              onClick={() => setRightPanel("chat")}
              className={`flex-1 py-2.5 text-[11px] font-semibold text-center transition-colors ${
                rightPanel === "chat" ? "text-[#22D3EE] border-b-2 border-[#22D3EE]" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 inline mr-1" />
              Chat
            </button>
          </div>

          {/* ─── Notebook Panel ─── */}
          {rightPanel === "notebook" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {/* Add insight form */}
                {showInsightForm ? (
                  <div className="mb-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    {insightFromArticle && (
                      <div className="flex items-center gap-2 mb-2 text-[10px] text-slate-400">
                        <FileText className="w-3 h-3" />
                        <span className="truncate">{insightFromArticle.title}</span>
                      </div>
                    )}
                    <textarea
                      value={insightText}
                      onChange={(e) => setInsightText(e.target.value)}
                      placeholder="Key insight or quote..."
                      className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 outline-none resize-none mb-2"
                      rows={3}
                      autoFocus
                    />
                    <textarea
                      value={insightNote}
                      onChange={(e) => setInsightNote(e.target.value)}
                      placeholder="Your note (optional)..."
                      className="w-full bg-transparent text-xs text-slate-400 placeholder:text-slate-600 outline-none resize-none mb-2"
                      rows={2}
                    />
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] text-slate-500 font-medium">Topic group</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {existingGroups.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setInsightGroup(insightGroup === g ? "" : g)}
                            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                              insightGroup === g
                                ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                                : "border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                        <input
                          type="text"
                          value={insightGroup}
                          onChange={(e) => setInsightGroup(e.target.value)}
                          placeholder="New topic..."
                          className="bg-transparent text-[11px] text-white placeholder:text-slate-600 outline-none w-24 border-b border-white/10 focus:border-amber-500/30 py-0.5 px-1 transition-colors"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSubmitInsight}
                        disabled={!insightText.trim() || saveInsightMut.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                      >
                        {saveInsightMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Save
                      </button>
                      <button
                        onClick={() => { setShowInsightForm(false); setInsightFromArticle(null); setInsightText(""); setInsightNote(""); }}
                        className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowInsightForm(true)}
                    className="w-full mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/10 text-xs text-slate-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add insight manually
                  </button>
                )}

                {/* Saved insights list — grouped by topic */}
                {(!insights || insights.length === 0) && !showInsightForm ? (
                  <div className="py-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center mx-auto mb-4">
                      <Notebook className="w-7 h-7 text-amber-500/50" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-2" style={{ fontFamily: "Satoshi, sans-serif" }}>
                      Your notebook is empty
                    </h4>
                    <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                      Save key insights from articles as you read. Click the <Quote className="w-3 h-3 inline text-amber-400" /> icon on any article card, or add one manually above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedInsights.map((group) => {
                      const isCollapsed = collapsedGroups.has(group.label || "__ungrouped");
                      const groupKey = group.label || "__ungrouped";
                      return (
                        <div key={groupKey}>
                          {/* Group header */}
                          <button
                            onClick={() => toggleGroupCollapse(groupKey)}
                            className="w-full flex items-center gap-2 mb-2 group/header"
                          >
                            <span className={`text-[10px] transition-transform ${isCollapsed ? "" : "rotate-90"}`}>▶</span>
                            {group.label ? (
                              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">{group.label}</span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ungrouped</span>
                            )}
                            <span className="text-[10px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded-full">{group.items.length}</span>
                            <div className="flex-1 border-t border-white/5" />
                          </button>
                          {/* Group items */}
                          {!isCollapsed && (
                            <div className="space-y-2 pl-4">
                              {group.items.map((insight: any) => (
                                <div
                                  key={insight.id}
                                  className="group p-3 rounded-xl border border-white/5 bg-[#0a0f1a] hover:border-amber-500/20 transition-colors"
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-white leading-relaxed">{insight.text}</p>
                                      {insight.note && (
                                        <p className="text-[11px] text-slate-500 mt-1.5 italic flex items-start gap-1">
                                          <StickyNote className="w-3 h-3 shrink-0 mt-0.5" />
                                          {insight.note}
                                        </p>
                                      )}
                                      {insight.articleTitle && (
                                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-600">
                                          <FileText className="w-2.5 h-2.5" />
                                          <span className="truncate">{insight.articleTitle}</span>
                                          {insight.sourceUrl && (
                                            <a href={insight.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#22D3EE] hover:underline shrink-0">
                                              <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                          )}
                                        </div>
                                      )}
                                      {/* Group reassign */}
                                      {editingGroupLabel?.id === insight.id ? (
                                        <div className="flex items-center gap-1.5 mt-2">
                                          <input
                                            type="text"
                                            defaultValue={editingGroupLabel?.current ?? ""}
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                updateInsightMut.mutate({ id: insight.id, groupLabel: (e.target as HTMLInputElement).value.trim() || null });
                                              }
                                              if (e.key === "Escape") setEditingGroupLabel(null);
                                            }}
                                            onBlur={(e) => {
                                              updateInsightMut.mutate({ id: insight.id, groupLabel: e.target.value.trim() || null });
                                            }}
                                            className="bg-transparent text-[10px] text-amber-400 border-b border-amber-500/30 outline-none w-20 py-0.5"
                                            placeholder="Topic..."
                                          />
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setEditingGroupLabel({ id: insight.id, current: insight.groupLabel || "" })}
                                          className="mt-2 text-[10px] text-slate-600 hover:text-amber-400 transition-colors"
                                        >
                                          {insight.groupLabel ? `✎ ${insight.groupLabel}` : "+ Add to topic"}
                                        </button>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => removeInsightMut.mutate({ id: insight.id })}
                                      className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>


            </div>
          )}

          {/* ─── Chat Panel ─── */}
          {rightPanel === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {chatMessages.length > 0 && (
                <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">{chatMessages.length} messages</span>
                  <button
                    onClick={() => clearChatMut.mutate({ workerId })}
                    disabled={clearChatMut.isPending}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    New Chat
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="py-8">
                    <div className="text-center mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366F1]/20 to-[#22D3EE]/20 flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-6 h-6 text-[#22D3EE]" />
                      </div>
                      <p className="text-sm text-white font-semibold mb-1" style={{ fontFamily: "Satoshi, sans-serif" }}>
                        Research Assistant
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Ask about your feed, get summaries, or brainstorm ideas
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {suggestedPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => {
                            setChatInput(prompt);
                            setTimeout(() => chatInputRef.current?.focus(), 50);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#6366F1] text-white rounded-br-md"
                          : "bg-white/5 text-slate-300 rounded-bl-md"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="text-sm"><Streamdown>{msg.content}</Streamdown></div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {chatPending && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse" />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse delay-100" />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse delay-200" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="px-3 py-3 border-t border-white/5">
                <div className="flex items-center gap-2 bg-[#0a0f1a] border border-white/10 rounded-xl px-3 py-2 focus-within:border-[#22D3EE]/30 transition-colors">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleChat()}
                    placeholder="Ask your researcher..."
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
                  />
                  <button
                    onClick={handleChat}
                    disabled={!chatInput.trim() || chatPending}
                    className="p-1.5 rounded-lg text-[#22D3EE] hover:bg-[#22D3EE]/10 transition-colors disabled:opacity-30"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Article Detail Panel ─── */}
          {rightPanel === "detail" && selectedItem && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <PriorityBadge priority={selectedItem.priority ?? "normal"} />
                  <span className="text-[11px] text-slate-500 font-medium">{selectedItem.sourceName || "Web"}</span>
                  <span className="text-[10px] text-slate-600">
                    {timeAgo(selectedItem.publishedAt ?? selectedItem.createdAt ?? new Date().toISOString())}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mb-3 leading-snug" style={{ fontFamily: "Satoshi, sans-serif" }}>
                  {selectedItem.title}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">{selectedItem.summary}</p>
                {selectedItem.content && (
                  <div className="mb-4 border-t border-white/5 pt-4">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Analysis</h4>
                    <div className="text-sm text-slate-300 leading-relaxed"><Streamdown>{selectedItem.content}</Streamdown></div>
                  </div>
                )}
                {selectedItem.deepDiveContent && (
                  <div className="mb-4 border-t border-[#22D3EE]/10 pt-4">
                    <h4 className="text-[10px] font-bold text-[#22D3EE] uppercase tracking-wider mb-2">Deep Dive</h4>
                    <div className="text-sm text-slate-300 leading-relaxed"><Streamdown>{selectedItem.deepDiveContent}</Streamdown></div>
                  </div>
                )}
                {selectedItem.sourceUrl && (
                  <a href={selectedItem.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#22D3EE] hover:underline mb-4">
                    View source <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {selectedItem.topics && selectedItem.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(Array.isArray(selectedItem.topics) ? selectedItem.topics : []).map((t: string) => (
                      <span key={t} className="text-[10px] font-medium text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              {/* Actions */}
              <div className="px-4 py-3 border-t border-white/5 flex items-center gap-2">
                <button
                  onClick={() => handleSaveInsightFromArticle(selectedItem)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-amber-400 border border-amber-400/20 hover:bg-amber-400/10 transition-colors"
                >
                  <Quote className="w-3.5 h-3.5" />
                  Save Insight
                </button>
                <button
                  onClick={() => starItem.mutate({ id: selectedItem.id })}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                    selectedItem.status === "starred"
                      ? "text-amber-400 bg-amber-400/10 border border-amber-400/20"
                      : "text-slate-400 border border-white/10 hover:bg-white/5"
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${selectedItem.status === "starred" ? "fill-amber-400" : ""}`} />
                </button>
                <button
                  onClick={() => deepDive.mutate({ id: selectedItem.id })}
                  disabled={deepDive.isPending || !!selectedItem.deepDiveContent}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-[#22D3EE] border border-[#22D3EE]/20 hover:bg-[#22D3EE]/10 transition-colors disabled:opacity-40"
                >
                  {deepDive.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => dismissItem.mutate({ id: selectedItem.id })}
                  className="p-2 rounded-lg text-slate-500 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-colors"
                >
                  <DismissIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </GlobalLayout>
  );
}
