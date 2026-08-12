import { useMemo, type ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { Opportunity } from "./salesIntelTypes";
import { SalesIntelEmptyState } from "./SalesIntelEmptyState";
import { formatSourceLabel } from "./salesIntelUtils";
import {
  SALES_INTEL_AXIS_TICK,
  SALES_INTEL_CHART_COLORS,
  SALES_INTEL_CHART_GRID,
  SALES_INTEL_CHART_HEIGHT,
  SALES_INTEL_CHART_HEIGHT_MOBILE,
  SALES_INTEL_CHART_TOOLTIP,
  SALES_INTEL_PANEL_CHART,
} from "./salesIntelUi";

interface SalesIntelOverviewChartsProps {
  opportunities: Opportunity[];
}

const PIPELINE_COLORS: Record<string, string> = {
  "Early Pipeline": SALES_INTEL_CHART_COLORS.cyan,
  "Needs Review": SALES_INTEL_CHART_COLORS.secondary,
  "Ready for SF": SALES_INTEL_CHART_COLORS.primary,
  Rejected: SALES_INTEL_CHART_COLORS.tertiary,
};

const SOURCE_BAR_COLORS = [
  SALES_INTEL_CHART_COLORS.primary,
  SALES_INTEL_CHART_COLORS.secondary,
  SALES_INTEL_CHART_COLORS.accent,
  SALES_INTEL_CHART_COLORS.violet,
] as const;

const REVIEW_OUTCOME_COLORS: Record<string, string> = {
  Validated: SALES_INTEL_CHART_COLORS.primary,
  Rejected: SALES_INTEL_CHART_COLORS.tertiary,
};

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const value = payload[0]?.value;
  const name = payload[0]?.name ?? label;

  return (
    <div
      className="rounded-lg border border-white/10 px-3 py-2 shadow-2xl shadow-black/50 backdrop-blur-md"
      style={{ background: SALES_INTEL_CHART_TOOLTIP.background }}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{name}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  chartHeight = SALES_INTEL_CHART_HEIGHT,
  align = "center",
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  chartHeight?: number;
  align?: "center" | "bottom";
  className?: string;
}) {
  const minHeight = chartHeight + 72;

  return (
    <section className={`flex flex-col p-4 sm:p-5 ${SALES_INTEL_PANEL_CHART} ${className}`} style={{ minHeight }}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/25 to-transparent"
        aria-hidden="true"
      />

      <div className="relative mb-4 shrink-0">
        <h3
          className="text-[12px] font-semibold tracking-tight text-white sm:text-[13px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
        {subtitle ? <p className="mt-0.5 text-[10px] text-slate-500">{subtitle}</p> : null}
      </div>

      <div
        className={`relative flex w-full flex-1 flex-col overflow-hidden ${
          align === "bottom" ? "mt-auto justify-end" : "justify-center"
        }`}
        style={{ height: chartHeight, minHeight: chartHeight }}
      >
        <div className="h-full w-full min-h-0">{children}</div>
      </div>
    </section>
  );
}

export default function SalesIntelOverviewCharts({ opportunities }: SalesIntelOverviewChartsProps) {
  const pipelineData = useMemo(() => {
    const counts = {
      "Early Pipeline": 0,
      "Needs Review": 0,
      "Ready for SF": 0,
      Rejected: 0,
    };

    for (const opportunity of opportunities) {
      switch (opportunity.stage) {
        case "ingested":
        case "qualifying":
        case "qualified":
          counts["Early Pipeline"] += 1;
          break;
        case "awaiting_review":
          counts["Needs Review"] += 1;
          break;
        case "validated":
        case "push_pending":
        case "pushed":
          counts["Ready for SF"] += 1;
          break;
        case "rejected":
        case "push_failed":
          counts.Rejected += 1;
          break;
        default:
          break;
      }
    }

    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [opportunities]);

  const pipelineTotal = pipelineData.reduce((sum, item) => sum + item.value, 0);

  const pipelineChartHeight = Math.min(
    SALES_INTEL_CHART_HEIGHT,
    Math.max(SALES_INTEL_CHART_HEIGHT_MOBILE, pipelineData.length * 44 + 32)
  );

  const qualificationData = useMemo(() => {
    const counts: Record<string, number> = {
      Validated: 0,
      Rejected: 0,
    };

    for (const opportunity of opportunities) {
      switch (opportunity.stage) {
        case "validated":
        case "push_pending":
        case "pushed":
          counts.Validated += 1;
          break;
        case "rejected":
        case "push_failed":
          counts.Rejected += 1;
          break;
        default:
          break;
      }
    }

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);
  }, [opportunities]);

  const qualificationTotal = qualificationData.reduce((sum, item) => sum + item.value, 0);
  const validatedCount = qualificationData.find((item) => item.name === "Validated")?.value ?? 0;
  const qualificationRate =
    qualificationTotal > 0 ? Math.round((validatedCount / qualificationTotal) * 100) : 0;

  const sourceData = useMemo(() => {
    const counts = new Map<string, number>();

    for (const opportunity of opportunities) {
      const label = formatSourceLabel(opportunity.sourceKey, opportunity.source);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [opportunities]);

  const sourceTotal = sourceData.reduce((sum, item) => sum + item.value, 0);

  if (opportunities.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:items-stretch">
      <ChartCard
        title="Pipeline by Status"
        subtitle={`${pipelineTotal} of ${opportunities.length} opportunities mapped to stages`}
        chartHeight={pipelineChartHeight}
        align="bottom"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={pipelineData}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
            barCategoryGap={10}
          >
            <CartesianGrid horizontal={false} stroke={SALES_INTEL_CHART_GRID} strokeDasharray="3 3" />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={SALES_INTEL_AXIS_TICK}
              axisLine={false}
              tickLine={false}
              domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={86}
              tick={{ ...SALES_INTEL_AXIS_TICK, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={16} fill={SALES_INTEL_CHART_COLORS.primary}>
              {pipelineData.map((entry) => (
                <Cell
                  key={entry.label}
                  fill={PIPELINE_COLORS[entry.label] ?? SALES_INTEL_CHART_COLORS.primary}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Qualification Rate"
        subtitle={
          qualificationTotal > 0
            ? `${qualificationRate}% validated of reviewed outcomes`
            : "Awaiting qualification outcomes"
        }
        align="center"
      >
        {qualificationData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={qualificationData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="44%"
                innerRadius="46%"
                outerRadius="64%"
                paddingAngle={3}
                stroke="rgba(12,14,24,0.9)"
                strokeWidth={2}
              >
                {qualificationData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={REVIEW_OUTCOME_COLORS[entry.name] ?? SALES_INTEL_CHART_COLORS.indigo}
                  />
                ))}
                <Label
                  position="center"
                  content={({ viewBox }) => {
                    if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                    const { cx, cy } = viewBox;
                    return (
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan
                          x={cx}
                          y={(cy ?? 0) - 4}
                          fill="#f8fafc"
                          fontSize={22}
                          fontWeight={700}
                          fontFamily="var(--font-display)"
                        >
                          {qualificationRate}%
                        </tspan>
                        <tspan x={cx} y={(cy ?? 0) + 14} fill="#64748b" fontSize={9}>
                          validated
                        </tspan>
                      </text>
                    );
                  }}
                />
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={7}
                formatter={(value) => <span className="text-[10px] text-slate-400">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <SalesIntelEmptyState
            icon={BarChart3}
            size="compact"
            title="No review outcomes yet"
            description="Validated and rejected opportunities will appear in this chart once qualification completes."
          />
        )}
      </ChartCard>

      <ChartCard
        title="Opportunities by Source"
        subtitle={`${sourceTotal} ingested across ${sourceData.length} source${sourceData.length === 1 ? "" : "s"}`}
        align="center"
        className="md:col-span-2 xl:col-span-1"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sourceData} margin={{ top: 8, right: 8, left: 0, bottom: 20 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={SALES_INTEL_CHART_GRID} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={SALES_INTEL_AXIS_TICK}
              interval={0}
              angle={sourceData.length > 2 ? -18 : 0}
              textAnchor={sourceData.length > 2 ? "end" : "middle"}
              height={sourceData.length > 2 ? 40 : 28}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={SALES_INTEL_AXIS_TICK}
              width={28}
              axisLine={false}
              tickLine={false}
              domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48} fill={SALES_INTEL_CHART_COLORS.primary}>
              {sourceData.map((entry, index) => (
                <Cell key={entry.label} fill={SOURCE_BAR_COLORS[index % SOURCE_BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
