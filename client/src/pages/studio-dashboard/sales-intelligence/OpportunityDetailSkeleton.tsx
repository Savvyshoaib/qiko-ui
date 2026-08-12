import { Skeleton } from "@/components/ui/skeleton";
import { SALES_INTEL_PANEL_SOFT } from "./salesIntelUi";

const sk = "bg-muted/30 border border-white/[0.06]";

export default function OpportunityDetailSkeleton() {
  return (
    <div className="animate-in fade-in duration-200" aria-busy="true" aria-label="Loading opportunity">
      <Skeleton className={`mb-5 h-4 w-32 ${sk}`} />

      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Skeleton className={`h-5 w-16 rounded ${sk}`} />
            <Skeleton className={`h-5 w-28 rounded ${sk}`} />
            <Skeleton className={`h-5 w-32 rounded ${sk}`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className={`h-8 w-20 rounded-lg ${sk}`} />
            <Skeleton className={`h-8 w-20 rounded-lg ${sk}`} />
            <Skeleton className={`h-8 w-24 rounded-lg ${sk}`} />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className={`h-6 w-full max-w-3xl ${sk}`} />
          <Skeleton className={`h-6 w-[80%] max-w-2xl ${sk}`} />
          <Skeleton className={`h-3.5 w-48 ${sk}`} />
        </div>

        <div className={`flex flex-col gap-2 p-3 sm:flex-row sm:items-center ${SALES_INTEL_PANEL_SOFT}`}>
          <Skeleton className={`h-4 w-28 ${sk}`} />
          <Skeleton className={`h-9 w-full flex-1 rounded-lg ${sk}`} />
          <Skeleton className={`h-9 w-20 rounded-lg ${sk}`} />
        </div>
      </div>

      <div className="mb-5 flex gap-2 border-b border-white/[0.06] pb-0">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className={`h-9 w-24 rounded-t-lg ${sk}`} />
        ))}
      </div>

      <div className={`space-y-4 p-4 sm:p-5 ${SALES_INTEL_PANEL_SOFT}`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className={`h-3 w-20 ${sk}`} />
              <Skeleton className={`h-4 w-36 ${sk}`} />
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-white/[0.06] pt-4">
          <Skeleton className={`h-3 w-16 ${sk}`} />
          <Skeleton className={`h-4 w-48 ${sk}`} />
        </div>
      </div>
    </div>
  );
}
