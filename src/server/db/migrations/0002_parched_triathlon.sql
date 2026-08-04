CREATE TYPE "public"."activity_action" AS ENUM('restaurant_added', 'restaurant_removed', 'color_tag_added', 'color_tag_removed');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) DEFAULT 'default' NOT NULL,
	"action" "activity_action" NOT NULL,
	"restaurant_id" uuid,
	"restaurant_name" text NOT NULL,
	"color" "tag_color",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_user_created_idx" ON "activity_log" USING btree ("user_id","created_at");
