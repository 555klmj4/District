import type { ScoredCandidate, RecommendationContext } from "@/shared/types/recommendation";
import type { CuisineAffinity } from "@/shared/types/preferences";

interface PromptInput {
  candidates: ScoredCandidate[];
  topAffinities: CuisineAffinity[];
  query?: string;
  context: RecommendationContext;
  bookmarkCount: number;
}

export function buildRecommendationPrompt(input: PromptInput): string {
  const { candidates, topAffinities, query, context, bookmarkCount } = input;

  const topCuisines = topAffinities
    .slice(0, 3)
    .map((a) => `${a.cuisine} (${Math.round(a.weight * 100)}% match)`)
    .join(", ");

  const timeContext = context.time_of_day
    ? `Time: ${context.time_of_day} on a ${context.day_of_week}`
    : "";
  const locationContext =
    context.lat != null ? `Location: provided (within ${context.max_distance_km}km)` : "";

  const candidateList = candidates
    .slice(0, 5)
    .map((c, i) => {
      const r = c.restaurant;
      const ratings = [
        r.rating_google ? `Google ${r.rating_google}` : null,
        r.rating_openrice ? `OpenRice ${r.rating_openrice}` : null,
        r.rating_yelp ? `Yelp ${r.rating_yelp}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      const dist = c.restaurant.distance_km != null
        ? `${c.restaurant.distance_km.toFixed(1)}km away`
        : "";
      return `${i + 1}. ${r.name} — ${r.cuisine_primary ?? "?"}, ${r.district ?? "?"} ${dist} [ratings: ${ratings || "none"}, score: ${c.score.toFixed(2)}]`;
    })
    .join("\n");

  const lowDataNote =
    bookmarkCount < 8
      ? "Note: The user has few bookmarks, so preference patterns are still forming."
      : "";

  return `You are District, a personal restaurant concierge with deep knowledge of the user's taste.

User query: "${query ?? "Give me a recommendation"}"
${timeContext}
${locationContext}
${lowDataNote}

User's taste profile:
- Top cuisines: ${topCuisines || "not yet established"}
- Bookmarks analyzed: ${bookmarkCount}

Top-ranked recommendations:
${candidateList}

In 2-3 sentences, explain why these restaurants match this user's preferences. Be specific — mention cuisine patterns, location convenience, or time-of-day habits if relevant. Do not list or repeat the restaurant names. Write in second person ("You tend to…", "These match your…").`;
}
