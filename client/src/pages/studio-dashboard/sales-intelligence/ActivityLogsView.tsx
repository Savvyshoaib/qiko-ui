import { useMemo, useState } from "react";
import {
  Archive,
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  FileSearch,
  History,
  Info,
  Loader2,
  Pencil,
  Radar,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  mapActivityLogsToOpportunityActivity,
  type OpportunityActivityCategory,
  type OpportunityActivityEntry,
  type OpportunityActivityStatus,
} from "./idgSalesMappers";
import { SalesIntelEmptyState } from "./SalesIntelEmptyState";
import { formatDate } from "./salesIntelUtils";
import {
  SALES_INTEL_INFO_STRIP,
  SALES_INTEL_PANEL_SOFT,
  SALES_INTEL_SECTION_TITLE,
} from "./salesIntelUi";
import { useSalesIntelData } from "./useSalesIntelData";

type ActivityFilter = "all" | OpportunityActivityCategory;

const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "review", label: "Review" },
  { id: "sync", label: "Sync" },
  { id: "system", label: "System" },
];

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
  if (entry.category === "sync") return CloudUpload;
  if (entry.action.toLowerCase().includes("scan")) return Radar;
  if (entry.action.toLowerCase().includes("ingest")) return FileSearch;
  if (entry.action.toLowerCase().includes("approv") || entry.action.toLowerCase().includes("review"))
    return UserCheck;
  if (entry.action.toLowerCase().includes("reject")) return XCircle;
  if (entry.action.toLowerCase().includes("archive") && !entry.action.toLowerCase().includes("restor"))
    return Archive;
  if (entry.action.toLowerCase().includes("restor")) return RotateCcw;
  if (entry.action.toLowerCase().includes("edit") || entry.action.toLowerCase().includes("note") || entry.action.toLowerCase().includes("field"))
    return Pencil;
  if (entry.action.toLowerCase().includes("qualif")) return ShieldCheck;
  return History;
}

function iconTone(status: OpportunityActivityStatus) {
  if (status === "success") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  if (status === "failed") return "border-red-500/25 bg-red-500/10 text-red-300";
  if (status === "warning") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  return "border-indigo-500/25 bg-indigo-500/10 text-indigo-300";
}

function StatusChange({ fromStatus, toStatus }: { fromStatus?: string; toStatus?: string }) {
  if (!fromStatus && !toStatus) return null;
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
      <span className="rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-slate-400">
        {fromStatus ?? "—"}
      </span>
      <span aria-hidden="true" className="text-slate-600">
        →
      </span>
      <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 text-indigo-200">
        {toStatus ?? "—"}
      </span>
    </p>
  );
}

export default function ActivityLogsView({ agentId }: { agentId: string }) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const {
    activityLogs,
    opportunities,
    loading,
    initialized,
    refreshActivityLogs,
  } = useSalesIntelData(agentId);

  const mapped = useMemo(
    () => mapActivityLogsToOpportunityActivity(activityLogs, opportunities),
    [activityLogs, opportunities]
  );

  const entries = useMemo(() => {
    if (filter === "all") return mapped;
    return mapped.filter((entry) => entry.category === filter);
  }, [filter, mapped]);

  if (!initialized && loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className={SALES_INTEL_INFO_STRIP}>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"
          aria-hidden="true"
        />
        <div className="relative flex gap-3 sm:gap-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
            <History className="size-4 text-indigo-300" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2
                className="text-[13px] font-semibold tracking-tight text-white sm:text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Opportunity activity
              </h2>
              <button
                type="button"
                onClick={() => void refreshActivityLogs()}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/[0.04]"
              >
                Refresh
              </button>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
              Chronological audit of lifecycle changes, reviews, scans, and sync events across the pipeline.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter activity logs">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.id)}
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
          Showing {entries.length} event{entries.length === 1 ? "" : "s"}
        </p>
      </div>

      {entries.length === 0 ? (
        <SalesIntelEmptyState
          icon={History}
          title={mapped.length === 0 ? "No activity yet" : "No activity in this filter"}
          description={
            mapped.length === 0
              ? "Scan sources, create opportunities, or run reviews to populate this timeline."
              : "Try another category, or clear the filter to see the full opportunity timeline."
          }
        />
      ) : (
        <>
          <div className={`relative p-4 sm:p-5 ${SALES_INTEL_PANEL_SOFT} md:hidden`}>
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
                      <p className="mt-0.5 truncate text-[11px] text-slate-300">{entry.opportunityTitle}</p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {entry.actor}
                        <span className="text-slate-600"> · </span>
                        {entry.actorRole}
                      </p>
                      <StatusChange fromStatus={entry.fromStatus} toStatus={entry.toStatus} />
                      <p className="mt-2 text-[10px] leading-relaxed text-slate-400">{entry.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className={`hidden overflow-x-auto md:block ${SALES_INTEL_PANEL_SOFT}`}>
            <table className="w-full min-w-[920px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Opportunity
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Status change
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
                {entries.map((entry) => {
                  const Icon = actionIcon(entry);
                  return (
                    <tr key={entry.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex size-6 shrink-0 items-center justify-center rounded-md border ${iconTone(entry.status)}`}
                          >
                            <Icon className="size-3" strokeWidth={1.75} />
                          </span>
                          <span className="text-[11px] font-medium text-slate-200">{entry.action}</span>
                        </div>
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <p className="truncate text-[12px] text-white">{entry.opportunityTitle}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[11px] text-slate-200">{entry.actor}</p>
                        <p className="text-[10px] text-slate-500">{entry.actorRole}</p>
                      </td>
                      <td className="px-4 py-3">
                        {entry.fromStatus || entry.toStatus ? (
                          <div className="flex flex-wrap items-center gap-1 text-[10px]">
                            <span className="text-slate-500">{entry.fromStatus ?? "—"}</span>
                            <span className="text-slate-600">→</span>
                            <span className="text-indigo-200">{entry.toStatus ?? "—"}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-600">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[11px] text-slate-500">
                        {formatDate(entry.occurredAt)}
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <p
                          className={`truncate text-[10px] ${
                            entry.status === "failed" ? "text-red-300/80" : "text-slate-400"
                          }`}
                          title={entry.detail}
                        >
                          {entry.detail}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className={`${SALES_INTEL_SECTION_TITLE} px-0.5`}>
            Newest first · from activity-logs API
          </p>
        </>
      )}
    </div>
  );
}
