import { ChevronRight, FileSearch, Radar } from "lucide-react";
import { useSalesIntelContext } from "./SalesIntelContext";
import SalesIntelOverviewCharts from "./SalesIntelOverviewCharts";
import SalesIntelOverviewSkeleton from "./SalesIntelOverviewSkeleton";
import { SalesIntelEmptyState } from "./SalesIntelEmptyState";
import { SALES_INTEL_INFO_STRIP, SALES_INTEL_PANEL_SOFT } from "./salesIntelUi";
import { formatDate, SourceBadge, StageBadge } from "./salesIntelUtils";

interface SalesIntelDashboardProps {
  /** Studio route worker id — must match SalesIntelProvider agentId (from URL) */
  agentId: string;
  onGoToIngestion?: () => void;
}

export default function SalesIntelDashboard({ agentId, onGoToIngestion }: SalesIntelDashboardProps) {
  const salesIntel = useSalesIntelContext();

  if (import.meta.env.DEV && agentId.trim() && salesIntel.agentId !== agentId.trim()) {
    console.warn(`[SalesIntelDashboard] URL agentId mismatch: ${agentId} vs ${salesIntel.agentId}`);
  }

  if (salesIntel.loading && !salesIntel.initialized) {
    return <SalesIntelOverviewSkeleton />;
  }

  const lastScan = salesIntel.sources
    .filter((source) => source.lastScanAt)
    .map((source) => source.lastScanAt!)
    .sort()
    .reverse()[0];

  const recent = [...salesIntel.opportunities]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className={SALES_INTEL_INFO_STRIP}>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"
          aria-hidden="true"
        />
        <div className="relative flex gap-3 sm:gap-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 shadow-sm shadow-indigo-500/10">
            <FileSearch className="size-4 text-indigo-300" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              className="text-[13px] font-semibold tracking-tight text-white sm:text-sm"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Opportunity intelligence
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
              Track ingested tenders, qualification status, human review queue, and Salesforce push readiness
              across all sources.
            </p>
            {lastScan ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="size-1.5 rounded-full bg-emerald-400/80" aria-hidden="true" />
                Last portal scan: {formatDate(lastScan)}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <SalesIntelOverviewCharts opportunities={salesIntel.opportunities} />

      {recent.length > 0 ? (
        <div className={`overflow-hidden ${SALES_INTEL_PANEL_SOFT}`}>
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
            <div>
              <h3
                className="text-[13px] font-semibold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Recent Opportunities
              </h3>
              <p className="mt-0.5 text-[10px] text-slate-500">Latest activity across your pipeline</p>
            </div>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium tabular-nums text-slate-400">
              {recent.length}
            </span>
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {recent.map((opp) => (
              <li key={opp.id}>
                <div className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.02] sm:items-center sm:px-5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-indigo-500/[0.08]">
                    <FileSearch className="size-3.5 text-indigo-300/90" strokeWidth={1.75} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <SourceBadge sourceKey={opp.sourceKey} sourceName={opp.source} />
                      <StageBadge stage={opp.stage} />
                    </div>
                    <p className="line-clamp-2 text-[12px] font-medium leading-snug text-white transition-colors group-hover:text-indigo-50 sm:truncate">
                      {opp.title}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">{opp.buyer}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <span className="text-[10px] tabular-nums text-slate-500 sm:text-right">
                      {formatDate(opp.updatedAt)}
                    </span>
                    <ChevronRight
                      className="size-3.5 text-slate-600 transition-colors group-hover:text-indigo-400/80"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <SalesIntelEmptyState
          icon={Radar}
          title="No opportunities yet"
          description="Your pipeline is empty. Run a portal scan to discover tenders from UNGM and TED, then track them here."
          steps={[
            "Open Ingestion and choose UNGM or TED",
            "Run a portal scan with your keywords",
            "Qualified opportunities will appear on this dashboard",
          ]}
          primaryAction={
            onGoToIngestion
              ? { label: "Go to Ingestion", onClick: onGoToIngestion }
              : undefined
          }
        />
      )}
    </div>
  );
}
