import { Check, ChevronRight, ClipboardCheck, Loader2, X } from "lucide-react";
import { SalesIntelEmptyState } from "./SalesIntelEmptyState";
import { formatCurrency, formatDate, SourceBadge, StageBadge } from "./salesIntelUtils";
import { SALES_INTEL_PANEL_SOFT } from "./salesIntelUi";
import { useSalesIntelData } from "./useSalesIntelData";

interface OpportunityReviewQueueProps {
  agentId: string;
  onSelectOpportunity: (id: string) => void;
}

export default function OpportunityReviewQueue({ agentId, onSelectOpportunity }: OpportunityReviewQueueProps) {
  const { opportunities, approveReview, rejectReview, processingId, loading, initialized } = useSalesIntelData(agentId);
  const queue = opportunities.filter((item) => item.stage === "awaiting_review");

  if (!initialized && loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <SalesIntelEmptyState
        icon={ClipboardCheck}
        title="Review queue is empty"
        description="Qualified opportunities that need human validation will land here before they can be pushed to Salesforce."
        steps={[
          "Ingest opportunities from UNGM or TED",
          "Let AI qualification score each tender",
          "Approve or reject items awaiting review",
        ]}
      />
    );
  }

  return (
    <div className="space-y-3">
      {queue.map((opp) => (
        <div
          key={opp.id}
          className={`rounded-xl border border-amber-500/15 p-4 transition-colors hover:border-amber-500/25 ${SALES_INTEL_PANEL_SOFT}`}
          style={{ background: "rgba(245,158,11,0.03)" }}
        >
          <button type="button" onClick={() => onSelectOpportunity(opp.id)} className="w-full text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5">
                  <SourceBadge sourceKey={opp.sourceKey} sourceName={opp.source} />
                </div>
                <p className="text-[13px] font-semibold text-white">{opp.title}</p>
                <p className="mt-1 text-[11px] text-slate-500">{opp.buyer}</p>
                {opp.qualificationSummary && (
                  <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">{opp.qualificationSummary}</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <StageBadge stage={opp.stage} />
              {opp.qualificationScore != null && (
                <span className="text-[10px] text-cyan-400">Score: {opp.qualificationScore}%</span>
              )}
              {opp.estimatedValue != null && (
                <span className="text-[10px] text-emerald-400/80">{formatCurrency(opp.estimatedValue, opp.currency)}</span>
              )}
              {opp.deadlineAt && <span className="text-[10px] text-slate-500">Deadline: {formatDate(opp.deadlineAt)}</span>}
            </div>
          </button>
          <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.06] pt-3 sm:flex-row">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void approveReview(opp.id);
              }}
              disabled={processingId === opp.id}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Validate
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void rejectReview(opp.id);
              }}
              disabled={processingId === opp.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
