import "server-only";
import { sql } from "drizzle-orm";
import type { DB } from "@/server/db";
import { restaurants, restaurantSources } from "@/server/db/schema";
import { parseAndResolveUrl } from "./urlParser";
import { fetchByPlaceId, fetchByTextSearch } from "./googlePlaces";
import { normalizePlace, computeRatingAggregate } from "./normalizer";
import { findDuplicate } from "./deduplication";
import type { RestaurantRow } from "@/server/db/schema";

export interface ImportResult {
  restaurant_id: string;
  was_duplicate: boolean;
  restaurant: RestaurantRow;
}

export async function importUrl(opts: {
  url: string;
  userId: string;
  db: DB;
}): Promise<ImportResult> {
  const { url, userId, db } = opts;

  // 1. Parse URL
  const parsed = await parseAndResolveUrl(url);

  // 2. Fetch from Google Places
  let placeData;
  if (parsed.placeId) {
    placeData = await fetchByPlaceId(parsed.placeId);
  } else if (parsed.restaurantName) {
    const results = await fetchByTextSearch(
      parsed.restaurantName,
      parsed.latLng ?? undefined
    );
    if (results.length === 0) {
      throw new Error(
        `Could not find "${parsed.restaurantName}" on Google Places`
      );
    }
    placeData = results[0]!;
  } else {
    throw new Error("Could not determine restaurant from URL");
  }

  // 3. Normalize
  const normalized = normalizePlace(placeData);

  // 4. Deduplicate
  const duplicate = await findDuplicate(db, normalized, userId);

  if (duplicate) {
    // Attach source URL to existing restaurant and update metadata
    await db
      .insert(restaurantSources)
      .values({
        restaurant_id: duplicate.restaurant_id,
        platform: parsed.platform,
        external_id: parsed.placeId ?? null,
        url: parsed.originalUrl,
        raw_data: placeData as unknown as Record<string, unknown>,
        fetched_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [restaurantSources.platform, restaurantSources.url],
        set: {
          raw_data: placeData as unknown as Record<string, unknown>,
          fetched_at: new Date(),
        },
      });

    const existingRows = await db
      .select()
      .from(restaurants)
      .where(
        (t) => sql`${t.id} = ${duplicate.restaurant_id}`
      )
      .limit(1);

    return {
      restaurant_id: duplicate.restaurant_id,
      was_duplicate: true,
      restaurant: existingRows[0]!,
    };
  }

  // 5. Insert new restaurant
  const insertData = {
    user_id: userId,
    name: normalized.name,
    slug: normalized.slug,
    category: normalized.category,
    address: normalized.address,
    district: normalized.district,
    city: normalized.city,
    country: normalized.country,
    lat: normalized.lat,
    lng: normalized.lng,
    phone: normalized.phone,
    website: normalized.website,
    price_level: normalized.price_level,
    cuisine_primary: normalized.cuisine_primary,
    cuisine_tags: normalized.cuisine_tags,
    hours: normalized.hours,
    rating_google: normalized.rating_google,
    rating_count_google: normalized.rating_count_google,
    rating_aggregate: normalized.rating_aggregate,
    google_place_id: normalized.google_place_id,
    enriched_at: new Date(),
  };

  const [restaurant] = await db
    .insert(restaurants)
    .values(insertData)
    .returning();

  // Set PostGIS location
  if (normalized.lat && normalized.lng) {
    await db
      .update(restaurants)
      .set({
        location: sql`ST_MakePoint(${parseFloat(normalized.lng)}, ${parseFloat(normalized.lat)})::geography`,
      })
      .where(sql`id = ${restaurant!.id}`);
  }

  // 6. Insert source record
  await db.insert(restaurantSources).values({
    restaurant_id: restaurant!.id,
    platform: parsed.platform,
    external_id: parsed.placeId ?? normalized.google_place_id,
    url: parsed.originalUrl,
    raw_data: placeData as unknown as Record<string, unknown>,
    fetched_at: new Date(),
  });

  return {
    restaurant_id: restaurant!.id,
    was_duplicate: false,
    restaurant: restaurant!,
  };
}
