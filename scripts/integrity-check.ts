/**
 * Audits every restaurant for data integrity issues and optionally re-enriches
 * from Google Places API.
 *
 * Usage:
 *   pnpm exec tsx scripts/integrity-check.ts          # audit only
 *   pnpm exec tsx scripts/integrity-check.ts --fix    # audit + fix
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import { districtEn } from "../src/lib/district-zh";

const { restaurants, restaurantSources } = schema;

// ── Types ──────────────────────────────────────────────────────────────────

interface DayHours { open: string; close: string }
type WeeklyHours = Partial<Record<"mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun", DayHours>>;

interface PlaceResult {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  priceRange?: { startPrice?: { units?: string } };
  regularOpeningHours?: { periods?: Array<{ open: { day: number; hour: number; minute: number }; close?: { hour: number; minute: number } }> };
  primaryTypeDisplayName?: { text: string };
  types?: string[];
  websiteUri?: string;
  nationalPhoneNumber?: string;
  addressComponents?: Array<{ longText: string; types: string[] }>;
}

// ── Google Places fetch ────────────────────────────────────────────────────

const PLACES_API_BASE = "https://places.googleapis.com/v1";
const FIELD_MASK = [
  "id", "displayName", "formattedAddress", "location", "rating",
  "userRatingCount", "priceLevel", "priceRange", "regularOpeningHours",
  "primaryTypeDisplayName", "types", "websiteUri", "nationalPhoneNumber",
  "addressComponents",
].join(",");

async function fetchPlace(placeId: string, apiKey: string, lang?: string): Promise<PlaceResult> {
  const url = lang
    ? `${PLACES_API_BASE}/places/${placeId}?languageCode=${encodeURIComponent(lang)}`
    : `${PLACES_API_BASE}/places/${placeId}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
      ...(lang ? { "Accept-Language": lang } : {}),
    },
  });
  if (!res.ok) throw new Error(`Google Places ${res.status}: ${await res.text()}`);
  return res.json() as Promise<PlaceResult>;
}

// ── Normalisation (inlined from normalizer.ts) ─────────────────────────────

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 1, PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const TYPE_TO_CUISINE: Record<string, string> = {
  japanese_restaurant: "Japanese", chinese_restaurant: "Chinese",
  korean_restaurant: "Korean", thai_restaurant: "Thai",
  vietnamese_restaurant: "Vietnamese", italian_restaurant: "Italian",
  french_restaurant: "French", american_restaurant: "American",
  mexican_restaurant: "Mexican", indian_restaurant: "Indian",
  mediterranean_restaurant: "Mediterranean", seafood_restaurant: "Seafood",
  steak_house: "Steakhouse", pizza_restaurant: "Pizza",
  sushi_restaurant: "Japanese", ramen_restaurant: "Japanese",
  dim_sum_restaurant: "Chinese", hong_kong_restaurant: "Hong Kong",
  cantonese_restaurant: "Cantonese", bar: "Bar", wine_bar: "Wine Bar",
  cocktail_bar: "Cocktail Bar", pub: "Pub", cafe: "Cafe",
  coffee_shop: "Cafe", bakery: "Bakery",
};

const TYPE_TO_CUISINE_ZH: Record<string, string> = {
  japanese_restaurant: "日本料理", chinese_restaurant: "中式料理",
  korean_restaurant: "韓國料理", thai_restaurant: "泰國料理",
  vietnamese_restaurant: "越南料理", italian_restaurant: "意大利菜",
  french_restaurant: "法國菜", american_restaurant: "美式料理",
  mexican_restaurant: "墨西哥菜", indian_restaurant: "印度料理",
  mediterranean_restaurant: "地中海料理", seafood_restaurant: "海鮮料理",
  steak_house: "牛排", pizza_restaurant: "披薩", sushi_restaurant: "壽司",
  ramen_restaurant: "拉麵", dim_sum_restaurant: "點心",
  hong_kong_restaurant: "港式料理", cantonese_restaurant: "粵菜",
  bar: "酒吧", wine_bar: "葡萄酒吧", cocktail_bar: "雞尾酒吧",
  pub: "英式酒吧", cafe: "咖啡廳", coffee_shop: "咖啡廳", bakery: "麵包店",
};

const TYPE_TO_CATEGORY: Record<string, string> = {
  bar: "bar", wine_bar: "bar", cocktail_bar: "bar", pub: "bar", night_club: "bar",
  cafe: "cafe", coffee_shop: "cafe", bakery: "cafe",
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function normalizeHours(h: PlaceResult["regularOpeningHours"] | null): WeeklyHours | null {
  if (!h?.periods) return null;
  const hours: WeeklyHours = {};
  for (const p of h.periods) {
    const key = DAY_KEYS[p.open.day];
    if (!key) continue;
    hours[key] = {
      open: `${String(p.open.hour).padStart(2,"0")}:${String(p.open.minute).padStart(2,"0")}`,
      close: p.close ? `${String(p.close.hour).padStart(2,"0")}:${String(p.close.minute).padStart(2,"0")}` : "23:59",
    };
  }
  return Object.keys(hours).length > 0 ? hours : null;
}

function extractAddressParts(components: NonNullable<PlaceResult["addressComponents"]>) {
  const byType: Record<string, string> = {};
  for (const c of components) for (const t of (c.types ?? [])) byType[t] ??= c.longText;
  const rawDistrict = byType["neighborhood"] ?? byType["sublocality_level_2"] ?? byType["sublocality_level_1"] ?? null;
  const hasCjk = rawDistrict != null && /[一-鿿]/.test(rawDistrict);
  const district = hasCjk ? (districtEn(rawDistrict) ?? rawDistrict) : rawDistrict;
  return {
    district,
    city: byType["locality"] ?? byType["postal_town"] ?? null,
    country: byType["country"] ?? null,
  };
}

function inferCuisine(primary: string | undefined, types: string[]): string | null {
  for (const t of types) { const m = TYPE_TO_CUISINE[t]; if (m) return m; }
  return primary ?? null;
}

function inferCuisineZh(zhText: string | undefined, types: string[]): string | null {
  if (zhText && /[一-鿿㐀-䶿]/.test(zhText)) return zhText;
  for (const t of types) { const m = TYPE_TO_CUISINE_ZH[t]; if (m) return m; }
  return null;
}

function inferCategory(types: string[]): string {
  for (const t of types) { const c = TYPE_TO_CATEGORY[t]; if (c) return c; }
  return "restaurant";
}

function inferAllCuisines(types: string[]): string[] {
  return types.map(t => TYPE_TO_CUISINE[t]).filter((c): c is string => c != null);
}

function computeRatingAggregate(g: string | null, gc: number | null, or_: string | null, y: string | null): string | null {
  const sources: { v: number; w: number }[] = [];
  if (g != null) { const v = parseFloat(g); if (!isNaN(v)) sources.push({ v, w: Math.min(1, (gc ?? 0) / 200) }); }
  if (or_ != null) { const v = parseFloat(or_); if (!isNaN(v)) sources.push({ v, w: 0.5 }); }
  if (y != null)  { const v = parseFloat(y);   if (!isNaN(v)) sources.push({ v, w: 0.5 }); }
  if (!sources.length) return null;
  const tw = sources.reduce((s,x) => s+x.w, 0);
  if (tw === 0) return null;
  return (sources.reduce((s,x) => s+x.v*x.w, 0) / tw).toFixed(2);
}

function priceLevel(place: PlaceResult): number | null {
  if (place.priceLevel && PRICE_LEVEL_MAP[place.priceLevel]) return PRICE_LEVEL_MAP[place.priceLevel]!;
  const start = parseInt(place.priceRange?.startPrice?.units ?? "0");
  if (start <= 0) return null;
  if (start < 150) return 1;
  if (start < 400) return 2;
  if (start < 800) return 3;
  return 4;
}

// ── Integrity checks ────────────────────────────────────────────────────────

const CJK_RE = /[一-鿿]/;

type Row = typeof restaurants.$inferSelect;

function checkIssues(r: Row): string[] {
  const issues: string[] = [];
  if (r.district != null && CJK_RE.test(r.district)) issues.push("cjk-district");
  if (r.district == null) issues.push("missing-district");
  if (r.name_zh == null) issues.push("missing-name-zh");
  if (r.price_level == null) issues.push("missing-price");
  if (r.hours == null) issues.push("missing-hours");
  if (r.cuisine_category == null) issues.push("missing-cuisine-cat");
  const dishes = r.signature_dishes as string[] | null;
  if (!dishes || dishes.length === 0) issues.push("missing-dishes");
  return issues;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const fix = process.argv.includes("--fix");
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (fix && !apiKey) throw new Error("GOOGLE_PLACES_API_KEY not set");

  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });

  const rows = await db.select().from(restaurants);
  console.log(`\nChecked: ${rows.length} restaurants\n`);

  const flagged = rows.filter(r => checkIssues(r).length > 0);

  if (flagged.length === 0) {
    console.log("✓ All restaurants pass integrity checks.");
    await client.end();
    return;
  }

  // Print audit table
  console.log("Issues found:\n");
  for (const r of flagged) {
    const issues = checkIssues(r);
    console.log(`  ${r.name.padEnd(40)} ${issues.join(", ")}`);
  }
  console.log(`\nTotal with issues: ${flagged.length}`);

  if (!fix) {
    console.log('\nRun with --fix to re-enrich flagged restaurants.');
    await client.end();
    return;
  }

  console.log("\n── Fix mode ──────────────────────────────────────────────\n");

  let fixed = 0, skipped = 0, failed = 0;

  for (const r of flagged) {
    if (!r.google_place_id) {
      console.log(`  ⊘ ${r.name} — skipped (no google_place_id)`);
      skipped++;
      continue;
    }

    try {
      const [placeEn, placeZh] = await Promise.all([
        fetchPlace(r.google_place_id, apiKey!),
        fetchPlace(r.google_place_id, apiKey!, "zh-TW").catch(() => null),
      ]);

      const types = placeEn.types ?? [];
      const { district, city, country } = extractAddressParts(placeEn.addressComponents ?? []);
      const { district: districtZhRaw } = placeZh
        ? extractAddressParts(placeZh.addressComponents ?? [])
        : { district: null };

      const ratingG = placeEn.rating != null ? placeEn.rating.toFixed(1) : null;
      const ratingAggregate = computeRatingAggregate(
        ratingG,
        placeEn.userRatingCount ?? null,
        r.rating_openrice,
        r.rating_yelp,
      );

      await db.update(restaurants).set({
        name:              placeEn.displayName.text,
        address:           placeEn.formattedAddress ?? null,
        district:          district ?? null,
        city:              city ?? null,
        country:           country ?? null,
        lat:               placeEn.location.latitude.toFixed(7),
        lng:               placeEn.location.longitude.toFixed(7),
        phone:             placeEn.nationalPhoneNumber ?? null,
        website:           placeEn.websiteUri ?? null,
        price_level:       priceLevel(placeEn),
        category:          inferCategory(types),
        cuisine_primary:   inferCuisine(placeEn.primaryTypeDisplayName?.text, types),
        cuisine_tags:      inferAllCuisines(types),
        hours:             normalizeHours(placeEn.regularOpeningHours ?? null),
        rating_google:     ratingG,
        rating_count_google: placeEn.userRatingCount ?? null,
        rating_aggregate:  ratingAggregate,
        name_zh:           placeZh?.displayName.text ?? null,
        address_zh:        placeZh?.formattedAddress ?? null,
        district_zh:       districtZhRaw ?? null,
        cuisine_primary_zh: inferCuisineZh(placeZh?.primaryTypeDisplayName?.text, types),
        enriched_at:       new Date(),
        updated_at:        new Date(),
      }).where(eq(restaurants.id, r.id));

      // Also refresh restaurant_sources
      const sourceUrl = `https://maps.google.com/?cid=${r.google_place_id}`;
      await db.insert(restaurantSources).values({
        restaurant_id: r.id,
        platform: "google",
        external_id: r.google_place_id,
        url: sourceUrl,
        raw_data: placeEn as unknown as Record<string, unknown>,
        fetched_at: new Date(),
      }).onConflictDoUpdate({
        target: [restaurantSources.platform, restaurantSources.url],
        set: { raw_data: placeEn as unknown as Record<string, unknown>, fetched_at: new Date() },
      });

      const remaining = checkIssues({ ...r, ...{ district, name_zh: placeZh?.displayName.text ?? null, price_level: priceLevel(placeEn), hours: normalizeHours(placeEn.regularOpeningHours ?? null) } as Partial<Row> } as Row);
      console.log(`  ✓ ${r.name}${remaining.length ? ` (still: ${remaining.join(", ")})` : ""}`);
      fixed++;
    } catch (e) {
      console.error(`  ✗ ${r.name}: ${(e as Error).message}`);
      failed++;
    }

    await new Promise(res => setTimeout(res, 300));
  }

  console.log(`\nSummary: ${fixed} fixed, ${skipped} skipped, ${failed} failed`);
  await client.end();
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
