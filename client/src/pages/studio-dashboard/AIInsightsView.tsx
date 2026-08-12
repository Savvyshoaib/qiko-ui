import {
  AlertTriangle,
  ArrowRight,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AI_INSIGHTS_ITEMS, AI_INSIGHTS_NARRATIVE, type InsightItem } from "./portfolioMetrics";

const CATEGORY_CONFIG: Record<
  InsightItem["category"],
  { label: string; icon: typeof Sparkles; className: string }
> = {
  risk: { label: "Risk", icon: AlertTriangle, className: "text-red-400 bg-red-500/10 border-red-500/20" },
  opportunity: { label: "Opportunity", icon: Target, className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  trend: { label: "Trend", icon: TrendingUp, className: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  recommendation: { label: "Recommendation", icon: Lightbulb, className: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  action: { label: "Action Required", icon: Zap, className: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
};

function InsightCard({ insight }: { insight: InsightItem }) {
  const config = CATEGORY_CONFIG[insight.category];
  const Icon = config.icon;

  return (
    <div
      className="rounded-xl border border-white/[0.06] p-5 transition-colors hover:border-white/[0.1]"
      style={{ background: "rgba(255,255,255,0.015)" }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${config.className}`}>
          <Icon className="h-3 w-3" />
          {config.label}
        </span>
        {insight.metricRef && (
          <span className="text-[10px] text-slate-600">{insight.metricRef}</span>
        )}
      </div>

      <h4 className="text-[14px] font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
        {insight.title}
      </h4>
      <p className="mt-2 text-[12px] leading-relaxed text-slate-400">{insight.narrative}</p>

      <div className="mt-4 rounded-lg border border-indigo-500/15 bg-indigo-500/[0.06] px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300/80">Suggested action</p>
        <p className="mt-1 text-[12px] text-indigo-100/90">{insight.suggestedAction}</p>
      </div>
    </div>
  );
}

interface AIInsightsViewProps {
  onOpenOverview?: () => void;
}

export default function AIInsightsView({ onOpenOverview }: AIInsightsViewProps) {
  const riskCount = AI_INSIGHTS_ITEMS.filter((item) => item.category === "risk" || item.category === "action").length;
  const opportunityCount = AI_INSIGHTS_ITEMS.filter((item) => item.category === "opportunity").length;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <h2 className="text-[18px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            AI Insights
          </h2>
        </div>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Explains outcome metrics — trends, risks, recommendations, and next steps
        </p>
      </div>

      <div
        className="mb-6 rounded-xl border border-indigo-500/20 p-5"
        style={{ background: "rgba(99,102,241,0.06)" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-indigo-300/70">
          {AI_INSIGHTS_NARRATIVE.title}
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-slate-200">{AI_INSIGHTS_NARRATIVE.summary}</p>
        <p className="mt-3 text-[10px] text-slate-500">{AI_INSIGHTS_NARRATIVE.confidence}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2">
            <p className="text-[18px] font-bold text-white">{riskCount}</p>
            <p className="text-[10px] text-red-300/80">Items needing attention</p>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2">
            <p className="text-[18px] font-bold text-white">{opportunityCount}</p>
            <p className="text-[10px] text-emerald-300/80">Positive opportunities</p>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
            <p className="text-[18px] font-bold text-white">{AI_INSIGHTS_ITEMS.length}</p>
            <p className="text-[10px] text-slate-400">Total insights generated</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Insights by priority
        </p>
        <span className="text-[10px] text-slate-600">Updated 2h ago</span>
      </div>

      <div className="space-y-4">
        {AI_INSIGHTS_ITEMS.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="text-[12px] text-slate-400">
          These insights are derived from the same outcome metrics shown on the{" "}
          <strong className="text-white">Business Overview</strong>. Ask in chat for a deeper dive on any item.
        </p>
        <button
          type="button"
          onClick={onOpenOverview}
          className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-indigo-400 hover:text-indigo-300"
        >
          View Business Overview
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
