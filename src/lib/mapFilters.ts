import type { FilterState } from "@/components/discover/FilterBar";

// Module-level store so filters survive MapView unmounting/remounting
// (e.g. swiping back from a restaurant detail page) within the same session.
// Kept separate from discoverFilters.ts so list and map remember their own
// filters independently.
let lastFilters: FilterState | null = null;

export function getPersistedMapFilters(): FilterState | null {
  return lastFilters;
}

export function setPersistedMapFilters(filters: FilterState) {
  lastFilters = filters;
}
