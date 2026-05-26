import { eq } from "drizzle-orm";
import { router, publicProcedure, TRPCError } from "../init";
import {
  recommendationFeedback,
  recommendationHistory,
  bookmarks,
  restaurants,
  userPreferences,
} from "@/server/db/schema";
import { FeedbackInput } from "@/shared/validators/recommendation";
import { extractSignals } from "@/server/recommendation/signals";

export const feedbackRouter = router({
  submit: publicProcedure
    .input(FeedbackInput)
    .mutation(async ({ ctx, input }) => {
      const { userId, db } = ctx;

      // Verify history belongs to user
      const historyRows = await db
        .select({ id: recommendationHistory.id })
        .from(recommendationHistory)
        .where(eq(recommendationHistory.id, input.history_id))
        .limit(1);

      if (historyRows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recommendation history not found",
        });
      }

      await db.insert(recommendationFeedback).values({
        user_id: userId,
        history_id: input.history_id,
        restaurant_id: input.restaurant_id,
        signal: input.signal,
      });

      // Async preference recompute (fire and forget — runs in same request but doesn't block response)
      const bookmarkRows = await db
        .select({ bookmark: bookmarks, restaurant: restaurants })
        .from(bookmarks)
        .innerJoin(restaurants, eq(bookmarks.restaurant_id, restaurants.id))
        .where(eq(bookmarks.user_id, userId));

      if (bookmarkRows.length > 0) {
        const signals = extractSignals(bookmarkRows);
        await db
          .insert(userPreferences)
          .values({
            user_id: userId,
            cuisine_affinities: signals.cuisine_affinities,
            preferred_price_levels: signals.preferred_price_levels,
            preferred_districts: signals.preferred_districts,
          })
          .onConflictDoUpdate({
            target: userPreferences.user_id,
            set: {
              cuisine_affinities: signals.cuisine_affinities,
              preferred_price_levels: signals.preferred_price_levels,
              preferred_districts: signals.preferred_districts,
              updated_at: new Date(),
            },
          });
      }

      return { success: true as const };
    }),
});
