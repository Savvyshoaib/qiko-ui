import { useCallback, useEffect, useState } from "react";
import { Archive, ArchiveRestore, FileSearch, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getIdgSalesOpportunities,
  type IdgSalesOpportunity,
} from "@/lib/idgSalesApi";
import { SalesIntelEmptyState } from "./SalesIntelEmptyState";
import { formatCurrency, formatDate, SourceBadge } from "./salesIntelUtils";
import { SALES_INTEL_INFO_STRIP, SALES_INTEL_PANEL_SOFT } from "./salesIntelUi";
import { useSalesIntelData } from "./useSalesIntelData";

const sk = "bg-muted/30 border border-white/[0.06]";

function ArchiveListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className={`overflow-hidden ${SALES_INTEL_PANEL_SOFT}`}
      aria-busy="true"
      aria-label="Loading archived opportunities"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
        <div className="space-y-1.5">
          <Skeleton className={`h-4 w-32 ${sk}`} />
          <Skeleton className={`h-3 w-48 ${sk}`} />
        </div>
        <Skeleton className={`h-5 w-8 rounded-full ${sk}`} />
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {Array.from({ length: rows }).map((_, index) => (
          <li
            key={index}
            className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Skeleton className={`size-8 shrink-0 rounded-lg ${sk}`} />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <Skeleton className={`h-4 w-14 rounded ${sk}`} />
                  <Skeleton className={`h-4 w-16 rounded ${sk}`} />
                  <Skeleton className={`h-4 w-20 rounded ${sk}`} />
                </div>
                <Skeleton className={`h-3.5 w-full max-w-md ${sk}`} />
                <Skeleton className={`h-3 w-40 ${sk}`} />
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 sm:flex-col sm:items-end">
              <Skeleton className={`h-3 w-24 ${sk}`} />
              <Skeleton className={`h-8 w-36 rounded-lg ${sk}`} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatStageLabel(stage?: string | null): string {
  if (!stage) return "—";
  return stage
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function OpportunityArchiveView({ agentId }: { agentId: string }) {
  const { restoreOpportunity, processingId } = useSalesIntelData(agentId);
  const [items, setItems] = useState<IdgSalesOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadArchived = useCallback(async () => {
    const trimmed = agentId.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      const response = await getIdgSalesOpportunities(trimmed, {
        archived_only: true,
        limit: "*",
      });
      setItems(Array.isArray(response.opportunities) ? response.opportunities : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load archived opportunities.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void loadArchived();
  }, [loadArchived]);

  const handleRestore = async (id: number) => {
    try {
      await restoreOpportunity(String(id));
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // toast handled in restoreOpportunity
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
        <div className={SALES_INTEL_INFO_STRIP}>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"
            aria-hidden="true"
          />
          <div className="relative flex gap-3 sm:gap-4">
            <Skeleton className={`size-9 shrink-0 rounded-lg ${sk}`} />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Skeleton className={`h-4 w-44 ${sk}`} />
                <Skeleton className={`h-7 w-16 rounded-lg ${sk}`} />
              </div>
              <Skeleton className={`h-3 w-full max-w-xl ${sk}`} />
            </div>
          </div>
        </div>
        <ArchiveListSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className={SALES_INTEL_INFO_STRIP}>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"
          aria-hidden="true"
        />
        <div className="relative flex gap-3 sm:gap-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
            <Archive className="size-4 text-indigo-300" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2
                className="text-[13px] font-semibold tracking-tight text-white sm:text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Archived opportunities
              </h2>
              <button
                type="button"
                onClick={() => void loadArchived()}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.04]"
              >
                Refresh
              </button>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
              Opportunities removed from the active pipeline. Restore an item to bring it back into
              circulation.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-8 text-center">
          <p className="text-[13px] font-semibold text-red-200">Failed to load archive</p>
          <p className="mt-2 text-[12px] text-red-300/80">{error}</p>
          <button
            type="button"
            onClick={() => void loadArchived()}
            className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-indigo-400"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <SalesIntelEmptyState
          icon={ArchiveRestore}
          title="Archive is empty"
          description="When you archive opportunities from the pipeline, they will appear here until restored."
        />
      ) : (
        <div className={`overflow-hidden ${SALES_INTEL_PANEL_SOFT}`}>
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
            <div>
              <h3
                className="text-[13px] font-semibold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Archived list
              </h3>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Inactive opportunities kept for reference
              </p>
            </div>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium tabular-nums text-slate-400">
              {items.length}
            </span>
          </div>

          <ul className="divide-y divide-white/[0.04]">
            {items.map((item) => {
              const isRestoring = processingId === String(item.id);
              const archivedBy =
                item.archivedBy?.userName?.trim() ||
                item.archivedBy?.email?.trim() ||
                null;

              return (
                <li key={item.id}>
                  <div className="group flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-slate-500/[0.08]">
                        <FileSearch className="size-3.5 text-slate-400" strokeWidth={1.75} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <SourceBadge
                            sourceKey={item.sourceKey ?? undefined}
                            sourceName={item.source ?? undefined}
                          />
                          <span className="inline-flex rounded border border-slate-500/25 bg-slate-500/10 px-1.5 py-[1px] text-[8px] font-semibold uppercase tracking-wider text-slate-400">
                            Archived
                          </span>
                          <span className="inline-flex rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-[1px] text-[8px] font-semibold uppercase tracking-wider text-slate-500">
                            Stage: {formatStageLabel(item.stage)}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-[12px] font-medium leading-snug text-white/90 sm:truncate">
                          {item.title}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">
                          {item.buyer || "—"}
                          {item.country ? ` · ${item.country}` : ""}
                          {item.estimatedValue != null
                            ? ` · ${formatCurrency(item.estimatedValue, item.currency ?? "GBP")}`
                            : ""}
                        </p>
                        {archivedBy ? (
                          <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
                            <span className="text-slate-600">Archived by:</span> {archivedBy}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-center sm:gap-2">
                      <span className="text-[10px] tabular-nums text-slate-500">
                        Archived {formatDate(item.archivedAt ?? undefined)}
                      </span>
                      <button
                        type="button"
                        disabled={isRestoring}
                        onClick={() => void handleRestore(item.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-[11px] font-semibold text-indigo-200 transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/15 hover:text-indigo-100 disabled:opacity-50"
                      >
                        {isRestoring ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin" />
                        ) : (
                          <RotateCcw className="size-3.5 shrink-0" />
                        )}
                        {isRestoring ? "Restoring..." : "Restore Opportunity"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
