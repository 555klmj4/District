import "server-only";
import type { Platform } from "@/shared/types/restaurant";

export interface ParsedUrl {
  platform: Platform;
  placeId: string | null;
  restaurantName: string | null;
  latLng: { lat: number; lng: number } | null;
  originalUrl: string;
}

export async function parseAndResolveUrl(rawUrl: string): Promise<ParsedUrl> {
  // Follow redirects (goo.gl/maps short links, etc.)
  let url = rawUrl;
  if (
    rawUrl.includes("goo.gl") ||
    rawUrl.includes("maps.app.goo.gl") ||
    rawUrl.includes("bit.ly")
  ) {
    try {
      const res = await fetch(rawUrl, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });
      url = res.url || rawUrl;
    } catch {
      // Use original URL if redirect fails
    }
  }

  const parsed = tryParseUrl(url);
  return { ...parsed, originalUrl: rawUrl };
}

function tryParseUrl(url: string): Omit<ParsedUrl, "originalUrl"> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { platform: "manual", placeId: null, restaurantName: null, latLng: null };
  }

  const { hostname, pathname, searchParams } = parsedUrl;

  // ── Google Maps ────────────────────────────────────────────────────────────
  if (
    hostname === "maps.google.com" ||
    hostname.includes("maps.app.goo.gl") ||
    ((hostname === "www.google.com" || hostname === "google.com") && pathname.startsWith("/maps"))
  ) {
    // Try to extract place_id from URL params
    const placeId = searchParams.get("place_id") ?? extractPlaceIdFromData(url);

    // Try to extract restaurant name from /place/NAME/ segment
    const placeMatch = pathname.match(/\/place\/([^/]+)\//);
    const restaurantName = placeMatch
      ? decodeURIComponent(placeMatch[1]!).replace(/\+/g, " ")
      : null;

    // Try to extract lat/lng from @lat,lng,zoom
    const coordMatch = pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const latLng = coordMatch
      ? { lat: parseFloat(coordMatch[1]!), lng: parseFloat(coordMatch[2]!) }
      : null;

    return { platform: "google", placeId, restaurantName, latLng };
  }

  // ── OpenRice ───────────────────────────────────────────────────────────────
  if (hostname.includes("openrice.com")) {
    const nameMatch = pathname.match(/\/([^/]+)\/restaurants?\/([^/]+)/);
    const restaurantName = nameMatch
      ? decodeURIComponent(nameMatch[2]!).replace(/-/g, " ")
      : extractLastPathSegment(pathname);

    return { platform: "openrice", placeId: null, restaurantName, latLng: null };
  }

  // ── Yelp ───────────────────────────────────────────────────────────────────
  if (hostname.includes("yelp.com")) {
    const nameMatch = pathname.match(/\/biz\/([^?/]+)/);
    const restaurantName = nameMatch
      ? decodeURIComponent(nameMatch[1]!).replace(/-/g, " ")
      : null;

    return { platform: "yelp", placeId: null, restaurantName, latLng: null };
  }

  return {
    platform: "manual",
    placeId: null,
    restaurantName: null,
    latLng: null,
  };
}

function extractPlaceIdFromData(url: string): string | null {
  // Google Maps encodes the place ID in the `data` param as !1s<placeId>
  const dataMatch = url.match(/!1s([^!]+)/);
  if (dataMatch) {
    const candidate = decodeURIComponent(dataMatch[1]!);
    // Valid place IDs start with "ChIJ" or similar
    if (candidate.startsWith("Ch") || candidate.startsWith("0x")) {
      return candidate;
    }
  }
  return null;
}

function extractLastPathSegment(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  return last ? decodeURIComponent(last).replace(/-/g, " ") : null;
}
