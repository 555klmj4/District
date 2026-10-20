import { z } from "zod";
import { eq, and, ilike, or, desc, asc, sql, inArray } from "drizzle-orm";
import { router, authedProcedure, TRPCError } from "../init";
import { restaurants, bookmarks, restaurantSources, restaurantColorTags, activityLog } from "@/server/db/schema";
import {
  RestaurantListInput,
  RestaurantSearchInput,
} from "@/shared/validators/restaurant";
import { isOpenNow } from "@/server/geo/utils";
import { sortColorTags } from "@/lib/colors";
import { districtEn } from "@/lib/district-zh";

// Matches English and Chinese fields; a Chinese district name also matches
// restaurants that only have the English district stored (中環 → "Central").
function textSearch(q: string, opts: { address?: boolean } = {}) {
  const like = `%${q}%`;
  const districtFromZh = districtEn(q.trim());
  return or(
    ilike(restaurants.name, like),
    ilike(restaurants.name_zh, like),
    ilike(restaurants.cuisine_primary, like),
    ilike(restaurants.cuisine_primary_zh, like),
    ilike(restaurants.district, like),
    ilike(restaurants.district_zh, like),
    ...(districtFromZh ? [eq(restaurants.district, districtFromZh)] : []),
    ...(opts.address
      ? [ilike(restaurants.address, like), ilike(restaurants.address_zh, like)]
      : []),
  )!;
}

export const restaurantsRouter = router({
  list: authedProcedure.input(RestaurantListInput).query(async ({ ctx, input }) => {
    const { userId, db } = ctx;
    const {
      search,
      cuisine,
      open_now,
      timezone,
      lat,
      lng,
      max_km,
      price_level,
      sort,
      bookmarked_only,
      limit,
      cursor,
    } = input;

    const conditions = [eq(restaurants.user_id, userId)];

    if (search) {
      conditions.push(textSearch(search));
    }

    if (cuisine) {
      conditions.push(ilike(restaurants.cuisine_primary, `%${cuisine}%`));
    }

    if (price_level && price_level.length > 0) {
      conditions.push(
        sql`${restaurants.price_level} = ANY(ARRAY[${sql.join(
          price_level.map((p) => sql`${p}`),
          sql`, `
        )}])`
      );
    }

    if (bookmarked_only) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM bookmarks b
          WHERE b.restaurant_id = "restaurants"."id"
          AND b.user_id = ${userId}
        )`
      );
    }

    if (lat != null && lng != null && max_km != null) {
      const distanceMeters = max_km * 1000;
      conditions.push(
        sql`ST_DWithin(
          ${restaurants.location},
          ST_MakePoint(${lng}, ${lat})::geography,
          ${distanceMeters}
        )`
      );
    }

    if (cursor) {
      conditions.push(sql`${restaurants.id} > ${cursor}`);
    }

    let orderBy;
    if (sort === "rating") {
      orderBy = [desc(restaurants.rating_aggregate), desc(restaurants.created_at)];
    } else if (sort === "name") {
      orderBy = [asc(restaurants.name)];
    } else if (sort === "distance" && lat != null && lng != null) {
      orderBy = [
        asc(
          sql`ST_Distance(
            ${restaurants.location},
            ST_MakePoint(${lng}, ${lat})::geography
          )`
        ),
      ];
    } else {
      orderBy = [desc(restaurants.created_at)];
    }

    const rows = await db
      .select({
        restaurant: {
          id: restaurants.id,
          name: restaurants.name,
          name_zh: restaurants.name_zh,
          cuisine_primary: restaurants.cuisine_primary,
          cuisine_primary_zh: restaurants.cuisine_primary_zh,
          cuisine_category: restaurants.cuisine_category,
          district: restaurants.district,
          district_zh: restaurants.district_zh,
          price_level: restaurants.price_level,
          rating_aggregate: restaurants.rating_aggregate,
          rating_google: restaurants.rating_google,
          rating_openrice: restaurants.rating_openrice,
          lat: restaurants.lat,
          lng: restaurants.lng,
          // Not returned to the client — used only to compute is_open_now below.
          hours: restaurants.hours,
          signature_dishes: restaurants.signature_dishes,
          google_place_id: restaurants.google_place_id,
        },
        is_bookmarked: sql<boolean>`EXISTS (
          SELECT 1 FROM bookmarks b
          WHERE b.restaurant_id = "restaurants"."id"
          AND b.user_id = ${userId}
        )`.as("is_bookmarked"),
        is_starred: sql<boolean>`EXISTS (
          SELECT 1 FROM restaurant_stars s
          WHERE s.restaurant_id = "restaurants"."id"
          AND s.user_id = ${userId}
        )`.as("is_starred"),
        bookmark_tags: sql<string[] | null>`(
          SELECT b.tags FROM bookmarks b
          WHERE b.restaurant_id = "restaurants"."id"
          AND b.user_id = ${userId}
          LIMIT 1
        )`.as("bookmark_tags"),
        price_range_data: sql<unknown>`(
          SELECT raw_data->'priceRange'
          FROM restaurant_sources
          WHERE restaurant_id = "restaurants"."id"
            AND platform = 'google'
          LIMIT 1
        )`.as("price_range_data"),
        distance_m:
          lat != null && lng != null
            ? sql<number>`ST_Distance(
                ${restaurants.location},
                ST_MakePoint(${lng}, ${lat})::geography
              )`.as("distance_m")
            : sql<null>`NULL`.as("distance_m"),
      })
      .from(restaurants)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    // Colour tags: separate query — enum arrays don't parse reliably from correlated subqueries
    const restaurantIds = items.map((r) => r.restaurant.id);
    const colorTagsMap = new Map<string, string[]>();
    if (restaurantIds.length > 0) {
      const ctRows = await db
        .select({ restaurant_id: restaurantColorTags.restaurant_id, color: restaurantColorTags.color })
        .from(restaurantColorTags)
        .where(inArray(restaurantColorTags.restaurant_id, restaurantIds));
      for (const row of ctRows) {
        const arr = colorTagsMap.get(row.restaurant_id) ?? [];
        arr.push(row.color);
        colorTagsMap.set(row.restaurant_id, arr);
      }
    }

    const enriched = items.map(({ restaurant, is_bookmarked, is_starred, bookmark_tags, price_range_data, distance_m }) => {
      const pr = price_range_data as { startPrice?: { currencyCode?: string; units?: string }; endPrice?: { units?: string } } | null | undefined;
      let price_range_str: string | null = null;
      if (pr?.startPrice?.units) {
        const currency = pr.startPrice.currencyCode ?? "";
        const start = pr.startPrice.units;
        const end = pr.endPrice?.units;
        price_range_str = end && end !== start ? `${currency} ${start}–${end}` : `${currency} ${start}+`;
      }
      const { hours, ...restaurantFields } = restaurant;
      return {
        ...restaurantFields,
        is_bookmarked,
        is_starred,
        bookmark_tags: (bookmark_tags as string[] | null) ?? [],
        color_tags: sortColorTags(colorTagsMap.get(restaurant.id) ?? []),
        price_range_str,
        distance_km: distance_m != null ? distance_m / 1000 : undefined,
        is_open_now: hours ? isOpenNow(hours, timezone) : undefined,
      };
    });

    if (open_now) {
      return {
        items: enriched.filter((r) => r.is_open_now === true),
        next_cursor: hasMore ? items[items.length - 1]!.restaurant.id : null,
      };
    }

    return {
      items: enriched,
      next_cursor: hasMore ? items[items.length - 1]!.restaurant.id : null,
    };
  }),

  getById: authedProcedure
    .input(z.object({ id: z.string().uuid(), timezone: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const { userId, db } = ctx;

      const rows = await db
        .select({
          restaurant: restaurants,
          is_bookmarked: sql<boolean>`EXISTS (
            SELECT 1 FROM bookmarks b
            WHERE b.restaurant_id = "restaurants"."id"
            AND b.user_id = ${userId}
          )`.as("is_bookmarked"),
          is_starred: sql<boolean>`EXISTS (
            SELECT 1 FROM restaurant_stars s
            WHERE s.restaurant_id = "restaurants"."id"
            AND s.user_id = ${userId}
          )`.as("is_starred"),
          bookmark_tags: sql<string[] | null>`(
            SELECT b.tags FROM bookmarks b
            WHERE b.restaurant_id = "restaurants"."id"
            AND b.user_id = ${userId}
            LIMIT 1
          )`.as("bookmark_tags"),
        })
        .from(restaurants)
        .where(
          and(eq(restaurants.id, input.id), eq(restaurants.user_id, userId))
        )
        .limit(1);

      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
      }

      const [sources, ctRows] = await Promise.all([
        // raw_data holds the full upstream API response (Google reviews with
        // full text + author attribution, etc.) — only these four sub-fields
        // are ever read client-side (RestaurantDetail.tsx), so reconstruct a
        // trimmed raw_data instead of shipping the whole blob to the client.
        db
          .select({
            id: restaurantSources.id,
            platform: restaurantSources.platform,
            url: restaurantSources.url,
            created_at: restaurantSources.created_at,
            raw_data: sql<Record<string, unknown> | null>`jsonb_build_object(
              'photos', raw_data->'photos',
              'reservable', raw_data->'reservable',
              'has_booking', raw_data->'has_booking',
              'priceRange', raw_data->'priceRange'
            )`,
          })
          .from(restaurantSources)
          .where(eq(restaurantSources.restaurant_id, input.id)),
        db.select({ color: restaurantColorTags.color })
          .from(restaurantColorTags)
          .where(eq(restaurantColorTags.restaurant_id, input.id)),
      ]);

      const { restaurant, is_bookmarked, is_starred, bookmark_tags } = rows[0]!;
      return {
        ...restaurant,
        is_bookmarked,
        is_starred,
        bookmark_tags: (bookmark_tags as string[] | null) ?? [],
        color_tags: sortColorTags(ctRows.map((r) => r.color)),
        is_open_now: restaurant.hours ? isOpenNow(restaurant.hours, input.timezone) : undefined,
        sources,
      };
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { userId, db } = ctx;

      const deleted = await db.transaction(async (tx) => {
        const rows = await tx
          .delete(restaurants)
          .where(and(eq(restaurants.id, input.id), eq(restaurants.user_id, userId)))
          .returning({ id: restaurants.id, name: restaurants.name });

        if (rows.length === 0) {
          return rows;
        }

        await tx.insert(activityLog).values({
          user_id: userId,
          action: "restaurant_removed",
          restaurant_name: rows[0]!.name,
        });

        return rows;
      });

      if (deleted.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
      }

      return { id: deleted[0]!.id };
    }),

  search: authedProcedure
    .input(RestaurantSearchInput)
    .query(async ({ ctx, input }) => {
      const { userId, db } = ctx;
      const { query } = input;

      const conditions = [
        eq(restaurants.user_id, userId),
        textSearch(query, { address: true }),
      ];

      // Only what the search-preview dropdown (FilterBar.tsx) actually
      // renders — id/name/district (+ zh) and rating.
      return db
        .select({
          id: restaurants.id,
          name: restaurants.name,
          name_zh: restaurants.name_zh,
          district: restaurants.district,
          district_zh: restaurants.district_zh,
          rating_aggregate: restaurants.rating_aggregate,
        })
        .from(restaurants)
        .where(and(...conditions))
        .orderBy(desc(restaurants.rating_aggregate))
        .limit(20);
    }),
});
