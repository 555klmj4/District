"use client";
import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RestaurantCard } from "@/components/restaurant/RestaurantCard";
import { FilterBar, type FilterState } from "./FilterBar";
import { LocationPrompt } from "./LocationPrompt";
import { ImportDialog } from "@/components/bookmark/ImportDialog";
import { useLocation } from "@/client/hooks/useLocation";
import { trpc } from "@/client/trpc";
import type { Restaurant } from "@/shared/types/restaurant";

const DEFAULT_FILTERS: FilterState = {
  search: "",
  cuisine: "",
  open_now: false,
  sort: "newest",
};

export function DiscoverFeed() {
  const location = useLocation();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showLocationPrompt, setShowLocationPrompt] = useState(
    location.granted === null
  );

  const query = trpc.restaurants.list.useQuery(
    {
      search: filters.search || undefined,
      cuisine: filters.cuisine || undefined,
      open_now: filters.open_now || undefined,
      sort: filters.sort,
      lat: location.lat ?? undefined,
      lng: location.lng ?? undefined,
      max_km: location.lat ? 20 : undefined,
      limit: 30,
    },
    { staleTime: 30_000 }
  );

  const restaurants = query.data?.items ?? [];

  const handleLocationRequest = () => {
    setShowLocationPrompt(false);
    location.request();
  };

  return (
    <div>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        hasLocation={location.lat != null}
      />

      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {query.isLoading
            ? "Loading…"
            : `${restaurants.length} restaurant${restaurants.length !== 1 ? "s" : ""}`}
        </span>
        <ImportDialog />
      </div>

      {showLocationPrompt && !location.lat && (
        <LocationPrompt onRequest={handleLocationRequest} />
      )}

      <div className="px-4 pb-4 space-y-3">
        {query.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))
        ) : restaurants.length === 0 ? (
          <EmptyState />
        ) : (
          restaurants.map((r) => (
            <RestaurantCard key={r.id} restaurant={r as Restaurant} />
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <div className="w-14 h-14 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-4">
        <UtensilsCrossed className="w-7 h-7 text-primary/60" />
      </div>
      <p className="font-medium text-foreground">No restaurants yet</p>
      <p className="text-sm mt-1">
        Paste a Google Maps or Yelp link to get started.
      </p>
    </div>
  );
}
