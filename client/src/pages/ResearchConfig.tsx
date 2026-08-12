import { getResearchMock, isMockDataEnabled } from "@/data/services";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import GlobalLayout from "@/components/GlobalLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  Link as LinkIcon,
  Clock,
  Tag,
  Settings,
  Rss,
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  ToggleLeft,
  ToggleRight,
  Newspaper,
  Radio,
  Zap,
} from "lucide-react";

/** tRPC bypass — replace with API when backend is wired. */
type ResearchConfigData = {
  topics: string[];
  scheduleTime: string;
  isScheduleActive: number;
  focusPrompt: string;
};

type ConfigSourceRow = {
  id: number;
  name: string;
  url: string;
  type: string;
  feedTitle?: string | null;
  isActive: number;
  lastFetchStatus?: string;
  articleCount?: number | null;
};

const researchConfigRoot = (
  isMockDataEnabled()
    ? getResearchMock().config
    : {
        topics: [] as string[],
        scheduleTime: "07:00",
        isScheduleActive: 0,
        focusPrompt: "",
        sources: [] as ConfigSourceRow[],
      }
) as ResearchConfigData & {
  sources?: ConfigSourceRow[];
};
const MOCK_CONFIG: ResearchConfigData = {
  topics: researchConfigRoot.topics ?? [],
  scheduleTime: researchConfigRoot.scheduleTime ?? "07:00",
  isScheduleActive: researchConfigRoot.isScheduleActive ?? 1,
  focusPrompt: researchConfigRoot.focusPrompt ?? "",
};
const MOCK_SOURCES: ConfigSourceRow[] = researchConfigRoot.sources ?? [];

export default function ResearchConfig({ embedded, workerId: propWorkerId }: { embedded?: boolean; workerId?: number } = {}) {
  const params = useParams<{ workerId: string }>();
  const workerId = propWorkerId || Number(params.workerId);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [config, setConfig] = useState<ResearchConfigData>(MOCK_CONFIG);
  const [sources, setSources] = useState<ConfigSourceRow[]>(MOCK_SOURCES);
  const profile = { name: (user?.name as string | undefined) || "Your researcher" };
  const isLoading = false;

  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [scheduleHour, setScheduleHour] = useState(7);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [focusPrompt, setFocusPrompt] = useState("");

  // Source add state
  const [showAddSource, setShowAddSource] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [addName, setAddName] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    title?: string;
    description?: string;
    type: string;
  } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [savePending, setSavePending] = useState(false);
  const [addSourcePending, setAddSourcePending] = useState(false);

  useEffect(() => {
    if (config) {
      setTopics(config.topics || []);
      const hour = config.scheduleTime ? parseInt(config.scheduleTime.split(':')[0], 10) : 7;
      setScheduleHour(isNaN(hour) ? 7 : hour);
      setScheduleEnabled(config.isScheduleActive === 1);
      setFocusPrompt(config.focusPrompt || "");
    }
  }, [config]);

  const updateConfig = {
    isPending: savePending,
    mutate: (payload: {
      workerId: number;
      topics: string[];
      scheduleHour: number;
      scheduleEnabled: boolean;
      focusPrompt: string;
    }) => {
      setSavePending(true);
      window.setTimeout(() => {
        setConfig((c) => ({
          ...c,
          topics: payload.topics,
          scheduleTime: `${String(payload.scheduleHour).padStart(2, "0")}:00`,
          isScheduleActive: payload.scheduleEnabled ? 1 : 0,
          focusPrompt: payload.focusPrompt,
        }));
        toast.success("Settings saved");
        setSavePending(false);
      }, 400);
    },
  };

  const addSourceMut = {
    isPending: addSourcePending,
    mutate: (payload: { workerId: number; url: string; name?: string }) => {
      const vr = validationResult;
      setAddSourcePending(true);
      window.setTimeout(() => {
        const url = payload.url;
        let host = "Source";
        try {
          host = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          /* ignore */
        }
        const inferredType =
          vr?.type === "rss" || /rss|feed|atom|\.xml/i.test(url) ? "rss" : "website";
        const displayName = payload.name?.trim() || vr?.title || host;
        setSources((prev) => {
          const nextId = prev.length ? Math.max(...prev.map((s) => s.id)) + 1 : 1;
          return [
            ...prev,
            {
              id: nextId,
              name: displayName,
              url,
              type: inferredType,
              feedTitle: vr?.title || displayName,
              isActive: 1,
              lastFetchStatus: "pending",
              articleCount: 0,
            },
          ];
        });
        toast.success(`Added "${displayName}" as a ${inferredType} source`);
        setAddUrl("");
        setAddName("");
        setValidationResult(null);
        setShowAddSource(false);
        setAddSourcePending(false);
      }, 300);
    },
  };

  const validateMut = {
    mutate: (payload: { url: string }) => {
      const url = payload.url;
      window.setTimeout(() => {
        try {
          const looksLikeRss = /rss|feed|atom|\.xml/i.test(url);
          const host = new URL(url).hostname.replace(/^www\./, "");
          setValidationResult({
            valid: looksLikeRss,
            title: looksLikeRss ? host : undefined,
            description: looksLikeRss ? "Feed detected (mock)." : undefined,
            type: looksLikeRss ? "rss" : "website",
          });
          if (looksLikeRss) setAddName((prev) => prev || host);
        } catch {
          setValidationResult({ valid: false, type: "website" });
        }
        setIsValidating(false);
      }, 400);
    },
  };

  const removeSourceMut = {
    mutate: (payload: { id: number }) => {
      setSources((prev) => prev.filter((s) => s.id !== payload.id));
      toast.success("Source removed");
      setDeleteConfirmId(null);
    },
  };

  const toggleSourceMut = {
    mutate: (payload: { id: number; isActive: boolean }) => {
      setSources((prev) =>
        prev.map((s) => (s.id === payload.id ? { ...s, isActive: payload.isActive ? 1 : 0 } : s))
      );
    },
  };

  // Handlers
  const handleAddTopic = () => {
    if (!newTopic.trim()) return;
    if (topics.includes(newTopic.trim())) return;
    setTopics([...topics, newTopic.trim()]);
    setNewTopic("");
  };

  const handleRemoveTopic = (t: string) => {
    setTopics(topics.filter((x) => x !== t));
  };

  const handleSave = () => {
    updateConfig.mutate({
      workerId,
      topics,
      scheduleHour,
      scheduleEnabled,
      focusPrompt,
    });
  };

  const handleValidate = () => {
    if (!addUrl.trim()) return;
    setIsValidating(true);
    setValidationResult(null);
    validateMut.mutate({ url: addUrl.trim() });
  };

  const handleAddSource = () => {
    if (!addUrl.trim()) return;
    addSourceMut.mutate({
      workerId,
      url: addUrl.trim(),
      name: addName.trim() || undefined,
    });
  };

  // Stats
  const activeCount = sources.filter((s: ConfigSourceRow) => s.isActive === 1).length;
  const rssCount = sources.filter((s: ConfigSourceRow) => s.type === "rss").length;

  if (isLoading) {
    if (embedded) {
      return (
        <div className="h-full bg-gray-950 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      );
    }
    return (
      <GlobalLayout activeSection="studio">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      </GlobalLayout>
    );
  }

  const configContent = (
    <div className="space-y-10">
      {/* ── Topics ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4 text-[#6366F1]" />
          <h2 className="text-sm font-semibold text-white">Topics</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          What should your researcher focus on? Add topics, industries, or specific areas.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {topics.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6366F1]/10 text-[#6366F1] rounded-lg text-xs font-medium"
            >
              {t}
              <button onClick={() => handleRemoveTopic(t)} className="hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
            placeholder="e.g. AI Agents, UAE Tech, Podcasts..."
            className="flex-1 px-3 py-2 bg-[#0a0f1a] border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#6366F1]/50"
          />
          <button
            onClick={handleAddTopic}
            className="p-2 bg-[#6366F1]/15 text-[#6366F1] rounded-lg hover:bg-[#6366F1]/25 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Focus Prompt ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-[#22D3EE]" />
          <h2 className="text-sm font-semibold text-white">Focus Prompt</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Give your researcher specific instructions. What angle should it take? What should it prioritise?
        </p>
        <textarea
          value={focusPrompt}
          onChange={(e) => setFocusPrompt(e.target.value)}
          placeholder="e.g. Focus on the UAE podcast scene and search globally for trends. Prioritise actionable insights over general news. Flag anything related to AI-powered content creation."
          className="w-full px-4 py-3 bg-[#0a0f1a] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#22D3EE]/50 resize-none h-28 leading-relaxed"
        />
      </section>

      {/* ── Sources ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Rss className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-white">Sources</h2>
            {sources && sources.length > 0 && (
              <span className="text-xs text-slate-500 ml-2">
                {activeCount} active · {rssCount} RSS
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAddSource(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Source
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Add RSS feeds, news sites, and blogs. We auto-detect feeds from any URL.
        </p>

        {/* Add Source Form */}
        {showAddSource && (
          <div className="bg-[#0a0f1a] border border-white/10 rounded-xl p-5 mb-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Add a new source
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Paste any URL — we'll automatically detect if it has an RSS feed.
            </p>

            <div className="space-y-3">
              {/* URL input */}
              <div className="flex gap-2">
                <input
                  type="url"
                  value={addUrl}
                  onChange={(e) => {
                    setAddUrl(e.target.value);
                    setValidationResult(null);
                  }}
                  placeholder="https://techcrunch.com or https://feeds.bbci.co.uk/news/rss.xml"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                />
                <button
                  onClick={handleValidate}
                  disabled={!addUrl.trim() || isValidating}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 hover:border-cyan-500 text-gray-300 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 text-sm"
                >
                  {isValidating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Detect
                </button>
              </div>

              {/* Validation result */}
              {validationResult && (
                <div
                  className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                    validationResult.valid
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : "bg-amber-500/10 border border-amber-500/20"
                  }`}
                >
                  {validationResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  )}
                  <div>
                    {validationResult.valid ? (
                      <>
                        <p className="text-xs font-medium text-emerald-300">
                          RSS feed detected: {validationResult.title || "Unknown"}
                        </p>
                        {validationResult.description && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {validationResult.description.slice(0, 150)}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-amber-300">
                        No RSS feed detected. It will be saved as a website source. Try adding a direct RSS feed URL for best results.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Name override */}
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Display name (optional — auto-detected from feed)"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddSource}
                  disabled={!addUrl.trim() || addSourceMut.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-950 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {addSourceMut.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Source
                </button>
                <button
                  onClick={() => {
                    setShowAddSource(false);
                    setAddUrl("");
                    setAddName("");
                    setValidationResult(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sources list */}
        {!sources || sources.length === 0 ? (
          <div className="text-center py-10 bg-[#0a0f1a] border border-white/5 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <Newspaper className="w-6 h-6 text-gray-500" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">No sources yet</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
              Add RSS feeds and news sites to power your research feed.
            </p>
            <button
              onClick={() => setShowAddSource(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-950 text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Source
            </button>

            {/* Suggested sources */}
            <div className="mt-8 max-w-lg mx-auto px-4">
              <p className="text-xs text-gray-500 mb-3">Popular sources to get started:</p>
              <div className="space-y-1.5">
                {[
                  { name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", category: "AI" },
                  { name: "ArXiv — AI & ML", url: "https://rss.arxiv.org/rss/cs.AI", category: "Academic" },
                  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Tech" },
                  { name: "BBC News - Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", category: "News" },
                  { name: "Hacker News", url: "https://hnrss.org/frontpage", category: "Tech" },
                  { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", category: "Tech" },
                ].map((suggestion) => (
                  <button
                    key={suggestion.url}
                    onClick={() => {
                      setShowAddSource(true);
                      setAddUrl(suggestion.url);
                      setAddName(suggestion.name);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-cyan-500/50 transition-colors text-left group"
                  >
                    <Rss className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">
                        {suggestion.name}
                      </p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-gray-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((source: ConfigSourceRow) => (
              <div
                key={source.id}
                className={`bg-[#0a0f1a] border rounded-lg p-4 transition-colors ${
                  source.isActive === 1 ? "border-white/10" : "border-white/5 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      source.type === "rss" ? "bg-orange-500/10" : "bg-gray-800"
                    }`}
                  >
                    {source.type === "rss" ? (
                      <Rss className="w-4 h-4 text-orange-400" />
                    ) : (
                      <Globe className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-medium text-white truncate">
                        {source.feedTitle || source.name}
                      </h3>
                      {source.lastFetchStatus === "success" && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      {source.lastFetchStatus === "error" && (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-cyan-400 transition-colors truncate max-w-xs"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        {source.url}
                      </a>
                      {typeof source.articleCount === "number" && source.articleCount > 0 && (
                        <span>{source.articleCount} articles</span>
                      )}
                      <span className="capitalize">{source.type}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() =>
                        toggleSourceMut.mutate({
                          id: source.id,
                          isActive: source.isActive !== 1,
                        })
                      }
                      className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                      title={source.isActive === 1 ? "Pause" : "Activate"}
                    >
                      {source.isActive === 1 ? (
                        <ToggleRight className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-gray-500" />
                      )}
                    </button>

                    {deleteConfirmId === source.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => removeSourceMut.mutate({ id: source.id })}
                          className="px-2 py-1 text-xs bg-red-500 hover:bg-red-400 text-white rounded transition-colors"
                        >
                          Remove
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(source.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add more */}
            <button
              onClick={() => setShowAddSource(true)}
              className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-gray-700 rounded-lg text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add another source
            </button>
          </div>
        )}
      </section>

      {/* ── Schedule ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Daily Schedule</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Your researcher wakes up once a day, scans all sources, and produces a digest.
        </p>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-[#0a0f1a] text-[#6366F1] focus:ring-[#6366F1]/50"
            />
            <span className="text-sm text-white">Enabled</span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Run at</span>
            <select
              value={scheduleHour}
              onChange={(e) => setScheduleHour(Number(e.target.value))}
              className="px-3 py-1.5 bg-[#0a0f1a] border border-white/10 rounded-lg text-sm text-white outline-none focus:border-[#6366F1]/50"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, "0")}:00
                </option>
              ))}
            </select>
            <span className="text-sm text-slate-400">daily</span>
          </div>
        </div>
      </section>

      {/* ── Save ── */}
      <div className="pt-4 border-t border-white/5">
        <button
          onClick={handleSave}
          disabled={updateConfig.isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#6366F1] text-white rounded-lg text-sm font-medium hover:bg-[#5558E6] transition-colors disabled:opacity-50"
        >
          {updateConfig.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Settings
        </button>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="h-full bg-gray-950 text-white overflow-y-auto">
        <div className="p-6 max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Research Settings</h2>
            <p className="text-sm text-slate-400 mt-1">
              Configure topics, sources, and schedule for {profile?.name || "your researcher"}.
            </p>
          </div>
          {configContent}
        </div>
      </div>
    );
  }

  return (
    <GlobalLayout activeSection="studio">
      <div className="p-6 lg:p-10 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setLocation(`/app/studio/${workerId}/feed`)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Satoshi, sans-serif" }}>
              Research Settings
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Configure topics, sources, and schedule for {profile?.name || "your researcher"}.
            </p>
          </div>
        </div>
        {configContent}
      </div>
    </GlobalLayout>
  );
}
