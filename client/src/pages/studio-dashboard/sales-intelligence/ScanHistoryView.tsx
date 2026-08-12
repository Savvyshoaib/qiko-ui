import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  History,
  Radar,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getIdgSalesScanHistory,
  type IdgSalesScanHistoryEntry,
} from "@/lib/idgSalesApi";
import { SalesIntelEmptyState } from "./SalesIntelEmptyState";
import { formatDate, SourceBadge } from "./salesIntelUtils";
import {
  SALES_INTEL_INFO_STRIP,
  SALES_INTEL_PANEL_SOFT,
  SALES_INTEL_SECTION_TITLE,
} from "./salesIntelUi";

const sk = "bg-muted/30 border border-white/[0.06]";

function ScanHistoryTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      className={`animate-in fade-in duration-200 overflow-hidden ${SALES_INTEL_PANEL_SOFT}`}
      aria-busy="true"
      aria-label="Loading scan history"
    >
      <div className="hidden md:block">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <div className="flex gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
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
              <Skeleton className={`h-3.5 w-16 ${sk}`} />
              <Skeleton className={`h-4 w-14 rounded ${sk}`} />
              <Skeleton className={`h-3.5 w-24 ${sk}`} />
              <Skeleton className={`h-3.5 w-36 ${sk}`} />
              <Skeleton className={`h-3.5 w-20 ${sk}`} />
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
              <Skeleton className={`h-3.5 w-16 ${sk}`} />
              <Skeleton className={`h-3 w-20 ${sk}`} />
            </div>
            <Skeleton className={`h-3.5 w-28 ${sk}`} />
            <Skeleton className={`h-3 w-40 ${sk}`} />
            <Skeleton className={`h-3 w-full ${sk}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

type SourceFilter = "all" | "ungm" | "ted";
type StatusFilter = "all" | "success" | "failed";

const SOURCE_FILTERS: { id: SourceFilter; label: string }[] = [
  { id: "all", label: "All sources" },
  { id: "ungm", label: "UNGM" },
  { id: "ted", label: "TED" },
];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All status" },
  { id: "success", label: "Success" },
  { id: "failed", label: "Failed" },
];

function StatusBadge({ status }: { status?: string | null }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Success
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-red-400">
        <XCircle className="h-3.5 w-3.5" />
        Failed
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

function formatActionLabel(action?: string | null): string {
  if (!action) return "Scan";
  return action
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ScanHistoryView({ agentId }: { agentId: string }) {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [items, setItems] = useState<IdgSalesScanHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    const trimmed = agentId.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      const response = await getIdgSalesScanHistory(trimmed, {
        ...(sourceFilter !== "all" ? { source_key: sourceFilter } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        limit: 100,
      });
      setItems(Array.isArray(response.scanHistory) ? response.scanHistory : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load scan history.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [agentId, sourceFilter, statusFilter]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const summary = useMemo(() => {
    const success = items.filter((item) => item.status === "success").length;
    const failed = items.filter((item) => item.status === "failed").length;
    const found = items.reduce((sum, item) => sum + (item.opportunitiesFound ?? 0), 0);
    return { success, failed, found };
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
            <Radar className="size-4 text-indigo-300" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2
                className="text-[13px] font-semibold tracking-tight text-white sm:text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                History Scan
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
              View historical scan activity, status, and execution logs for UNGM and TED sources.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {SOURCE_FILTERS.map((item) => {
            const active = sourceFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSourceFilter(item.id)}
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
          <span className="mx-1 hidden h-6 w-px bg-white/[0.08] sm:inline-block" />
          {STATUS_FILTERS.map((item) => {
            const active = statusFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatusFilter(item.id)}
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
        </div>
        <p className="text-[11px] text-slate-500">
          {summary.success} ok · {summary.failed} failed · {summary.found} opportunities found
        </p>
      </div>

      {loading ? (
        <ScanHistoryTableSkeleton />
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-8 text-center">
          <p className="text-[13px] font-semibold text-red-200">Failed to load scan history</p>
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
          icon={Radar}
          title="No scan history yet"
          description="Run UNGM or TED scans from Ingestion to populate this history."
        />
      ) : (
        <>
          <div className={`hidden overflow-x-auto md:block ${SALES_INTEL_PANEL_SOFT}`}>
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Results
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
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <SourceBadge sourceKey={item.sourceKey} />
                    </td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-200">
                      {formatActionLabel(item.action)}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400">
                      {item.status === "failed"
                        ? "—"
                        : `${item.created ?? 0} new · ${item.updated ?? 0} updated · ${item.skipped ?? 0} skipped`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[11px] text-slate-500">
                      {formatDate(item.createdAt ?? undefined)}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p
                        className={`truncate text-[10px] ${
                          item.status === "failed" ? "text-red-300/80" : "text-slate-400"
                        }`}
                        title={item.detail ?? undefined}
                      >
                        {item.detail || "—"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`space-y-2 md:hidden ${SALES_INTEL_PANEL_SOFT} p-3`}>
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <StatusBadge status={item.status} />
                  <span className="text-[10px] text-slate-500">
                    {formatDate(item.createdAt ?? undefined)}
                  </span>
                </div>
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <SourceBadge sourceKey={item.sourceKey} />
                  <span className="text-[11px] font-medium text-slate-200">
                    {formatActionLabel(item.action)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {item.status === "failed"
                    ? "Scan failed"
                    : `${item.created ?? 0} new · ${item.updated ?? 0} updated · ${item.skipped ?? 0} skipped`}
                </p>
                {item.detail ? (
                  <p
                    className={`mt-2 text-[10px] leading-relaxed ${
                      item.status === "failed" ? "text-red-300/80" : "text-slate-400"
                    }`}
                  >
                    {item.detail}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <p className={`${SALES_INTEL_SECTION_TITLE} px-0.5`}>
            Newest first · from scan-history API
          </p>
        </>
      )}
    </div>
  );
}
