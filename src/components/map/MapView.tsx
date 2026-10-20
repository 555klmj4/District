"use client";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { SlidersHorizontal, TriangleAlert, UtensilsCrossed } from "lucide-react";
import { trpc } from "@/client/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";
import { useLocation } from "@/client/hooks/useLocation";
import { useFilterAlignment } from "@/client/hooks/useFilterAlignment";
import { useSwipeGesture } from "@/client/hooks/useSwipeGesture";
import { RestaurantMap } from "./RestaurantMap";
import { MapRestaurantList } from "./MapRestaurantList";
import { FilterBar, type FilterState } from "@/components/discover/FilterBar";
import { SearchDialog, SEARCH_BUTTON_BOTTOM } from "@/components/discover/SearchDialog";
import { GlassCircleButton } from "@/components/layout/GlassCircleButton";
import { ImportDialog } from "@/components/bookmark/ImportDialog";
import { districtToRegion } from "@/lib/district-zh";
import { getPersistedMapFilters, setPersistedMapFilters } from "@/lib/mapFilters";
import { useSafeAreaTop } from "@/lib/useSafeAreaTop";
import type { Restaurant } from "@/shared/types/restaurant";

interface MapViewProps {
  apiKey: string;
}

// Map gets the smaller share so the restaurant list below it has room to be
// useful; tune here if the split feels off in practice.
const MAP_HEIGHT_RATIO = 0.42;

export function MapView({ apiKey }: MapViewProps) {
  // PageShell header = h-11 (44px) content + top safe-area inset
  const HEADER_PX = 44 + useSafeAreaTop();
  const { t } = useTranslation();
  const location = useLocation();
  const { addLeft, setAddLeft } = useFilterAlignment();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ target: { lat: number; lng: number }; token: number } | null>(null);
  const focusTokenRef = useRef(0);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const swipeGesture = useSwipeGesture(() => setAddLeft(true), () => setAddLeft(false));
  const addButtonSwipeGesture = useSwipeGesture(() => setAddLeft(false), () => setAddLeft(true));
  const [filters, setFilters] = useState<FilterState>(
    () =>
      getPersistedMapFilters() ?? {
        search: "",
        region: "",
        district: "",
        includeColors: [],
        excludeColors: [],
        noColor: false,
        open_now: false,
        sort: "name",
      }
  );

  useEffect(() => {
    setPersistedMapFilters(filters);
  }, [filters]);

  const query = trpc.restaurants.list.useQuery(
    {
      search: filters.search || undefined,
      open_now: filters.open_now || undefined,
      sort: filters.sort,
      lat: location.lat ?? undefined,
      lng: location.lng ?? undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      limit: 500,
    },
    {}
  );

  const allRestaurants = useMemo(
    () => (query.data?.items ?? []).filter((r) => r.lat && r.lng),
    [query.data]
  );

  const availableColors = useMemo(() => {
    const set = new Set<string>();
    const source = filters.region
      ? allRestaurants.filter((r) => districtToRegion(r.district) === filters.region)
      : allRestaurants;
    for (const r of source)
      for (const c of r.color_tags ?? []) set.add(c);
    return set;
  }, [allRestaurants, filters.region]);

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    const source = filters.region
      ? allRestaurants.filter((r) => districtToRegion(r.district) === filters.region)
      : allRestaurants;
    for (const r of source)
      if (r.district) set.add(r.district);
    return set;
  }, [allRestaurants, filters.region]);

  const restaurants = useMemo(() => {
    let result = allRestaurants;
    if (filters.region)
      result = result.filter((r) => districtToRegion(r.district) === filters.region);
    if (filters.district)
      result = result.filter((r) => r.district === filters.district);
    if (filters.noColor) {
      result = result.filter((r) => (r.color_tags ?? []).length === 0);
    } else {
      if (filters.includeColors.length > 0)
        result = result.filter((r) => (r.color_tags ?? []).some((c) => filters.includeColors.includes(c)));
      if (filters.excludeColors.length > 0)
        result = result.filter((r) => !(r.color_tags ?? []).some((c) => filters.excludeColors.includes(c)));
    }
    return result;
  }, [allRestaurants, filters.region, filters.district, filters.noColor, filters.includeColors, filters.excludeColors]);

  useEffect(() => {
    if (filters.district && !availableDistricts.has(filters.district))
      setFilters((f) => ({ ...f, district: "" }));
  }, [availableDistricts, filters.district]);

  useEffect(() => {
    setFilters((f) => {
      const nextInclude = f.includeColors.filter((c) => availableColors.has(c));
      const nextExclude = f.excludeColors.filter((c) => availableColors.has(c));
      if (nextInclude.length === f.includeColors.length && nextExclude.length === f.excludeColors.length) return f;
      return { ...f, includeColors: nextInclude, excludeColors: nextExclude };
    });
  }, [availableColors]);

  // Zoom map to bounding box of filtered region; zoom out when region cleared
  const hasColorFilter = filters.noColor || filters.includeColors.length > 0 || filters.excludeColors.length > 0;
  const targetBounds = useMemo(() => {
    const source = filters.region || filters.district || hasColorFilter
      ? restaurants
      : null; // no region/district/color filter → don't override map position
    if (!source || source.length === 0) return null;
    const lats = source.map((r) => parseFloat(r.lat!));
    const lngs = source.map((r) => parseFloat(r.lng!));
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
  }, [filters.region, filters.district, hasColorFilter, restaurants]);

  // Selecting from the list also pans the map to it — a pin tap is already
  // on screen, so that path just sets selectedId without a pan.
  const selectFromList = useCallback((id: string) => {
    setSelectedId(id);
    const r = restaurants.find((x) => x.id === id);
    if (r?.lat && r?.lng) {
      focusTokenRef.current += 1;
      setFocusRequest({ target: { lat: parseFloat(r.lat), lng: parseFloat(r.lng) }, token: focusTokenRef.current });
    }
  }, [restaurants]);

  if (query.isLoading) {
    return (
      <Skeleton className="w-full" style={{ height: `calc(100dvh - ${HEADER_PX}px)` }} />
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-14 h-14 rounded-full bg-destructive/8 flex items-center justify-center mb-4">
          <TriangleAlert className="w-7 h-7 text-destructive/60" />
        </div>
        <p className="font-medium text-foreground">{t("list_load_error_title")}</p>
        <p className="text-sm mt-1">{t("list_load_error_body")}</p>
        <button onClick={() => query.refetch()} className="mt-4 text-sm text-primary font-medium">
          {t("retry")}
        </button>
      </div>
    );
  }

  if (allRestaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-14 h-14 rounded-full bg-primary/8 flex items-center justify-center mb-4">
          <UtensilsCrossed className="w-7 h-7 text-primary/60" />
        </div>
        <p className="font-medium text-foreground">{t("no_restaurants_title")}</p>
        <p className="text-sm mt-1">{t("no_restaurants_body")}</p>
      </div>
    );
  }

  const availableHeightCss = `calc(100dvh - ${HEADER_PX}px)`;

  return (
    <APIProvider apiKey={apiKey}>
      <div
        className="relative"
        style={{ height: `calc(${availableHeightCss} * ${MAP_HEIGHT_RATIO})` }}
      >
        <RestaurantMap
          restaurants={restaurants}
          selectedId={selectedId}
          onSelect={setSelectedId}
          targetBounds={targetBounds}
          focusRequest={focusRequest}
          onInteractingChange={(interacting) => { if (interacting) setFilterPanelOpen(false); }}
        />
      </div>

      <div style={{ height: `calc(${availableHeightCss} * ${1 - MAP_HEIGHT_RATIO})` }}>
        <MapRestaurantList
          restaurants={restaurants as Restaurant[]}
          selectedId={selectedId}
          onSelect={selectFromList}
        />
      </div>

      {filterPanelOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setFilterPanelOpen(false)}
          aria-hidden="true"
        />
      )}
      {filterPanelOpen && (
        <div
          className="fixed inset-x-0 z-20 px-4"
          style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="bg-background border border-border rounded-2xl shadow-xl overflow-hidden">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              hasLocation={location.lat != null}
              availableColors={availableColors}
              availableDistricts={availableDistricts}
              addLeft={addLeft}
            />
          </div>
        </div>
      )}

      {!filterPanelOpen && (
        <SearchDialog
          value={filters.search}
          onSubmit={(search) => setFilters((f) => ({ ...f, search }))}
          renderTrigger={
            <GlassCircleButton
              side={addLeft ? "right" : "left"}
              active={!!filters.search}
              aria-label={t("search_title")}
              style={{ bottom: SEARCH_BUTTON_BOTTOM }}
            />
          }
        />
      )}

      <GlassCircleButton
        side={addLeft ? "right" : "left"}
        active={filterPanelOpen}
        aria-label={t("filters_show")}
        aria-pressed={filterPanelOpen}
        onClick={() => setFilterPanelOpen((v) => !v)}
        {...swipeGesture}
      >
        <SlidersHorizontal className="w-5 h-5" />
      </GlassCircleButton>

      <ImportDialog
        iconOnly
        renderTrigger={<GlassCircleButton side={addLeft ? "left" : "right"} aria-label={t("add_restaurant")} {...addButtonSwipeGesture} />}
      />
    </APIProvider>
  );
}
