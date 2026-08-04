/**
 * Re-fetches Google Places data for all restaurants that have a google_place_id,
 * updating restaurant_sources.raw_data so priceRange (and other new fields) are populated.
 *
 * Usage:
 *   pnpm exec tsx scripts/bulk-enrich.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, isNotNull } from "drizzle-orm";
import * as schema from "../src/server/db/schema";

const { restaurants, restaurantSources } = schema;

const PLACES_API_BASE = "https://places.googleapis.com/v1";
const FIELD_MASK = [
  "id", "displayName", "formattedAddress", "location", "rating",
  "userRatingCount", "priceLevel", "priceRange", "regularOpeningHours",
  "primaryTypeDisplayName", "types", "websiteUri", "nationalPhoneNumber",
  "shortFormattedAddress", "addressComponents", "reservable", "googleMapsUri",
].join(",");

async function fetchPlace(placeId: string, apiKey: string) {
  const res = await fetch(`${PLACES_API_BASE}/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
  });
  if (!res.ok) throw new Error(`Google Places API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY not set");

  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });

  const rows = await db
    .select({ id: restaurants.id, name: restaurants.name, google_place_id: restaurants.google_place_id })
    .from(restaurants)
    .where(isNotNull(restaurants.google_place_id));

  console.log(`Found ${rows.length} restaurants with google_place_id\n`);

  let ok = 0, fail = 0;

  for (const r of rows) {
    try {
      const data = await fetchPlace(r.google_place_id!, apiKey);

      const url = `https://maps.google.com/?cid=${r.google_place_id}`;
      await db
        .insert(restaurantSources)
        .values({
          restaurant_id: r.id,
          platform: "google",
          external_id: r.google_place_id,
          url,
          raw_data: data,
          fetched_at: new Date(),
        })
        .onConflictDoUpdate({
          target: [restaurantSources.platform, restaurantSources.url],
          set: { raw_data: data, fetched_at: new Date() },
        });

      const priceRange = (data as Record<string, unknown>).priceRange;
      console.log(`✓ ${r.name}${priceRange ? ` — ${JSON.stringify(priceRange)}` : ""}`);
      ok++;
    } catch (e) {
      console.error(`✗ ${r.name}: ${(e as Error).message}`);
      fail++;
    }

    await sleep(200); // stay well within Google rate limits
  }

  console.log(`\nDone: ${ok} updated, ${fail} failed`);
  await client.end();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
