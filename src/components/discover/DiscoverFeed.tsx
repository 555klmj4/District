"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { SlidersHorizontal, UtensilsCrossed, TriangleAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RestaurantCard } from "@/components/restaurant/RestaurantCard";
import { FilterBar, type FilterState } from "./FilterBar";
import { LocationPrompt } from "./LocationPrompt";
import { GlassCircleButton } from "@/components/layout/GlassCircleButton";
import { ImportDialog } from "@/components/bookmark/ImportDialog";
import { useLocation } from "@/client/hooks/useLocation";
import { useFilterAlignment } from "@/client/hooks/useFilterAlignment";
import { useSwipeGesture } from "@/client/hooks/useSwipeGesture";
import { trpc } from "@/client/trpc";
import { useTranslation } from "@/lib/i18n";
import { districtLabelZh, districtToRegion, REGION_COLORS } from "@/lib/district-zh";
import { getPersistedFilters, setPersistedFilters } from "@/lib/discoverFilters";
import { useSafeAreaTop } from "@/lib/useSafeAreaTop";
import { cn } from "@/lib/utils";
import type { Restaurant } from "@/shared/types/restaurant";

function defaultFilters(): FilterState {
  return {
    search: "",
    region: "",
    district: "",
    includeColors: [],
    excludeColors: [],
    noColor: false,
    open_now: false,
    sort: "name",
  };
}

// Max number of stacked district labels shown in the pinned header bar
const MAX_PINNED_HEADERS = 4;

// Placeholder height used by content-visibility while a district's cards are
// off-screen and unrendered — only affects scroll-position math before that
// section is first visited; self-corrects to the real height once painted.
const ESTIMATED_ROW_HEIGHT_PX = 76;

export function DiscoverFeed() {
  // PageShell header = h-11 (44px) content + top safe-area inset
  const HEADER_PX = 44 + useSafeAreaTop();
  const [filters, setFilters] = useState<FilterState>(() => getPersistedFilters() ?? defaultFilters());

  useEffect(() => {
    setPersistedFilters(filters);
  }, [filters]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const locationUpgradedRef = useRef(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
  const { t, lang } = useTranslation();
  const zh = lang === "zh-TW";
  const location = useLocation();
  const { addLeft, setAddLeft } = useFilterAlignment();

  useEffect(() => {
    if (location.lat != null && !locationUpgradedRef.current) {
      locationUpgradedRef.current = true;
      setFilters((f) => f.sort === "newest" ? { ...f, sort: "distance" } : f);
    }
  }, [location.lat]);

  // --- data ---
  const query = trpc.restaurants.list.useQuery(
    {
      search:   filters.search || undefined,
      open_now: filters.open_now || undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      sort:     filters.sort,
      lat:      location.lat ?? undefined,
      lng:      location.lng ?? undefined,
      limit:    500,
    },
    { staleTime: 5 * 60_000 }
  );

  const allRestaurants = query.data?.items ?? [];

  const backfill = trpc.ingestion.backfillCuisineCategories.useMutation();
  useEffect(() => {
    const needsBackfill = allRestaurants.some((r) => !r.cuisine_category);
    if (needsBackfill && !backfill.isPending)
      backfill.mutate(undefined, { onSuccess: () => void query.refetch() });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRestaurants.length]);

  const dishBackfill = trpc.ingestion.backfillSignatureDishes.useMutation();
  useEffect(() => {
    const needsDishBackfill = allRestaurants.some(
      (r) => (!r.signature_dishes || r.signature_dishes.length === 0) && r.google_place_id
    );
    if (needsDishBackfill && !dishBackfill.isPending)
      dishBackfill.mutate(undefined, { onSuccess: () => void query.refetch() });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRestaurants.length]);

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

  const starredRestaurants = useMemo(
    () => restaurants.filter((r) => r.is_starred),
    [restaurants]
  );

  const groupedRestaurants = useMemo(() => {
    const groups = new Map<string, typeof restaurants>();
    for (const r of restaurants) {
      const key = r.district ?? "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [restaurants]);

  useEffect(() => {
    setFilters((f) => {
      const nextInclude = f.includeColors.filter((c) => availableColors.has(c));
      const nextExclude = f.excludeColors.filter((c) => availableColors.has(c));
      if (nextInclude.length === f.includeColors.length && nextExclude.length === f.excludeColors.length) return f;
      return { ...f, includeColors: nextInclude, excludeColors: nextExclude };
    });
  }, [availableColors]);

  useEffect(() => {
    if (filters.district && !availableDistricts.has(filters.district))
      setFilters((f) => ({ ...f, district: "" }));
  }, [availableDistricts, filters.district]);

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const swipeGesture = useSwipeGesture(() => setAddLeft(true), () => setAddLeft(false));
  const addButtonSwipeGesture = useSwipeGesture(() => setAddLeft(false), () => setAddLeft(true));

  // --- pinned district bar ---
  // position:fixed means getBoundingClientRect() on section elements is always
  // stable — no layout feedback loop.

  const sectionElsRef  = useRef<(HTMLDivElement | null)[]>([]);
  const headerElsRef   = useRef<(HTMLDivElement | null)[]>([]);

  const [pinnedCount, setPinnedCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // Permanent, always-visible Starred bar — sits above the district pinned bar,
  // which needs to know its height to stack itself (and its pin-math) below it.
  // Tracked via ResizeObserver (not a plain ref callback) since the panel's
  // content — and therefore height — can change while it stays mounted (e.g.
  // starring/unstarring a second restaurant), which a ref callback would miss.
  const starredBarElRef = useRef<HTMLDivElement | null>(null);
  const [starredBarHeight, setStarredBarHeight] = useState(0);

  useEffect(() => {
    const el = starredBarElRef.current;
    if (!el) { setStarredBarHeight(0); return; }
    const observer = new ResizeObserver(([entry]) => {
      setStarredBarHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [starredRestaurants.length]);

  const updatePinnedCount = useCallback(() => {
    const base = HEADER_PX + starredBarHeight;
    let count = 0;
    const heights: number[] = [];
    for (const headerEl of headerElsRef.current) {
      if (!headerEl) break;
      const rect = headerEl.getBoundingClientRect();
      // Sum the *real* heights of the last MAX_PINNED_HEADERS confirmed headers
      // (not an assumed uniform height) — this is exactly the overlay's actual
      // rendered bottom edge, so a header only counts as pinned once its own
      // bottom has fully crossed behind it (never partially visible below it).
      const stackHeight = heights.slice(-MAX_PINNED_HEADERS).reduce((sum, h) => sum + h, 0);
      if (rect.bottom <= base + stackHeight) {
        count++;
        heights.push(rect.height);
      } else break;
    }
    setPinnedCount((prev) => (prev === count ? prev : count));

    // Active section = first one (by its *whole* section, not just its
    // header) that hasn't fully scrolled past the overlay yet — i.e. still
    // has content visible on screen. This can differ from `count - 1`: a
    // short section's header can fully pass the overlay while its cards have
    // also already scrolled away, so deriving "active" from the header-only
    // pin count can point at a section no longer on screen at all.
    const overlayBottom = base + heights.slice(-MAX_PINNED_HEADERS).reduce((sum, h) => sum + h, 0);
    let active = 0;
    for (let i = 0; i < sectionElsRef.current.length; i++) {
      const sectionEl = sectionElsRef.current[i];
      if (!sectionEl) break;
      active = i;
      if (sectionEl.getBoundingClientRect().bottom > overlayBottom) break;
    }
    setActiveIndex((prev) => (prev === active ? prev : active));
  }, [HEADER_PX, starredBarHeight]);

  useEffect(() => {
    sectionElsRef.current = sectionElsRef.current.slice(0, groupedRestaurants.length);
    headerElsRef.current = headerElsRef.current.slice(0, groupedRestaurants.length);
    updatePinnedCount();
  }, [groupedRestaurants, updatePinnedCount]);

  useEffect(() => {
    let rafId: number;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePinnedCount);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(rafId); };
  }, [updatePinnedCount]);

  const scrollToSection = useCallback((index: number) => {
    const el = sectionElsRef.current[index];
    if (!el) return;
    const base = HEADER_PX + starredBarHeight;
    const start = Math.max(0, index - MAX_PINNED_HEADERS);
    let stackHeight = 0;
    for (let i = start; i < index; i++) {
      stackHeight += headerElsRef.current[i]?.getBoundingClientRect().height ?? 0;
    }
    const top = el.getBoundingClientRect().top + window.scrollY - base - stackHeight;
    window.scrollTo({ top, behavior: "smooth" });
  }, [HEADER_PX, starredBarHeight]);

  return (
    <div>
      {/* Loading bar — fixed just below the top header */}
      {query.isLoading && (
        <div
          className="fixed left-0 right-0 z-40 h-0.5 overflow-hidden bg-border"
          style={{ top: HEADER_PX }}
        >
          <div className="loading-bar h-full w-1/3 bg-primary" />
        </div>
      )}

      {/* Starred bar — permanent, always visible below the top header, not scroll-triggered */}
      {starredRestaurants.length > 0 && (
        <div
          ref={starredBarElRef}
          className="fixed left-0 right-0 z-30 border-b border-border bg-background"
          style={{ top: HEADER_PX }}
        >
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="w-full text-left px-4 pt-2 pb-1 flex items-center gap-2 bg-primary"
          >
            <span className="text-xs uppercase tracking-wider font-bold text-primary-foreground">
              {t("starred_section_title")}
            </span>
            <span className="text-xs text-primary-foreground/70">
              {starredRestaurants.length}
            </span>
          </button>
          <div className="max-h-64 overflow-y-auto divide-y divide-border">
            {starredRestaurants.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={r as Restaurant}
                isSelected={selectedId === r.id}
                onSelect={setSelectedId}
                navigateOnClick
              />
            ))}
          </div>
        </div>
      )}

      {/* Pinned district bar — fixed below the top header + Starred bar */}
      {pinnedCount > 0 && (() => {
        const start = Math.max(0, pinnedCount - MAX_PINNED_HEADERS);
        const sliced = groupedRestaurants.slice(start, pinnedCount);
        return (
          <div
            className="fixed left-0 right-0 z-20 bg-transparent"
            style={{ top: HEADER_PX + starredBarHeight }}
          >
            {sliced.map(([district, items], i) => {
              const idx = start + i;
              const isActive = idx === activeIndex;
              const region = districtToRegion(district);
              const textClass = region ? REGION_COLORS[region].text : "text-foreground";
              return (
                <button
                  key={district}
                  type="button"
                  onClick={() => scrollToSection(idx)}
                  className={cn(
                    "relative w-full text-left px-4 pt-2 pb-1 flex items-center gap-2 bg-background",
                    i < sliced.length - 1 ? "border-b border-border/50" : "border-b border-border"
                  )}
                >
                  {isActive && <div className="absolute inset-0 bg-primary/8 pointer-events-none" />}
                  <span className={cn("relative text-xs uppercase tracking-wider", isActive ? "font-bold" : "font-semibold", textClass)}>
                    {zh ? districtLabelZh(district, items) : district}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {query.isLoading ? (
        <div className="px-4 space-y-3 pt-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : restaurants.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ paddingTop: starredBarHeight }}>
          {groupedRestaurants.map(([district, items], index) => {
            const isActive = index === activeIndex;
            const region = districtToRegion(district);
            const textClass = region ? REGION_COLORS[region].text : "text-foreground";
            return (
              <div
                key={district}
                ref={(el) => { sectionElsRef.current[index] = el; }}
              >
                <div
                  ref={(el) => { headerElsRef.current[index] = el; }}
                  className={cn("px-4 pt-2 pb-1 flex items-center gap-2 border-b border-border", isActive ? "bg-primary/8" : "bg-background")}
                >
                  <span className={cn("text-xs uppercase tracking-wider", isActive ? "font-bold" : "font-semibold", textClass)}>
                    {zh ? districtLabelZh(district, items) : district}
                  </span>
                  <span className="text-xs text-muted-foreground/50">
                    {items.length}
                  </span>
                </div>
                <div
                  className="divide-y divide-border"
                  style={{
                    contentVisibility: "auto",
                    containIntrinsicSize: `0 ${items.length * ESTIMATED_ROW_HEIGHT_PX}px`,
                  }}
                >
                  {items.map((r) => (
                    <RestaurantCard
                      key={r.id}
                      restaurant={r as Restaurant}
                      isSelected={selectedId === r.id}
                      onSelect={setSelectedId}
                      navigateOnClick
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showLocationPrompt && !location.lat && location.granted === null && (
        <LocationPrompt
          onRequest={() => {
            setShowLocationPrompt(false);
            location.request();
          }}
        />
      )}

      {/* Filter panel — floats above the button row when toggled open */}
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
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="text-center py-16 text-muted-foreground">
      <div className="w-14 h-14 rounded-full bg-primary/8 flex items-center justify-center mx-auto mb-4">
        <UtensilsCrossed className="w-7 h-7 text-primary/60" />
      </div>
      <p className="font-medium text-foreground">{t("no_restaurants_title")}</p>
      <p className="text-sm mt-1">{t("no_restaurants_body")}</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-16 text-muted-foreground">
      <div className="w-14 h-14 rounded-full bg-destructive/8 flex items-center justify-center mx-auto mb-4">
        <TriangleAlert className="w-7 h-7 text-destructive/60" />
      </div>
      <p className="font-medium text-foreground">{t("list_load_error_title")}</p>
      <p className="text-sm mt-1">{t("list_load_error_body")}</p>
      <button onClick={onRetry} className="mt-4 text-sm text-primary font-medium">
        {t("retry")}
      </button>
    </div>
  );
}
