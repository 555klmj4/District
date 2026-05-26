import { z } from "zod";
import { eq, and, ilike, or, desc, asc, sql, isNotNull } from "drizzle-orm";
import { router, publicProcedure, TRPCError } from "../init";
import { restaurants, bookmarks, restaurantSources } from "@/server/db/schema";
import {
  RestaurantListInput,
  RestaurantSearchInput,
} from "@/shared/validators/restaurant";
import { isOpenNow } from "@/server/geo/utils";

export const restaurantsRouter = router({
  list: publicProcedure.input(RestaurantListInput).query(async ({ ctx, input }) => {
    const { userId, db } = ctx;
    const {
      search,
      cuisine,
      open_now,
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
      conditions.push(
        or(
          ilike(restaurants.name, `%${search}%`),
          ilike(restaurants.cuisine_primary, `%${search}%`),
          ilike(restaurants.district, `%${search}%`)
        )!
      );
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
          WHERE b.restaurant_id = ${restaurants.id}
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
        restaurant: restaurants,
        is_bookmarked: sql<boolean>`EXISTS (
          SELECT 1 FROM bookmarks b
          WHERE b.restaurant_id = ${restaurants.id}
          AND b.user_id = ${userId}
        )`.as("is_bookmarked"),
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

    const enriched = items.map(({ restaurant, is_bookmarked, distance_m }) => ({
      ...restaurant,
      is_bookmarked,
      distance_km: distance_m != null ? distance_m / 1000 : undefined,
      is_open_now: restaurant.hours ? isOpenNow(restaurant.hours) : undefined,
    }));

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

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { userId, db } = ctx;

      const rows = await db
        .select({
          restaurant: restaurants,
          is_bookmarked: sql<boolean>`EXISTS (
            SELECT 1 FROM bookmarks b
            WHERE b.restaurant_id = ${restaurants.id}
            AND b.user_id = ${userId}
          )`.as("is_bookmarked"),
        })
        .from(restaurants)
        .where(
          and(eq(restaurants.id, input.id), eq(restaurants.user_id, userId))
        )
        .limit(1);

      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
      }

      const sources = await db
        .select()
        .from(restaurantSources)
        .where(eq(restaurantSources.restaurant_id, input.id));

      const { restaurant, is_bookmarked } = rows[0]!;
      return {
        ...restaurant,
        is_bookmarked,
        is_open_now: restaurant.hours ? isOpenNow(restaurant.hours) : undefined,
        sources,
      };
    }),

  search: publicProcedure
    .input(RestaurantSearchInput)
    .query(async ({ ctx, input }) => {
      const { userId, db } = ctx;
      const { query, lat, lng } = input;

      const conditions = [
        eq(restaurants.user_id, userId),
        or(
          ilike(restaurants.name, `%${query}%`),
          ilike(restaurants.cuisine_primary, `%${query}%`),
          ilike(restaurants.district, `%${query}%`),
          ilike(restaurants.address, `%${query}%`)
        )!,
      ];

      const rows = await db
        .select({
          restaurant: restaurants,
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
        .orderBy(desc(restaurants.rating_aggregate))
        .limit(20);

      return rows.map(({ restaurant, distance_m }) => ({
        ...restaurant,
        distance_km: distance_m != null ? distance_m / 1000 : undefined,
        is_open_now: restaurant.hours ? isOpenNow(restaurant.hours) : undefined,
      }));
    }),
});
