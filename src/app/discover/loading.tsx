import { Skeleton } from "@/components/ui/skeleton";

export default function DiscoverLoading() {
  return (
    <div className="flex flex-col min-h-dvh">
      {/* Top loading bar */}
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
        <div className="loading-bar h-full bg-primary" />
      </div>

      {/* Header skeleton */}
      <header className="sticky top-0 z-40 bg-background border-b border-border px-4 h-14 flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-8 rounded-full" />
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </header>

      {/* Filter bar skeleton */}
      <div className="px-4 pt-3 pb-2 flex gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-full" />
        ))}
      </div>

      {/* Restaurant list skeleton */}
      <div className="flex-1 px-0 divide-y divide-border">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 pl-3 pr-4 py-3">
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
