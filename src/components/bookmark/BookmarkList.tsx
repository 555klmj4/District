"use client";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RestaurantCard } from "@/components/restaurant/RestaurantCard";
import { trpc } from "@/client/trpc";
import { cn } from "@/lib/utils";
import type { Restaurant } from "@/shared/types/restaurant";

const TABS = [
  { value: "all", label: "All" },
  { value: "visited", label: "Visited" },
  { value: "wishlist", label: "Wishlist" },
] as const;

export function BookmarkList() {
  const [tab, setTab] = useState<"all" | "visited" | "wishlist">("all");

  const query = trpc.bookmarks.list.useQuery({
    sort: "newest",
    visited: tab === "visited" ? true : tab === "wishlist" ? false : undefined,
    limit: 50,
  });

  const items = query.data?.items ?? [];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 px-4 py-3 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              tab === t.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setTab(t.value)}
          >
            {t.label}
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

function EmptyState({ tab }: { tab: string }) {
  const messages: Record<string, string> = {
    all: "No saved restaurants yet. Paste a link to add one.",
    visited: "Mark restaurants as visited to see them here.",
    wishlist: "Restaurants you haven't visited yet will appear here.",
  };
  return (
    <div className="text-center py-16 text-muted-foreground">
      <p className="text-4xl mb-3">{tab === "visited" ? "✅" : "🔖"}</p>
      <p className="text-sm">{messages[tab]}</p>
    </div>
  );
}
