import "server-only";
import type { PlaceResult } from "./googlePlaces";
import type { WeeklyHours, DayHours, Category } from "@/shared/types/restaurant";

// Google's priceLevel enum values
const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE:        1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE:    2,
  PRICE_LEVEL_EXPENSIVE:   3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

// Maps Google place types to cuisine labels
const TYPE_TO_CUISINE: Record<string, string> = {
  japanese_restaurant:     "Japanese",
  chinese_restaurant:      "Chinese",
  korean_restaurant:       "Korean",
  thai_restaurant:         "Thai",
  vietnamese_restaurant:   "Vietnamese",
  italian_restaurant:      "Italian",
  french_restaurant:       "French",
  american_restaurant:     "American",
  mexican_restaurant:      "Mexican",
  indian_restaurant:       "Indian",
  mediterranean_restaurant:"Mediterranean",
  seafood_restaurant:      "Seafood",
  steak_house:             "Steakhouse",
  pizza_restaurant:        "Pizza",
  sushi_restaurant:        "Japanese",
  ramen_restaurant:        "Japanese",
  dim_sum_restaurant:      "Chinese",
  hong_kong_restaurant:    "Hong Kong",
  cantonese_restaurant:    "Cantonese",
  bar:                     "Bar",
  wine_bar:                "Wine Bar",
  cocktail_bar:            "Cocktail Bar",
  pub:                     "Pub",
  cafe:                    "Cafe",
  coffee_shop:             "Cafe",
  bakery:                  "Bakery",
};

const TYPE_TO_CATEGORY: Record<string, Category> = {
  bar: "bar",
  wine_bar: "bar",
  cocktail_bar: "bar",
  pub: "bar",
  night_club: "bar",
  cafe: "cafe",
  coffee_shop: "cafe",
  bakery: "cafe",
};

export interface NormalizedPlace {
  name: string;
  slug: string;
  category: Category;
  address: string | null;
  district: string | null;
  city: string | null;
  country: string | null;
  lat: string | null;
  lng: string | null;
  phone: string | null;
  website: string | null;
  price_level: number | null;
  cuisine_primary: string | null;
  cuisine_tags: string[];
  hours: WeeklyHours | null;
  rating_google: string | null;
  rating_openrice: string | null;
  rating_count_google: number | null;
  rating_aggregate: string | null;
  google_place_id: string;
}

export function normalizePlace(place: PlaceResult): NormalizedPlace {
  const types = place.types ?? [];
  const cuisinePrimary = inferCuisine(place.primaryTypeDisplayName?.text, types);
  const cuisineTags = inferAllCuisines(types);
  const category = inferCategory(types);

  const { district, city, country } = extractAddressParts(
    place.addressComponents ?? []
  );

  const rating =
    place.rating != null ? place.rating.toFixed(1) : null;
  const aggregate =
    place.rating != null ? computeRatingAggregate({
      rating_google: rating,
      rating_count_google: place.userRatingCount ?? null,
      rating_openrice: null,
      rating_yelp: null,
    }) : null;

  return {
    name: place.displayName.text,
    slug: makeSlug(place.displayName.text, place.id),
    category,
    address: place.formattedAddress ?? null,
    district: district ?? null,
    city: city ?? null,
    country: country ?? null,
    lat: place.location.latitude.toFixed(7),
    lng: place.location.longitude.toFixed(7),
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    price_level: place.priceLevel ? (PRICE_LEVEL_MAP[place.priceLevel] ?? null) : null,
    cuisine_primary: cuisinePrimary,
    cuisine_tags: cuisineTags,
    hours: normalizeHours(place.regularOpeningHours ?? null),
    rating_google: rating,
    rating_openrice: null,
    rating_count_google: place.userRatingCount ?? null,
    rating_aggregate: aggregate,
    google_place_id: place.id,
  };
}

export function computeRatingAggregate(ratings: {
  rating_google: string | null;
  rating_count_google: number | null;
  rating_openrice: string | null;
  rating_yelp: string | null;
}): string | null {
  const sources: { value: number; weight: number }[] = [];

  if (ratings.rating_google != null) {
    const v = parseFloat(ratings.rating_google);
    if (!isNaN(v)) {
      sources.push({
        value: v,
        weight: Math.min(1, (ratings.rating_count_google ?? 0) / 200),
      });
    }
  }
  if (ratings.rating_openrice != null) {
    const v = parseFloat(ratings.rating_openrice);
    if (!isNaN(v)) sources.push({ value: v, weight: 0.5 });
  }
  if (ratings.rating_yelp != null) {
    const v = parseFloat(ratings.rating_yelp);
    if (!isNaN(v)) sources.push({ value: v, weight: 0.5 });
  }

  if (sources.length === 0) return null;
  const totalWeight = sources.reduce((s, x) => s + x.weight, 0);
  if (totalWeight === 0) return null;
  const avg = sources.reduce((s, x) => s + x.value * x.weight, 0) / totalWeight;
  return avg.toFixed(2);
}

function inferCuisine(
  primaryType: string | undefined,
  types: string[]
): string | null {
  if (primaryType) return primaryType;
  for (const t of types) {
    const mapped = TYPE_TO_CUISINE[t];
    if (mapped) return mapped;
  }
  return null;
}

function inferAllCuisines(types: string[]): string[] {
  return types
    .map((t) => TYPE_TO_CUISINE[t])
    .filter((c): c is string => c != null);
}

function inferCategory(types: string[]): Category {
  for (const t of types) {
    const cat = TYPE_TO_CATEGORY[t];
    if (cat) return cat;
  }
  return "restaurant";
}

// Day index: 0=Sunday per Google's convention
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function normalizeHours(
  openingHours: PlaceResult["regularOpeningHours"] | null
): WeeklyHours | null {
  if (!openingHours?.periods) return null;

  const hours: WeeklyHours = {};

  for (const period of openingHours.periods) {
    const dayKey = DAY_KEYS[period.open.day];
    if (!dayKey) continue;

    const open = `${String(period.open.hour).padStart(2, "0")}:${String(period.open.minute).padStart(2, "0")}`;
    const close = period.close
      ? `${String(period.close.hour).padStart(2, "0")}:${String(period.close.minute).padStart(2, "0")}`
      : "23:59";

    hours[dayKey] = { open, close } as DayHours;
  }

  return Object.keys(hours).length > 0 ? hours : null;
}

function extractAddressParts(
  components: NonNullable<PlaceResult["addressComponents"]>
): { district: string | null; city: string | null; country: string | null } {
  let district: string | null = null;
  let city: string | null = null;
  let country: string | null = null;

  for (const c of components) {
    const types = c.types ?? [];
    if (types.includes("sublocality_level_1") || types.includes("neighborhood")) {
      district ??= c.longText;
    }
    if (types.includes("locality") || types.includes("postal_town")) {
      city ??= c.longText;
    }
    if (types.includes("country")) {
      country ??= c.longText;
    }
  }

  return { district, city, country };
}

function makeSlug(name: string, placeId: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${base}-${placeId.slice(-8)}`;
}
