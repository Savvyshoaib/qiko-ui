import { useMemo, useState } from "react";
import { ChevronRight, GitBranch, Loader2, Plus, Search } from "lucide-react";
import OpportunityCreateView from "./OpportunityCreateView";
import OpportunityDetailView from "./OpportunityDetailView";
import OpportunityPipelineView from "./OpportunityPipelineView";
import { OpportunitySourceDeadlineFilters } from "./OpportunitySourceDeadlineFilters";
import { SalesIntelEmptyState } from "./SalesIntelEmptyState";
import {
  buildReviewerFilterOptions,
  buildSourceFilterOptions,
  filterOpportunities,
  type DeadlineFilterId,
  type OpportunityFilterState,
} from "./opportunityFilters";
import { formatCurrency, formatDate, SourceBadge, StageBadge } from "./salesIntelUtils";
import { SALES_INTEL_PANEL_SOFT } from "./salesIntelUi";
import { useSalesIntelData } from "./useSalesIntelData";

type ListStageFilter = "all" | "rejected" | "push_failed";

export default function OpportunityListView({
  agentId,
  filters,
  onSelectOpportunity,
  onGoToIngestion,
}: {
  agentId: string;
  filters: OpportunityFilterState;
  onSelectOpportunity: (id: string) => void;
  onGoToIngestion?: () => void;
}) {
  const { opportunities, loading, initialized } = useSalesIntelData(agentId);
  const [stageFilter, setStageFilter] = useState<ListStageFilter>("all");

  const baseFiltered = useMemo(
    () => filterOpportunities(opportunities, filters),
    [filters, opportunities]
  );

  const rejectedCount = baseFiltered.filter((item) => item.stage === "rejected").length;
  const pushFailedCount = baseFiltered.filter((item) => item.stage === "push_failed").length;

  const filtered = baseFiltered.filter((item) => {
    if (stageFilter === "rejected" && item.stage !== "rejected") return false;
    if (stageFilter === "push_failed" && item.stage !== "push_failed") return false;
    return true;
  });

  if (!initialized && loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <SalesIntelEmptyState
        icon={GitBranch}
        title="Pipeline is empty"
        description="Opportunities from portal scans will appear here once ingested and qualified."
        steps={[
          "Run a scan from the Ingestion tab",
          "Review and qualify new tenders",
          "Track stage progress in pipeline or list view",
        ]}
        primaryAction={
          onGoToIngestion ? { label: "Go to Ingestion", onClick: onGoToIngestion } : undefined
        }
      />
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter list by stage">
        {(
          [
            { id: "all" as const, label: "All", count: baseFiltered.length },
            { id: "rejected" as const, label: "Rejected", count: rejectedCount },
            { id: "push_failed" as const, label: "Push failed", count: pushFailedCount },
          ] as const
        ).map((tab) => {
          const active = stageFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStageFilter(tab.id)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                active
                  ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/30"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[10px] opacity-70">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className={`px-4 py-12 text-center ${SALES_INTEL_PANEL_SOFT}`}>
          <p className="text-[12px] font-semibold text-slate-300">No matches</p>
          <p className="mt-1 text-[11px] text-slate-500">Try another filter or clear the search.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {filtered.map((opp) => (
              <button
                key={opp.id}
                type="button"
                onClick={() => onSelectOpportunity(opp.id)}
                className={`w-full p-4 text-left transition-colors hover:bg-white/[0.02] ${SALES_INTEL_PANEL_SOFT}`}
              >
                <div className="mb-1.5">
                  <SourceBadge sourceKey={opp.sourceKey} sourceName={opp.source} />
                </div>
                <p className="line-clamp-2 text-[12px] font-medium text-white">{opp.title}</p>
                <p className="mt-1 truncate text-[10px] text-slate-500">{opp.buyer}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StageBadge stage={opp.stage} />
                  <span className="text-[10px] text-emerald-400/80">
                    {formatCurrency(opp.estimatedValue, opp.currency)}
                  </span>
                  {opp.deadlineAt ? (
                    <span className="text-[10px] text-slate-500">{formatDate(opp.deadlineAt)}</span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>

          <div className={`hidden overflow-x-auto md:block ${SALES_INTEL_PANEL_SOFT}`}>
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Opportunity
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Buyer
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Deadline
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Stage
                  </th>
                  <th className="w-8 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((opp) => (
                  <tr
                    key={opp.id}
                    onClick={() => onSelectOpportunity(opp.id)}
                    className="cursor-pointer border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate text-[12px] font-medium text-white">{opp.title}</p>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400">{opp.buyer}</td>
                    <td className="px-4 py-3">
                      <SourceBadge sourceKey={opp.sourceKey} sourceName={opp.source} />
                    </td>
                    <td className="px-4 py-3 text-[11px] text-emerald-400/80">
                      {formatCurrency(opp.estimatedValue, opp.currency)}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {formatDate(opp.deadlineAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StageBadge stage={opp.stage} />
                    </td>
                    <td className="px-2 py-3 text-slate-600">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

export function SalesIntelPipelineWorkspace({
  agentId,
  onGoToIngestion,
}: {
  agentId: string;
  onGoToIngestion?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceKey, setSourceKey] = useState<string | null>(null);
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilterId | null>(null);
  const [reviewerId, setReviewerId] = useState<string | null>(null);
  const { opportunities, selectOpportunity, refresh } = useSalesIntelData(agentId);

  const sourceOptions = useMemo(() => buildSourceFilterOptions(opportunities), [opportunities]);
  const reviewerOptions = useMemo(
    () => buildReviewerFilterOptions(opportunities),
    [opportunities]
  );

  // Drop selections that no longer exist in the loaded dataset.
  const effectiveSourceKey =
    sourceKey && sourceOptions.some((option) => option.key === sourceKey) ? sourceKey : null;
  const effectiveReviewerId =
    reviewerId && reviewerOptions.some((option) => option.id === reviewerId)
      ? reviewerId
      : null;

  const effectiveFilters: OpportunityFilterState = useMemo(
    () => ({
      searchQuery,
      sourceKey: effectiveSourceKey,
      deadlineFilter,
      reviewerId: effectiveReviewerId,
    }),
    [deadlineFilter, effectiveReviewerId, effectiveSourceKey, searchQuery]
  );

  const handleSelect = (id: string) => {
    setIsCreating(false);
    setSelectedId(id);
    void selectOpportunity(id);
  };

  if (isCreating) {
    return (
      <OpportunityCreateView
        agentId={agentId}
        onBack={() => setIsCreating(false)}
        onCreated={async () => {
          setSelectedId(null);
          await refresh({ silent: true }).catch(() => undefined);
        }}
      />
    );
  }

  if (selectedId) {
    return (
      <OpportunityDetailView
        agentId={agentId}
        opportunityId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5">
        <div className="flex shrink-0 items-center gap-1">
          {(["pipeline", "list"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold capitalize transition-colors ${
                view === mode
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-500 hover:text-slate-300 border border-transparent"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <label className="relative block w-[140px] shrink min-w-[110px] max-w-[160px] flex-1 basis-[140px]">
          <span className="sr-only">Search opportunities</span>
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] py-1.5 pl-7 pr-2 text-[11px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/40"
          />
        </label>
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <OpportunitySourceDeadlineFilters
            sourceOptions={sourceOptions}
            reviewerOptions={reviewerOptions}
            sourceKey={effectiveSourceKey}
            deadlineFilter={deadlineFilter}
            reviewerId={effectiveReviewerId}
            onSourceKeyChange={setSourceKey}
            onDeadlineFilterChange={setDeadlineFilter}
            onReviewerIdChange={setReviewerId}
          />
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-500 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-400"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Create Opportunity</span>
          <span className="sm:hidden">Create</span>
        </button>
      </div>

      {view === "pipeline" ? (
        <OpportunityPipelineView
          agentId={agentId}
          filters={effectiveFilters}
          onSelectOpportunity={handleSelect}
        />
      ) : (
        <OpportunityListView
          agentId={agentId}
          filters={effectiveFilters}
          onSelectOpportunity={handleSelect}
          onGoToIngestion={onGoToIngestion}
        />
      )}
    </div>
  );
}
