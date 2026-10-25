import { z } from "zod";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { router, authedProcedure, TRPCError } from "../init";
import { restaurants, restaurantSources } from "@/server/db/schema";
import { importUrl, importByPlaceId, type ImportResult } from "@/server/ingestion/pipeline";
import { addColorTags } from "@/server/colorTags";
import type { DB } from "@/server/db";
import { TAG_COLOR_IDS, type TagColor } from "@/lib/colors";
import {
  fetchByPlaceId,
  searchPlacesByName,
  searchBranchCandidates,
} from "@/server/ingestion/googlePlaces";
import { normalizePlace, extractAddressParts } from "@/server/ingestion/normalizer";
import { brandSearchQueries, isSameBrand } from "@/server/ingestion/branches";
import { computeRatingAggregate } from "@/server/ingestion/normalizer";
import { classifyCuisine } from "@/server/ai/classifyCuisine";
import { generateSignatureDishes } from "@/server/ai/signatureDishes";
import { searchOpenRiceRating } from "@/server/ingestion/openrice";
import { sql } from "drizzle-orm";

const ColorsInput = z.array(z.enum(TAG_COLOR_IDS)).max(TAG_COLOR_IDS.length).optional();

async function withColors(
  result: ImportResult,
  db: DB,
  userId: string,
  colors: TagColor[] | undefined
): Promise<ImportResult> {
  if (colors?.length) {
    await addColorTags(db, userId, { id: result.restaurant_id, name: result.restaurant.name }, colors);
  }
  return result;
}

export const ingestionRouter = router({
  importUrl: authedProcedure
    .input(z.object({ url: z.string().url().max(2048), colors: ColorsInput }))
    .mutation(async ({ ctx, input }) => {
      const { userId, db } = ctx;

      const result = await importUrl({ url: input.url, userId, db });
      return withColors(result, db, userId, input.colors);
    }),

  searchByName: authedProcedure
    .input(z.object({ query: z.string().min(2).max(200) }))
    .query(async ({ input }) => {
      const [results, resultsZh] = await Promise.all([
        searchPlacesByName(input.query),
        searchPlacesByName(input.query, undefined, "zh-TW"),
      ]);
      const zhByPlaceId = new Map(resultsZh.map((p) => [p.id, p.displayName.text]));
      return results.map((p) => ({
        placeId: p.id,
        name: p.displayName.text,
        name_zh: zhByPlaceId.get(p.id) ?? null,
        address: p.shortFormattedAddress ?? p.formattedAddress,
        rating: p.rating ?? null,
        userRatingCount: p.userRatingCount ?? null,
        priceLevel: p.priceLevel ?? null,
        primaryType: p.primaryTypeDisplayName?.text ?? null,
      }));
    }),

  importByPlaceId: authedProcedure
    .input(z.object({ placeId: z.string().min(1), colors: ColorsInput }))
    .mutation(async ({ ctx, input }) => {
      const { userId, db } = ctx;
      const result = await importByPlaceId({ placeId: input.placeId, userId, db });
      return withColors(result, db, userId, input.colors);
    }),

  findBranches: authedProcedure
    .input(z.object({ restaurantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { userId, db } = ctx;

      const [base] = await db
        .select({
          name: restaurants.name,
          name_zh: restaurants.name_zh,
          google_place_id: restaurants.google_place_id,
        })
        .from(restaurants)
        .where(and(eq(restaurants.id, input.restaurantId), eq(restaurants.user_id, userId)))
        .limit(1);

      if (!base) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
      }

      // Generic English brand names ("A Little Treat") get read as a phrase
      // and buried among unrelated places, so also search the Chinese brand
      // name, which is usually distinctive.
      const queries = brandSearchQueries(base.name, base.name_zh);
      const searches = await Promise.all(
        queries.map((q) =>
          Promise.all([
            searchBranchCandidates(q),
            searchBranchCandidates(q, "zh-TW").catch(() => []),
          ])
        )
      );

      const byPlaceId = new Map<string, (typeof searches)[number][0][number]>();
      const zhByPlaceId = new Map<string, string>();
      for (const [en, zh] of searches) {
        for (const p of en) if (!byPlaceId.has(p.id)) byPlaceId.set(p.id, p);
        for (const p of zh) if (!zhByPlaceId.has(p.id)) zhByPlaceId.set(p.id, p.displayName.text);
      }

      const candidates = [...byPlaceId.values()]
        .filter((p) => p.id !== base.google_place_id)
        .map((p) => ({ place: p, name_zh: zhByPlaceId.get(p.id) ?? null }))
        .filter(({ place, name_zh }) =>
          isSameBrand({ name: place.displayName.text, name_zh }, base)
        );

      if (candidates.length === 0) return [];

      const saved = await db
        .select({ google_place_id: restaurants.google_place_id })
        .from(restaurants)
        .where(
          and(
            eq(restaurants.user_id, userId),
            inArray(
              restaurants.google_place_id,
              candidates.map(({ place }) => place.id)
            )
          )
        );
      const savedIds = new Set(saved.map((r) => r.google_place_id));

      // Already-saved branches are returned (flagged) rather than hidden, so
      // the dialog never claims a chain has no other branches.
      return candidates
        .map(({ place, name_zh }) => ({
          placeId: place.id,
          saved: savedIds.has(place.id),
          name: place.displayName.text,
          name_zh,
          address: place.shortFormattedAddress ?? place.formattedAddress,
          district: extractAddressParts(place.addressComponents ?? []).district,
          rating: place.rating ?? null,
        }));
    }),

  importBranches: authedProcedure
    .input(z.object({ placeIds: z.array(z.string().min(1)).min(1).max(40), colors: ColorsInput }))
    .mutation(async ({ ctx, input }) => {
      const { userId, db } = ctx;
      const placeIds = [...new Set(input.placeIds)];

      let added = 0;
      let duplicates = 0;
      let failed = 0;

      // Each import makes two Places calls and schedules LLM/OpenRice
      // enrichment, so cap concurrency rather than firing all at once.
      for (let i = 0; i < placeIds.length; i += 5) {
        const results = await Promise.allSettled(
          placeIds
            .slice(i, i + 5)
            .map(async (placeId) =>
              withColors(await importByPlaceId({ placeId, userId, db }), db, userId, input.colors)
            )
        );
        for (const r of results) {
          if (r.status === "rejected") {
            failed++;
            console.error("[importBranches] import failed:", r.reason);
          } else if (r.value.was_duplicate) {
            duplicates++;
          } else {
            added++;
          }
        }
      }

      return { added, duplicates, failed };
    }),

  enrichById: authedProcedure
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

      const [placeData, placeDataZh] = await Promise.all([
        fetchByPlaceId(restaurant.google_place_id),
        fetchByPlaceId(restaurant.google_place_id, "zh-TW").catch(() => null),
      ]);
      const normalized = normalizePlace(placeData, placeDataZh ?? undefined);

      // Backfill a missing OpenRice link — e.g. restaurants imported via
      // Google Maps that didn't get a confident match at import time.
      const existingOpenRiceSource = await db
        .select({ id: restaurantSources.id })
        .from(restaurantSources)
        .where(
          and(
            eq(restaurantSources.restaurant_id, input.restaurant_id),
            eq(restaurantSources.platform, "openrice")
          )
        )
        .limit(1);

      let openriceRating = restaurant.rating_openrice;
      let openriceCount = restaurant.rating_count_openrice;

      if (existingOpenRiceSource.length === 0) {
        const orData = await searchOpenRiceRating(
          restaurant.name_zh ?? restaurant.name,
          restaurant.address_zh ?? restaurant.address,
          restaurant.district_zh ?? restaurant.district
        );
        if (orData.url) {
          await db
            .insert(restaurantSources)
            .values({
              restaurant_id: input.restaurant_id,
              platform: "openrice",
              external_id: null,
              url: orData.url,
              raw_data: { rating: orData.rating, smile_count: orData.smileCount, has_booking: orData.hasBooking },
              fetched_at: new Date(),
            })
            .onConflictDoNothing();

          if (openriceRating == null && orData.rating != null) {
            openriceRating = orData.rating.toFixed(1);
            openriceCount = orData.smileCount;
          }
        }
      }

      const [updated] = await db
        .update(restaurants)
        .set({
          ...normalized,
          rating_openrice: openriceRating,
          rating_count_openrice: openriceCount,
          rating_aggregate: computeRatingAggregate({
            rating_google: normalized.rating_google ?? restaurant.rating_google,
            rating_count_google:
              normalized.rating_count_google ??
              restaurant.rating_count_google,
            rating_openrice: openriceRating,
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

  backfillCuisineCategories: authedProcedure
    .mutation(async ({ ctx }) => {
      const { userId, db } = ctx;

      // Only classify restaurants that don't have a category yet
      const rows = await db
        .select({
          id: restaurants.id,
          name: restaurants.name,
          cuisine_primary: restaurants.cuisine_primary,
          cuisine_tags: restaurants.cuisine_tags,
        })
        .from(restaurants)
        .where(
          and(
            eq(restaurants.user_id, userId),
            isNull(restaurants.cuisine_category)
          )
        )
        // Bounded batch — cheap (one LLM call per row), the client re-fires
        // this mutation after every successful refetch, so a larger backlog
        // just gets chipped away at across mounts instead of one huge
        // sequential invocation risking the function's execution limit.
        .limit(20);

      const results = await Promise.allSettled(
        rows.map(async (r) => {
          const category = await classifyCuisine({
            name: r.name,
            cuisine_primary: r.cuisine_primary,
            cuisine_tags: (r.cuisine_tags as string[] | null) ?? [],
          });
          await db
            .update(restaurants)
            .set({ cuisine_category: category })
            .where(eq(restaurants.id, r.id));
        })
      );
      const classified = results.filter((r) => r.status === "fulfilled").length;

      return { classified };
    }),

  backfillSignatureDishes: authedProcedure
    .mutation(async ({ ctx }) => {
      const { userId, db } = ctx;

      const rows = await db
        .select({
          id: restaurants.id,
          name: restaurants.name,
          cuisine_primary: restaurants.cuisine_primary,
          google_place_id: restaurants.google_place_id,
          signature_dishes: restaurants.signature_dishes,
        })
        .from(restaurants)
        .where(
          and(
            eq(restaurants.user_id, userId),
            sql`(${restaurants.signature_dishes}::jsonb = '[]'::jsonb OR ${restaurants.signature_dishes} IS NULL)`,
            sql`${restaurants.google_place_id} IS NOT NULL`
          )
        )
        // Bounded batch — each row does up to 4 external round trips (2
        // Places lookups + 2 LLM generations), so this stays small; the
        // client re-fires this mutation after every successful refetch, so
        // a larger backlog just gets chipped away at across mounts.
        .limit(5);

      const results = await Promise.all(
        rows.map(async (r): Promise<boolean> => {
          try {
            const [placeData, placeDataZh] = await Promise.all([
              fetchByPlaceId(r.google_place_id!),
              fetchByPlaceId(r.google_place_id!, "zh-TW").catch(() => null),
            ]);
            const enReviews = (placeData.reviews ?? []).map((rv) => rv.text?.text ?? "").filter(Boolean);
            const zhReviews = (placeDataZh?.reviews ?? []).map((rv) => rv.text?.text ?? "").filter(Boolean);
            if (enReviews.length === 0 && zhReviews.length === 0) return false;
            const [dishes, dishesZh] = await Promise.all([
              generateSignatureDishes(r.name, r.cuisine_primary, enReviews, "en"),
              generateSignatureDishes(r.name, r.cuisine_primary, zhReviews.length > 0 ? zhReviews : enReviews, "zh"),
            ]);
            if (dishes.length === 0 && dishesZh.length === 0) return false;
            await db
              .update(restaurants)
              .set({ signature_dishes: dishes, signature_dishes_zh: dishesZh })
              .where(eq(restaurants.id, r.id));

            // Also update raw_data on the Google source record so photos are stored
            await db
              .insert(restaurantSources)
              .values({
                restaurant_id: r.id,
                platform: "google",
                external_id: r.google_place_id,
                url: `https://maps.google.com/?cid=${r.google_place_id}`,
                raw_data: placeData as unknown as Record<string, unknown>,
                fetched_at: new Date(),
              })
              .onConflictDoUpdate({
                target: [restaurantSources.platform, restaurantSources.url],
                set: { raw_data: placeData as unknown as Record<string, unknown>, fetched_at: new Date() },
              });

            return true;
          } catch {
            // non-fatal: skip this restaurant
            return false;
          }
        })
      );
      const enriched = results.filter(Boolean).length;

      return { enriched };
    }),
});
