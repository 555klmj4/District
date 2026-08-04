import { z } from "zod";
import { eq, and, gte, desc } from "drizzle-orm";
import { router, authedProcedure, TRPCError } from "../init";
import {
  restaurants,
  userPreferences,
  recommendationHistory,
  recommendationFeedback,
  restaurantColorTags,
} from "@/server/db/schema";
import { RecommendationInput } from "@/shared/validators/recommendation";
import { scoreRestaurants } from "@/server/recommendation/engine";
import { generateExplanation } from "@/server/recommendation/explainer";
import { isOpenNow, haversineKm } from "@/server/geo/utils";
import { sortColorTags } from "@/lib/colors";
import type { RecommendationContext } from "@/shared/types/recommendation";

export const recommendationsRouter = router({
  generate: authedProcedure
    .input(RecommendationInput)
    .mutation(async ({ ctx, input }) => {
      const { userId, db } = ctx;

      // Fetch all restaurants as candidates
      const candidateRows = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.user_id, userId));

      if (candidateRows.length < 3) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Add at least 3 restaurants to unlock recommendations.",
        });
      }

      // Fetch color tags for all candidates
      const colorTagRows = await db
        .select({ restaurant_id: restaurantColorTags.restaurant_id, color: restaurantColorTags.color })
        .from(restaurantColorTags)
        .innerJoin(restaurants, eq(restaurantColorTags.restaurant_id, restaurants.id))
        .where(eq(restaurants.user_id, userId));

      const colorTagsMap = new Map<string, string[]>();
      for (const row of colorTagRows) {
        const existing = colorTagsMap.get(row.restaurant_id) ?? [];
        existing.push(row.color);
        colorTagsMap.set(row.restaurant_id, existing);
      }

      // Fetch preferences
      const prefRows = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.user_id, userId))
        .limit(1);
      const preferences = prefRows[0] ?? null;

      // Fetch recent feedback (last 30 days)
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const feedbackRows = await db
        .select()
        .from(recommendationFeedback)
        .where(
          and(
            eq(recommendationFeedback.user_id, userId),
            gte(recommendationFeedback.created_at, since)
          )
        );

      // Build context
      const context: RecommendationContext = {
        lat: input.lat,
        lng: input.lng,
        max_distance_km: input.max_km ?? preferences?.max_distance_km ?? 10,
        cuisine_filter: input.cuisine,
        open_now: input.open_now,
        time_of_day: new Date()
          .toTimeString()
          .slice(0, 5),
        day_of_week: new Date()
          .toLocaleDateString("en-US", { weekday: "long" })
          .toLowerCase(),
      };

      // Build restaurant list with computed fields for engine
      const restaurantList = candidateRows.map((restaurant) => {
        const distKm =
          input.lat != null && input.lng != null && restaurant.lat != null && restaurant.lng != null
            ? haversineKm(
                input.lat,
                input.lng,
                parseFloat(restaurant.lat),
                parseFloat(restaurant.lng)
              )
            : null;

        return {
          ...restaurant,
          distance_km: distKm ?? undefined,
          is_open_now: restaurant.hours ? isOpenNow(restaurant.hours, input.timezone) : undefined,
          bookmark_created_at: restaurant.created_at,
          personal_rating: null,
          color_tags: sortColorTags(colorTagsMap.get(restaurant.id) ?? []),
        };
      });

      // Apply hard filters
      let filtered = restaurantList;
      if (input.open_now) {
        filtered = filtered.filter((r) => r.is_open_now === true);
      }
      if (context.max_distance_km != null && input.lat != null) {
        filtered = filtered.filter(
          (r) => r.distance_km == null || r.distance_km <= context.max_distance_km!
        );
      }
      if (input.cuisine) {
        filtered = filtered.filter((r) =>
          r.cuisine_primary?.toLowerCase().includes(input.cuisine!.toLowerCase())
        );
      }

      // Soft filter: if the user typed a free-text query, try to match it against
      // restaurant name / cuisine / tags. Only apply if it produces ≥1 result.
      if (input.query && !input.cuisine) {
        const keywords = input.query
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2);
        if (keywords.length > 0) {
          const queryMatched = filtered.filter((r) => {
            const haystack = [
              r.name,
              r.name_zh,
              r.cuisine_primary,
              r.cuisine_primary_zh,
              ...((r.cuisine_tags as string[] | null) ?? []),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            return keywords.some((kw) => haystack.includes(kw));
          });
          if (queryMatched.length > 0) filtered = queryMatched;
        }
      }

      if (filtered.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No restaurants match your current filters.",
        });
      }

      // Score
      const { ranked } = scoreRestaurants({
        candidates: filtered,
        preferences: {
          cuisine_affinities: preferences?.cuisine_affinities ?? [],
          preferred_price_levels: preferences?.preferred_price_levels ?? [],
          preferred_districts: preferences?.preferred_districts ?? [],
          avoid_cuisines: preferences?.avoid_cuisines ?? [],
          max_distance_km: preferences?.max_distance_km ?? 10,
        },
        feedback_history: feedbackRows,
        context,
      });

      const topN = ranked.slice(0, input.limit);

      // Generate AI explanation
      const explanation = await generateExplanation({
        candidates: topN,
        preferences,
        query: input.query,
        context,
      });

      // Persist history
      const scoredResults = topN.map((c) => ({
        restaurant_id: c.restaurant.id,
        score: c.score,
        score_breakdown: c.score_breakdown,
      }));

      const [history] = await db
        .insert(recommendationHistory)
        .values({
          user_id: userId,
          query_text: input.query ?? null,
          context,
          results: scoredResults,
          explanation,
          model_used: "gpt-4o-mini",
        })
        .returning();

      return {
        history_id: history!.id,
        candidates: topN,
        explanation,
        context,
      };
    }),

  getHistory: authedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const { userId, db } = ctx;

      return db
        .select()
        .from(recommendationHistory)
        .where(eq(recommendationHistory.user_id, userId))
        .orderBy(desc(recommendationHistory.created_at))
        .limit(input.limit);
    }),
});
