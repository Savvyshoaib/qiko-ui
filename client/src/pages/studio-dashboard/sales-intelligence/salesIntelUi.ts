/** Shared Sales Intelligence UI tokens for consistent dark-theme styling. */

export const SALES_INTEL_PANEL =
  "rounded-xl border border-white/[0.08] bg-[#0f111c]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

export const SALES_INTEL_PANEL_SOFT =
  "rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

export const SALES_INTEL_PANEL_CHART =
  "relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.035] via-[#0f111c]/80 to-[#0c0e18]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";

export const SALES_INTEL_INFO_STRIP =
  "relative overflow-hidden rounded-xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/[0.07] via-[#0f111c]/40 to-violet-500/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5";

export const SALES_INTEL_OUTCOMES_STRIP =
  "relative mb-4 overflow-hidden rounded-xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/[0.07] via-[#0f111c]/40 to-violet-500/[0.04] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-4 sm:py-3";

export const SALES_INTEL_SECTION_TITLE =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";

/** Kanban pipeline — uniform card height */
export const SALES_INTEL_PIPELINE_CARD_HEIGHT =
  "h-[6.5rem] max-h-[6.5rem] shrink-0";

/** Kanban column — vertical scroll with boundary chaining to page */
export const SALES_INTEL_PIPELINE_COLUMN_BODY =
  "flex min-h-[320px] max-h-[min(70vh,42rem)] flex-col gap-2 overflow-y-auto overscroll-y-auto [scrollbar-gutter:stable_both-edges]";

export const SALES_INTEL_CHART_HEIGHT = 220;
export const SALES_INTEL_CHART_HEIGHT_MOBILE = 180;

/** Indigo/violet palette aligned with Studio — no red/green/cyan chart accents. */
export const SALES_INTEL_CHART_COLORS = {
  primary: "#818cf8",
  secondary: "#a78bfa",
  tertiary: "#6366f1",
  accent: "#8b5cf6",
  muted: "#64748b",
  indigo: "#6366f1",
  purple: "#8b5cf6",
  violet: "#a78bfa",
  cyan: "#67e8f9",
} as const;

/** Ordered series colors for multi-bar / multi-segment charts. */
export const SALES_INTEL_CHART_SERIES = [
  SALES_INTEL_CHART_COLORS.primary,
  SALES_INTEL_CHART_COLORS.secondary,
  SALES_INTEL_CHART_COLORS.tertiary,
  SALES_INTEL_CHART_COLORS.accent,
  SALES_INTEL_CHART_COLORS.muted,
] as const;

export const SALES_INTEL_CHART_GRID = "rgba(255,255,255,0.04)";

export const SALES_INTEL_CHART_TOOLTIP = {
  background: "rgba(12,14,24,0.96)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
  backdropFilter: "blur(8px)",
} as const;

export const SALES_INTEL_CHART_TOOLTIP_LABEL = "#94a3b8";
export const SALES_INTEL_CHART_TOOLTIP_VALUE = "#f8fafc";

export const SALES_INTEL_AXIS_TICK = { fill: "#64748b", fontSize: 10 } as const;

export function outcomesGridClass(count: number): string {
  if (count === 5) return "grid-cols-2 md:grid-cols-3 xl:grid-cols-5";
  if (count === 4) return "grid-cols-2 md:grid-cols-4";
  if (count === 3) return "grid-cols-1 sm:grid-cols-3";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  return "grid-cols-2 sm:grid-cols-3";
}

/** Score bars use indigo intensity — same hue family as the rest of Studio. */
export function dimensionBarColor(score: number): string {
  if (score >= 75) return SALES_INTEL_CHART_COLORS.primary;
  if (score >= 50) return SALES_INTEL_CHART_COLORS.tertiary;
  if (score >= 25) return SALES_INTEL_CHART_COLORS.accent;
  return SALES_INTEL_CHART_COLORS.muted;
}

export function chartSeriesColor(index: number): string {
  return SALES_INTEL_CHART_SERIES[index % SALES_INTEL_CHART_SERIES.length];
}

