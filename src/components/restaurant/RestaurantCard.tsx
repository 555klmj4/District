"use client";
import Link from "next/link";
import { UtensilsCrossed, MapPin, Navigation } from "lucide-react";
import { RatingBadge } from "./RatingBadge";
import { StatusIndicator } from "./StatusIndicator";
import { MapLaunchButton } from "./MapLaunchButton";
import { BookmarkButton } from "@/components/bookmark/BookmarkButton";
import { cn } from "@/lib/utils";
import type { Restaurant } from "@/shared/types/restaurant";

const PRICE_LABELS: Record<number, string> = {
  1: "$",
  2: "$$",
  3: "$$$",
  4: "$$$$",
};

interface RestaurantCardProps {
  restaurant: Restaurant;
  showBookmark?: boolean;
  className?: string;
}

export function RestaurantCard({
  restaurant,
  showBookmark = true,
  className,
}: RestaurantCardProps) {
  const {
    id,
    name,
    cuisine_primary,
    district,
    price_level,
    rating_aggregate,
    rating_google,
    rating_openrice,
    rating_yelp,
    google_place_id,
    lat,
    lng,
    hours,
    is_open_now,
    is_bookmarked,
    distance_km,
  } = restaurant;

  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-border shadow-sm p-4 flex flex-col gap-3 hover:shadow-md hover:border-primary/20 transition-all",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Link
            href={`/restaurants/${id}`}
            className="font-semibold text-foreground leading-snug hover:text-primary transition-colors line-clamp-1"
          >
            {name}
          </Link>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {cuisine_primary && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/8 text-primary px-2 py-0.5 rounded-full">
                <UtensilsCrossed className="w-3 h-3" />
                {cuisine_primary}
              </span>
            )}
            {district && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {district}
              </span>
            )}
            {price_level && (
              <span className="text-xs font-medium text-muted-foreground">
                {PRICE_LABELS[price_level]}
              </span>
            )}
          </div>
        </div>
        {showBookmark && (
          <BookmarkButton restaurantId={id} isBookmarked={is_bookmarked ?? false} />
        )}
      </div>

      {/* Ratings + Status */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <RatingBadge
          aggregate={rating_aggregate}
          google={rating_google}
          openrice={rating_openrice}
          yelp={rating_yelp}
          compact
        />
        <div className="flex items-center gap-3">
          {distance_km != null && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Navigation className="w-3 h-3" />
              {distance_km < 1
                ? `${Math.round(distance_km * 1000)}m`
                : `${distance_km.toFixed(1)}km`}
            </span>
          )}
          <StatusIndicator hours={hours} isOpenNow={is_open_now} />
        </div>
      </div>

      {/* Footer */}
      <MapLaunchButton
        name={name}
        placeId={google_place_id}
        lat={lat}
        lng={lng}
        size="sm"
        className="self-start"
      />
    </div>
  );
}
