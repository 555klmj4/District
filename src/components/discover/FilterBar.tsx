"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Ban, Search, Star, X } from "lucide-react";
import { TAG_COLORS, colorHex } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { REGIONS, REGION_ZH, REGION_COLORS, districtToRegion, districtZh, type Region } from "@/lib/district-zh";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/client/trpc";
import { hasChinese, bilingualName } from "@/lib/restaurant-name";

interface FilterState {
  search: string;
  region: string;
  district: string;
  includeColors: string[];
  excludeColors: string[];
  noColor: boolean;
  open_now: boolean;
  sort: "newest" | "rating" | "distance" | "name";
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  hasLocation: boolean;
  availableColors: Set<string>;
  availableDistricts: Set<string>;
  addLeft: boolean;
}

// Cycles a colour swatch neutral -> include -> exclude -> neutral.
function cycleColorFilter(filters: FilterState, id: string): FilterState {
  if (filters.includeColors.includes(id)) {
    return {
      ...filters,
      includeColors: filters.includeColors.filter((c) => c !== id),
      excludeColors: [...filters.excludeColors, id],
    };
  }
  if (filters.excludeColors.includes(id)) {
    return { ...filters, excludeColors: filters.excludeColors.filter((c) => c !== id) };
  }
  return { ...filters, noColor: false, includeColors: [...filters.includeColors, id] };
}

export function FilterBar({ filters, onChange, hasLocation, availableColors, availableDistricts, addLeft }: FilterBarProps) {
  const { t, lang } = useTranslation();
  const zh = lang === "zh-TW";

  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(filters.search);

  const debouncedDraft = useDebouncedValue(searchDraft, 300);
  const trimmedDraft = debouncedDraft.trim();
  const preview = trpc.restaurants.search.useQuery(
    { query: trimmedDraft },
    { enabled: trimmedDraft.length >= 2 }
  );

  function submitSearch() {
    onChange({ ...filters, search: searchDraft.trim() });
    setSearchDialogOpen(false);
  }

  const SORT_OPTIONS = [
    { value: "newest" as const, label: t("sort_newest") },
    { value: "rating" as const, label: t("sort_rating") },
    { value: "distance" as const, label: t("sort_distance") },
    { value: "name" as const, label: t("sort_name") },
  ];

  const visibleColors = useMemo(
    () => TAG_COLORS.filter((color) => availableColors.has(color.id)),
    [availableColors]
  );
  const hasColors = visibleColors.length > 0;
  const sortedDistricts = useMemo(
    () => [...availableDistricts].sort((a, b) => a.localeCompare(b)),
    [availableDistricts]
  );

  return (
    <div className="bg-background border-b border-border space-y-0">
      {/* Row 1: Region chips + Open Now — scrollable, right-aligns per addLeft preference */}
      <div className="overflow-x-auto no-scrollbar pt-2 pb-1" style={addLeft ? { direction: "rtl" } : undefined}>
        <div className="flex gap-1.5 w-max px-4" style={{ direction: "ltr" }}>
          {REGIONS.map((r: Region) => (
            <button
              key={r}
              onClick={() => onChange({ ...filters, region: filters.region === r ? "" : r })}
              className={cn(
                "h-8 px-3 rounded-full text-sm font-medium border whitespace-nowrap transition-all flex items-center",
                filters.region === r
                  ? cn(REGION_COLORS[r].active, "shadow-sm")
                  : cn(REGION_COLORS[r].bg, REGION_COLORS[r].text, "border-border hover:border-foreground/20")
              )}
            >
              {zh ? REGION_ZH[r] : r}
            </button>
          ))}
          <button
            className={cn(
              "h-8 px-3 rounded-full text-sm font-medium border whitespace-nowrap transition-all flex items-center",
              filters.open_now
                ? "bg-[var(--open-green)] text-white border-[var(--open-green)] shadow-sm"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
            )}
            onClick={() => onChange({ ...filters, open_now: !filters.open_now })}
          >
            {t("open_now")}
          </button>
        </div>
      </div>

      {/* Row 1b: District chips — scrollable, only shown once a region is selected, colored by parent region */}
      {filters.region && sortedDistricts.length > 0 && (
        <div className="overflow-x-auto no-scrollbar pb-1" style={addLeft ? { direction: "rtl" } : undefined}>
          <div className="flex gap-1.5 w-max px-4" style={{ direction: "ltr" }}>
            {sortedDistricts.map((d) => {
              const region = districtToRegion(d);
              const active = filters.district === d;
              return (
                <button
                  key={d}
                  onClick={() => onChange({ ...filters, district: active ? "" : d })}
                  className={cn(
                    "h-8 px-3 rounded-full text-sm font-medium border whitespace-nowrap transition-all flex items-center",
                    active
                      ? region ? cn(REGION_COLORS[region].active, "shadow-sm") : "bg-primary text-primary-foreground border-primary shadow-sm"
                      : region ? cn(REGION_COLORS[region].bg, REGION_COLORS[region].text, "border-border hover:border-foreground/20")
                               : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                  )}
                >
                  {zh ? (districtZh(d) ?? d) : d}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Row 2: Sort chips + Add Restaurant — side follows addLeft preference */}
      <div className="flex items-center gap-1.5 px-4 pb-1">
        <div className="flex-1" style={{ order: 1 }} />
        <div className="flex items-center gap-1.5" style={{ order: addLeft ? 2 : 0 }}>
          {SORT_OPTIONS.map((opt) => {
            if (opt.value === "distance" && !hasLocation) return null;
            return (
              <button
                key={opt.value}
                className={cn(
                  "h-8 px-3 rounded-full text-sm font-medium border transition-all flex items-center",
                  filters.sort === opt.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:shadow-sm"
                )}
                onClick={() => onChange({ ...filters, sort: filters.sort === opt.value ? "newest" : opt.value })}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 3: Colour tags + Search — side follows addLeft preference */}
      <div className={cn("flex gap-2 items-center px-4 pt-1 pb-2", addLeft ? "justify-end" : "justify-start")}>
        {hasColors && (
          <>
            <button
              onClick={() => {
                const next = !filters.noColor;
                onChange({ ...filters, noColor: next, ...(next ? { includeColors: [], excludeColors: [] } : {}) });
              }}
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center transition-all touch-manipulation shrink-0 text-muted-foreground",
                filters.noColor ? "ring-2 ring-white ring-offset-1 ring-offset-background" : "opacity-30 hover:opacity-70"
              )}
              aria-label={t("filter_no_color")}
              aria-pressed={filters.noColor}
            >
              <Ban className="w-4 h-4" />
            </button>
            {visibleColors.map((color) => {
              const isInclude = filters.includeColors.includes(color.id);
              const isExclude = filters.excludeColors.includes(color.id);
              return (
                <button
                  key={color.id}
                  onClick={() => onChange(cycleColorFilter(filters, color.id))}
                  className={cn(
                    "relative w-5 h-5 rounded-full transition-all touch-manipulation shrink-0 flex items-center justify-center",
                    isInclude && "ring-2 ring-white ring-offset-1 ring-offset-background",
                    isExclude && "ring-2 ring-red-500 ring-offset-1 ring-offset-background",
                    !isInclude && !isExclude && "opacity-30 hover:opacity-70"
                  )}
                  style={{ backgroundColor: colorHex(color.id) }}
                  aria-label={`Filter by ${color.id}`}
                  aria-pressed={isExclude ? "mixed" : isInclude}
                >
                  {isExclude && <X className="w-3 h-3 text-white" strokeWidth={3} />}
                </button>
              );
            })}
          </>
        )}

        <Dialog
          open={searchDialogOpen}
          onOpenChange={(o) => {
            setSearchDialogOpen(o);
            if (o) setSearchDraft(filters.search);
          }}
        >
          <DialogTrigger
            render={
              <button
                className={cn(
                  "h-8 w-8 shrink-0 rounded-full border flex items-center justify-center transition-all",
                  filters.search
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                )}
                aria-label={t("search_title")}
              />
            }
          >
            <Search className="w-4 h-4" />
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("search_title")}</DialogTitle>
            </DialogHeader>
            <form
              className="flex gap-2 pt-2"
              onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
            >
              <div className="relative flex-1">
                <Input
                  placeholder={t("search_placeholder")}
                  className={searchDraft ? "pr-8" : undefined}
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  autoFocus
                />
                {searchDraft && (
                  <button
                    type="button"
                    onClick={() => setSearchDraft("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {trimmedDraft.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-white/50 bg-[oklch(0.97_0.006_48)] shadow-[0_8px_32px_oklch(0_0_0/0.14),0_1px_0_oklch(1_0_0/0.6)_inset,0_-1px_0_oklch(0_0_0/0.04)_inset] divide-y divide-white/40 z-50">
                    {preview.isFetching ? (
                      <div className="space-y-2 p-2">
                        <Skeleton className="h-12 rounded-md" />
                        <Skeleton className="h-12 rounded-md" />
                        <Skeleton className="h-12 rounded-md" />
                      </div>
                    ) : preview.isError ? (
                      <p className="p-3 text-sm text-destructive">{t("search_error")}</p>
                    ) : preview.data && preview.data.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">{t("search_no_results")}</p>
                    ) : (
                      preview.data?.map((r) => {
                        const displayName = bilingualName(r.name, r.name_zh);
                        const displayDistrict = zh
                          ? (hasChinese(r.district_zh) ? r.district_zh! : districtZh(r.district) ?? r.district)
                          : r.district;
                        const rating = r.rating_aggregate != null ? parseFloat(r.rating_aggregate).toFixed(1) : null;
                        return (
                          <Link
                            key={r.id}
                            href={`/restaurants/${r.id}`}
                            className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-white/40"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{displayName}</span>
                              {displayDistrict && (
                                <span className="block truncate text-xs text-muted-foreground">{displayDistrict}</span>
                              )}
                            </span>
                            {rating != null && (
                              <span className="mt-0.5 flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                                <Star className="w-3 h-3 fill-current text-amber-500" />
                                {rating}
                              </span>
                            )}
                          </Link>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              <Button type="submit">{t("search_title")}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export type { FilterState };
