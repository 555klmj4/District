import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingBadgeProps {
  aggregate: string | null;
  google?: string | null;
  openrice?: string | null;
  yelp?: string | null;
  googleCount?: number | null;
  compact?: boolean;
  className?: string;
}

export function RatingBadge({
  aggregate,
  google,
  openrice,
  yelp,
  googleCount,
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

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-sm font-semibold text-primary",
          className
        )}
      >
        <Star className="w-3.5 h-3.5 fill-primary" />
        {score.toFixed(1)}
      </span>
    );
  }

  const sources = [
    google ? { label: "G", value: google, title: "Google" } : null,
    openrice ? { label: "OR", value: openrice, title: "OpenRice" } : null,
    yelp ? { label: "Y", value: yelp, title: "Yelp" } : null,
  ].filter(Boolean);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="inline-flex items-center gap-1 text-base font-bold text-primary">
        <Star className="w-4 h-4 fill-primary" />
        {score.toFixed(1)}
      </span>
      {sources.length > 0 && (
        <div className="flex gap-1.5">
          {sources.map((s) => (
            <span
              key={s!.label}
              title={s!.title}
              className="text-xs text-muted-foreground"
            >
              {s!.label}&nbsp;{parseFloat(s!.value).toFixed(1)}
            </span>
          ))}
          {googleCount != null && googleCount > 0 && (
            <span className="text-xs text-muted-foreground">
              ({googleCount.toLocaleString()})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
