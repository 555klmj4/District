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
  "regularOpeningHours",
  "primaryTypeDisplayName",
  "types",
  "websiteUri",
  "nationalPhoneNumber",
  "shortFormattedAddress",
  "addressComponents",
  "reservable",
  "googleMapsUri",
];

// Single-place endpoint uses bare field names; text search requires "places." prefix
const FIELD_MASK = FIELDS.join(",");
const TEXT_SEARCH_FIELD_MASK = FIELDS.map((f) => `places.${f}`).join(",");

function getApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  return key;
}

function headers(fieldMask = FIELD_MASK) {
  return {
    "X-Goog-Api-Key": getApiKey(),
    "X-Goog-FieldMask": fieldMask,
    "Content-Type": "application/json",
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
  reservable?: boolean;
  googleMapsUri?: string;
  addressComponents?: Array<{
    longText: string;
    shortText: string;
    types: string[];
  }>;
}

export async function fetchByPlaceId(placeId: string): Promise<PlaceResult> {
  const res = await fetch(`${PLACES_API_BASE}/places/${placeId}`, {
    headers: headers(),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<PlaceResult>;
}

export async function fetchByTextSearch(
  query: string,
  locationBias?: { lat: number; lng: number }
): Promise<PlaceResult[]> {
  const body: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: 5,
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
    headers: headers(TEXT_SEARCH_FIELD_MASK),
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
