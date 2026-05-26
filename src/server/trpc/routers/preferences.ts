import { eq } from "drizzle-orm";
import { router, publicProcedure } from "../init";
import { userPreferences, bookmarks, restaurants } from "@/server/db/schema";
import { PreferencesUpdateInput } from "@/shared/validators/recommendation";
import { extractSignals } from "@/server/recommendation/signals";

export const preferencesRouter = router({
  get: publicProcedure.query(async ({ ctx }) => {
    const { userId, db } = ctx;

    const rows = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.user_id, userId))
      .limit(1);

    if (rows.length > 0) return rows[0]!;

    // Auto-create default preferences for new user
    const [created] = await db
      .insert(userPreferences)
      .values({ user_id: userId })
      .returning();

    return created!;
  }),

  update: publicProcedure
    .input(PreferencesUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { userId, db } = ctx;

      const updateData: Record<string, unknown> = { updated_at: new Date() };
      if (input.home_lat !== undefined) updateData.home_lat = input.home_lat?.toString();
      if (input.home_lng !== undefined) updateData.home_lng = input.home_lng?.toString();
      if (input.home_address !== undefined) updateData.home_address = input.home_address;
      if (input.avoid_cuisines !== undefined) updateData.avoid_cuisines = input.avoid_cuisines;
      if (input.max_distance_km !== undefined) updateData.max_distance_km = input.max_distance_km;

      // Upsert
      const [row] = await db
        .insert(userPreferences)
        .values({ user_id: userId, ...updateData })
        .onConflictDoUpdate({
          target: userPreferences.user_id,
          set: updateData,
        })
        .returning();

      return row!;
    }),

  recompute: publicProcedure.mutation(async ({ ctx }) => {
    const { userId, db } = ctx;

    const bookmarkRows = await db
      .select({ bookmark: bookmarks, restaurant: restaurants })
      .from(bookmarks)
      .innerJoin(restaurants, eq(bookmarks.restaurant_id, restaurants.id))
      .where(eq(bookmarks.user_id, userId));

    const signals = extractSignals(bookmarkRows);

    const [row] = await db
      .insert(userPreferences)
      .values({
        user_id: userId,
        cuisine_affinities: signals.cuisine_affinities,
        preferred_price_levels: signals.preferred_price_levels,
        preferred_districts: signals.preferred_districts,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.user_id,
        set: {
          cuisine_affinities: signals.cuisine_affinities,
          preferred_price_levels: signals.preferred_price_levels,
          preferred_districts: signals.preferred_districts,
          updated_at: new Date(),
        },
      })
      .returning();

    return row!;
  }),
});
