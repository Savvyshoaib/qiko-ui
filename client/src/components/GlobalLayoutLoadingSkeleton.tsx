import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLayoutLoadingSkeleton() {
  return (
    <div className="h-screen bg-[#050810] flex overflow-hidden">
      <aside className="h-screen w-[200px] border-r border-white/5 bg-[#060b15] p-3">
        <div className="h-full flex flex-col">
          <div className="mb-6">
            <Skeleton className="h-7 w-16 bg-white/10" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-9 w-full rounded-xl bg-white/10" />
            <Skeleton className="h-9 w-full rounded-xl bg-white/10" />
            <Skeleton className="h-9 w-full rounded-xl bg-white/10" />
            <Skeleton className="h-9 w-full rounded-xl bg-white/10" />
          </div>

          <div className="mt-auto">
            <Skeleton className="h-9 w-full rounded-xl bg-white/10" />
          </div>
        </div>
      </aside>

      <main className="h-screen flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-9 w-64 rounded-md bg-white/10" />
                <Skeleton className="h-4 w-44 rounded-md bg-white/10" />
              </div>

              <div className="rounded-2xl border border-white/10 p-4 space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  <Skeleton className="h-22 rounded-lg bg-white/10" />
                  <Skeleton className="h-22 rounded-lg bg-white/10" />
                  <Skeleton className="h-22 rounded-lg bg-white/10" />
                  <Skeleton className="h-22 rounded-lg bg-white/10" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-3 rounded bg-white/20" />
                  <Skeleton className="h-3 rounded bg-white/20" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 p-4 space-y-3">
                <Skeleton className="h-5 w-28 rounded-md bg-white/10" />
                <Skeleton className="h-22 w-full rounded-xl bg-white/10" />
                <Skeleton className="h-22 w-full rounded-xl bg-white/10" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-28 rounded-md bg-white/10" />
                <Skeleton className="h-4 w-14 rounded-md bg-white/10" />
              </div>
              <Skeleton className="h-14 w-full rounded-2xl bg-white/10" />
              <Skeleton className="h-14 w-full rounded-2xl bg-white/10" />
              <Skeleton className="h-11 w-full rounded-2xl bg-white/10" />
              <Skeleton className="h-14 w-full rounded-2xl bg-white/10" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
