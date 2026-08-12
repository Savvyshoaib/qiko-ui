import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Gavel,
  History,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getIdgSalesDecisionHistory,
  type IdgSalesDecisionHistoryEntry,
  type IdgSalesDecisionHistoryReviewer,
} from "@/lib/idgSalesApi";
import { SalesIntelEmptyState } from "./SalesIntelEmptyState";
import { formatDateTime } from "./salesIntelUtils";
import {
  SALES_INTEL_INFO_STRIP,
  SALES_INTEL_PANEL_SOFT,
  SALES_INTEL_SECTION_TITLE,
} from "./salesIntelUi";

const sk = "bg-muted/30 border border-white/[0.06]";

function DecisionHistoryTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      className={`animate-in fade-in duration-200 overflow-hidden ${SALES_INTEL_PANEL_SOFT}`}
      aria-busy="true"
      aria-label="Loading decision history"
    >
      <div className="hidden md:block">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <div className="flex gap-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className={`h-3 w-16 ${sk}`} />
            ))}
          </div>
        </div>
        <ul>
          {Array.from({ length: rows }).map((_, index) => (
            <li
              key={index}
              className="flex items-center gap-6 border-b border-white/[0.03] px-4 py-3.5"
            >
              <Skeleton className={`h-3.5 w-20 ${sk}`} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className={`h-3.5 w-48 max-w-full ${sk}`} />
                <Skeleton className={`h-3 w-24 ${sk}`} />
              </div>
              <div className="space-y-1.5">
                <Skeleton className={`h-3.5 w-28 ${sk}`} />
                <Skeleton className={`h-3 w-36 ${sk}`} />
              </div>
              <Skeleton className={`h-3.5 w-28 ${sk}`} />
              <Skeleton className={`h-3.5 w-40 flex-1 ${sk}`} />
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2 p-3 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <div className="flex justify-between gap-2">
              <Skeleton className={`h-3.5 w-20 ${sk}`} />
              <Skeleton className={`h-3 w-24 ${sk}`} />
            </div>
            <Skeleton className={`h-3.5 w-44 max-w-full ${sk}`} />
            <Skeleton className={`h-3 w-32 ${sk}`} />
            <Skeleton className={`h-3 w-full ${sk}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

type DecisionFilter = "all" | "approved" | "rejected" | "needs_review";

const DECISION_FILTERS: { id: DecisionFilter; label: string }[] = [
  { id: "all", label: "All decisions" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "needs_review", label: "Override" },
];

function DecisionBadge({ decision }: { decision?: string | null }) {
  if (decision === "approved") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Approved
      </span>
    );
  }
  if (decision === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-red-400">
        <XCircle className="h-3.5 w-3.5" />
        Rejected
      </span>
    );
  }
  if (decision === "needs_review") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
        <RotateCcw className="h-3.5 w-3.5" />
        Override
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
      <History className="h-3.5 w-3.5" />
      —
    </span>
  );
}

export default function DecisionHistoryView({ agentId }: { agentId: string }) {
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all");
  const [reviewerUserId, setReviewerUserId] = useState<string>("");
  const [items, setItems] = useState<IdgSalesDecisionHistoryEntry[]>([]);
  const [reviewers, setReviewers] = useState<IdgSalesDecisionHistoryReviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    const trimmed = agentId.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      const response = await getIdgSalesDecisionHistory(trimmed, {
        ...(decisionFilter !== "all" ? { decision: decisionFilter } : {}),
        ...(reviewerUserId !== "" ? { reviewer_user_id: Number(reviewerUserId) } : {}),
        limit: 200,
      });
      setItems(Array.isArray(response.decisionHistory) ? response.decisionHistory : []);
      setReviewers(Array.isArray(response.reviewers) ? response.reviewers : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load decision history.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [agentId, decisionFilter, reviewerUserId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const summary = useMemo(() => {
    let approved = 0;
    let rejected = 0;
    let overrides = 0;
    for (const item of items) {
      if (item.decision === "approved") approved += 1;
      else if (item.decision === "rejected") rejected += 1;
      else if (item.decision === "needs_review") overrides += 1;
    }
    return { approved, rejected, overrides, total: items.length };
  }, [items]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className={SALES_INTEL_INFO_STRIP}>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"
          aria-hidden="true"
        />
        <div className="relative flex gap-3 sm:gap-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
            <Gavel className="size-4 text-indigo-300" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2
                className="text-[13px] font-semibold tracking-tight text-white sm:text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Decision History
              </h2>
              <button
                type="button"
                onClick={() => void loadHistory()}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.04]"
              >
                Refresh
              </button>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
              Record every approval, rejection and override action for audit purposes.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {DECISION_FILTERS.map((item) => {
            const active = decisionFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setDecisionFilter(item.id)}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  active
                    ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/30"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <select
            value={reviewerUserId}
            onChange={(event) => setReviewerUserId(event.target.value)}
            className="ml-0 rounded-lg border border-white/10 bg-[#0a0f1a] px-2.5 py-1.5 text-[11px] text-slate-200 outline-none focus:border-indigo-500/40 sm:ml-2"
          >
            <option value="">All reviewers</option>
            {reviewers.map((reviewer) => (
              <option key={reviewer.id} value={String(reviewer.id)}>
                {reviewer.userName || reviewer.email || `User #${reviewer.id}`}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-slate-500">
          {summary.approved} approved · {summary.rejected} rejected · {summary.overrides} override
          {summary.overrides === 1 ? "" : "s"} · {summary.total} shown
        </p>
      </div>

      {loading ? (
        <DecisionHistoryTableSkeleton />
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-8 text-center">
          <p className="text-[13px] font-semibold text-red-200">Failed to load decision history</p>
          <p className="mt-2 text-[12px] text-red-300/80">{error}</p>
          <button
            type="button"
            onClick={() => void loadHistory()}
            className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-indigo-400"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <SalesIntelEmptyState
          icon={Gavel}
          title="No decisions recorded yet"
          description="Approve, reject, or restore opportunities for review to populate this audit trail."
        />
      ) : (
        <>
          <div className={`hidden overflow-x-auto md:block ${SALES_INTEL_PANEL_SOFT}`}>
            <table className="w-full min-w-[920px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Decision
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Opportunity
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Reviewer
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    When
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((entry) => (
                  <tr key={entry.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <DecisionBadge decision={entry.decision} />
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <p className="truncate text-[12px] text-white">
                        {entry.opportunityTitle ||
                          (entry.opportunityId != null
                            ? `Opportunity #${entry.opportunityId}`
                            : "—")}
                      </p>
                      {entry.opportunityStage ? (
                        <p className="mt-0.5 text-[10px] text-slate-500">{entry.opportunityStage}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] text-slate-200">
                        {entry.reviewer?.userName ||
                          entry.reviewer?.email ||
                          (entry.reviewerUserId != null
                            ? `User #${entry.reviewerUserId}`
                            : "System")}
                      </p>
                      {entry.reviewer?.email && entry.reviewer?.userName ? (
                        <p className="text-[10px] text-slate-500">{entry.reviewer.email}</p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[11px] text-slate-500">
                      {entry.createdAt ? formatDateTime(entry.createdAt) : "—"}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate text-[10px] text-slate-400" title={entry.detail ?? ""}>
                        {entry.detail || "—"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`space-y-3 p-3 md:hidden ${SALES_INTEL_PANEL_SOFT}`}>
            {items.map((entry) => (
              <article key={entry.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <DecisionBadge decision={entry.decision} />
                  <time className="text-[10px] text-slate-500">
                    {entry.createdAt ? formatDateTime(entry.createdAt) : "—"}
                  </time>
                </div>
                <p className="text-[12px] font-semibold text-white">
                  {entry.opportunityTitle ||
                    (entry.opportunityId != null ? `Opportunity #${entry.opportunityId}` : "—")}
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  {entry.reviewer?.userName ||
                    entry.reviewer?.email ||
                    (entry.reviewerUserId != null ? `User #${entry.reviewerUserId}` : "System")}
                </p>
                {entry.detail ? (
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-400">{entry.detail}</p>
                ) : null}
              </article>
            ))}
          </div>

          <p className={`${SALES_INTEL_SECTION_TITLE} px-0.5`}>
            Newest first · JWT decision-history API
          </p>
        </>
      )}
    </div>
  );
}
