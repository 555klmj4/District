-- Enable required extensions (Supabase has these available)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) DEFAULT 'default' NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"visited" boolean DEFAULT false,
	"visited_at" timestamp with time zone,
	"personal_rating" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuisine_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"parent" varchar(128),
	"aliases" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "cuisine_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "recommendation_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) DEFAULT 'default' NOT NULL,
	"history_id" uuid NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"signal" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) DEFAULT 'default' NOT NULL,
	"query_text" text,
	"context" jsonb,
	"results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"explanation" text,
	"model_used" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"platform" varchar(64) NOT NULL,
	"external_id" varchar(512),
	"url" text NOT NULL,
	"raw_data" jsonb,
	"fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) DEFAULT 'default' NOT NULL,
	"name" varchar(512) NOT NULL,
	"slug" varchar(512) NOT NULL,
	"category" varchar(64),
	"address" text,
	"district" varchar(256),
	"city" varchar(256),
	"country" varchar(128),
	"location" "geography(Point, 4326)",
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"phone" varchar(64),
	"website" text,
	"price_level" integer,
	"cuisine_primary" varchar(128),
	"cuisine_tags" jsonb DEFAULT '[]'::jsonb,
	"hours" jsonb,
	"rating_google" numeric(3, 1),
	"rating_openrice" numeric(3, 1),
	"rating_yelp" numeric(3, 1),
	"rating_count_google" integer,
	"rating_aggregate" numeric(4, 2),
	"google_place_id" varchar(256),
	"yelp_id" varchar(256),
	"enriched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) DEFAULT 'default' NOT NULL,
	"cuisine_affinities" jsonb DEFAULT '[]'::jsonb,
	"preferred_price_levels" jsonb DEFAULT '[]'::jsonb,
	"preferred_districts" jsonb DEFAULT '[]'::jsonb,
	"home_lat" numeric(10, 7),
	"home_lng" numeric(10, 7),
	"home_address" text,
	"avoid_cuisines" jsonb DEFAULT '[]'::jsonb,
	"max_distance_km" integer DEFAULT 5,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_history_id_recommendation_history_id_fk" FOREIGN KEY ("history_id") REFERENCES "public"."recommendation_history"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_sources" ADD CONSTRAINT "restaurant_sources_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_user_restaurant_idx" ON "bookmarks" USING btree ("user_id","restaurant_id");--> statement-breakpoint
CREATE INDEX "bookmarks_user_idx" ON "bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bookmarks_created_idx" ON "bookmarks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "feedback_user_history_idx" ON "recommendation_feedback" USING btree ("user_id","history_id");--> statement-breakpoint
CREATE INDEX "feedback_restaurant_idx" ON "recommendation_feedback" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "rec_history_user_idx" ON "recommendation_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rec_history_created_idx" ON "recommendation_history" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_platform_url_idx" ON "restaurant_sources" USING btree ("platform","url");--> statement-breakpoint
CREATE INDEX "sources_restaurant_idx" ON "restaurant_sources" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurants_slug_user_idx" ON "restaurants" USING btree ("slug","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurants_google_place_id_idx" ON "restaurants" USING btree ("google_place_id");--> statement-breakpoint
CREATE INDEX "restaurants_city_idx" ON "restaurants" USING btree ("city");--> statement-breakpoint
CREATE INDEX "restaurants_cuisine_idx" ON "restaurants" USING btree ("cuisine_primary");--> statement-breakpoint
CREATE INDEX "restaurants_user_id_idx" ON "restaurants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "restaurants_location_gist_idx" ON "restaurants" USING gist ("location");--> statement-breakpoint
CREATE INDEX "restaurants_name_trgm_idx" ON "restaurants" USING gin (name gin_trgm_ops);