import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  History,
  Info,
  Pencil,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { getIdgSalesOpportunityHistory } from "@/lib/idgSalesApi";
import {
  mapActivityLogsToOpportunityActivity,
  type OpportunityActivityEntry,
  type OpportunityActivityStatus,
} from "./idgSalesMappers";
import { SalesIntelEmptyState } from "./SalesIntelEmptyState";
import { formatDate } from "./salesIntelUtils";
import { SALES_INTEL_PANEL_SOFT, SALES_INTEL_SECTION_TITLE } from "./salesIntelUi";
import type { Opportunity } from "./salesIntelTypes";

const sk = "bg-muted/30 border border-white/[0.06]";

function HistoryTimelineSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="space-y-3 animate-in fade-in duration-200"
      aria-busy="true"
      aria-label="Loading opportunity history"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Skeleton className={`h-3.5 w-64 max-w-full ${sk}`} />
        <Skeleton className={`h-7 w-16 rounded-lg ${sk}`} />
      </div>

      <div className={`relative p-4 sm:p-5 ${SALES_INTEL_PANEL_SOFT}`}>
        <ul className="space-y-0">
          {Array.from({ length: rows }).map((_, index) => {
            const isLast = index === rows - 1;
            return (
              <li key={index} className="relative flex gap-3 pb-5 last:pb-0">
                {!isLast ? (
                  <span
                    className="absolute left-[15px] top-8 bottom-0 w-px bg-white/[0.06]"
                    aria-hidden="true"
                  />
                ) : null}
                <Skeleton className={`relative z-[1] size-8 shrink-0 rounded-full ${sk}`} />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Skeleton className={`h-3.5 w-16 ${sk}`} />
                    <Skeleton className={`h-3 w-20 ${sk}`} />
                  </div>
                  <Skeleton className={`h-4 w-44 max-w-full ${sk}`} />
                  <Skeleton className={`h-3 w-52 max-w-full ${sk}`} />
                  <Skeleton className={`h-3 w-full max-w-md ${sk}`} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OpportunityActivityStatus }) {
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
  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5" />
        Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-cyan-300">
      <Info className="h-3.5 w-3.5" />
      Info
    </span>
  );
}

function actionIcon(entry: OpportunityActivityEntry): LucideIcon {
  const action = entry.action.toLowerCase();
  if (entry.category === "sync") return CloudUpload;
  if (action.includes("approv") || action.includes("review")) return UserCheck;
  if (action.includes("reject")) return XCircle;
  if (action.includes("archive") && !action.includes("restor")) return Archive;
  if (action.includes("restor")) return RotateCcw;
  if (action.includes("edit") || action.includes("note") || action.includes("field")) return Pencil;
  if (action.includes("qualif")) return ShieldCheck;
  return History;
}

function iconTone(status: OpportunityActivityStatus) {
  if (status === "success") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  if (status === "failed") return "border-red-500/25 bg-red-500/10 text-red-300";
  if (status === "warning") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  return "border-indigo-500/25 bg-indigo-500/10 text-indigo-300";
}

interface OpportunityHistoryPanelProps {
  agentId: string;
  opportunity: Opportunity;
  active: boolean;
}

export default function OpportunityHistoryPanel({
  agentId,
  opportunity,
  active,
}: OpportunityHistoryPanelProps) {
  const [entries, setEntries] = useState<OpportunityActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    const trimmed = agentId.trim();
    if (!trimmed || !opportunity.id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await getIdgSalesOpportunityHistory(trimmed, opportunity.id, { limit: 100 });
      const mapped = mapActivityLogsToOpportunityActivity(
        Array.isArray(response.history) ? response.history : [],
        [opportunity]
      );
      setEntries(mapped);
      setLoaded(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load opportunity history.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [agentId, opportunity]);

  useEffect(() => {
    setEntries([]);
    setLoaded(false);
    setError(null);
  }, [opportunity.id]);

  useEffect(() => {
    if (!active) return;
    void loadHistory();
  }, [active, loadHistory]);

  const countLabel = useMemo(() => {
    return `${entries.length} event${entries.length === 1 ? "" : "s"}`;
  }, [entries.length]);

  if (!active) return null;

  if (loading && !loaded) {
    return <HistoryTimelineSkeleton />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500">
          Timeline of edits, reviews, and actions for this opportunity · {countLabel}
        </p>
        <button
          type="button"
          onClick={() => void loadHistory()}
          disabled={loading}
          className="rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.04] disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-300">
          {error}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <SalesIntelEmptyState
          icon={History}
          title="No history yet"
          description="Edits, reviews, notes, archive, and Salesforce actions will appear here."
        />
      ) : (
        <>
          <div className={`relative p-4 sm:p-5 ${SALES_INTEL_PANEL_SOFT}`}>
            <ol className="relative space-y-0">
              {entries.map((entry, index) => {
                const Icon = actionIcon(entry);
                const isLast = index === entries.length - 1;
                return (
                  <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {!isLast ? (
                      <span
                        className="absolute left-[15px] top-8 bottom-0 w-px bg-white/[0.06]"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div
                      className={`relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border ${iconTone(entry.status)}`}
                    >
                      <Icon className="size-3.5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <StatusBadge status={entry.status} />
                        <time className="text-[10px] text-slate-500" dateTime={entry.occurredAt}>
                          {formatDate(entry.occurredAt)}
                        </time>
                      </div>
                      <p className="text-[12px] font-semibold text-white">{entry.action}</p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {entry.actor}
                        <span className="text-slate-600"> · </span>
                        {entry.actorRole}
                      </p>
                      {entry.fromStatus || entry.toStatus ? (
                        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                          <span className="rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-slate-400">
                            {entry.fromStatus ?? "—"}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">
                            →
                          </span>
                          <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 text-indigo-200">
                            {entry.toStatus ?? "—"}
                          </span>
                        </p>
                      ) : null}
                      {entry.fieldChanges && entry.fieldChanges.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {entry.fieldChanges.map((change) => (
                            <li
                              key={`${entry.id}-${change.field}`}
                              className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-[10px]"
                            >
                              <span className="font-medium text-slate-300">{change.field}</span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-slate-500">
                                <span className="text-slate-400">{change.from ?? "—"}</span>
                                <span className="text-slate-600">→</span>
                                <span className="text-indigo-200">{change.to ?? "—"}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {entry.detail ? (
                        <p className="mt-2 text-[10px] leading-relaxed text-slate-400">{entry.detail}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
          <p className={`${SALES_INTEL_SECTION_TITLE} px-0.5`}>Newest first · opportunity history API</p>
        </>
      )}
    </div>
  );
}
