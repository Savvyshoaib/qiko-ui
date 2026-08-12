import { Skeleton } from "@/components/ui/skeleton";
import {
  outcomesGridClass,
  SALES_INTEL_CHART_HEIGHT,
  SALES_INTEL_CHART_HEIGHT_MOBILE,
  SALES_INTEL_INFO_STRIP,
  SALES_INTEL_OUTCOMES_STRIP,
  SALES_INTEL_PANEL_CHART,
  SALES_INTEL_PANEL_SOFT,
} from "./salesIntelUi";

const sk = "bg-muted/30 border border-white/[0.06]";

function OutcomesStripSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className={SALES_INTEL_OUTCOMES_STRIP}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"
        aria-hidden="true"
      />
      <Skeleton className={`relative mb-1.5 h-2.5 w-36 ${sk}`} />
      <div
        className={`relative grid items-stretch divide-white/[0.06] ${outcomesGridClass(count)} divide-y sm:divide-y-0 sm:divide-x`}
      >
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="grid h-full min-w-0 grid-rows-[2rem_1.5rem_0.75rem] items-start justify-items-center gap-y-1 px-2 py-1.5 sm:grid-rows-[2.25rem_1.5rem_0.75rem] sm:px-3 sm:py-2.5"
          >
            <div className="flex h-full w-full items-center justify-center">
              <Skeleton className={`h-4 w-10 ${sk}`} />
            </div>
            <Skeleton className={`h-2.5 w-20 ${sk}`} />
            <Skeleton className={`h-2 w-14 ${sk}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCardSkeleton() {
  return (
    <div className={`p-4 sm:p-5 ${SALES_INTEL_PANEL_CHART}`}>
      <Skeleton className={`h-4 w-32 ${sk}`} />
      <Skeleton className={`mt-1.5 h-3 w-40 ${sk}`} />
      <Skeleton
        className={`mt-4 hidden w-full rounded-lg md:block ${sk}`}
        style={{ height: SALES_INTEL_CHART_HEIGHT }}
      />
      <Skeleton
        className={`mt-4 w-full rounded-lg md:hidden ${sk}`}
        style={{ height: SALES_INTEL_CHART_HEIGHT_MOBILE }}
      />
    </div>
  );
}

export default function SalesIntelOverviewSkeleton() {
  return (
    <div
      className="animate-in fade-in duration-200"
      aria-busy="true"
      aria-label="Loading overview"
    >
      <OutcomesStripSkeleton />

      <div className="space-y-4 sm:space-y-6">
        <div className={SALES_INTEL_INFO_STRIP}>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"
            aria-hidden="true"
          />
          <div className="relative flex gap-3 sm:gap-4">
            <Skeleton className={`size-9 shrink-0 rounded-lg ${sk}`} />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className={`h-4 w-44 ${sk}`} />
              <Skeleton className={`h-3 w-full max-w-xl ${sk}`} />
              <Skeleton className={`h-3 w-40 ${sk}`} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>

        <div className={`overflow-hidden ${SALES_INTEL_PANEL_SOFT}`}>
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
            <div className="space-y-1.5">
              <Skeleton className={`h-4 w-40 ${sk}`} />
              <Skeleton className={`h-3 w-48 ${sk}`} />
            </div>
            <Skeleton className={`h-5 w-8 rounded-full ${sk}`} />
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {Array.from({ length: 5 }).map((_, index) => (
              <li
                key={index}
                className="flex items-start gap-3 px-4 py-3.5 sm:items-center sm:px-5"
              >
                <Skeleton className={`size-8 shrink-0 rounded-lg ${sk}`} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Skeleton className={`h-4 w-14 rounded ${sk}`} />
                    <Skeleton className={`h-4 w-24 rounded ${sk}`} />
                  </div>
                  <Skeleton className={`h-3.5 w-full max-w-md ${sk}`} />
                  <Skeleton className={`h-3 w-32 ${sk}`} />
                </div>
                <Skeleton className={`h-3 w-16 shrink-0 ${sk}`} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
