"use client";
import { memo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Navigation, Trash2, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RatingBadge } from "./RatingBadge";
import { StatusIndicator } from "./StatusIndicator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/client/trpc";
import { useTranslation } from "@/lib/i18n";
import { districtZh } from "@/lib/district-zh";
import { colorHex, STAR_COLOR_CLASS, STAR_BG_LIGHT_CLASS } from "@/lib/colors";
import { getColorTagOverride } from "@/lib/colorTagOverride";
import { cn } from "@/lib/utils";
import { hasChinese, bilingualName } from "@/lib/restaurant-name";
import type { Restaurant } from "@/shared/types/restaurant";

const PRICE_LABELS: Record<number, string> = { 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };
const SWIPE_THRESHOLD = 80;
const MAX_DRAG = 140;

interface RestaurantCardProps {
  restaurant: Restaurant;
  className?: string;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  navigateOnClick?: boolean;
}

export const RestaurantCard = memo(function RestaurantCard({ restaurant, className, isSelected, onSelect, navigateOnClick }: RestaurantCardProps) {
  const router = useRouter();
  const { lang, t } = useTranslation();
  const zh = lang === "zh-TW";
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const utils = trpc.useUtils();

  const deleteMutation = trpc.restaurants.delete.useMutation({
    onSuccess: () => {
      void utils.restaurants.list.invalidate();
      setConfirmDeleteOpen(false);
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to delete restaurant");
    },
  });

  const starMutation = trpc.stars.toggle.useMutation({
    onSuccess: (data) => {
      toast.success(data.starred ? t("star_added_toast") : t("star_removed_toast"));
      void utils.restaurants.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to update star");
    },
  });

  const dragStartX = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0]!.clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0]!.clientX - dragStartX.current;
    setDragX(Math.max(-MAX_DRAG, Math.min(dx, 0)));
  };

  const handleTouchEnd = () => {
    if (dragX < -SWIPE_THRESHOLD) {
      setConfirmDeleteOpen(true);
    }
    setIsDragging(false);
    setDragX(0);
  };

  const {
    id,
    name, name_zh,
    cuisine_primary, cuisine_primary_zh,
    district, district_zh,
    price_level,
    price_range_str,
    rating_aggregate,
    rating_google,
    rating_openrice,
    hours,
    is_open_now,
    distance_km,
    color_tags,
    is_starred,
  } = restaurant;

  const activeTags = getColorTagOverride(id) ?? color_tags ?? [];

  const displayName     = bilingualName(name, name_zh);
  const displayCuisine  = (zh && hasChinese(cuisine_primary_zh)) ? cuisine_primary_zh! : cuisine_primary;
  const displayDistrict = zh
    ? (hasChinese(district_zh) ? district_zh! : districtZh(district) ?? district)
    : district;

  return (
    <div className={cn("relative overflow-hidden group", className)}>
      <div
        className="absolute inset-0 flex items-center justify-end pr-4 bg-destructive/10"
        style={{ opacity: Math.max(0, Math.min(-dragX / SWIPE_THRESHOLD, 1)) }}
      >
        <Trash2 className="w-5 h-5 text-destructive" />
      </div>
      <div
        className={cn(
          "flex flex-col",
          isSelected ? "bg-primary/8" : is_starred ? STAR_BG_LIGHT_CLASS : "bg-background"
        )}
        onClick={() => {
          onSelect?.(id);
          if (navigateOnClick) router.push(`/restaurants/${id}`);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? "none" : "transform 200ms ease-out",
        }}
      >
      {/* Main row */}
      <div className="flex items-center gap-2 pl-1.5 pr-4 py-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            starMutation.mutate({ restaurant_id: id });
          }}
          disabled={starMutation.isPending}
          className="p-1.5 shrink-0 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
          aria-label={is_starred ? t("unstar_restaurant") : t("star_restaurant")}
          aria-pressed={!!is_starred}
        >
          <Star
            className={cn("w-4 h-4", is_starred ? STAR_COLOR_CLASS : "text-muted-foreground/60")}
            fill={is_starred ? "currentColor" : "none"}
          />
        </button>

        {/* Left: name + meta */}
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center gap-1">
            <Link
              href={`/restaurants/${id}`}
              className="font-semibold text-foreground text-sm leading-snug hover:text-primary transition-colors line-clamp-1"
            >
              {displayName}
            </Link>
          </span>

          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {displayCuisine && (
              <span className="text-xs text-primary font-medium">{displayCuisine}</span>
            )}
            {displayCuisine && (displayDistrict || price_range_str || price_level) && (
              <span className="text-xs text-muted-foreground">·</span>
            )}
            {displayDistrict && (
              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {displayDistrict}
              </span>
            )}
            {(price_range_str ?? (price_level ? PRICE_LABELS[price_level] : null)) && (
              <span className="text-xs text-muted-foreground">
                {price_range_str ?? PRICE_LABELS[price_level!]}
              </span>
            )}
            {activeTags.length > 0 && (
              <span className="flex gap-0.5 items-center">
                {activeTags.slice(0, 4).map((c) => (
                  <span
                    key={c}
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: colorHex(c) }}
                  />
                ))}
              </span>
            )}
          </div>
        </div>

        {/* Right: rating + distance + status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <RatingBadge
              aggregate={rating_aggregate}
              google={rating_google}
              openrice={rating_openrice}
              compact
            />
            <div className="flex items-center gap-1.5">
              {distance_km != null && (
                <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Navigation className="w-2.5 h-2.5" />
                  {distance_km < 1
                    ? `${Math.round(distance_km * 1000)}m`
                    : `${distance_km.toFixed(1)}km`}
                </span>
              )}
              <StatusIndicator hours={hours} isOpenNow={is_open_now} />
            </div>
          </div>
        </div>

        {/* Pointer-only delete — touch devices swipe left instead. */}
        <div className="hidden pointer-fine:group-hover:flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDeleteOpen(true);
            }}
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            aria-label={t("delete_restaurant")}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      </div>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t("delete_restaurant")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("delete_confirm")}</p>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(false)}
              className="flex-1 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              {t("delete_cancel")}
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate({ id: restaurant.id })}
              disabled={deleteMutation.isPending}
              className="flex-1 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t("delete_confirm_button")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
