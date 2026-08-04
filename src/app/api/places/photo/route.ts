import { NextRequest, NextResponse } from "next/server";

const PLACES_API_BASE = "https://places.googleapis.com/v1";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  const maxWidth = req.nextUrl.searchParams.get("maxWidth") ?? "800";

  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const url = `${PLACES_API_BASE}/${name}/media?maxWidthPx=${maxWidth}&skipHttpRedirect=true`;
  const res = await fetch(url, {
    headers: { "X-Goog-Api-Key": apiKey },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Photo fetch failed" }, { status: res.status });
  }

  const data = (await res.json()) as { photoUri?: string };
  if (!data.photoUri) {
    return NextResponse.json({ error: "No photo URI" }, { status: 404 });
  }

  return NextResponse.redirect(data.photoUri, {
    status: 302,
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
