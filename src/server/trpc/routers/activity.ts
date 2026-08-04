import { z } from "zod";
import { and, desc, eq, lt } from "drizzle-orm";
import { router, authedProcedure } from "../init";
import { activityLog, restaurants } from "@/server/db/schema";

export const activityRouter = router({
  list: authedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(30),
        cursor: z.string().datetime().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId, db } = ctx;
      const { limit, cursor } = input;

      const conditions = [eq(activityLog.user_id, userId)];
      if (cursor) {
        conditions.push(lt(activityLog.created_at, new Date(cursor)));
      }

      const rows = await db
        .select({
          id: activityLog.id,
          user_id: activityLog.user_id,
          action: activityLog.action,
          restaurant_id: activityLog.restaurant_id,
          restaurant_name: activityLog.restaurant_name,
          restaurant_name_zh: restaurants.name_zh,
          color: activityLog.color,
          created_at: activityLog.created_at,
        })
        .from(activityLog)
        .leftJoin(restaurants, eq(activityLog.restaurant_id, restaurants.id))
        .where(and(...conditions))
        .orderBy(desc(activityLog.created_at))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        items,
        next_cursor: hasMore ? items[items.length - 1]!.created_at.toISOString() : null,
      };
    }),
});
