import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, publicProcedure, TRPCError } from "../init";
import { restaurants, restaurantSources } from "@/server/db/schema";
import { importUrl } from "@/server/ingestion/pipeline";
import { fetchByPlaceId } from "@/server/ingestion/googlePlaces";
import { normalizePlace } from "@/server/ingestion/normalizer";
import { computeRatingAggregate } from "@/server/ingestion/normalizer";
import { sql } from "drizzle-orm";

export const ingestionRouter = router({
  importUrl: publicProcedure
    .input(z.object({ url: z.string().url().max(2048) }))
    .mutation(async ({ ctx, input }) => {
      const { userId, db } = ctx;

      const result = await importUrl({ url: input.url, userId, db });
      return result;
    }),

  enrichById: publicProcedure
    .input(z.object({ restaurant_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { userId, db } = ctx;

      const rows = await db
        .select()
        .from(restaurants)
        .where(
          and(
            eq(restaurants.id, input.restaurant_id),
            eq(restaurants.user_id, userId)
          )
        )
        .limit(1);

      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
      }

      const restaurant = rows[0]!;

      if (!restaurant.google_place_id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Google Place ID — cannot enrich.",
        });
      }

      const placeData = await fetchByPlaceId(restaurant.google_place_id);
      const normalized = normalizePlace(placeData);

      const [updated] = await db
        .update(restaurants)
        .set({
          ...normalized,
          rating_aggregate: computeRatingAggregate({
            rating_google: normalized.rating_google ?? restaurant.rating_google,
            rating_count_google:
              normalized.rating_count_google ??
              restaurant.rating_count_google,
            rating_openrice: restaurant.rating_openrice,
            rating_yelp: restaurant.rating_yelp,
          }),
          location:
            normalized.lat && normalized.lng
              ? sql`ST_MakePoint(${parseFloat(normalized.lng!)}, ${parseFloat(normalized.lat!)})::geography`
              : restaurant.location,
          enriched_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(restaurants.id, input.restaurant_id))
        .returning();

      // Update the google source record
      await db
        .insert(restaurantSources)
        .values({
          restaurant_id: input.restaurant_id,
          platform: "google",
          external_id: restaurant.google_place_id,
          url: `https://maps.google.com/?cid=${restaurant.google_place_id}`,
          raw_data: placeData as unknown as Record<string, unknown>,
          fetched_at: new Date(),
        })
        .onConflictDoUpdate({
          target: [restaurantSources.platform, restaurantSources.url],
          set: { raw_data: placeData as unknown as Record<string, unknown>, fetched_at: new Date() },
        });

      return updated!;
    }),
});
