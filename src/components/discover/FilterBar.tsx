"use client";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        <Input
          placeholder="Search restaurants, cuisines…"
          className="flex-1 h-9 text-sm"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
        <Button
          variant={hasActiveFilters ? "default" : "secondary"}
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filter
          {hasActiveFilters && (
            <Badge className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
              !
            </Badge>
          )}
        </Button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="space-y-3">
          {/* Sort */}
          <div className="flex gap-2 flex-wrap">
            {SORT_OPTIONS.map((opt) => {
              if (opt.value === "distance" && !hasLocation) return null;
              return (
                <button
                  key={opt.value}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    filters.sort === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  )}
                  onClick={() => onChange({ ...filters, sort: opt.value })}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Open now + cuisine */}
          <div className="flex gap-2 flex-wrap items-center">
            <button
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                filters.open_now
                  ? "bg-[var(--open-green)] text-background border-[var(--open-green)]"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
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
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
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
