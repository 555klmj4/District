import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingBadgeProps {
  aggregate: string | null;
  google?: string | null;
  openrice?: string | null;
  googleCount?: number | null;
  openriceCount?: number | null;
  compact?: boolean;
  className?: string;
}

export function RatingBadge({
  aggregate,
  compact = false,
  className,
}: RatingBadgeProps) {
  const score = aggregate ? parseFloat(aggregate) : null;

  if (!score) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        No rating
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-semibold text-primary",
        compact ? "text-sm" : "text-base font-bold",
        className
      )}
    >
      <Star className={cn("fill-primary", compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
      {score.toFixed(1)}
    </span>
  );
}
