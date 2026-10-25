import "server-only";
import type { DB } from "@/server/db";
import { restaurantColorTags, activityLog } from "@/server/db/schema";
import type { TagColor } from "@/lib/colors";

// Adds (never removes) colour tags, logging only the ones that were new.
export async function addColorTags(
  db: DB,
  userId: string,
  restaurant: { id: string; name: string },
  colors: TagColor[]
): Promise<void> {
  if (colors.length === 0) return;
  const inserted = await db
    .insert(restaurantColorTags)
    .values(colors.map((color) => ({ restaurant_id: restaurant.id, color })))
    .onConflictDoNothing()
    .returning({ color: restaurantColorTags.color });
  if (inserted.length === 0) return;
  await db.insert(activityLog).values(
    inserted.map(({ color }) => ({
      user_id: userId,
      action: "color_tag_added" as const,
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      color,
    }))
  );
}
