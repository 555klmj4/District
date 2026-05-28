"use client";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RestaurantCard } from "@/components/restaurant/RestaurantCard";
import { trpc } from "@/client/trpc";
import { cn } from "@/lib/utils";
import { useTranslation, type TranslationKey } from "@/lib/i18n";
import type { Restaurant } from "@/shared/types/restaurant";

type Tab = "all" | "visited" | "wishlist";

export function BookmarkList() {
  const [tab, setTab] = useState<Tab>("all");
  const { t } = useTranslation();

  const TABS: { value: Tab; labelKey: TranslationKey }[] = [
    { value: "all", labelKey: "tab_all" },
    { value: "visited", labelKey: "tab_visited" },
    { value: "wishlist", labelKey: "tab_wishlist" },
  ];

  const query = trpc.bookmarks.list.useQuery({
    sort: "newest",
    visited: tab === "visited" ? true : tab === "wishlist" ? false : undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    limit: 50,
  });

  const items = query.data?.items ?? [];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 px-4 py-3 border-b border-border">
        {TABS.map(({ value, labelKey }) => (
          <button
            key={value}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              tab === value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            onClick={() => setTab(value)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 pt-4 space-y-3">
        {query.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))
        ) : items.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          items.map(({ restaurant, ...bookmark }) => (
            <RestaurantCard
              key={bookmark.id}
              restaurant={{ ...restaurant, is_bookmarked: true } as Restaurant}
            />
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const { t } = useTranslation();
  const msgKey: TranslationKey =
    tab === "visited" ? "bookmarks_empty_visited" :
    tab === "wishlist" ? "bookmarks_empty_wishlist" :
    "bookmarks_empty_all";

  return (
    <div className="text-center py-16 text-muted-foreground">
      <p className="text-4xl mb-3">{tab === "visited" ? "✅" : "🔖"}</p>
      <p className="text-sm">{t(msgKey)}</p>
    </div>
  );
}
