import { z } from "zod";
import { eq, and, desc, asc, ilike } from "drizzle-orm";
import { router, publicProcedure, TRPCError } from "../init";
import { bookmarks, restaurants } from "@/server/db/schema";
import {
  BookmarkToggleInput,
  BookmarkUpdateInput,
  BookmarkListInput,
} from "@/shared/validators/bookmark";
import { isOpenNow } from "@/server/geo/utils";

export const bookmarksRouter = router({
  list: publicProcedure
    .input(BookmarkListInput)
    .query(async ({ ctx, input }) => {
      const { userId, db } = ctx;
      const { sort, cuisine, visited, timezone, limit, cursor } = input;

      const conditions = [eq(bookmarks.user_id, userId)];

      if (visited != null) {
        conditions.push(eq(bookmarks.visited, visited));
      }

      let orderBy;
      if (sort === "oldest") {
        orderBy = [asc(bookmarks.created_at)];
      } else if (sort === "name") {
        orderBy = [asc(restaurants.name)];
      } else if (sort === "rating") {
        orderBy = [desc(restaurants.rating_aggregate)];
      } else {
        orderBy = [desc(bookmarks.created_at)];
      }

      const rows = await db
        .select({ bookmark: bookmarks, restaurant: restaurants })
        .from(bookmarks)
        .innerJoin(restaurants, eq(bookmarks.restaurant_id, restaurants.id))
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(limit + 1);

      const filtered = cuisine
        ? rows.filter(
            ({ restaurant }) =>
              restaurant.cuisine_primary
                ?.toLowerCase()
                .includes(cuisine.toLowerCase())
          )
        : rows;

      const hasMore = filtered.length > limit;
      const items = hasMore ? filtered.slice(0, limit) : filtered;

      return {
        items: items.map(({ bookmark, restaurant }) => ({
          ...bookmark,
          restaurant: {
            ...restaurant,
            is_open_now: restaurant.hours
              ? isOpenNow(restaurant.hours, timezone)
              : undefined,
          },
        })),
        next_cursor: hasMore ? items[items.length - 1]!.bookmark.id : null,
      };
    }),

  toggle: publicProcedure
    .input(BookmarkToggleInput)
    .mutation(async ({ ctx, input }) => {
      const { userId, db } = ctx;

      const existing = await db
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.user_id, userId),
            eq(bookmarks.restaurant_id, input.restaurant_id)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .delete(bookmarks)
          .where(eq(bookmarks.id, existing[0]!.id));
        return { bookmarked: false };
      }

      await db.insert(bookmarks).values({
        user_id: userId,
        restaurant_id: input.restaurant_id,
      });
      return { bookmarked: true };
    }),

  update: publicProcedure
    .input(BookmarkUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { userId, db } = ctx;
      const { id, ...updates } = input;

      const existing = await db
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(and(eq(bookmarks.id, id), eq(bookmarks.user_id, userId)))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bookmark not found" });
      }

      const updateData: Record<string, unknown> = { updated_at: new Date() };
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.visited !== undefined) {
        updateData.visited = updates.visited;
        if (updates.visited) updateData.visited_at = new Date();
      }
      if (updates.personal_rating !== undefined) {
        updateData.personal_rating = updates.personal_rating;
      }

      const [updated] = await db
        .update(bookmarks)
        .set(updateData)
        .where(eq(bookmarks.id, id))
        .returning();

      return updated!;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { userId, db } = ctx;

      const result = await db
        .delete(bookmarks)
        .where(and(eq(bookmarks.id, input.id), eq(bookmarks.user_id, userId)))
        .returning({ id: bookmarks.id });

      if (result.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bookmark not found" });
      }

      return { success: true as const };
    }),
});
