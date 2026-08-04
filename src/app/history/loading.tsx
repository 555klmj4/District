import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
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

      {/* Activity rows skeleton */}
      <div className="px-4 pt-3 divide-y divide-border">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="py-3 flex items-start gap-3">
            <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
