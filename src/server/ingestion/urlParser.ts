import "server-only";
import type { Platform } from "@/shared/types/restaurant";

export interface ParsedUrl {
  platform: Platform;
  placeId: string | null;
  restaurantName: string | null;
  latLng: { lat: number; lng: number } | null;
  originalUrl: string;
}

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

export async function parseAndResolveUrl(rawUrl: string): Promise<ParsedUrl> {
  let url = rawUrl;

  const needsRedirect =
    rawUrl.includes("goo.gl") ||
    rawUrl.includes("maps.app.goo.gl") ||
    rawUrl.includes("bit.ly") ||
    rawUrl.includes("s.openrice.com");

  if (needsRedirect) {
    // s.openrice.com short URLs go through a BytePlus JS-challenge page on GET;
    // HEAD requests bypass the challenge and still follow the Location headers.
    const method = rawUrl.includes("s.openrice.com") ? "HEAD" : "GET";
    try {
      const res = await fetch(rawUrl, {
        method,
        redirect: "follow",
        headers: { "User-Agent": MOBILE_UA },
        signal: AbortSignal.timeout(8000),
      });
      url = res.url || rawUrl;
    } catch {
      // fall through and try to parse the original URL
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
    hostname === "maps.google.com.hk" ||
    hostname.includes("maps.app.goo.gl") ||
    ((hostname === "www.google.com" || hostname === "google.com") &&
      (pathname.startsWith("/maps") || searchParams.has("q") || searchParams.has("cid")))
  ) {
    // Place ID from explicit param
    const placeId = searchParams.get("place_id") ?? extractPlaceIdFromData(url);

    // Restaurant name — try multiple patterns
    const placeMatch =
      pathname.match(/\/place\/([^/@]+)/) ??        // /maps/place/NAME or /maps/place/NAME/@...
      pathname.match(/\/search\/([^/@]+)/);          // /maps/search/NAME
    let restaurantName = placeMatch
      ? decodeURIComponent(placeMatch[1]!).replace(/\+/g, " ").trim()
      : null;

    // Also try ?q= parameter (used by some iOS share formats)
    if (!restaurantName && searchParams.has("q")) {
      restaurantName = searchParams.get("q");
    }

    // Prefer actual place coords from !3d/!4d data params over map-center @lat,lng,zoom
    const placeCoordMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    const centerCoordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const latLng = placeCoordMatch
      ? { lat: parseFloat(placeCoordMatch[1]!), lng: parseFloat(placeCoordMatch[2]!) }
      : centerCoordMatch
      ? { lat: parseFloat(centerCoordMatch[1]!), lng: parseFloat(centerCoordMatch[2]!) }
      : null;

    return { platform: "google", placeId, restaurantName, latLng };
  }

  // ── OpenRice ───────────────────────────────────────────────────────────────
  if (hostname.includes("openrice.com")) {
    const nameMatch = pathname.match(/\/([^/]+)\/restaurants?\/([^/]+)/);
    let restaurantName: string | null;
    if (nameMatch) {
      restaurantName = decodeURIComponent(nameMatch[2]!).replace(/-/g, " ");
    } else {
      // Handle /lang/region/r-NAME-DISTRICT-CUISINE-rID format
      const lastSegment = pathname.split("/").filter(Boolean).pop() ?? null;
      if (lastSegment) {
        const decoded = decodeURIComponent(lastSegment);
        // Strip leading r- and trailing -rNUMBER to get name+district
        restaurantName = decoded
          .replace(/^r-/, "")
          .replace(/-r\d+$/, "")
          .replace(/-/g, " ")
          .trim() || null;
      } else {
        restaurantName = null;
      }
    }
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
    // Only accept Places API v1 IDs (ChIJ... format). 0x... are CIDs which the API rejects.
    if (candidate.startsWith("Ch")) return candidate;
  }
  return null;
}

function extractLastPathSegment(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  return last ? decodeURIComponent(last).replace(/-/g, " ") : null;
}
