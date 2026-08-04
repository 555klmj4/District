ALTER TYPE "public"."activity_action" ADD VALUE 'restaurant_starred';--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'restaurant_unstarred';--> statement-breakpoint
CREATE TABLE "restaurant_stars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) DEFAULT 'default' NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "restaurant_stars" ADD CONSTRAINT "restaurant_stars_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stars_user_restaurant_idx" ON "restaurant_stars" USING btree ("user_id","restaurant_id");--> statement-breakpoint
CREATE INDEX "stars_user_idx" ON "restaurant_stars" USING btree ("user_id");