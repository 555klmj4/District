"use client";
import { History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/client/trpc";
import { useTranslation, type TranslationKey } from "@/lib/i18n";
import { colorHex } from "@/lib/colors";
import { bilingualName } from "@/lib/restaurant-name";

function formatTimestamp(date: Date, lang: string) {
  return date.toLocaleString(lang === "zh-TW" ? "zh-TW" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ActivityFeed() {
  const { t, lang } = useTranslation();
  const query = trpc.activity.list.useInfiniteQuery(
    { limit: 50 },
    { getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined }
  );
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  const verbKey = (action: string): TranslationKey => {
    switch (action) {
      case "restaurant_added": return "history_verb_added";
      case "restaurant_removed": return "history_verb_removed";
      case "color_tag_added": return "history_verb_color_added";
      case "color_tag_removed": return "history_verb_color_removed";
      case "restaurant_starred": return "history_verb_starred";
      case "restaurant_unstarred": return "history_verb_unstarred";
      default: return "history_verb_added";
    }
  };

  if (query.isLoading) {
    return (
      <div className="px-4 space-y-3 pt-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="w-14 h-14 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-4">
          <History className="w-7 h-7 text-primary/60" />
        </div>
        <p className="font-medium text-foreground">{t("history_empty_title")}</p>
        <p className="text-sm mt-1">{t("history_empty_body")}</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 divide-y divide-border">
      {items.map((entry) => {
        const displayName = bilingualName(entry.restaurant_name, entry.restaurant_name_zh);
        return (
          <div key={entry.id} className="py-3 flex items-start gap-3">
            {entry.color ? (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                style={{ backgroundColor: colorHex(entry.color) }}
              />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 bg-muted-foreground/30" />
            )}
            <div>
              <p className="text-sm">
                <span className="text-muted-foreground">{t(verbKey(entry.action))} </span>
                <span className="font-medium">{displayName}</span>
              </p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {formatTimestamp(entry.created_at, lang)}
              </p>
            </div>
          </div>
        );
      })}
      {query.hasNextPage && (
        <div className="py-4 flex justify-center">
          <button
            onClick={() => void query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="text-sm text-primary font-medium disabled:opacity-50"
          >
            {query.isFetchingNextPage ? t("loading") : t("history_load_more")}
          </button>
        </div>
      )}
    </div>
  );
}
