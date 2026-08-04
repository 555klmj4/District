import { Skeleton } from "@/components/ui/skeleton";

export default function RecommendLoading() {
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

      {/* Prompt + suggest button skeleton */}
      <div className="flex-1 px-4 pt-4 space-y-4">
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full ml-auto" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
