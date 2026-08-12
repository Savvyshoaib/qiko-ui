import { getResearchMock, isMockDataEnabled } from "@/data/services";
import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import GlobalLayout from "@/components/GlobalLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowLeft,
  Notebook,
  Plus,
  Trash2,
  FileText,
  ExternalLink,
  Search,
  Tag,
  ChevronDown,
  ChevronRight,
  Edit3,
  Check,
  X,
  Pencil,
} from "lucide-react";

/** tRPC bypass — replace with API when backend is wired. */
type NotebookInsight = {
  id: number;
  text: string;
  note?: string;
  articleTitle?: string;
  sourceUrl?: string;
  groupLabel?: string;
  createdAt: string;
};

const researchNotebook = isMockDataEnabled()
  ? (getResearchMock().notebook as {
      workerName?: string;
      insights: NotebookInsight[];
    })
  : { workerName: "Researcher", insights: [] as NotebookInsight[] };
const MOCK_INSIGHTS: NotebookInsight[] = researchNotebook.insights ?? [];
const MOCK_WORKER = { name: researchNotebook.workerName || "Alex Researcher" };

export default function ResearchNotebook() {
  const { workerId: wIdStr } = useParams<{ workerId: string }>();
  const workerId = Number(wIdStr);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteTopic, setNewNoteTopic] = useState("");
  const [editingNote, setEditingNote] = useState<{ id: number; text: string } | null>(null);
  const [renamingGroup, setRenamingGroup] = useState<{ label: string; newLabel: string } | null>(null);
  const [editingTopic, setEditingTopic] = useState<{ id: number; current: string } | null>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const [insights, setInsights] = useState<NotebookInsight[]>(MOCK_INSIGHTS);
  const worker = { name: (user?.name as string | undefined) || MOCK_WORKER.name };

  const [savePending, setSavePending] = useState(false);

  const saveInsightMut = {
    isPending: savePending,
    mutate: (payload: { workerId: number; text: string; groupLabel?: string }) => {
      setSavePending(true);
      window.setTimeout(() => {
        setInsights((prev) => {
          const nextId = prev.length ? Math.max(...prev.map((i) => i.id)) + 1 : 1;
          return [
            ...prev,
            {
              id: nextId,
              text: payload.text,
              groupLabel: payload.groupLabel,
              createdAt: new Date().toISOString(),
            },
          ];
        });
        setNewNoteText("");
        setNewNoteTopic("");
        setShowAddForm(false);
        toast.success("Note added");
        setSavePending(false);
      }, 200);
    },
  };

  const removeInsightMut = {
    mutate: (payload: { id: number }) => {
      setInsights((prev) => prev.filter((i) => i.id !== payload.id));
      toast.success("Note removed");
    },
  };

  const applyInsightPatch = (payload: { id: number; text?: string; groupLabel?: string | null }) => {
    setInsights((prev) =>
      prev.map((i) => {
        if (i.id !== payload.id) return i;
        return {
          ...i,
          ...(payload.text !== undefined ? { text: payload.text } : {}),
          ...(payload.groupLabel !== undefined
            ? { groupLabel: payload.groupLabel || undefined }
            : {}),
        };
      })
    );
  };

  const updateInsightMut = {
    mutate: (payload: { id: number; text?: string; groupLabel?: string | null }) => {
      applyInsightPatch(payload);
      setEditingNote(null);
      setEditingTopic(null);
    },
    mutateAsync: async (payload: { id: number; text?: string; groupLabel?: string | null }) => {
      applyInsightPatch(payload);
    },
  };

  // Focus edit textarea when editing
  useEffect(() => {
    if (editingNote && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [editingNote]);

  // Derived data
  const existingGroups = useMemo(() => {
    if (!insights) return [];
    const labels = new Set<string>();
    insights.forEach((i: any) => { if (i.groupLabel) labels.add(i.groupLabel); });
    return Array.from(labels).sort();
  }, [insights]);

  const filteredInsights = useMemo(() => {
    if (!insights) return [];
    let filtered = insights;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((i: any) =>
        i.text.toLowerCase().includes(q) ||
        (i.note && i.note.toLowerCase().includes(q)) ||
        (i.articleTitle && i.articleTitle.toLowerCase().includes(q)) ||
        (i.groupLabel && i.groupLabel.toLowerCase().includes(q))
      );
    }
    if (activeGroup !== null) {
      if (activeGroup === "__ungrouped") {
        filtered = filtered.filter((i: any) => !i.groupLabel);
      } else {
        filtered = filtered.filter((i: any) => i.groupLabel === activeGroup);
      }
    }
    return filtered;
  }, [insights, searchQuery, activeGroup]);

  const groupedInsights = useMemo(() => {
    const groups = new Map<string, any[]>();
    const ungrouped: any[] = [];
    filteredInsights.forEach((insight: any) => {
      if (insight.groupLabel) {
        if (!groups.has(insight.groupLabel)) groups.set(insight.groupLabel, []);
        groups.get(insight.groupLabel)!.push(insight);
      } else {
        ungrouped.push(insight);
      }
    });
    const result: { label: string | null; items: any[] }[] = [];
    Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([label, items]) => result.push({ label, items }));
    if (ungrouped.length > 0) result.push({ label: null, items: ungrouped });
    return result;
  }, [filteredInsights]);

  const totalCount = insights?.length || 0;
  const ungroupedCount = insights?.filter((i: any) => !i.groupLabel).length || 0;

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    saveInsightMut.mutate({
      workerId,
      text: newNoteText.trim(),
      groupLabel: newNoteTopic.trim() || undefined,
    });
  };

  const handleSaveEdit = (id: number, newText: string) => {
    if (!newText.trim()) return;
    updateInsightMut.mutate({ id, text: newText.trim() });
    toast.success("Note saved");
  };

  const handleRenameGroup = (oldLabel: string, newLabel: string) => {
    if (!newLabel.trim() || newLabel === oldLabel) {
      setRenamingGroup(null);
      return;
    }
    const trimmed = newLabel.trim();
    setInsights((prev) =>
      prev.map((i) => (i.groupLabel === oldLabel ? { ...i, groupLabel: trimmed } : i))
    );
    setRenamingGroup(null);
    toast.success(`Renamed to "${trimmed}"`);
  };

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-[#060a14]">
        {/* Header */}
        <div className="border-b border-white/5 bg-[#0a0f1a]/80 backdrop-blur-xl sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/app/studio/${workerId}/feed`)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Back to feed"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                  <Notebook className="w-4.5 h-4.5 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white" style={{ fontFamily: "Satoshi, sans-serif" }}>
                    Notebook
                  </h1>
                  <p className="text-[11px] text-slate-500">
                    {worker?.name ? `${worker.name}'s notes` : "Notes"} · {totalCount} note{totalCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex-1" />
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Note
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex gap-6">
            {/* Sidebar */}
            <div className="w-48 shrink-0 hidden md:block">
              <div className="sticky top-24">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Topics</h3>
                <div className="space-y-0.5">
                  <button
                    onClick={() => setActiveGroup(null)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeGroup === null
                        ? "bg-amber-500/10 text-amber-400 font-semibold"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    All
                    <span className="ml-auto text-[11px] text-slate-600">{totalCount}</span>
                  </button>
                  {existingGroups.map((g) => {
                    const count = insights?.filter((i: any) => i.groupLabel === g).length || 0;
                    return (
                      <button
                        key={g}
                        onClick={() => setActiveGroup(activeGroup === g ? null : g)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          activeGroup === g
                            ? "bg-amber-500/10 text-amber-400 font-semibold"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 shrink-0" />
                        <span className="truncate">{g}</span>
                        <span className="ml-auto text-[11px] text-slate-600">{count}</span>
                      </button>
                    );
                  })}
                  {ungroupedCount > 0 && (
                    <button
                      onClick={() => setActiveGroup(activeGroup === "__ungrouped" ? null : "__ungrouped")}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeGroup === "__ungrouped"
                          ? "bg-amber-500/10 text-amber-400 font-semibold"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      Ungrouped
                      <span className="ml-auto text-[11px] text-slate-600">{ungroupedCount}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Search */}
              <div className="relative mb-5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-amber-500/30 transition-colors"
                />
              </div>

              {/* Inline add note form */}
              {showAddForm && (
                <div className="mb-5 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                  <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Write your note..."
                    className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 outline-none resize-none border border-white/10 rounded-lg p-3 focus:border-amber-500/30 transition-colors"
                    rows={3}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote();
                    }}
                  />
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                      {existingGroups.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setNewNoteTopic(newNoteTopic === g ? "" : g)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                            newNoteTopic === g
                              ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                              : "border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                      <input
                        type="text"
                        value={newNoteTopic}
                        onChange={(e) => setNewNoteTopic(e.target.value)}
                        placeholder="Topic..."
                        className="bg-transparent text-[11px] text-white placeholder:text-slate-600 outline-none w-20 border-b border-white/10 focus:border-amber-500/30 py-0.5 px-1 transition-colors"
                      />
                    </div>
                    <button
                      onClick={() => { setShowAddForm(false); setNewNoteText(""); setNewNoteTopic(""); }}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddNote}
                      disabled={!newNoteText.trim() || saveInsightMut.isPending}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {(!insights || insights.length === 0) && !showAddForm ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center mx-auto mb-5">
                    <Notebook className="w-8 h-8 text-amber-500/40" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "Satoshi, sans-serif" }}>
                    No notes yet
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed mb-5">
                    Save insights from articles in the feed, or add notes manually here.
                  </p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add your first note
                  </button>
                </div>
              ) : filteredInsights.length === 0 && (searchQuery || activeGroup) ? (
                <div className="py-16 text-center">
                  <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No notes match your search.</p>
                  <button
                    onClick={() => { setSearchQuery(""); setActiveGroup(null); }}
                    className="mt-3 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                /* Grouped notes */
                <div className="space-y-5">
                  {groupedInsights.map((group) => {
                    const groupKey = group.label || "__ungrouped";
                    const isCollapsed = collapsedGroups.has(groupKey);
                    return (
                      <div key={groupKey}>
                        {/* Group header */}
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => toggleGroupCollapse(groupKey)}
                            className="p-0.5 text-slate-500 hover:text-white transition-colors"
                          >
                            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          {renamingGroup?.label === group.label ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={renamingGroup.newLabel}
                                onChange={(e) => setRenamingGroup({ ...renamingGroup, newLabel: e.target.value })}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleRenameGroup(group.label!, renamingGroup.newLabel);
                                  if (e.key === "Escape") setRenamingGroup(null);
                                }}
                                className="bg-transparent text-sm font-semibold text-amber-400 outline-none border-b border-amber-500/30 py-0.5 px-1"
                              />
                              <button onClick={() => handleRenameGroup(group.label!, renamingGroup.newLabel)} className="p-0.5 text-green-400 hover:text-green-300">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setRenamingGroup(null)} className="p-0.5 text-slate-500 hover:text-slate-300">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className={`text-xs font-bold uppercase tracking-wider ${group.label ? "text-amber-400" : "text-slate-500"}`} style={{ fontFamily: "Satoshi, sans-serif" }}>
                                {group.label || "Ungrouped"}
                              </span>
                              {group.label && (
                                <button
                                  onClick={() => setRenamingGroup({ label: group.label!, newLabel: group.label! })}
                                  className="p-0.5 text-slate-600 hover:text-amber-400 transition-colors"
                                  title="Rename"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                          <span className="text-[10px] text-slate-600">{group.items.length}</span>
                          <div className="flex-1 border-t border-white/5" />
                        </div>

                        {/* Notes list */}
                        {!isCollapsed && (
                          <div className="space-y-1.5 ml-5">
                            {group.items.map((insight: any) => (
                              <div
                                key={insight.id}
                                className="group flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.02] transition-colors"
                              >
                                <div className="w-1 h-1 rounded-full bg-amber-500/40 mt-2 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  {editingNote !== null && editingNote.id === insight.id ? (
                                    /* Inline edit mode */
                                    <div>
                                      <textarea
                                        ref={editRef}
                                        value={editingNote.text}
                                        onChange={(e) =>
                                          setEditingNote({ id: editingNote.id, text: e.target.value })
                                        }
                                        className="w-full bg-white/[0.03] text-sm text-white outline-none resize-none border border-amber-500/30 rounded-lg p-2.5 focus:border-amber-500/50 transition-colors"
                                        rows={3}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                                            handleSaveEdit(insight.id, editingNote.text);
                                          if (e.key === "Escape") setEditingNote(null);
                                        }}
                                      />
                                      <div className="flex items-center gap-2 mt-2">
                                        <button
                                          onClick={() => handleSaveEdit(insight.id, editingNote.text)}
                                          disabled={!editingNote.text.trim()}
                                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                                        >
                                          <Check className="w-3 h-3" />
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingNote(null)}
                                          className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* Display mode */
                                    <>
                                      <p className="text-sm text-white/90 leading-relaxed">{insight.text}</p>
                                      {insight.note && (
                                        <p className="text-[11px] text-slate-500 mt-1 italic">{insight.note}</p>
                                      )}
                                      <div className="flex items-center gap-3 mt-2">
                                        {insight.articleTitle && (
                                          <div className="flex items-center gap-1 text-[10px] text-slate-600">
                                            <FileText className="w-2.5 h-2.5" />
                                            <span className="truncate max-w-[180px]">{insight.articleTitle}</span>
                                            {insight.sourceUrl && (
                                              <a href={insight.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                                                <ExternalLink className="w-2.5 h-2.5" />
                                              </a>
                                            )}
                                          </div>
                                        )}
                                        {/* Topic reassign */}
                                        {editingTopic !== null && editingTopic.id === insight.id ? (
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="text"
                                              defaultValue={editingTopic.current ?? ""}
                                              autoFocus
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  updateInsightMut.mutate({ id: insight.id, groupLabel: (e.target as HTMLInputElement).value.trim() || null });
                                                  setEditingTopic(null);
                                                }
                                                if (e.key === "Escape") setEditingTopic(null);
                                              }}
                                              onBlur={(e) => {
                                                updateInsightMut.mutate({ id: insight.id, groupLabel: e.target.value.trim() || null });
                                                setEditingTopic(null);
                                              }}
                                              className="bg-transparent text-[10px] text-amber-400 border-b border-amber-500/30 outline-none w-20 py-0.5"
                                              placeholder="Topic..."
                                            />
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => setEditingTopic({ id: insight.id, current: insight.groupLabel || "" })}
                                            className="text-[10px] text-slate-600 hover:text-amber-400 transition-colors"
                                          >
                                            {insight.groupLabel ? `✎ Move` : "+ Topic"}
                                          </button>
                                        )}
                                        <span className="text-[10px] text-slate-700">
                                          {new Date(insight.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </div>
                                {/* Action buttons — visible on hover */}
                                {editingNote?.id !== insight.id && (
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button
                                      onClick={() => setEditingNote({ id: insight.id, text: insight.text })}
                                      className="p-1.5 rounded-lg text-slate-600 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                                      title="Edit note"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => removeInsightMut.mutate({ id: insight.id })}
                                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                      title="Delete note"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
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
        </div>
      </div>
    </GlobalLayout>
  );
}
