"use client";
import { useState } from "react";
import { SlidersHorizontal, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "newest" as const, label: "Recent" },
  { value: "rating" as const, label: "Top rated" },
  { value: "distance" as const, label: "Nearest" },
  { value: "name" as const, label: "Name" },
];

interface FilterState {
  search: string;
  cuisine: string;
  open_now: boolean;
  sort: "newest" | "rating" | "distance" | "name";
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  hasLocation: boolean;
}

export function FilterBar({ filters, onChange, hasLocation }: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    filters.cuisine || filters.open_now || filters.sort !== "newest";

  return (
    <div className="space-y-3 px-4 py-3 border-b border-border">
      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search restaurants, cuisines…"
            className="h-9 text-sm pl-8"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>
        <Button
          variant={hasActiveFilters ? "default" : "secondary"}
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filter
          {hasActiveFilters && (
            <span className="ml-0.5 w-4 h-4 rounded-full bg-primary-foreground/20 text-[10px] font-bold flex items-center justify-center">
              ·
            </span>
          )}
        </Button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="space-y-3">
          {/* Sort */}
          <div className="flex gap-1.5 flex-wrap">
            {SORT_OPTIONS.map((opt) => {
              if (opt.value === "distance" && !hasLocation) return null;
              return (
                <button
                  key={opt.value}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                    filters.sort === opt.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:shadow-sm"
                  )}
                  onClick={() => onChange({ ...filters, sort: opt.value })}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Open now + cuisine */}
          <div className="flex gap-1.5 flex-wrap items-center">
            <button
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                filters.open_now
                  ? "bg-[var(--open-green)] text-white border-[var(--open-green)] shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
              )}
              onClick={() => onChange({ ...filters, open_now: !filters.open_now })}
            >
              Open now
            </button>
            <Input
              placeholder="Cuisine (e.g. Japanese)"
              className="h-7 text-xs flex-1 min-w-28"
              value={filters.cuisine}
              onChange={(e) => onChange({ ...filters, cuisine: e.target.value })}
            />
            {hasActiveFilters && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                onClick={() =>
                  onChange({ search: "", cuisine: "", open_now: false, sort: "newest" })
                }
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export type { FilterState };
