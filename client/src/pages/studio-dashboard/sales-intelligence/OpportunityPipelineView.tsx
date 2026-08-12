import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Loader2,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import type { Opportunity, OpportunityStage } from "./salesIntelTypes";
import { OPPORTUNITY_STAGE_LABELS, PIPELINE_KANBAN_STAGES } from "./salesIntelTypes";
import {
  filterOpportunities,
  type OpportunityFilterState,
} from "./opportunityFilters";
import { formatCurrency, SourceBadge, StageBadge } from "./salesIntelUtils";
import {
  SALES_INTEL_PANEL_SOFT,
  SALES_INTEL_PIPELINE_CARD_HEIGHT,
  SALES_INTEL_PIPELINE_COLUMN_BODY,
  SALES_INTEL_SECTION_TITLE,
} from "./salesIntelUi";
import { useSalesIntelData } from "./useSalesIntelData";
import {
  chainVerticalWheelToScroller,
  handlePipelineBoardWheel,
  handlePipelineCardWheel,
  handlePipelineColumnWheel,
} from "./pipelineScrollUtils";

const REJECTED_PAGE_SIZE = 6;

type RejectedFilter = "all" | "rejected" | "push_failed";

interface OpportunityPipelineViewProps {
  agentId: string;
  filters: OpportunityFilterState;
  onSelectOpportunity: (id: string) => void;
}

export default function OpportunityPipelineView({
  agentId,
  filters,
  onSelectOpportunity,
}: OpportunityPipelineViewProps) {
  const { opportunities, loading, initialized, restoreReview, processingId } = useSalesIntelData(agentId);
  const [dragOverStage, setDragOverStage] = useState<OpportunityStage | null>(null);

  const visible = useMemo(
    () => filterOpportunities(opportunities, filters),
    [filters, opportunities]
  );

  const byStage = (stage: OpportunityStage) =>
    visible.filter(
      (item) =>
        item.stage === stage ||
        (stage === "ingested" && item.stage === "awaiting_review") ||
        (stage === "qualified" && item.stage === "push_pending")
    );

  const rejected = visible.filter((item) => item.stage === "rejected" || item.stage === "push_failed");

  if (!initialized && loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2"
        onWheel={handlePipelineBoardWheel}
      >
        {PIPELINE_KANBAN_STAGES.map((stage) => {
          const items = byStage(stage);
          const isDragOver = dragOverStage === stage;

          return (
            <div key={stage} className="flex w-[min(100%,260px)] min-w-[220px] flex-1 shrink-0 snap-start flex-col sm:min-w-[240px]">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[11px] font-semibold text-slate-300">{OPPORTUNITY_STAGE_LABELS[stage]}</p>
                <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                  {items.length}
                </span>
              </div>
              <div
                data-pipeline-column
                className={`rounded-xl border p-2 transition-all duration-150 ${SALES_INTEL_PIPELINE_COLUMN_BODY} ${
                  isDragOver
                    ? "border-indigo-500/50 bg-indigo-500/[0.08] shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]"
                    : "border-white/[0.06] bg-white/[0.01]"
                }`}
                onWheel={handlePipelineColumnWheel}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverStage((current) => (current === stage ? null : current));
                  }
                }}
              >
                {items.length === 0 ? (
                  <div className="flex w-full min-h-[12rem] flex-1 items-center justify-center self-stretch rounded-lg border border-dashed border-white/[0.06] px-3 py-6 text-slate-600">
                    <p className="w-full text-center text-[10px] leading-none">No items</p>
                  </div>
                ) : (
                  items.map((opp) => (
                    <PipelineCard
                      key={opp.id}
                      opportunity={opp}
                      onClick={() => onSelectOpportunity(opp.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {rejected.length > 0 ? (
        <RejectedFailedPanel
          items={rejected}
          processingId={processingId}
          onSelectOpportunity={onSelectOpportunity}
          onRestore={(id) => void restoreReview(id)}
        />
      ) : null}
    </div>
  );
}

interface PipelineCardProps {
  opportunity: Opportunity;
  onClick: () => void;
}

function PipelineCard({ opportunity, onClick }: PipelineCardProps) {
  const valueLabel =
    opportunity.estimatedValue != null
      ? formatCurrency(opportunity.estimatedValue, opportunity.currency)
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      onWheel={handlePipelineCardWheel}
      className={`group flex w-full items-stretch gap-2 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-left transition-all hover:border-indigo-500/25 hover:bg-indigo-500/[0.05] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 ${SALES_INTEL_PIPELINE_CARD_HEIGHT}`}
    >
      <GripVertical
        className="h-3.5 w-3.5 shrink-0 self-center text-slate-700"
        aria-hidden="true"
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-2 overflow-hidden py-0">
        <p className="line-clamp-2 min-w-0 break-words text-[11px] font-medium leading-snug text-white">
          {opportunity.title}
        </p>
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
            <span className="flex shrink-0 items-center">
              <SourceBadge sourceKey={opportunity.sourceKey} sourceName={opportunity.source} />
            </span>
            <p className="min-w-0 truncate text-[10px] leading-none text-slate-500" title={opportunity.buyer}>
              {opportunity.buyer || "—"}
            </p>
          </div>
          {valueLabel ? (
            <p className="truncate text-[10px] font-semibold text-emerald-400/80">{valueLabel}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function RejectedFailedPanel({
  items,
  processingId,
  onSelectOpportunity,
  onRestore,
}: {
  items: Opportunity[];
  processingId?: string | null;
  onSelectOpportunity: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [filter, setFilter] = useState<RejectedFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const rejectedCount = items.filter((item) => item.stage === "rejected").length;
  const failedCount = items.filter((item) => item.stage === "push_failed").length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "rejected" && item.stage !== "rejected") return false;
      if (filter === "push_failed" && item.stage !== "push_failed") return false;
      if (!q) return true;
      return (
        (item.title ?? "").toLowerCase().includes(q) ||
        (item.buyer ?? "").toLowerCase().includes(q) ||
        (item.source ?? "").toLowerCase().includes(q)
      );
    });
  }, [filter, items, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / REJECTED_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(
    safePage * REJECTED_PAGE_SIZE,
    safePage * REJECTED_PAGE_SIZE + REJECTED_PAGE_SIZE
  );
  const rangeStart = filtered.length === 0 ? 0 : safePage * REJECTED_PAGE_SIZE + 1;
  const rangeEnd = Math.min(filtered.length, (safePage + 1) * REJECTED_PAGE_SIZE);

  const setFilterAndReset = (next: RejectedFilter) => {
    setFilter(next);
    setPage(0);
  };

  return (
    <section className={`overflow-hidden ${SALES_INTEL_PANEL_SOFT}`}>
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] sm:px-5"
        aria-expanded={expanded}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10">
          <XCircle className="size-3.5 text-red-300" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={SALES_INTEL_SECTION_TITLE}>Rejected / Failed</p>
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
              {items.length}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {rejectedCount} rejected · {failedCount} push failed — keep pipeline focus on active stages
          </p>
        </div>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded ? (
        <div className="border-t border-white/[0.06]">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter rejected and failed">
              {(
                [
                  { id: "all" as const, label: "All", count: items.length },
                  { id: "rejected" as const, label: "Rejected", count: rejectedCount },
                  { id: "push_failed" as const, label: "Push failed", count: failedCount },
                ] as const
              ).map((tab) => {
                const active = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilterAndReset(tab.id)}
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

            <label className="relative block w-full sm:max-w-[220px]">
              <span className="sr-only">Search rejected opportunities</span>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search title or buyer…"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] py-1.5 pl-8 pr-3 text-[11px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/40"
              />
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center sm:px-5">
              <p className="text-[12px] font-semibold text-slate-300">No matches</p>
              <p className="mt-1 text-[11px] text-slate-500">Try another filter or clear the search.</p>
            </div>
          ) : (
            <>
              <ul
                className="max-h-[min(22rem,50vh)] divide-y divide-white/[0.04] overflow-y-auto overscroll-y-auto border-t border-white/[0.04] [scrollbar-gutter:stable]"
                onWheel={(event) => chainVerticalWheelToScroller(event, event.currentTarget)}
              >
                {pageItems.map((opp) => (
                  <RejectedRow
                    key={opp.id}
                    opportunity={opp}
                    isRestoring={processingId === opp.id}
                    onClick={() => onSelectOpportunity(opp.id)}
                    onRestore={() => onRestore(opp.id)}
                  />
                ))}
              </ul>

              <div className="flex flex-col gap-2 border-t border-white/[0.06] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-[10px] text-slate-500">
                  Showing {rangeStart}–{rangeEnd} of {filtered.length}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-white/[0.08] px-2 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="size-3.5" />
                    Prev
                  </button>
                  <span className="min-w-[3.5rem] text-center text-[10px] tabular-nums text-slate-500">
                    {safePage + 1} / {pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= pageCount - 1}
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-white/[0.08] px-2 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}

interface RejectedRowProps {
  opportunity: Opportunity;
  isRestoring: boolean;
  onClick: () => void;
  onRestore: () => void;
}

function RejectedRow({ opportunity, isRestoring, onClick, onRestore }: RejectedRowProps) {
  const canRestore = opportunity.stage === "rejected";

  return (
    <li className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-white/[0.02] sm:gap-3 sm:px-5">
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-white">{opportunity.title}</p>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <SourceBadge sourceKey={opportunity.sourceKey} sourceName={opportunity.source} />
            <p className="truncate text-[10px] text-slate-500">{opportunity.buyer}</p>
          </div>
        </div>
        <StageBadge stage={opportunity.stage} />
      </button>

      {canRestore ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRestore();
          }}
          disabled={isRestoring}
          title="Restore for Review"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 text-[10px] font-semibold text-amber-200 hover:bg-amber-500/15 disabled:opacity-50"
        >
          {isRestoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
          <span className="hidden sm:inline">Restore</span>
        </button>
      ) : null}

      <button
        type="button"
        onClick={onClick}
        className="shrink-0 rounded-md p-1 text-slate-600 hover:bg-white/[0.04] hover:text-slate-400"
        aria-label="Open opportunity"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </li>
  );
}
