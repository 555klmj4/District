import type { Restaurant } from "./restaurant";
import type { ScoreBreakdown } from "./preferences";

export interface RecommendationContext {
  lat?: number;
  lng?: number;
  time_of_day?: string;  // "HH:MM" 24h
  day_of_week?: string;  // "monday" | "tuesday" | ...
  max_distance_km?: number;
  cuisine_filter?: string;
  open_now?: boolean;
}

export interface ScoredResult {
  restaurant_id: string;
  score: number;
  score_breakdown: ScoreBreakdown;
}

export interface ScoredCandidate {
  restaurant: Restaurant;
  score: number;
  score_breakdown: ScoreBreakdown;
}

export interface RecommendationResult {
  history_id: string;
  candidates: ScoredCandidate[];
  explanation: string | null;
  context: RecommendationContext;
}

export type FeedbackSignal = "thumbs_up" | "thumbs_down" | "visited";
