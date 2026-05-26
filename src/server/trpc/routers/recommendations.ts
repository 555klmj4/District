import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { router, publicProcedure, TRPCError } from "../init";
import {
  bookmarks,
  restaurants,
  userPreferences,
  recommendationHistory,
  recommendationFeedback,
} from "@/server/db/schema";
import { RecommendationInput } from "@/shared/validators/recommendation";
import { scoreRestaurants } from "@/server/recommendation/engine";
import { generateExplanation } from "@/server/recommendation/explainer";
import { isOpenNow, haversineKm } from "@/server/geo/utils";
import type { RecommendationContext } from "@/shared/types/recommendation";

export const recommendationsRouter = router({
  generate: publicProcedure
    .input(RecommendationInput)
    .mutation(async ({ ctx, input }) => {
      const { userId, db } = ctx;

      // Require a minimum number of bookmarks
      const bookmarkCount = await db
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(eq(bookmarks.user_id, userId));

      if (bookmarkCount.length < 3) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Save at least 3 restaurants to unlock recommendations.",
        });
      }

      // Fetch all bookmarked restaurants as candidates
      const candidateRows = await db
        .select({ bookmark: bookmarks, restaurant: restaurants })
        .from(bookmarks)
        .innerJoin(restaurants, eq(bookmarks.restaurant_id, restaurants.id))
        .where(eq(bookmarks.user_id, userId));

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
        .where(eq(recommendationFeedback.user_id, userId));

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
      const restaurantList = candidateRows.map(({ restaurant, bookmark }) => {
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
          bookmark_created_at: bookmark.created_at,
          personal_rating: bookmark.personal_rating,
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

  getHistory: publicProcedure
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
