export type Platform = "google" | "openrice" | "yelp" | "manual";

export type Category = "restaurant" | "bar" | "cafe" | "other";

export interface DayHours {
  open: string;  // "HH:MM" 24h
  close: string; // "HH:MM" 24h
  closed?: boolean;
}

export interface WeeklyHours {
  mon?: DayHours;
  tue?: DayHours;
  wed?: DayHours;
  thu?: DayHours;
  fri?: DayHours;
  sat?: DayHours;
  sun?: DayHours;
}

export interface RestaurantSource {
  id: string;
  restaurant_id: string;
  platform: Platform;
  external_id: string | null;
  url: string;
  fetched_at: Date | null;
  created_at: Date;
}

export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  category: Category | null;
  address: string | null;
  district: string | null;
  city: string | null;
  country: string | null;
  lat: string | null;
  lng: string | null;
  phone: string | null;
  website: string | null;
  price_level: number | null;
  cuisine_category: string | null;
  cuisine_primary: string | null;
  cuisine_primary_zh: string | null;
  name_zh: string | null;
  address_zh: string | null;
  district_zh: string | null;
  cuisine_tags: string[];
  hours: WeeklyHours | null;
  rating_google: string | null;
  rating_openrice: string | null;
  rating_yelp: string | null;
  rating_count_google: number | null;
  rating_count_openrice: number | null;
  rating_aggregate: string | null;
  google_place_id: string | null;
  yelp_id: string | null;
  signature_dishes: string[];
  signature_dishes_zh: string[];
  enriched_at: Date | null;
  created_at: Date;
  updated_at: Date;
  // Joined data
  sources?: RestaurantSource[];
  price_range_str?: string | null;
  is_bookmarked?: boolean;
  bookmark_tags?: string[];
  is_starred?: boolean;
  color_tags?: string[];
  distance_km?: number;
  is_open_now?: boolean;
}

export interface RestaurantInsert {
  user_id?: string;
  name: string;
  slug: string;
  category?: Category;
  address?: string | null;
  district?: string | null;
  city?: string | null;
  country?: string | null;
  lat?: string | null;
  lng?: string | null;
  phone?: string | null;
  website?: string | null;
  price_level?: number | null;
  cuisine_primary?: string | null;
  cuisine_tags?: string[];
  hours?: WeeklyHours | null;
  rating_google?: string | null;
  rating_count_google?: number | null;
  rating_aggregate?: string | null;
  google_place_id?: string | null;
  yelp_id?: string | null;
  enriched_at?: Date | null;
}
