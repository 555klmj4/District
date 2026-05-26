import { z } from "zod";

export const RecommendationInput = z.object({
  query: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  max_km: z.number().min(0.1).max(50).optional(),
  open_now: z.boolean().optional(),
  timezone: z.string().optional(),
  cuisine: z.string().optional(),
  limit: z.number().int().min(1).max(10).default(5),
});
export type RecommendationInput = z.infer<typeof RecommendationInput>;

export const FeedbackInput = z.object({
  history_id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  signal: z.enum(["thumbs_up", "thumbs_down", "visited"]),
});
export type FeedbackInput = z.infer<typeof FeedbackInput>;

export const PreferencesUpdateInput = z.object({
  home_lat: z.number().min(-90).max(90).nullable().optional(),
  home_lng: z.number().min(-180).max(180).nullable().optional(),
  home_address: z.string().max(500).nullable().optional(),
  avoid_cuisines: z.array(z.string()).optional(),
  max_distance_km: z.number().int().min(1).max(50).optional(),
});
export type PreferencesUpdateInput = z.infer<typeof PreferencesUpdateInput>;
