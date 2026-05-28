"use client";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { WeeklyHours } from "@/shared/types/restaurant";

interface StatusIndicatorProps {
  hours: WeeklyHours | null;
  isOpenNow?: boolean;
  label?: string;
  className?: string;
}

export function StatusIndicator({ isOpenNow, label, className }: StatusIndicatorProps) {
  const { t } = useTranslation();

  if (isOpenNow == null) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {t("hours_unknown")}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "text-xs font-medium flex items-center gap-1.5",
        isOpenNow ? "text-[var(--open-green)]" : "text-muted-foreground",
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          isOpenNow ? "bg-[var(--open-green)] animate-pulse" : "bg-muted-foreground"
        )}
      />
      {label ?? (isOpenNow ? t("open_now_label") : t("closed_label"))}
    </span>
  );
}
