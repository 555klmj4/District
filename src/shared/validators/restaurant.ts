import { z } from "zod";

export const RestaurantListInput = z.object({
  search: z.string().optional(),
  cuisine: z.string().optional(),
  open_now: z.boolean().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  max_km: z.number().min(0.1).max(50).optional(),
  price_level: z.array(z.number().int().min(1).max(4)).optional(),
  sort: z.enum(["distance", "rating", "newest", "name"]).optional(),
  bookmarked_only: z.boolean().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
export type RestaurantListInput = z.infer<typeof RestaurantListInput>;

export const RestaurantSearchInput = z.object({
  query: z.string().min(1).max(200),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
export type RestaurantSearchInput = z.infer<typeof RestaurantSearchInput>;
