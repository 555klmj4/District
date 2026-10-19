import "server-only";

const PLACES_API_BASE = "https://places.googleapis.com/v1";

const FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "priceLevel",
  "priceRange",
  "regularOpeningHours",
  "primaryTypeDisplayName",
  "types",
  "websiteUri",
  "nationalPhoneNumber",
  "shortFormattedAddress",
  "addressComponents",
  "reservable",
  "googleMapsUri",
  "photos",
  "reviews",
];

// Single-place endpoint uses bare field names; text search requires "places." prefix
const FIELD_MASK = FIELDS.join(",");
const TEXT_SEARCH_FIELD_MASK = FIELDS.map((f) => `places.${f}`).join(",");

// Minimal field set for live search-as-you-type — omits reviews/photos/hours,
// which are expensive and unused until a specific place is actually imported.
const SEARCH_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "shortFormattedAddress",
  "rating",
  "userRatingCount",
  "priceLevel",
  "primaryTypeDisplayName",
];
const NAME_SEARCH_FIELD_MASK = SEARCH_FIELDS.map((f) => `places.${f}`).join(",");

function getApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  return key;
}

function headers(fieldMask = FIELD_MASK, languageCode?: string) {
  return {
    "X-Goog-Api-Key": getApiKey(),
    "X-Goog-FieldMask": fieldMask,
    "Content-Type": "application/json",
    ...(languageCode ? { "Accept-Language": languageCode } : {}),
  };
}

export interface PlaceResult {
  id: string;
  displayName: { text: string; languageCode?: string };
  formattedAddress: string;
  shortFormattedAddress?: string;
  location: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  regularOpeningHours?: {
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close: { day: number; hour: number; minute: number };
    }>;
    weekdayDescriptions?: string[];
  };
  primaryTypeDisplayName?: { text: string };
  types?: string[];
  websiteUri?: string;
  nationalPhoneNumber?: string;
  priceRange?: {
    startPrice?: { currencyCode?: string; units?: string; nanos?: number };
    endPrice?: { currencyCode?: string; units?: string; nanos?: number };
  };
  reservable?: boolean;
  googleMapsUri?: string;
  addressComponents?: Array<{
    longText: string;
    shortText: string;
    types: string[];
  }>;
  photos?: Array<{
    name: string;
    heightPx: number;
    widthPx: number;
  }>;
  reviews?: Array<{
    text?: { text: string; languageCode: string };
    rating?: number;
  }>;
}

export async function fetchByPlaceId(
  placeId: string,
  languageCode?: string
): Promise<PlaceResult> {
  const url = languageCode
    ? `${PLACES_API_BASE}/places/${placeId}?languageCode=${encodeURIComponent(languageCode)}`
    : `${PLACES_API_BASE}/places/${placeId}`;
  const res = await fetch(url, {
    headers: headers(FIELD_MASK, languageCode),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<PlaceResult>;
}

// Hard bounding box for Hong Kong — prevents results from outside HK
const HK_BOUNDS = {
  rectangle: {
    low:  { latitude: 22.15, longitude: 113.83 },
    high: { latitude: 22.56, longitude: 114.44 },
  },
};

export async function fetchByTextSearch(
  query: string,
  locationBias?: { lat: number; lng: number },
  languageCode?: string
): Promise<PlaceResult[]> {
  const body: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: 5,
    locationRestriction: HK_BOUNDS,
    ...(languageCode ? { languageCode } : {}),
  };

  if (locationBias) {
    body.locationBias = {
      circle: {
        center: {
          latitude: locationBias.lat,
          longitude: locationBias.lng,
        },
        radius: 5000.0,
      },
    };
  }

  const res = await fetch(`${PLACES_API_BASE}/places:searchText`, {
    method: "POST",
    headers: headers(TEXT_SEARCH_FIELD_MASK, languageCode),
    body: JSON.stringify(body),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Places text search error ${res.status}: ${errBody}`);
  }

  const data = (await res.json()) as { places?: PlaceResult[] };
  return data.places ?? [];
}

export interface PlaceSearchResult {
  id: string;
  displayName: { text: string; languageCode?: string };
  formattedAddress: string;
  shortFormattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  primaryTypeDisplayName?: { text: string };
}

async function postTextSearch<T>(
  body: Record<string, unknown>,
  fieldMask: string,
  languageCode?: string
): Promise<T[]> {
  const res = await fetch(`${PLACES_API_BASE}/places:searchText`, {
    method: "POST",
    headers: headers(fieldMask, languageCode),
    body: JSON.stringify(body),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Places name search error ${res.status}: ${errBody}`);
  }

  const data = (await res.json()) as { places?: T[] };
  return data.places ?? [];
}

export async function searchPlacesByName(
  query: string,
  locationBias?: { lat: number; lng: number },
  languageCode?: string
): Promise<PlaceSearchResult[]> {
  const body: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: 5,
    locationRestriction: HK_BOUNDS,
    ...(languageCode ? { languageCode } : {}),
  };

  if (locationBias) {
    body.locationBias = {
      circle: {
        center: {
          latitude: locationBias.lat,
          longitude: locationBias.lng,
        },
        radius: 5000.0,
      },
    };
  }

  return postTextSearch<PlaceSearchResult>(body, NAME_SEARCH_FIELD_MASK, languageCode);
}

export type BranchCandidate = PlaceSearchResult & {
  addressComponents?: PlaceResult["addressComponents"];
};

const BRANCH_SEARCH_FIELD_MASK = [...SEARCH_FIELDS, "addressComponents"]
  .map((f) => `places.${f}`)
  .join(",");

export async function searchBranchCandidates(
  query: string,
  languageCode?: string
): Promise<BranchCandidate[]> {
  return postTextSearch<BranchCandidate>(
    {
      textQuery: query,
      maxResultCount: 20,
      locationRestriction: HK_BOUNDS,
      ...(languageCode ? { languageCode } : {}),
    },
    BRANCH_SEARCH_FIELD_MASK,
    languageCode
  );
}
