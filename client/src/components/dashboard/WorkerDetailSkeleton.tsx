import { Skeleton } from "@/components/ui/skeleton";

export default function WorkerDetailSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="bg-[#0a0f1a]/80 border-b border-white/5 backdrop-blur-xl">
        <div className="px-6 py-4">
          <Skeleton className="h-8 w-32 rounded-lg bg-white/10" />
        </div>

        <div className="bg-gradient-to-r from-slate-800/30 to-slate-700/20 px-6 py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-xl bg-white/10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-44 rounded-md bg-white/10" />
              <Skeleton className="h-4 w-56 rounded-md bg-white/10" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
          </div>
        </div>

        <div className="px-6 py-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Skeleton className="h-[72px] rounded-2xl bg-emerald-500/10 border border-emerald-400/20" />
            <Skeleton className="h-[72px] rounded-2xl bg-white/10 border border-white/10" />
          </div>
        </div>

        <div className="border-t border-white/5 px-6 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24 rounded-xl bg-white/10" />
            <Skeleton className="h-8 w-16 rounded-xl bg-white/10" />
            <Skeleton className="h-8 w-16 rounded-xl bg-white/10" />
            <Skeleton className="h-8 w-14 rounded-xl bg-white/10" />
            <Skeleton className="h-8 w-28 rounded-xl bg-white/10" />
            <Skeleton className="h-8 w-20 rounded-xl bg-white/10" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <Skeleton className="h-9 w-52 rounded-md bg-white/10" />
          <Skeleton className="h-4 w-[26rem] rounded-md bg-white/10" />
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <Skeleton className="h-6 w-48 rounded-md bg-white/10" />
            <Skeleton className="h-24 w-full rounded-xl bg-white/10" />
            <Skeleton className="h-20 w-full rounded-xl bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
