"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, Globe, CalendarCheck, ExternalLink, Link2, Trash2, Share2, Check, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { RatingBadge } from "./RatingBadge";
import { StatusIndicator } from "./StatusIndicator";
import { MapLaunchButton } from "./MapLaunchButton";
import { ColorPicker } from "./ColorPicker";
import { GlassCircleButton } from "@/components/layout/GlassCircleButton";
import { trpc } from "@/client/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { hasChinese, bilingualName } from "@/lib/restaurant-name";
import type { WeeklyHours } from "@/shared/types/restaurant";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/router";

type RestaurantDetailOutput = inferRouterOutputs<AppRouter>["restaurants"]["getById"];

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const DAY_ABBR: Record<string, { en: string; zh: string }> = {
  mon: { en: "Mon", zh: "週一" },
  tue: { en: "Tue", zh: "週二" },
  wed: { en: "Wed", zh: "週三" },
  thu: { en: "Thu", zh: "週四" },
  fri: { en: "Fri", zh: "週五" },
  sat: { en: "Sat", zh: "週六" },
  sun: { en: "Sun", zh: "週日" },
};

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google Maps",
  openrice: "OpenRice",
  manual: "Manual",
};

interface RestaurantDetailProps {
  id: string;
  initialData?: RestaurantDetailOutput;
  initialDataUpdatedAt?: number;
}


export function RestaurantDetail({ id, initialData, initialDataUpdatedAt }: RestaurantDetailProps) {
  const { t, lang } = useTranslation();
  const zh = lang === "zh-TW";
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedMap, setCopiedMap] = useState(false);
  const [copiedOpenRice, setCopiedOpenRice] = useState(false);
  const [visiblePhotos, setVisiblePhotos] = useState(4);
  const [failedPhotos, setFailedPhotos] = useState<Set<number>>(new Set());

  useEffect(() => { setVisiblePhotos(4); setFailedPhotos(new Set()); }, [id]);
  const utils = trpc.useUtils();

  const { data: restaurant, isLoading } = trpc.restaurants.getById.useQuery(
    { id, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    { staleTime: 30_000, initialData, initialDataUpdatedAt },
  );

  const deleteMutation = trpc.restaurants.delete.useMutation({
    onSuccess: () => {
      void utils.restaurants.list.invalidate();
      router.replace("/discover");
    },
  });

  const enrichMutation = trpc.ingestion.enrichById.useMutation({
    onSuccess: () => {
      void utils.restaurants.getById.invalidate({ id });
    },
  });

  const sourcePlatforms = restaurant?.sources ?? [];
  const openriceSource = sourcePlatforms.find((s) => s.platform === "openrice");
  // Earliest source row = the platform link the user actually pasted to add
  // this restaurant — supplementary sources (e.g. Google data auto-fetched
  // alongside an OpenRice import) are always inserted after it.
  const originSource = useMemo(
    () => [...sourcePlatforms].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0],
    [sourcePlatforms]
  );
  // Non-Google, non-OpenRice links
  const otherLinks = useMemo(
    () => sourcePlatforms.filter((s) => s.platform !== "google" && s.platform !== "openrice"),
    [sourcePlatforms]
  );
  const filteredTags = useMemo(() => {
    if (!restaurant) return [];
    return (restaurant.cuisine_tags ?? []).filter((tag) => {
      const tl = tag.toLowerCase();
      const pl = (restaurant.cuisine_primary ?? "").toLowerCase();
      const zl = (restaurant.cuisine_primary_zh ?? "").toLowerCase();
      return tl !== pl && tl !== zl && !tl.includes(pl) && !pl.includes(tl);
    }).slice(0, 3);
  }, [restaurant]);

  // Auto-refresh Google data when photos or Chinese name are missing, but only
  // if data is stale (>7 days). A missing OpenRice link is checked separately,
  // unstaled — its absence doesn't become "more true" over time the way Google
  // data going stale does, so it shouldn't wait behind the same 7-day gate.
  useEffect(() => {
    if (!restaurant) return;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const googleStale =
      !restaurant.enriched_at || new Date(restaurant.enriched_at).getTime() <= sevenDaysAgo;
    const hasPhotos = sourcePlatforms.some(
      (s) => s.platform === "google" && (s.raw_data as Record<string, unknown> | null)?.photos != null
    );
    const needsGoogleRefresh = googleStale && (!hasPhotos || !restaurant.name_zh);
    const needsOpenRice = !openriceSource;
    const needsEnrich = (needsGoogleRefresh || needsOpenRice) && !!restaurant.google_place_id;
    if (needsEnrich && !enrichMutation.isPending && !enrichMutation.isSuccess) {
      enrichMutation.mutate({ restaurant_id: id });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id]);

  // A photo that fails to load means its cached Google photo reference has
  // gone stale — unlike "missing entirely", the 7-day gate above can't catch
  // this, so refresh as soon as we observe it (still only once per visit).
  useEffect(() => {
    if (failedPhotos.size === 0 || !restaurant?.google_place_id) return;
    if (!enrichMutation.isPending && !enrichMutation.isSuccess) {
      enrichMutation.mutate({ restaurant_id: id });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failedPhotos]);

  if (isLoading) {
    return (
      <div className="px-4 space-y-3 pt-4">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-36 rounded-lg" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="px-4 py-16 text-center text-muted-foreground">
        <p>{t("not_found")}</p>
        <Link href="/discover" className="text-primary text-sm mt-2 block">
          ← {t("back")}
        </Link>
      </div>
    );
  }

  const hours = restaurant.hours as WeeklyHours | null;

  const displayName    = (zh && hasChinese(restaurant.name_zh))            ? restaurant.name_zh!            : restaurant.name;
  const titleName      = bilingualName(restaurant.name, restaurant.name_zh);
  const displayAddress = (zh && hasChinese(restaurant.address_zh))         ? restaurant.address_zh!         : restaurant.address;
  const displayCuisine = (zh && hasChinese(restaurant.cuisine_primary_zh)) ? restaurant.cuisine_primary_zh! : restaurant.cuisine_primary;

  const googleSource = sourcePlatforms.find((s) => s.platform === "google");
  const googleRawData = googleSource?.raw_data as Record<string, unknown> | null;
  const googlePhotos = (googleRawData?.photos as Array<{ name: string }> | undefined) ?? [];
  const googleReservable = googleRawData?.reservable === true;
  const openriceBookable = (openriceSource?.raw_data as Record<string, unknown> | null)?.has_booking === true;

  const priceRange = googleRawData?.priceRange as {
    startPrice?: { currencyCode?: string; units?: string };
    endPrice?: { currencyCode?: string; units?: string };
  } | undefined;
  const priceRangeStr = (() => {
    if (!priceRange?.startPrice?.units) return null;
    const currency = priceRange.startPrice.currencyCode ?? "";
    const start = priceRange.startPrice.units;
    const end = priceRange.endPrice?.units;
    return end && end !== start ? `${currency} ${start}–${end}` : `${currency} ${start}+`;
  })();

  const openriceUrl = openriceSource?.url
    ?? `https://www.openrice.com/zh/hongkong/restaurants?what=${encodeURIComponent(restaurant.name_zh ?? restaurant.name)}`;

  const googleMapsUrl = restaurant.google_place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayName)}&query_place_id=${restaurant.google_place_id}`
    : restaurant.lat && restaurant.lng
    ? `https://www.google.com/maps/search/?api=1&query=${parseFloat(restaurant.lat)},${parseFloat(restaurant.lng)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayName)}`;

  const copyToClipboard = (url: string, setCopied: (v: boolean) => void) => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareOrCopy = (url: string, title: string, setCopied: (v: boolean) => void) => {
    if (typeof navigator.share === "function") {
      navigator.share({ title, url }).catch(() => {
        // user cancelled the share sheet (AbortError) or share failed silently — no fallback
        // needed, the OS already presented its own UI for this
      });
    } else {
      copyToClipboard(url, setCopied);
    }
  };

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pb-3 space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight leading-snug">{titleName}</h1>

        {originSource && (
          <a
            href={originSource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Link2 className="w-3 h-3" />
            {t("added_via")} {PLATFORM_LABELS[originSource.platform] ?? originSource.platform}
          </a>
        )}

        {/* Cuisine + price — color picker fixed right */}
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm flex-1 min-w-0">
            {displayCuisine && (
              <span className="text-primary font-medium">{displayCuisine}</span>
            )}
            {filteredTags.map((tag) => (
              <span key={tag} className="text-muted-foreground">{tag}</span>
            ))}
            {restaurant.price_level && (
              <span className="text-muted-foreground">{"$".repeat(restaurant.price_level)}</span>
            )}
          </div>
          <ColorPicker
            restaurantId={restaurant.id}
            activeTags={restaurant.color_tags ?? []}
            className="shrink-0"
          />
        </div>

        {/* Rating + status */}
        <div className="flex items-center gap-3">
          <RatingBadge aggregate={restaurant.rating_aggregate} />
          <StatusIndicator hours={hours} isOpenNow={restaurant.is_open_now} />
        </div>

        {/* Reservation availability */}
        <div className="flex flex-wrap gap-3 pt-0.5">
          {openriceBookable && (
            <a
              href={openriceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[var(--open-green)] hover:underline"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              {t("book_openrice")}
            </a>
          )}
          {googleReservable && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[var(--open-green)] hover:underline"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              {t("reserve_google")}
            </a>
          )}
        </div>
      </div>

      <Separator />

      {/* Info */}
      <div className="px-4 py-3 space-y-2">
        {priceRangeStr && (
          <div className="flex gap-3 text-sm">
            <span className="text-muted-foreground shrink-0 w-14">{t("price_label")}</span>
            <span className="text-foreground">{priceRangeStr}</span>
          </div>
        )}
        {displayAddress && (
          <div className="flex gap-3 text-sm">
            <span className="text-muted-foreground shrink-0 w-14">{t("address_label")}</span>
            <span className="text-foreground">{displayAddress}</span>
          </div>
        )}
        {restaurant.phone && (
          <div className="flex gap-3 text-sm items-center">
            <span className="text-muted-foreground shrink-0 w-14">
              <Phone className="w-3.5 h-3.5" />
            </span>
            <a href={`tel:${restaurant.phone}`} className="text-foreground hover:text-primary">
              {restaurant.phone}
            </a>
          </div>
        )}
        {restaurant.website && (
          <div className="flex gap-3 text-sm items-center">
            <span className="text-muted-foreground shrink-0 w-14">
              <Globe className="w-3.5 h-3.5" />
            </span>
            <a
              href={restaurant.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary truncate"
            >
              {restaurant.website.replace(/^https?:\/\//, "")}
            </a>
          </div>
        )}
      </div>

      {/* Hours */}
      {hours && (
        <>
          <Separator />
          <div className="px-4 py-3">
            <div className="flex gap-3 text-sm">
              <span className="text-muted-foreground shrink-0 w-14">{t("hours_section")}</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 flex-1">
                {DAY_KEYS.map((dayKey) => {
                  const day = hours[dayKey as keyof WeeklyHours];
                  const label = DAY_ABBR[dayKey]?.[zh ? "zh" : "en"] ?? dayKey;
                  return (
                    <div key={dayKey} className="flex gap-2 text-sm">
                      <span className="text-muted-foreground shrink-0 w-7">{label}</span>
                      <span className={day ? "text-foreground tabular-nums" : "text-muted-foreground"}>
                        {day ? (day.closed ? t("closed_today") : `${day.open}–${day.close}`) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Signature dishes */}
      {(() => {
        const enDishes = restaurant.signature_dishes ?? [];
        const zhDishes = restaurant.signature_dishes_zh ?? [];
        if (enDishes.length === 0 && zhDishes.length === 0) return null;
        const primaryDishes = enDishes.length > 0 ? enDishes : zhDishes;
        const secondaryDishes = enDishes.length > 0 ? zhDishes : [];
        return (
          <>
            <Separator />
            <div className="px-4 py-3 space-y-2">
              <div className="flex gap-3 text-sm">
                <span className="text-muted-foreground shrink-0 w-14">{t("known_for")}</span>
                <span className="text-foreground">
                  {primaryDishes.join(", ")}
                  {secondaryDishes.length > 0 && ` (${secondaryDishes.join(", ")})`}
                </span>
              </div>
            </div>
          </>
        );
      })()}

      {/* Photos */}
      {googlePhotos.slice(0, visiblePhotos).some((_, i) => !failedPhotos.has(i)) && (
        <>
          <Separator />
          <div
            className="overflow-x-auto no-scrollbar flex gap-2 px-4 py-3"
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 120) {
                setVisiblePhotos((v) => Math.min(v + 4, googlePhotos.length));
              }
            }}
          >
            {googlePhotos.slice(0, visiblePhotos).map((photo, i) =>
              failedPhotos.has(i) ? null : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  loading={i === 0 ? "eager" : "lazy"}
                  src={`/api/places/photo?name=${encodeURIComponent(photo.name)}&maxWidth=600`}
                  alt={`${displayName} photo ${i + 1}`}
                  className="h-40 w-auto rounded-xl object-cover shrink-0"
                  onError={() => setFailedPhotos((prev) => new Set(prev).add(i))}
                />
              )
            )}
          </div>
        </>
      )}

      {/* Maps + OpenRice buttons */}
      <Separator />
      <div className="px-4 py-3 space-y-2">
        <div className="flex gap-2">
          <MapLaunchButton
            name={displayName}
            placeId={restaurant.google_place_id}
            lat={restaurant.lat}
            lng={restaurant.lng}
            className="flex-1"
          />
          <a
            href={openriceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "secondary" }), "gap-2 flex-1")}
          >
            <ExternalLink className="w-4 h-4" />
            OpenRice
          </a>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => shareOrCopy(googleMapsUrl, displayName, setCopiedMap)}
            className={cn(buttonVariants({ variant: "secondary" }), "gap-2 flex-1")}
          >
            {copiedMap ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copiedMap ? t("link_copied") : t("share_maps_link")}
          </button>
          <button
            onClick={() => shareOrCopy(openriceUrl, displayName, setCopiedOpenRice)}
            className={cn(buttonVariants({ variant: "secondary" }), "gap-2 flex-1")}
          >
            {copiedOpenRice ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copiedOpenRice ? t("link_copied") : t("share_openrice_link")}
          </button>
        </div>
      </div>

      {/* Other links (Yelp, etc.) */}
      {otherLinks.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {otherLinks.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                {PLATFORM_LABELS[s.platform] ?? s.platform}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="px-4 pt-2 pb-2">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 text-sm text-destructive/60 hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t("delete_restaurant")}
          </button>
        ) : (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2.5">
            <p className="text-sm text-destructive/80">{t("delete_confirm")}</p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteMutation.mutate({ id })}
                disabled={deleteMutation.isPending}
                className="flex-1 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t("delete_confirm_button")}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                {t("delete_cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      <GlassCircleButton
        side="right"
        aria-label={t("back")}
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-5 h-5" />
      </GlassCircleButton>
    </div>
  );
}
