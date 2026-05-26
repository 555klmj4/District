import "server-only";

const PLACES_API_BASE = "https://places.googleapis.com/v1";

const FIELD_MASK = [
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
].join(",");

function getApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  return key;
}

function headers() {
  return {
    "X-Goog-Api-Key": getApiKey(),
    "X-Goog-FieldMask": FIELD_MASK,
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
    headers: headers(),
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
