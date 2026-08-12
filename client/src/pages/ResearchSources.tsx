import { getResearchMock, isMockDataEnabled } from "@/data/services";
import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Rss,
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Search,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Newspaper,
  Radio,
  Zap,
} from "lucide-react";

/** Local row shape (matches UI). tRPC bypass — replace with API when backend is wired. */
export type ResearchSourceRow = {
  id: number;
  name: string;
  url: string;
  type: "rss" | "website" | "newsletter";
  feedTitle?: string | null;
  feedDescription?: string | null;
  isActive: number;
  lastFetchStatus?: "success" | "error" | "pending";
  errorMessage?: string | null;
  articleCount?: number | null;
  lastScannedAt?: string | null;
  topics?: string[];
};

const DEFAULT_MOCK_SOURCES: ResearchSourceRow[] = isMockDataEnabled()
  ? ((getResearchMock().sources as ResearchSourceRow[]) ?? [])
  : [];

export default function ResearchSources({ embedded, workerId: propWorkerId }: { embedded?: boolean; workerId?: number } = {}) {
  const { workerId: wParam } = useParams<{ workerId: string }>();
  const workerId = propWorkerId || Number(wParam);
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();

  // State
  const [addUrl, setAddUrl] = useState("");
  const [addName, setAddName] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    title?: string;
    description?: string;
    type: string;
  } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [sources, setSources] = useState<ResearchSourceRow[]>(DEFAULT_MOCK_SOURCES);
  const [addPending, setAddPending] = useState(false);

  const profile = useMemo(() => (user?.name ? { name: user.name as string } : null), [user]);

  const handleValidate = () => {
    if (!addUrl.trim()) return;
    setIsValidating(true);
    setValidationResult(null);
    const url = addUrl.trim();
    window.setTimeout(() => {
      try {
        const looksLikeRss = /rss|feed|atom|\.xml/i.test(url);
        const host = new URL(url).hostname.replace(/^www\./, "");
        setValidationResult({
          valid: looksLikeRss,
          title: looksLikeRss ? host : undefined,
          description: looksLikeRss ? "RSS/Atom feed detected (mock — connect API later)." : undefined,
          type: looksLikeRss ? "rss" : "website",
        });
        if (looksLikeRss) {
          setAddName((prev) => prev || host);
        }
      } catch {
        setValidationResult({ valid: false, type: "website" });
      }
      setIsValidating(false);
    }, 400);
  };

  const handleAddSource = () => {
    if (!addUrl.trim() || addPending) return;
    setAddPending(true);
    window.setTimeout(() => {
      const url = addUrl.trim();
      let host = "Source";
      try {
        host = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        /* ignore */
      }
      const inferredType =
        validationResult?.type === "rss" || /rss|feed|atom|\.xml/i.test(url) ? "rss" : "website";
      const displayName = addName.trim() || validationResult?.title || host;
      setSources((prev) => {
        const nextId = prev.length ? Math.max(...prev.map((s) => s.id)) + 1 : 1;
        return [
          ...prev,
          {
            id: nextId,
            name: displayName,
            url,
            type: inferredType as "rss" | "website",
            feedTitle: validationResult?.title || displayName,
            feedDescription: validationResult?.description ?? null,
            isActive: 1,
            lastFetchStatus: "pending",
            articleCount: 0,
            lastScannedAt: null,
            topics: [],
          },
        ];
      });
      toast.success(`Added "${displayName}" as a ${inferredType} source`);
      setAddUrl("");
      setAddName("");
      setValidationResult(null);
      setShowAddForm(false);
      setAddPending(false);
    }, 300);
  };

  const handleRemoveSource = (id: number) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    toast.success("Source removed");
    setDeleteConfirmId(null);
  };

  const handleToggleSource = (id: number, nextActive: boolean) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: nextActive ? 1 : 0 } : s)),
    );
  };

  // Stats
  const activeCount = sources?.filter((s) => s.isActive === 1).length || 0;
  const rssCount = sources?.filter((s) => s.type === "rss").length || 0;
  const errorCount = sources?.filter((s) => s.lastFetchStatus === "error").length || 0;

  if (authLoading) {
    return (
      <div className={`${embedded ? 'h-full' : 'min-h-screen'} bg-gray-950 flex items-center justify-center`}>
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  const content = (
    <div className={`${embedded ? 'h-full overflow-y-auto' : 'max-w-5xl mx-auto px-6 py-8'}`}>
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Radio className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{activeCount}</p>
                <p className="text-xs text-gray-400">Active Sources</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Rss className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{rssCount}</p>
                <p className="text-xs text-gray-400">RSS Feeds</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{errorCount}</p>
                <p className="text-xs text-gray-400">Errors</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Source Form */}
        {showAddForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              Add a new source
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Paste any URL — we'll automatically detect if it has an RSS feed. Works with news sites, blogs, newsletters, and direct RSS/Atom feed URLs.
            </p>

            <div className="space-y-4">
              {/* URL input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={addUrl}
                    onChange={(e) => {
                      setAddUrl(e.target.value);
                      setValidationResult(null);
                    }}
                    placeholder="https://techcrunch.com or https://feeds.bbci.co.uk/news/rss.xml"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                  />
                  <button
                    onClick={handleValidate}
                    disabled={!addUrl.trim() || isValidating}
                    className="px-4 py-2.5 bg-gray-800 border border-gray-700 hover:border-cyan-500 text-gray-300 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isValidating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Detect
                  </button>
                </div>
              </div>

              {/* Validation result */}
              {validationResult && (
                <div
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    validationResult.valid
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : "bg-amber-500/10 border border-amber-500/20"
                  }`}
                >
                  {validationResult.valid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  )}
                  <div>
                    {validationResult.valid ? (
                      <>
                        <p className="text-sm font-medium text-emerald-300">
                          RSS feed detected: {validationResult.title || "Unknown"}
                        </p>
                        {validationResult.description && (
                          <p className="text-xs text-gray-400 mt-1">
                            {validationResult.description.slice(0, 150)}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-amber-300">
                        No RSS feed detected. The source will be saved but may not fetch articles automatically. Try adding a direct RSS feed URL instead.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Name override */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Display Name <span className="text-gray-500">(optional — auto-detected from feed)</span>
                </label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. TechCrunch, BBC News, The Verge"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleAddSource}
                  disabled={!addUrl.trim() || addPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {addPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Source
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setAddUrl("");
                    setAddName("");
                    setValidationResult(null);
                  }}
                  className="px-5 py-2.5 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sources list */}
        {!sources || sources.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Newspaper className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No sources yet</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              Add RSS feeds, news sites, and blogs to power your research feed with real-world data. Your researcher will scan these sources and surface the most relevant articles.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Source
            </button>

            {/* Suggested sources */}
            <div className="mt-10 max-w-lg mx-auto">
              <p className="text-sm text-gray-500 mb-4">Popular sources to get started:</p>
              <div className="space-y-2">
                {[
                  { name: "ArXiv — AI & Machine Learning", url: "https://rss.arxiv.org/rss/cs.AI", category: "Academic" },
                  { name: "ArXiv — Computation & Language (NLP)", url: "https://rss.arxiv.org/rss/cs.CL", category: "Academic" },
                  { name: "ArXiv — Machine Learning", url: "https://rss.arxiv.org/rss/cs.LG", category: "Academic" },
                  { name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", category: "AI" },
                  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Tech" },
                  { name: "BBC News - Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", category: "News" },
                  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "Tech" },
                  { name: "Hacker News", url: "https://hnrss.org/frontpage", category: "Tech" },
                  { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", category: "Tech" },
                  { name: "Reuters - Business", url: "https://www.reutersagency.com/feed/", category: "Business" },
                ].map((suggestion) => (
                  <button
                    key={suggestion.url}
                    onClick={() => {
                      setShowAddForm(true);
                      setAddUrl(suggestion.url);
                      setAddName(suggestion.name);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-cyan-500/50 transition-colors text-left group"
                  >
                    <Rss className="w-4 h-4 text-orange-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                        {suggestion.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{suggestion.url}</p>
                    </div>
                    <Plus className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className={`bg-gray-900 border rounded-xl p-5 transition-colors ${
                  source.isActive === 1 ? "border-gray-800" : "border-gray-800/50 opacity-60"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      source.type === "rss"
                        ? "bg-orange-500/10"
                        : source.type === "newsletter"
                        ? "bg-purple-500/10"
                        : "bg-gray-800"
                    }`}
                  >
                    {source.type === "rss" ? (
                      <Rss className="w-6 h-6 text-orange-400" />
                    ) : source.type === "newsletter" ? (
                      <Newspaper className="w-6 h-6 text-purple-400" />
                    ) : (
                      <Globe className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white truncate">
                        {source.feedTitle || source.name}
                      </h3>
                      {/* Status badge */}
                      {source.lastFetchStatus === "success" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      )}
                      {source.lastFetchStatus === "error" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">
                          <AlertCircle className="w-3 h-3" />
                          Error
                        </span>
                      )}
                      {source.lastFetchStatus === "pending" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-400">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </div>

                    {source.feedDescription && (
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                        {source.feedDescription}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
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
                      {source.lastScannedAt && (
                        <span>
                          Last scanned{" "}
                          {new Date(source.lastScannedAt).toLocaleDateString()}
                        </span>
                      )}
                      <span className="capitalize">{source.type}</span>
                    </div>

                    {source.lastFetchStatus === "error" && source.errorMessage && (
                      <p className="text-xs text-red-400/70 mt-2 bg-red-500/5 rounded px-2 py-1">
                        {source.errorMessage.slice(0, 200)}
                      </p>
                    )}

                    {/* Topics */}
                    {source.topics && (source.topics as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(source.topics as string[]).map((topic) => (
                          <span
                            key={topic}
                            className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-400"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle */}
                    <button
                      onClick={() =>
                        handleToggleSource(source.id, source.isActive !== 1)
                      }
                      className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                      title={source.isActive === 1 ? "Pause source" : "Activate source"}
                    >
                      {source.isActive === 1 ? (
                        <ToggleRight className="w-5 h-5 text-cyan-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-500" />
                      )}
                    </button>

                    {/* Delete */}
                    {deleteConfirmId === source.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRemoveSource(source.id)}
                          className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(source.id)}
                        className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-red-400 transition-colors"
                        title="Remove source"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add more button at bottom */}
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 p-4 border border-dashed border-gray-700 rounded-xl text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add another source
            </button>
          </div>
        )}
      </div>
  );

  if (embedded) {
    return (
      <div className="h-full bg-gray-950 text-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Sources</h2>
              <p className="text-sm text-gray-400">
                {profile?.name ? `${profile.name}'s` : "Your"} research feeds
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Source
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/app/studio/${workerId}/feed`)}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-white">Sources</h1>
                <p className="text-sm text-gray-400">
                  {profile?.name ? `${profile.name}'s` : "Your"} research feeds
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Source
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {content}
      </div>
    </div>
  );
}
