import {
  pgTable,
  pgEnum,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { WeeklyHours } from "@/shared/types/restaurant";
import type {
  CuisineAffinity,
  ScoreBreakdown,
} from "@/shared/types/preferences";
import type {
  RecommendationContext,
  ScoredResult,
  FeedbackSignal,
} from "@/shared/types/recommendation";

// PostGIS geography(Point) column — only used in WHERE / ORDER BY via sql`...`
const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geography(Point, 4326)";
  },
});

export const tagColorEnum = pgEnum("tag_color", [
  "green", "blue", "purple", "yellow", "orange", "red", "grey",
]);

// ── restaurants ────────────────────────────────────────────────────────────
export const restaurants = pgTable(
  "restaurants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: varchar("user_id", { length: 255 }).notNull().default("default"),

    name: varchar("name", { length: 512 }).notNull(),
    slug: varchar("slug", { length: 512 }).notNull(),
    category: varchar("category", { length: 64 }),

    address: text("address"),
    district: varchar("district", { length: 256 }),
    city: varchar("city", { length: 256 }),
    country: varchar("country", { length: 128 }),
    location: geographyPoint("location"),
    lat: numeric("lat", { precision: 10, scale: 7 }),
    lng: numeric("lng", { precision: 10, scale: 7 }),

    phone: varchar("phone", { length: 64 }),
    website: text("website"),
    price_level: integer("price_level"),
    cuisine_category: varchar("cuisine_category", { length: 64 }),
    cuisine_primary: varchar("cuisine_primary", { length: 128 }),
    cuisine_primary_zh: varchar("cuisine_primary_zh", { length: 128 }),
    name_zh: varchar("name_zh", { length: 512 }),
    address_zh: text("address_zh"),
    district_zh: varchar("district_zh", { length: 256 }),
    cuisine_tags: jsonb("cuisine_tags").$type<string[]>().default([]),
    hours: jsonb("hours").$type<WeeklyHours>(),

    rating_google: numeric("rating_google", { precision: 3, scale: 1 }),
    rating_openrice: numeric("rating_openrice", { precision: 3, scale: 1 }),
    rating_yelp: numeric("rating_yelp", { precision: 3, scale: 1 }),
    rating_count_google: integer("rating_count_google"),
    rating_count_openrice: integer("rating_count_openrice"),
    rating_aggregate: numeric("rating_aggregate", { precision: 4, scale: 2 }),

    google_place_id: varchar("google_place_id", { length: 256 }),
    yelp_id: varchar("yelp_id", { length: 256 }),

    signature_dishes: jsonb("signature_dishes").$type<string[]>().default([]),
    signature_dishes_zh: jsonb("signature_dishes_zh").$type<string[]>().default([]),
    enriched_at: timestamp("enriched_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("restaurants_slug_user_idx").on(t.slug, t.user_id),
    uniqueIndex("restaurants_google_place_id_idx").on(t.google_place_id),
    // GiST and GIN trigram indexes are created in migration SQL (not expressible via Drizzle builder)
    index("restaurants_city_idx").on(t.city),
    index("restaurants_cuisine_idx").on(t.cuisine_primary),
    index("restaurants_user_id_idx").on(t.user_id),
    index("restaurants_user_created_idx").on(t.user_id, t.created_at),
  ]
);

// ── restaurant_sources ─────────────────────────────────────────────────────
export const restaurantSources = pgTable(
  "restaurant_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurant_id: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 64 }).notNull(),
    external_id: varchar("external_id", { length: 512 }),
    url: text("url").notNull(),
    raw_data: jsonb("raw_data"),
    fetched_at: timestamp("fetched_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("sources_platform_url_idx").on(t.platform, t.url),
    index("sources_restaurant_idx").on(t.restaurant_id),
  ]
);

// ── restaurant_color_tags ──────────────────────────────────────────────────
export const restaurantColorTags = pgTable(
  "restaurant_color_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurant_id: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    color: tagColorEnum("color").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("color_tags_restaurant_color_idx").on(t.restaurant_id, t.color),
    index("color_tags_restaurant_idx").on(t.restaurant_id),
  ]
);

// ── restaurant_stars ───────────────────────────────────────────────────────
export const restaurantStars = pgTable(
  "restaurant_stars",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: varchar("user_id", { length: 255 }).notNull().default("default"),
    restaurant_id: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("stars_user_restaurant_idx").on(t.user_id, t.restaurant_id),
    index("stars_user_idx").on(t.user_id),
  ]
);

// ── bookmarks ──────────────────────────────────────────────────────────────
export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: varchar("user_id", { length: 255 }).notNull().default("default"),
    restaurant_id: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    notes: text("notes"),
    tags: jsonb("tags").$type<string[]>().default([]),
    visited: boolean("visited").default(false),
    visited_at: timestamp("visited_at", { withTimezone: true }),
    personal_rating: integer("personal_rating"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("bookmarks_user_restaurant_idx").on(t.user_id, t.restaurant_id),
    index("bookmarks_user_idx").on(t.user_id),
    index("bookmarks_created_idx").on(t.created_at),
  ]
);

// ── user_preferences ───────────────────────────────────────────────────────
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: varchar("user_id", { length: 255 })
    .notNull()
    .unique()
    .default("default"),
  cuisine_affinities: jsonb("cuisine_affinities")
    .$type<CuisineAffinity[]>()
    .default([]),
  preferred_price_levels: jsonb("preferred_price_levels")
    .$type<number[]>()
    .default([]),
  preferred_districts: jsonb("preferred_districts")
    .$type<string[]>()
    .default([]),
  home_lat: numeric("home_lat", { precision: 10, scale: 7 }),
  home_lng: numeric("home_lng", { precision: 10, scale: 7 }),
  home_address: text("home_address"),
  avoid_cuisines: jsonb("avoid_cuisines").$type<string[]>().default([]),
  max_distance_km: integer("max_distance_km").default(5),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── recommendation_history ─────────────────────────────────────────────────
export const recommendationHistory = pgTable(
  "recommendation_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: varchar("user_id", { length: 255 }).notNull().default("default"),
    query_text: text("query_text"),
    context: jsonb("context").$type<RecommendationContext>(),
    results: jsonb("results").$type<ScoredResult[]>().notNull().default([]),
    explanation: text("explanation"),
    model_used: varchar("model_used", { length: 128 }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("rec_history_user_idx").on(t.user_id),
    index("rec_history_created_idx").on(t.created_at),
  ]
);

// ── recommendation_feedback ────────────────────────────────────────────────
export const recommendationFeedback = pgTable(
  "recommendation_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: varchar("user_id", { length: 255 }).notNull().default("default"),
    history_id: uuid("history_id")
      .notNull()
      .references(() => recommendationHistory.id, { onDelete: "cascade" }),
    restaurant_id: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    signal: varchar("signal", { length: 32 })
      .notNull()
      .$type<FeedbackSignal>(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("feedback_user_history_idx").on(t.user_id, t.history_id),
    index("feedback_restaurant_idx").on(t.restaurant_id),
  ]
);

// ── activity_log ───────────────────────────────────────────────────────────
export const activityActionEnum = pgEnum("activity_action", [
  "restaurant_added",
  "restaurant_removed",
  "color_tag_added",
  "color_tag_removed",
  "restaurant_starred",
  "restaurant_unstarred",
]);

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: varchar("user_id", { length: 255 }).notNull().default("default"),
    action: activityActionEnum("action").notNull(),
    restaurant_id: uuid("restaurant_id").references(() => restaurants.id, {
      onDelete: "set null",
    }),
    restaurant_name: text("restaurant_name").notNull(),
    color: tagColorEnum("color"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("activity_log_user_created_idx").on(t.user_id, t.created_at)]
);

// ── cuisine_tags (reference) ───────────────────────────────────────────────
export const cuisineTags = pgTable(
  "cuisine_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 128 }).notNull().unique(),
    parent: varchar("parent", { length: 128 }),
    aliases: jsonb("aliases").$type<string[]>().default([]),
  }
);

// ── users ──────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  passphrase_hash: text("passphrase_hash").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type UserRow = typeof users.$inferSelect;

// Inferred types
export type RestaurantRow = typeof restaurants.$inferSelect;
export type RestaurantInsertRow = typeof restaurants.$inferInsert;
export type RestaurantSourceRow = typeof restaurantSources.$inferSelect;
export type RestaurantSourceInsertRow = typeof restaurantSources.$inferInsert;
export type RestaurantColorTagRow = typeof restaurantColorTags.$inferSelect;
export type RestaurantStarRow = typeof restaurantStars.$inferSelect;
export type BookmarkRow = typeof bookmarks.$inferSelect;
export type BookmarkInsertRow = typeof bookmarks.$inferInsert;
export type UserPreferencesRow = typeof userPreferences.$inferSelect;
export type RecommendationHistoryRow =
  typeof recommendationHistory.$inferSelect;
export type RecommendationFeedbackRow =
  typeof recommendationFeedback.$inferSelect;
export type ActivityLogRow = typeof activityLog.$inferSelect;
