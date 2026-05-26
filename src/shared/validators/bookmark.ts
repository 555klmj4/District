import { z } from "zod";

export const BookmarkToggleInput = z.object({
  restaurant_id: z.string().uuid(),
});

export const BookmarkUpdateInput = z.object({
  id: z.string().uuid(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  visited: z.boolean().optional(),
  personal_rating: z.number().int().min(1).max(5).nullable().optional(),
});
export type BookmarkUpdateInput = z.infer<typeof BookmarkUpdateInput>;

export const BookmarkListInput = z.object({
  sort: z.enum(["newest", "oldest", "name", "rating"]).default("newest"),
  cuisine: z.string().optional(),
  visited: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});
export type BookmarkListInput = z.infer<typeof BookmarkListInput>;
