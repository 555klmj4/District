import "server-only";
import Firecrawl from "firecrawl";

export interface OpenRiceData {
  rating: number | null;
  smileCount: number | null;
  hasBooking: boolean;
  url: string | null;
}

let firecrawl: Firecrawl | null = null;
function getFirecrawl(): Firecrawl {
  // timeoutMs bounds our own HTTP call to Firecrawl's API; the per-scrape
  // `timeout` below bounds how long Firecrawl waits on the target page. A
  // request with neither observed hanging indefinitely with no error.
  firecrawl ??= new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY, timeoutMs: 30000 });
  return firecrawl;
}

// OpenRice blocks/serves a near-empty page to Vercel's serverless egress IPs
// (confirmed: search requests came back 200 OK but with a body ~100x smaller
// than the same request from a normal network). Routing through Firecrawl's
// stealth proxy avoids that — same request, different network path.
async function fetchHtmlViaProxy(url: string): Promise<string> {
  const doc = await getFirecrawl().scrape(url, {
    formats: ["rawHtml"],
    proxy: "stealth",
    headers: { "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8" },
    timeout: 25000,
  });
  return doc.rawHtml ?? "";
}

// Search OpenRice for a restaurant by name + district, then match the correct
// branch by comparing addresses (street number) and name similarity.
export async function searchOpenRiceRating(
  name: string,
  address?: string | null,
  district?: string | null
): Promise<OpenRiceData> {
  try {
    const query = [name, district].filter(Boolean).join(" ");
    const searchUrl = `https://www.openrice.com/zh/hongkong/restaurants?what=${encodeURIComponent(query)}`;

    const searchHtml = await fetchHtmlViaProxy(searchUrl);

    // Collect up to 4 unique restaurant links from the search results. Links
    // may be relative ("/zh/hongkong/r-...", raw OpenRice HTML) or absolute
    // ("https://www.openrice.com/zh/hongkong/r-...", Firecrawl's rawHtml
    // resolves relative hrefs) — capture just the path either way.
    const links = [
      ...searchHtml.matchAll(/href="(?:https?:\/\/[^"/]+)?(\/(?:zh|en)\/hongkong\/r-[^?"#\s]+)"/gi),
    ]
      .map((m) => m[1]!)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 4);

    if (links.length === 0) {
      console.warn(`[openrice] no links scraped from search results: url=${searchUrl} htmlLength=${searchHtml.length}`);
      return { rating: null, smileCount: null, hasBooking: false, url: null };
    }

    const ourStreetNum = address ? extractStreetNumber(address) : null;
    const ourNameNorm = normalizeName(name);

    // Fetch all candidate pages concurrently rather than one at a time —
    // each proxied fetch can take several seconds, so doing this serially
    // made worst-case latency (no early match) the sum of up to 5 fetches.
    const candidates = await Promise.allSettled(
      links.map(async (link) => {
        const restaurantUrl = `https://www.openrice.com${link}`;
        const pageHtml = await fetchHtmlViaProxy(restaurantUrl);
        return { restaurantUrl, pageHtml };
      })
    );

    // Score each successfully-fetched candidate by name + address match; return the best
    let bestResult: OpenRiceData | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      if (candidate.status === "rejected") {
        console.warn(`[openrice] candidate page fetch failed:`, candidate.reason);
        continue;
      }

      const { restaurantUrl, pageHtml } = candidate.value;
      const { rating, reviewCount, orName, orAddress, acceptsReservations } = extractPageData(pageHtml);
      const booking = detectBooking(pageHtml, acceptsReservations);

      // Score: address street-number match (+2) and name similarity (+1)
      let score = 0;
      if (ourStreetNum && orAddress && orAddress.includes(ourStreetNum)) score += 2;
      if (orName && normalizeName(orName).includes(ourNameNorm)) score += 1;
      if (orName && ourNameNorm.includes(normalizeName(orName))) score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestResult = { rating, smileCount: reviewCount, hasBooking: booking, url: restaurantUrl };
      }
    }

    if (!bestResult) {
      console.warn(`[openrice] no candidate scored above threshold: query="${query}" candidates=${links.length}`);
    }
    return bestResult ?? { rating: null, smileCount: null, hasBooking: false, url: null };
  } catch (err) {
    console.error(`[openrice] searchOpenRiceRating threw:`, err);
    return { rating: null, smileCount: null, hasBooking: false, url: null };
  }
}

export async function fetchOpenRiceData(url: string): Promise<OpenRiceData> {
  try {
    const html = await fetchHtmlViaProxy(url);
    const { rating, reviewCount, acceptsReservations } = extractPageData(html);
    return { rating, smileCount: reviewCount, hasBooking: detectBooking(html, acceptsReservations), url: null };
  } catch (err) {
    console.error(`[openrice] fetchOpenRiceData threw:`, err);
    return { rating: null, smileCount: null, hasBooking: false, url: null };
  }
}

// Pull rating, reviewCount, name, address and reservation status out of a
// restaurant page's JSON-LD
function extractPageData(html: string): {
  rating: number | null;
  reviewCount: number | null;
  orName: string | null;
  orAddress: string | null;
  acceptsReservations: boolean | null;
} {
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1]!);
      const entries = Array.isArray(data) ? data : [data];
      for (const entry of entries) {
        const rv = entry?.aggregateRating?.ratingValue;
        const rating = rv != null ? parseFloat(rv) : null;
        const validRating =
          rating != null && !isNaN(rating) && rating >= 1 && rating <= 5
            ? rating
            : null;

        const rc = entry?.aggregateRating?.reviewCount;
        const reviewCount = rc != null ? parseInt(rc, 10) : null;
        const validReviewCount =
          reviewCount != null && !isNaN(reviewCount) && reviewCount >= 0
            ? reviewCount
            : null;

        const addr = entry?.address;
        const orAddress =
          typeof addr === "string"
            ? addr
            : addr?.streetAddress ??
              [addr?.streetAddress, addr?.addressLocality]
                .filter(Boolean)
                .join(" ") ??
              null;

        if (validRating != null || orAddress) {
          const ar = entry?.acceptsReservations;
          return {
            rating: validRating,
            reviewCount: validReviewCount,
            orName: entry?.name ?? null,
            orAddress: orAddress ?? null,
            acceptsReservations: typeof ar === "boolean" ? ar : null,
          };
        }
      }
    } catch {
      // continue
    }
  }

  // Regex fallback for rating only
  const ratingMatch = html.match(/["']ratingValue["']\s*:\s*["']?([0-9.]+)["']?/i);
  if (ratingMatch) {
    const rating = parseFloat(ratingMatch[1]!);
    if (!isNaN(rating) && rating >= 1 && rating <= 5) {
      return { rating, reviewCount: null, orName: null, orAddress: null, acceptsReservations: null };
    }
  }

  return { rating: null, reviewCount: null, orName: null, orAddress: null, acceptsReservations: null };
}

// Extract the leading street number from an address string (e.g. "2-20", "123A")
function extractStreetNumber(address: string): string | null {
  const m = address.match(/\b(\d[\d\-]*[A-Za-z]?)\b/);
  return m ? m[1]! : null;
}

// Normalize a name for comparison: lowercase, strip spaces + punctuation
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[\s\-·•,，。、''""()（）]/g, "");
}


// OpenRice's own JSON-LD publishes an authoritative acceptsReservations flag
// — trust it when present. Text-heuristic fallback is only for pages where
// that field is missing, and deliberately avoids generic phrases like
// "reservation" + "button" (both appear on virtually every OpenRice page
// regardless of this restaurant's actual booking status — that compound
// check previously matched "button" as generic UI chrome plus "reservation"
// out of a JSON-LD field that was explicitly reporting `false`).
function detectBooking(html: string, acceptsReservations: boolean | null): boolean {
  if (acceptsReservations != null) return acceptsReservations;

  const lower = html.toLowerCase();
  return (
    lower.includes("bookatable") ||
    lower.includes("sevenrooms") ||
    lower.includes("chope") ||
    lower.includes("book a table") ||
    lower.includes("make a reservation") ||
    lower.includes("book now")
  );
}
