export interface CuisineAffinity {
  cuisine: string;
  weight: number;       // 0.0 – 1.0, normalized across all cuisines
  sample_count: number; // number of bookmarks contributing to this weight
}

export interface UserPreferences {
  id: string;
  user_id: string;
  cuisine_affinities: CuisineAffinity[];
  preferred_price_levels: number[];   // e.g. [2, 3]
  preferred_districts: string[];
  home_lat: string | null;
  home_lng: string | null;
  home_address: string | null;
  avoid_cuisines: string[];
  max_distance_km: number;
  updated_at: Date;
}

export interface ScoreBreakdown {
  affinity: number;  // 0–1
  distance: number;  // 0–1
  rating: number;    // 0–1
  recency: number;   // 0–1
  feedback: number;  // 0–1
  color: number;     // multiplier applied to total
  total: number;     // weighted sum × color multiplier
}
