import "server-only";

export interface OpenRiceData {
  rating: number | null;
  hasBooking: boolean;
}

export async function fetchOpenRiceData(url: string): Promise<OpenRiceData> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 0 },
    });

    if (!res.ok) return { rating: null, hasBooking: false };

    const html = await res.text();

    // Try JSON-LD structured data first
    const jsonLdMatches = html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    );
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]!);
        const entries = Array.isArray(data) ? data : [data];
        for (const entry of entries) {
          const rv = entry?.aggregateRating?.ratingValue;
          if (rv != null) {
            const rating = parseFloat(rv);
            if (!isNaN(rating) && rating >= 1 && rating <= 5) {
              return { rating, hasBooking: detectBooking(html) };
            }
          }
        }
      } catch {
        // continue
      }
    }

    // Fallback: look for score patterns like "4.5" near rating keywords
    const ratingMatch = html.match(/["']ratingValue["']\s*:\s*["']?([0-9.]+)["']?/i);
    if (ratingMatch) {
      const rating = parseFloat(ratingMatch[1]!);
      if (!isNaN(rating) && rating >= 1 && rating <= 5) {
        return { rating, hasBooking: detectBooking(html) };
      }
    }

    return { rating: null, hasBooking: detectBooking(html) };
  } catch {
    return { rating: null, hasBooking: false };
  }
}

function detectBooking(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes("bookatable") ||
    lower.includes("sevenrooms") ||
    lower.includes("chope") ||
    lower.includes("book a table") ||
    lower.includes("make a reservation") ||
    lower.includes("book now") ||
    (lower.includes("reservation") && lower.includes("button"))
  );
}
