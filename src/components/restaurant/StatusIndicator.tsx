"use client";
import { cn } from "@/lib/utils";
import type { WeeklyHours } from "@/shared/types/restaurant";

interface StatusIndicatorProps {
  hours: WeeklyHours | null;
  isOpenNow?: boolean;
  label?: string;
  className?: string;
}

export function StatusIndicator({
  isOpenNow,
  label,
  className,
}: StatusIndicatorProps) {
  if (isOpenNow == null) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        Hours unknown
      </span>
    );
  }

  return (
    <span
      className={cn(
        "text-xs font-medium flex items-center gap-1",
        isOpenNow ? "text-[var(--open-green)]" : "text-muted-foreground",
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          isOpenNow ? "bg-[var(--open-green)]" : "bg-muted-foreground"
        )}
      />
      {label ?? (isOpenNow ? "Open now" : "Closed")}
    </span>
  );
}
