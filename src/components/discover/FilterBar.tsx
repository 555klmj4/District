"use client";
import { useMemo } from "react";
import { Ban, X } from "lucide-react";
import { TAG_COLORS, colorHex } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { REGIONS, REGION_ZH, REGION_COLORS, districtToRegion, districtZh, type Region } from "@/lib/district-zh";

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

      {/* Row 3: Colour tags — side follows addLeft preference */}
      {hasColors && (
      <div className={cn("flex gap-2 items-center px-4 pt-1 pb-2", addLeft ? "justify-end" : "justify-start")}>
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
      </div>
      )}
    </div>
  );
}

export type { FilterState };
