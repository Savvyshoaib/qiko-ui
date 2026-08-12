import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  PoundSterling,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  OVERVIEW_ATTENTION_ITEMS,
  OVERVIEW_ATTENTION_METRICS,
  OVERVIEW_HEADLINE,
  OVERVIEW_PRIMARY_METRICS,
  OVERVIEW_PROGRESS_TRENDS,
  OVERVIEW_TEAM_METRICS,
  OVERVIEW_WIN_LOSS_METRICS,
  type OutcomeMetric,
  type AttentionItem,
} from "./portfolioMetrics";

function metricToneClass(tone: OutcomeMetric["tone"]): string {
  switch (tone) {
    case "success":
      return "border-emerald-500/20 bg-emerald-500/[0.06]";
    case "warning":
      return "border-amber-500/20 bg-amber-500/[0.06]";
    case "danger":
      return "border-red-500/20 bg-red-500/[0.06]";
    default:
      return "border-white/[0.06] bg-white/[0.02]";
  }
}

function MetricCard({ metric }: { metric: OutcomeMetric }) {
  return (
    <div className={`rounded-xl border p-4 ${metricToneClass(metric.tone)}`}>
      <p
        className="text-[24px] font-bold tracking-tight text-white"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {metric.value}
      </p>
      <p className="mt-1 text-[11px] font-medium text-slate-300">{metric.label}</p>
      {metric.trend && (
        <p
          className={`mt-1.5 text-[10px] ${
            metric.trendUp === false ? "text-red-400/80" : "text-emerald-400/80"
          }`}
        >
          {metric.trendUp === false ? "↓" : "↑"} {metric.trend}
        </p>
      )}
    </div>
  );
}

function SectionLabel({ icon: Icon, title, subtitle }: { icon: typeof Target; title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
        <Icon className="h-4 w-4 text-indigo-400" />
      </div>
      <div>
        <h3 className="text-[14px] font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h3>
        <p className="text-[11px] text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const severityStyles = {
    high: "border-red-500/20 bg-red-500/[0.05]",
    medium: "border-amber-500/20 bg-amber-500/[0.05]",
    low: "border-white/[0.06] bg-white/[0.02]",
  };

  return (
    <div className={`rounded-xl border p-4 ${severityStyles[item.severity]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            {item.severity === "high" && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />}
            <p className="text-[13px] font-semibold text-white">{item.title}</p>
          </div>
          <p className="text-[12px] leading-relaxed text-slate-400">{item.detail}</p>
          <p className="mt-2 text-[11px] font-medium text-indigo-300">
            Recommended: {item.action}
          </p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-600" />
      </div>
    </div>
  );
}

export default function PortfolioOverviewView({ onOpenInsights }: { onOpenInsights?: () => void }) {
  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h2 className="text-[18px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
          Business Overview
        </h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Outcome-driven snapshot — what is happening and what needs attention
        </p>
      </div>

      <div
        className="mb-6 rounded-xl border border-indigo-500/25 p-5"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-indigo-300/80">
              What is happening?
            </p>
            <h3 className="mt-2 text-[20px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
              {OVERVIEW_HEADLINE.status}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-300">{OVERVIEW_HEADLINE.summary}</p>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-right">
            <p className="text-[10px] text-slate-500">{OVERVIEW_HEADLINE.period}</p>
            <p className="mt-1 text-[12px] font-semibold text-emerald-400">2 active bids · 8 days to next deadline</p>
          </div>
        </div>
      </div>

      <SectionLabel
        icon={CheckCircle2}
        title="Business outcomes"
        subtitle="Readiness, pipeline value, compliance, and evidence quality"
      />
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {OVERVIEW_PRIMARY_METRICS.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <SectionLabel
        icon={AlertTriangle}
        title="What requires attention?"
        subtitle="Risk areas, bottlenecks, and pending actions"
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {OVERVIEW_ATTENTION_METRICS.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mb-8 space-y-3">
        {OVERVIEW_ATTENTION_ITEMS.map((item) => (
          <AttentionRow key={item.id} item={item} />
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div>
          <SectionLabel
            icon={PoundSterling}
            title="Win / loss & revenue impact"
            subtitle="Submission volume, win rates, and pipeline value"
          />
          <div className="grid grid-cols-2 gap-3">
            {OVERVIEW_WIN_LOSS_METRICS.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </div>
        </div>

        <div>
          <SectionLabel
            icon={Users}
            title="Team performance"
            subtitle="Ownership, throughput, and review completion"
          />
          <div className="grid grid-cols-2 gap-3">
            {OVERVIEW_TEAM_METRICS.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </div>
        </div>
      </div>

      <SectionLabel
        icon={TrendingUp}
        title="Completion & progress trends"
        subtitle="Direction of key outcome metrics vs prior period"
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {OVERVIEW_PROGRESS_TRENDS.map((trend) => (
          <div
            key={trend.label}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{trend.label}</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="text-[18px] font-bold text-white">{trend.current}</p>
              <p className="text-[10px] text-slate-600">was {trend.previous}</p>
            </div>
            <p className="mt-1 text-[10px] text-emerald-400/80">
              {trend.label.includes("gaps") ? "↓ improving" : "↑ improving"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-indigo-500/15 bg-indigo-500/[0.05] px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-indigo-400" />
          <p className="text-[12px] text-indigo-200/90">
            Open <strong className="text-white">AI Insights</strong> for narrative analysis, recommended actions, and
            trend explanations behind these numbers.
          </p>
        </div>
        {onOpenInsights && (
          <button
            type="button"
            onClick={onOpenInsights}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-400"
          >
            View AI Insights
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
