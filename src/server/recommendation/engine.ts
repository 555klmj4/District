import "server-only";
import type { RecommendationContext, ScoredCandidate } from "@/shared/types/recommendation";
import type { CuisineAffinity, ScoreBreakdown } from "@/shared/types/preferences";

const WEIGHTS = {
  affinity: 0.28,
  distance: 0.22,
  rating:   0.20,
  recency:  0.10,
  feedback: 0.15,
  color:    0.05,
} as const;

// Color multipliers applied to the weighted sum
const COLOR_MULTIPLIERS: Record<string, number> = {
  green:  1.30,
  blue:   1.10,
  purple: 1.10,
  yellow: 1.05,
  orange: 1.15,
  red:    1.05,
  grey:   0.50,
};

type Candidate = {
  id: string;
  name: string;
  cuisine_primary: string | null;
  rating_google: string | null;
  rating_openrice: string | null;
  rating_yelp: string | null;
  rating_count_google: number | null;
  price_level: number | null;
  distance_km?: number;
  bookmark_created_at: Date;
  personal_rating?: number | null;
  [key: string]: unknown;
};

type FeedbackRow = {
  restaurant_id: string;
  signal: string;
  created_at: Date;
};

type PreferencesInput = {
  cuisine_affinities: CuisineAffinity[];
  preferred_price_levels: number[];
  preferred_districts: string[];
  avoid_cuisines: string[];
  max_distance_km: number;
};

export interface EngineInput {
  candidates: Candidate[];
  preferences: PreferencesInput;
  feedback_history: FeedbackRow[];
  context: RecommendationContext;
}

export interface EngineOutput {
  ranked: ScoredCandidate[];
}

export function scoreRestaurants(input: EngineInput): EngineOutput {
  const { candidates, preferences, feedback_history, context } = input;

  const now = new Date();

  const scored: ScoredCandidate[] = candidates.map((candidate) => {
    const affinity = scoreAffinity(
      candidate.cuisine_primary,
      preferences.cuisine_affinities,
      preferences.avoid_cuisines
    );
    const distance = scoreDistance(candidate.distance_km);
    const rating = scoreRating(
      candidate.rating_google,
      candidate.rating_openrice,
      candidate.rating_yelp,
      candidate.rating_count_google
    );
    const recency = scoreRecency(candidate.bookmark_created_at, now);
    const feedback = scoreFeedback(candidate.id, feedback_history, now);

    const colorTags = (candidate.color_tags as string[] | undefined) ?? [];
    const colorMultiplier = computeColorMultiplier(colorTags);

    const base =
      affinity  * WEIGHTS.affinity +
      distance  * WEIGHTS.distance +
      rating    * WEIGHTS.rating +
      recency   * WEIGHTS.recency +
      feedback  * WEIGHTS.feedback;

    const total = base * colorMultiplier;

    const score_breakdown: ScoreBreakdown = {
      affinity,
      distance,
      rating,
      recency,
      feedback,
      color: colorMultiplier,
      total,
    };

    return {
      restaurant: candidate as unknown as ScoredCandidate["restaurant"],
      score: total,
      score_breakdown,
    };
  });

  return {
    ranked: scored.sort((a, b) => b.score - a.score),
  };
}

function scoreAffinity(
  cuisine: string | null,
  affinities: CuisineAffinity[],
  avoidList: string[]
): number {
  if (!cuisine) return 0.3;

  const cuisineLower = cuisine.toLowerCase();
  if (avoidList.some((a) => cuisineLower.includes(a.toLowerCase()))) return 0.0;

  const match = affinities.find((a) =>
    cuisineLower.includes(a.cuisine.toLowerCase()) ||
    a.cuisine.toLowerCase().includes(cuisineLower)
  );
  return match?.weight ?? 0.3;
}

function scoreDistance(distanceKm?: number): number {
  if (distanceKm == null) return 0.5;
  // Exponential decay: 1.0 at 0km, ~0.72 at 1km, ~0.37 at 3km, ~0.14 at 6km
  return Math.exp(-distanceKm / 3);
}

function scoreRating(
  google: string | null,
  openrice: string | null,
  yelp: string | null,
  googleCount: number | null
): number {
  const sources: { rating: number; weight: number }[] = [];

  if (google != null) {
    const r = parseFloat(google);
    if (!isNaN(r)) {
      // Google weight scales with review volume (up to 200 reviews = full weight)
      const weight = Math.min(1, (googleCount ?? 0) / 200);
      sources.push({ rating: (r - 1) / 4, weight });
    }
  }
  if (openrice != null) {
    const r = parseFloat(openrice);
    if (!isNaN(r)) sources.push({ rating: (r - 1) / 4, weight: 0.5 });
  }
  if (yelp != null) {
    const r = parseFloat(yelp);
    if (!isNaN(r)) sources.push({ rating: (r - 1) / 4, weight: 0.5 });
  }

  if (sources.length === 0) return 0.4; // default if no ratings
  const totalWeight = sources.reduce((s, x) => s + x.weight, 0);
  return sources.reduce((s, x) => s + x.rating * x.weight, 0) / totalWeight;
}

function computeColorMultiplier(colorTags: string[]): number {
  if (colorTags.length === 0) return 1.0;
  const avg = colorTags.reduce((sum, c) => sum + (COLOR_MULTIPLIERS[c] ?? 1.0), 0) / colorTags.length;
  return avg;
}

function scoreRecency(bookmarkedAt: Date, now: Date): number {
  const daysSince = (now.getTime() - bookmarkedAt.getTime()) / (1000 * 60 * 60 * 24);
  // 90-day half-life: fresh saves have higher intent signal
  return Math.exp(-daysSince / 90);
}

function scoreFeedback(
  restaurantId: string,
  feedbackHistory: FeedbackRow[],
  now: Date
): number {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recent = feedbackHistory.filter(
    (f) => f.restaurant_id === restaurantId && new Date(f.created_at) > cutoff
  );

  let score = 0.5; // neutral baseline
  for (const f of recent) {
    if (f.signal === "thumbs_up") score = Math.min(1.0, score + 0.3);
    if (f.signal === "thumbs_down") score = Math.max(0.0, score - 0.5);
    if (f.signal === "visited") score = Math.max(0.0, score - 0.1);
  }
  return score;
}
