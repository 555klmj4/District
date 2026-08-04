import { Skeleton } from "@/components/ui/skeleton";

export default function RestaurantLoading() {
  return (
    <div className="flex flex-col min-h-dvh">
      {/* Top loading bar */}
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
        <div className="loading-bar h-full bg-primary" />
      </div>

      {/* Header skeleton */}
      <header className="sticky top-0 z-40 bg-background border-b border-border px-4 h-14 flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-5 w-36" />
      </header>

      {/* Content skeleton */}
      <div className="flex-1 px-4 pt-4 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" style={{ width: `${70 + (i % 3) * 10}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
