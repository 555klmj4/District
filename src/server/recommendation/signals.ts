import "server-only";
import type { CuisineAffinity } from "@/shared/types/preferences";

type BookmarkWithRestaurant = {
  bookmark: {
    created_at: Date;
    personal_rating: number | null;
  };
  restaurant: {
    cuisine_primary: string | null;
    price_level: number | null;
    district: string | null;
  };
};

interface SignalOutput {
  cuisine_affinities: CuisineAffinity[];
  preferred_price_levels: number[];
  preferred_districts: string[];
}

export function extractSignals(
  bookmarks: BookmarkWithRestaurant[]
): SignalOutput {
  const now = new Date();

  // Cuisine weights: recency × (personal_rating/5 || 0.6)
  const cuisineScores = new Map<string, number>();
  const cuisineCounts = new Map<string, number>();

  // Price level counts
  const priceCounts = new Map<number, number>();

  // District counts
  const districtCounts = new Map<string, number>();

  for (const { bookmark, restaurant } of bookmarks) {
    const daysSince =
      (now.getTime() - new Date(bookmark.created_at).getTime()) / 86_400_000;
    const recencyFactor = Math.exp(-daysSince / 90);
    const ratingFactor = bookmark.personal_rating
      ? bookmark.personal_rating / 5
      : 0.6;
    const weight = recencyFactor * ratingFactor;

    if (restaurant.cuisine_primary) {
      const cuisine = restaurant.cuisine_primary;
      cuisineScores.set(cuisine, (cuisineScores.get(cuisine) ?? 0) + weight);
      cuisineCounts.set(cuisine, (cuisineCounts.get(cuisine) ?? 0) + 1);
    }

    if (restaurant.price_level) {
      priceCounts.set(
        restaurant.price_level,
        (priceCounts.get(restaurant.price_level) ?? 0) + 1
      );
    }

    if (restaurant.district) {
      districtCounts.set(
        restaurant.district,
        (districtCounts.get(restaurant.district) ?? 0) + 1
      );
    }
  }

  // Normalize cuisine scores to [0, 1]
  const maxScore = Math.max(...cuisineScores.values(), 0.001);
  const cuisine_affinities: CuisineAffinity[] = Array.from(cuisineScores.entries())
    .map(([cuisine, score]) => ({
      cuisine,
      weight: score / maxScore,
      sample_count: cuisineCounts.get(cuisine) ?? 0,
    }))
    .sort((a, b) => b.weight - a.weight);

  // Preferred price levels: take those with at least 2 bookmarks, sort by count
  const preferred_price_levels = Array.from(priceCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .map(([level]) => level);

  // Preferred districts: top 3 by bookmark count
  const preferred_districts = Array.from(districtCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([district]) => district);

  return { cuisine_affinities, preferred_price_levels, preferred_districts };
}
