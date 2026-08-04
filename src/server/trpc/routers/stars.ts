import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, authedProcedure, TRPCError } from "../init";
import { restaurants, restaurantStars, activityLog } from "@/server/db/schema";

export const starsRouter = router({
  toggle: authedProcedure
    .input(z.object({ restaurant_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      const [restaurant] = await db
        .select({ id: restaurants.id, name: restaurants.name })
        .from(restaurants)
        .where(and(eq(restaurants.id, input.restaurant_id), eq(restaurants.user_id, userId)))
        .limit(1);

      if (!restaurant) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [existing] = await db
        .select({ id: restaurantStars.id })
        .from(restaurantStars)
        .where(
          and(
            eq(restaurantStars.user_id, userId),
            eq(restaurantStars.restaurant_id, input.restaurant_id),
          )
        )
        .limit(1);

      if (existing) {
        await db.transaction(async (tx) => {
          await tx.delete(restaurantStars).where(eq(restaurantStars.id, existing.id));
          await tx.insert(activityLog).values({
            user_id: userId,
            action: "restaurant_unstarred",
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name,
          });
        });
        return { starred: false };
      } else {
        await db.transaction(async (tx) => {
          await tx.insert(restaurantStars).values({
            user_id: userId,
            restaurant_id: input.restaurant_id,
          });
          await tx.insert(activityLog).values({
            user_id: userId,
            action: "restaurant_starred",
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name,
          });
        });
        return { starred: true };
      }
    }),
});
