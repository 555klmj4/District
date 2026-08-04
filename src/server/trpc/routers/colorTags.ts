import { z } from "zod";
import { sql, eq, and } from "drizzle-orm";
import { router, authedProcedure, TRPCError } from "../init";
import { restaurants, restaurantColorTags, activityLog } from "@/server/db/schema";
import { TAG_COLOR_IDS } from "@/lib/colors";

export const colorTagsRouter = router({
  toggle: authedProcedure
    .input(z.object({
      restaurant_id: z.string().uuid(),
      color: z.enum(TAG_COLOR_IDS),
    }))
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
        .select({ id: restaurantColorTags.id })
        .from(restaurantColorTags)
        .where(
          and(
            eq(restaurantColorTags.restaurant_id, input.restaurant_id),
            eq(restaurantColorTags.color, input.color),
          )
        )
        .limit(1);

      if (existing) {
        await db.transaction(async (tx) => {
          await tx.execute(sql`
            DELETE FROM restaurant_color_tags
            WHERE restaurant_id = ${input.restaurant_id}::uuid
            AND color = ${input.color}::tag_color
          `);
          await tx.insert(activityLog).values({
            user_id: userId,
            action: "color_tag_removed",
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name,
            color: input.color,
          });
        });
        return { color: input.color, active: false };
      } else {
        await db.transaction(async (tx) => {
          await tx.execute(sql`
            INSERT INTO restaurant_color_tags (restaurant_id, color)
            VALUES (${input.restaurant_id}::uuid, ${input.color}::tag_color)
          `);
          await tx.insert(activityLog).values({
            user_id: userId,
            action: "color_tag_added",
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name,
            color: input.color,
          });
        });
        return { color: input.color, active: true };
      }
    }),
});
