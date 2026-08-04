import "server-only";
import { after } from "next/server";
import { sql, eq } from "drizzle-orm";
import type { DB } from "@/server/db";
import { restaurants, restaurantSources, activityLog } from "@/server/db/schema";
import { parseAndResolveUrl } from "./urlParser";
import { fetchByPlaceId, fetchByTextSearch, type PlaceResult } from "./googlePlaces";
import { normalizePlace, computeRatingAggregate, type NormalizedPlace } from "./normalizer";
import { findDuplicate } from "./deduplication";
import { fetchOpenRiceData, searchOpenRiceRating } from "./openrice";
import { classifyCuisine } from "@/server/ai/classifyCuisine";
import { generateSignatureDishes } from "@/server/ai/signatureDishes";
import type { RestaurantRow } from "@/server/db/schema";
import type { Platform } from "@/shared/types/restaurant";

export interface ImportResult {
  restaurant_id: string;
  was_duplicate: boolean;
  restaurant: RestaurantRow;
}

// Runs after the restaurant row already exists and the response has been
// sent — fetches the OpenRice rating and generates AI cuisine/signature-dish
// data, then patches the row in place. OpenRice is scraped through a proxy
// that can take up to ~25s in the worst case (outside our control); keeping
// it off the synchronous save path means that tail latency no longer blocks
// every import, even though it's almost always fast.
async function enrichRestaurantInBackground(opts: {
  restaurantId: string;
  db: DB;
  placeData: PlaceResult;
  placeDataZh: PlaceResult | null;
  normalized: NormalizedPlace;
  platform: Platform;
  originalUrl: string;
}): Promise<void> {
  const { restaurantId, db, placeData, placeDataZh, normalized, platform, originalUrl } = opts;

  try {
    const enReviews = (placeData.reviews ?? []).map((r) => r.text?.text ?? "").filter(Boolean);
    const zhReviews = (placeDataZh?.reviews ?? []).map((r) => r.text?.text ?? "").filter(Boolean);

    const openriceLookup =
      platform === "openrice"
        ? fetchOpenRiceData(originalUrl)
        : searchOpenRiceRating(
            // Use Chinese name/address for better accuracy on a Chinese platform
            normalized.name_zh ?? normalized.name,
            normalized.address_zh ?? normalized.address,
            normalized.district_zh ?? normalized.district
          );

    const [orData, cuisineCategory, signatureDishes, signatureDishesZh] = await Promise.all([
      openriceLookup,
      classifyCuisine({
        name: normalized.name,
        cuisine_primary: normalized.cuisine_primary,
        cuisine_tags: normalized.cuisine_tags,
        types: placeData.types,
      }),
      generateSignatureDishes(normalized.name, normalized.cuisine_primary, enReviews, "en"),
      generateSignatureDishes(normalized.name, normalized.cuisine_primary, zhReviews.length > 0 ? zhReviews : enReviews, "zh"),
    ]);

    const openriceRating = orData.rating;
    const openriceSmileCount = orData.smileCount;
    const openriceHasBooking = orData.hasBooking;
    const openriceFoundUrl = platform === "openrice" ? null : orData.url;

    let ratingOpenrice: string | null = null;
    let ratingAggregate = normalized.rating_aggregate;
    if (openriceRating != null) {
      ratingOpenrice = openriceRating.toFixed(1);
      ratingAggregate = computeRatingAggregate({
        rating_google: normalized.rating_google,
        rating_count_google: normalized.rating_count_google,
        rating_openrice: ratingOpenrice,
        rating_yelp: null,
      });
    }

    await db
      .update(restaurants)
      .set({
        cuisine_category: cuisineCategory,
        signature_dishes: signatureDishes,
        signature_dishes_zh: signatureDishesZh,
        rating_openrice: ratingOpenrice,
        rating_count_openrice: openriceSmileCount,
        rating_aggregate: ratingAggregate,
        enriched_at: new Date(),
      })
      .where(eq(restaurants.id, restaurantId));

    // For OpenRice-sourced imports, the primary source row was inserted with
    // a placeholder raw_data (we didn't have the scrape result yet) — fill it
    // in now.
    if (platform === "openrice") {
      await db
        .insert(restaurantSources)
        .values({
          restaurant_id: restaurantId,
          platform: "openrice",
          external_id: null,
          url: originalUrl,
          raw_data: { rating: openriceRating, smile_count: openriceSmileCount, has_booking: openriceHasBooking },
          fetched_at: new Date(),
        })
        .onConflictDoUpdate({
          target: [restaurantSources.platform, restaurantSources.url],
          set: {
            raw_data: { rating: openriceRating, smile_count: openriceSmileCount, has_booking: openriceHasBooking },
            fetched_at: new Date(),
          },
        });
    }

    // If we found an OpenRice page via search, save it as a source too
    if (openriceFoundUrl && platform !== "openrice") {
      await db.insert(restaurantSources).values({
        restaurant_id: restaurantId,
        platform: "openrice",
        external_id: null,
        url: openriceFoundUrl,
        raw_data: { rating: openriceRating, smile_count: openriceSmileCount, has_booking: openriceHasBooking },
        fetched_at: new Date(),
      }).onConflictDoNothing();
    }
  } catch (err) {
    console.error(`[pipeline] background enrichment failed for restaurant ${restaurantId}:`, err);
  }
}

async function importFromPlace(opts: {
  placeData: PlaceResult;
  userId: string;
  db: DB;
  platform: Platform;
  originalUrl: string;
  placeId: string | null;
}): Promise<ImportResult> {
  const { placeData, userId, db, platform, originalUrl, placeId } = opts;

  // Fetch Chinese translation using confirmed place ID
  let placeDataZh: PlaceResult | null = null;
  try {
    placeDataZh = await fetchByPlaceId(placeData.id, "zh-TW");
  } catch {
    // non-fatal: proceed without Chinese data
  }

  // Normalize
  const normalized = normalizePlace(placeData, placeDataZh);

  // Deduplicate
  const duplicate = await findDuplicate(db, normalized, userId);

  if (duplicate) {
    // Attach source URL to existing restaurant and update metadata
    await db
      .insert(restaurantSources)
      .values({
        restaurant_id: duplicate.restaurant_id,
        platform,
        external_id: placeId ?? null,
        url: originalUrl,
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

  // Insert the restaurant immediately with everything derivable from Google
  // Places alone. OpenRice rating + AI cuisine/signature-dishes are filled in
  // afterward by enrichRestaurantInBackground.
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
    cuisine_category: null,
    signature_dishes: [],
    signature_dishes_zh: [],
    cuisine_primary: normalized.cuisine_primary,
    cuisine_primary_zh: normalized.cuisine_primary_zh,
    name_zh: normalized.name_zh,
    address_zh: normalized.address_zh,
    district_zh: normalized.district_zh,
    cuisine_tags: normalized.cuisine_tags,
    hours: normalized.hours,
    rating_google: normalized.rating_google,
    rating_openrice: null,
    rating_count_google: normalized.rating_count_google,
    rating_count_openrice: null,
    rating_aggregate: normalized.rating_aggregate,
    google_place_id: normalized.google_place_id,
    enriched_at: null,
  };

  const [restaurant] = await db
    .insert(restaurants)
    .values(insertData)
    .returning();

  await db.insert(activityLog).values({
    user_id: userId,
    action: "restaurant_added",
    restaurant_id: restaurant!.id,
    restaurant_name: restaurant!.name,
  });

  // Set PostGIS location
  if (normalized.lat && normalized.lng) {
    await db
      .update(restaurants)
      .set({
        location: sql`ST_MakePoint(${parseFloat(normalized.lng)}, ${parseFloat(normalized.lat)})::geography`,
      })
      .where(sql`id = ${restaurant!.id}`);
  }

  // Source record for the imported URL/place. For OpenRice-sourced imports
  // the real OpenRice raw_data isn't available yet (fetched in the
  // background) — insert a placeholder here and fill it in later.
  await db.insert(restaurantSources).values({
    restaurant_id: restaurant!.id,
    platform,
    external_id: placeId ?? normalized.google_place_id,
    url: originalUrl,
    raw_data: platform === "openrice" ? {} : (placeData as unknown as Record<string, unknown>),
    fetched_at: new Date(),
  });

  // For OpenRice imports, also save a Google Maps source (Places data already fetched)
  if (platform === "openrice" && normalized.google_place_id) {
    await db.insert(restaurantSources).values({
      restaurant_id: restaurant!.id,
      platform: "google",
      external_id: normalized.google_place_id,
      url: `https://maps.google.com/?cid=${normalized.google_place_id}`,
      raw_data: placeData as unknown as Record<string, unknown>,
      fetched_at: new Date(),
    }).onConflictDoNothing();
  }

  after(() =>
    enrichRestaurantInBackground({
      restaurantId: restaurant!.id,
      db,
      placeData,
      placeDataZh,
      normalized,
      platform,
      originalUrl,
    })
  );

  return {
    restaurant_id: restaurant!.id,
    was_duplicate: false,
    restaurant: restaurant!,
  };
}

export async function importUrl(opts: {
  url: string;
  userId: string;
  db: DB;
}): Promise<ImportResult> {
  const { url, userId, db } = opts;

  // 1. Parse URL
  const parsed = await parseAndResolveUrl(url);

  // 2. Fetch from Google Places (English)
  let placeData: PlaceResult;
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

  return importFromPlace({
    placeData,
    userId,
    db,
    platform: parsed.platform,
    originalUrl: parsed.originalUrl,
    placeId: parsed.placeId,
  });
}

export async function importByPlaceId(opts: {
  placeId: string;
  userId: string;
  db: DB;
}): Promise<ImportResult> {
  const { placeId, userId, db } = opts;

  const placeData = await fetchByPlaceId(placeId);

  return importFromPlace({
    placeData,
    userId,
    db,
    platform: "google",
    originalUrl: placeData.googleMapsUri ?? `https://maps.google.com/?cid=${placeId}`,
    placeId,
  });
}
