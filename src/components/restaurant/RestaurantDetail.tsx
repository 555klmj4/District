"use client";
import Link from "next/link";
import { ArrowLeft, Phone, Globe, Clock, CalendarCheck, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RatingBadge } from "./RatingBadge";
import { StatusIndicator } from "./StatusIndicator";
import { MapLaunchButton } from "./MapLaunchButton";
import { BookmarkButton } from "@/components/bookmark/BookmarkButton";
import { trpc } from "@/client/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeeklyHours } from "@/shared/types/restaurant";

const DAY_LABELS = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google Maps",
  openrice: "OpenRice",
  yelp: "Yelp",
  manual: "Manual",
};

interface RestaurantDetailProps {
  id: string;
}

export function RestaurantDetail({ id }: RestaurantDetailProps) {
  const { data: restaurant, isLoading } = trpc.restaurants.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="px-4 space-y-4 pt-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="px-4 py-16 text-center text-muted-foreground">
        <p>Restaurant not found.</p>
        <Link href="/discover" className="text-primary text-sm mt-2 block">
          ← Back to discover
        </Link>
      </div>
    );
  }

  const hours = restaurant.hours as WeeklyHours | null;
  const sourcePlatforms = restaurant.sources ?? [];

  // Booking detection from source raw_data
  const googleSource = sourcePlatforms.find((s) => s.platform === "google");
  const openriceSource = sourcePlatforms.find((s) => s.platform === "openrice");
  const googleReservable = (googleSource?.raw_data as Record<string, unknown> | null)?.reservable === true;
  const openriceBookable = (openriceSource?.raw_data as Record<string, unknown> | null)?.has_booking === true;

  // OpenRice search URL fallback
  const openriceSearchUrl = `https://www.openrice.com/en/hongkong/restaurants?what=${encodeURIComponent(restaurant.name)}`;

  return (
    <div className="pb-8">
      {/* Back nav */}
      <div className="px-4 py-3">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      {/* Header */}
      <div className="px-4 pb-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{restaurant.name}</h1>
          <BookmarkButton
            restaurantId={restaurant.id}
            isBookmarked={restaurant.is_bookmarked ?? false}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {restaurant.cuisine_primary && (
            <Badge variant="secondary">{restaurant.cuisine_primary}</Badge>
          )}
          {restaurant.cuisine_tags?.filter((t) => t !== restaurant.cuisine_primary)
            .slice(0, 3)
            .map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          {restaurant.price_level && (
            <span className="text-sm text-muted-foreground">
              {"$".repeat(restaurant.price_level)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <StatusIndicator
            hours={hours}
            isOpenNow={restaurant.is_open_now}
          />
        </div>

        <RatingBadge
          aggregate={restaurant.rating_aggregate}
          google={restaurant.rating_google}
          openrice={restaurant.rating_openrice}
          yelp={restaurant.rating_yelp}
          googleCount={restaurant.rating_count_google}
        />

        {/* Booking badges */}
        {(googleReservable || openriceBookable) && (
          <div className="flex flex-wrap gap-2">
            {googleReservable && (
              <a
                href={`https://www.google.com/maps/place/?q=place_id:${restaurant.google_place_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
              >
                <CalendarCheck className="w-3 h-3" />
                Reserve via Google
              </a>
            )}
            {openriceBookable && openriceSource && (
              <a
                href={openriceSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors"
              >
                <CalendarCheck className="w-3 h-3" />
                Book via OpenRice
              </a>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* ℹ️ Info */}
      <div className="px-4 py-4 space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">ℹ️ Info</p>
        {restaurant.address && (
          <div className="text-sm">
            <p className="text-muted-foreground text-xs mb-1">Address</p>
            <p className="text-foreground">{restaurant.address}</p>
          </div>
        )}
        {restaurant.phone && (
          <a
            href={`tel:${restaurant.phone}`}
            className="flex items-center gap-2 text-sm text-foreground hover:text-primary"
          >
            <Phone className="w-4 h-4 text-muted-foreground" />
            {restaurant.phone}
          </a>
        )}
        {restaurant.website && (
          <a
            href={restaurant.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-foreground hover:text-primary truncate"
          >
            <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="truncate">{restaurant.website.replace(/^https?:\/\//, "")}</span>
          </a>
        )}
      </div>

      {/* 🕐 Hours */}
      {hours && (
        <>
          <Separator />
          <div className="px-4 py-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              🕐 Hours
            </p>
            <div className="space-y-1.5">
              {(Object.keys(DAY_LABELS) as Array<keyof typeof DAY_LABELS>).map((key) => {
                const day = hours[key];
                return (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">
                      {DAY_LABELS[key]}
                    </span>
                    <span className="text-foreground">
                      {day ? (
                        day.closed ? (
                          "Closed"
                        ) : (
                          `${day.open} – ${day.close}`
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 🔗 Links */}
      <Separator />
      <div className="px-4 py-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">🔗 Links</p>
        <div className="flex flex-wrap gap-2">
          {/* Existing sources */}
          {sourcePlatforms.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {PLATFORM_LABELS[s.platform] ?? s.platform}
            </a>
          ))}
          {/* OpenRice search link if no OpenRice source yet */}
          {!openriceSource && (
            <a
              href={openriceSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Search OpenRice
            </a>
          )}
        </div>
      </div>

      {/* Map button */}
      <div className="px-4 pt-2">
        <MapLaunchButton
          name={restaurant.name}
          placeId={restaurant.google_place_id}
          lat={restaurant.lat}
          lng={restaurant.lng}
          className="w-full"
        />
      </div>
    </div>
  );
}
