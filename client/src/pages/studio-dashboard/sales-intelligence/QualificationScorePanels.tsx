import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { dimensionBarColor, SALES_INTEL_PANEL_CHART, SALES_INTEL_SECTION_TITLE } from "./salesIntelUi";

export function QualificationPanel({
  title,
  help,
  children,
  className,
}: {
  title: string;
  help?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("p-4 sm:p-5", SALES_INTEL_PANEL_CHART, className)}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/25 to-transparent"
        aria-hidden="true"
      />
      <div className="relative mb-3 flex items-center gap-1.5">
        <h3
          className={cn(SALES_INTEL_SECTION_TITLE, "text-slate-400")}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
        {help}
      </div>
      {children}
    </section>
  );
}

function scoreTone(score: number): "strong" | "moderate" | "weak" {
  if (score >= 75) return "strong";
  if (score >= 50) return "moderate";
  return "weak";
}

const SCORE_RING_COLORS = {
  strong: "#34d399",
  moderate: "#fbbf24",
  weak: "#f87171",
} as const;

export function ScoreRing({
  score,
  recommendation,
}: {
  score: number | null | undefined;
  recommendation?: string | null;
}) {
  if (score == null) {
    return <p className="text-[12px] text-slate-400">—</p>;
  }

  const tone = scoreTone(score);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative size-[7.5rem] shrink-0">
        <svg className="size-full -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke={SCORE_RING_COLORS[tone]}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-[1.75rem] font-bold leading-none tabular-nums text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {score}
          </span>
          <span className="mt-0.5 text-[10px] text-slate-500">/ 100</span>
        </div>
      </div>

      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Qualification score</p>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-300">
          {tone === "strong"
            ? "Strong fit across most qualification dimensions."
            : tone === "moderate"
              ? "Moderate fit — review flagged dimensions before approval."
              : "Weak fit — significant gaps require human review."}
        </p>
        {recommendation ? (
          <span
            className={cn(
              "mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold",
              recommendation.toLowerCase().includes("reject")
                ? "border-red-500/25 bg-red-500/10 text-red-300"
                : recommendation.toLowerCase().includes("approv")
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/25 bg-amber-500/10 text-amber-200"
            )}
          >
            {recommendation}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function DimensionScoreBars({
  data,
}: {
  data: { label: string; score: number }[];
}) {
  if (data.length === 0) {
    return <p className="text-[12px] text-slate-400">No dimension scores available yet.</p>;
  }

  return (
    <div className="space-y-3.5">
      {data.map((item) => {
        const barColor = dimensionBarColor(item.score);
        const tone = scoreTone(item.score);

        return (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium text-slate-400">{item.label}</span>
              <span
                className={cn(
                  "shrink-0 text-[11px] font-semibold tabular-nums",
                  tone === "strong" && "text-emerald-300/90",
                  tone === "moderate" && "text-amber-200/90",
                  tone === "weak" && "text-slate-300"
                )}
              >
                {item.score}
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(100, Math.max(0, item.score))}%`,
                  backgroundColor: barColor,
                  boxShadow: `0 0 12px ${barColor}40`,
                }}
              />
            </div>
          </div>
        );
      })}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-3 text-[9px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#818cf8]" />
          Strong (75+)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#6366f1]" />
          Moderate (50–74)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#64748b]" />
          Weak (&lt;50)
        </span>
      </div>
    </div>
  );
}

export function AiInsightBlock({
  title,
  body,
  confidence,
}: {
  title: string;
  body?: string | null;
  confidence?: number | null;
}) {
  return (
    <QualificationPanel
      title={confidence != null ? `${title} · ${confidence}% confidence` : title}
    >
      <div className="flex gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
          <Sparkles className="size-3.5 text-indigo-300" strokeWidth={1.75} />
        </div>
        <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-slate-300">{body ?? "—"}</p>
      </div>
    </QualificationPanel>
  );
}

export function RecommendationList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <QualificationPanel title="Recommendations">
        <p className="text-[12px] text-slate-400">No recommendations yet.</p>
      </QualificationPanel>
    );
  }

  return (
    <QualificationPanel title="Recommendations">
      <ol className="space-y-2.5">
        {items.map((item, index) => (
          <li key={item} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-[9px] font-semibold text-indigo-300">
              {index + 1}
            </span>
            <span className="text-[12px] leading-relaxed text-slate-300">{item}</span>
          </li>
        ))}
      </ol>
    </QualificationPanel>
  );
}
