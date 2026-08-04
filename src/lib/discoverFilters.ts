import type { FilterState } from "@/components/discover/FilterBar";

// Module-level store so filters survive DiscoverFeed unmounting/remounting
// (e.g. swiping back from a restaurant detail page) within the same session.
let lastFilters: FilterState | null = null;

export function getPersistedFilters(): FilterState | null {
  return lastFilters;
}

export function setPersistedFilters(filters: FilterState) {
  lastFilters = filters;
}
