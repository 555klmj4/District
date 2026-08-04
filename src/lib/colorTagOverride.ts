// Module-level store for color tag overrides. Survives React component unmount/remount
// across navigation since it lives outside the React tree, unlike the React Query cache.
const overrides = new Map<string, string[]>();

export function setColorTagOverride(restaurantId: string, tags: string[]) {
  overrides.set(restaurantId, tags);
}

export function getColorTagOverride(restaurantId: string): string[] | undefined {
  return overrides.get(restaurantId);
}
