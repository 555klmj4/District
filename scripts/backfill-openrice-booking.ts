/**
 * Re-derives has_booking for every existing OpenRice restaurant_sources row,
 * using the corrected acceptsReservations-first logic (see
 * src/server/ingestion/openrice.ts) instead of the old, buggy
 * "reservation" + "button" text heuristic that produced false positives.
 *
 * Usage:
 *   pnpm exec tsx scripts/backfill-openrice-booking.ts
 *   pnpm exec tsx scripts/backfill-openrice-booking.ts <url> [<url> ...]   # only these
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { appendFileSync } from "fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import Firecrawl from "firecrawl";
import * as schema from "../src/server/db/schema";

const { restaurantSources } = schema;

async function fetchHtmlViaProxy(firecrawl: Firecrawl, url: string): Promise<string> {
  const doc = await firecrawl.scrape(url, {
    formats: ["rawHtml"],
    proxy: "stealth",
    headers: { "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8" },
    timeout: 25000,
  });
  return doc.rawHtml ?? "";
}

// Hard backstop in case a request hangs with no error at all (observed once
// against the Firecrawl SDK) — the `timeout`/`timeoutMs` options above should
// prevent this, but this guarantees the loop always moves on.
async function withHardTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`hard timeout after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

// Mirrors extractPageData's acceptsReservations parsing in
// src/server/ingestion/openrice.ts
function extractAcceptsReservations(html: string): boolean | null {
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1]!);
      const entries = Array.isArray(data) ? data : [data];
      for (const entry of entries) {
        const ar = entry?.acceptsReservations;
        if (typeof ar === "boolean") return ar;
      }
    } catch {
      // continue
    }
  }
  return null;
}

// Same narrowed fallback as detectBooking() in openrice.ts (used only when
// acceptsReservations is genuinely absent from the page's JSON-LD)
function textHeuristicBooking(html: string): boolean {
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

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// stdout from a backgrounded process can sit buffered for a long time before
// it's visible to a caller tailing the redirected file — write progress
// synchronously to our own file instead so it's visible immediately.
const PROGRESS_FILE = "/tmp/backfill-openrice-booking.progress.log";
function log(line: string) {
  console.log(line);
  appendFileSync(PROGRESS_FILE, line + "\n");
}

async function main() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not set");
  const firecrawl = new Firecrawl({ apiKey, timeoutMs: 30000 });

  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });

  const allRows = await db
    .select({
      id: restaurantSources.id,
      restaurant_id: restaurantSources.restaurant_id,
      url: restaurantSources.url,
      raw_data: restaurantSources.raw_data,
    })
    .from(restaurantSources)
    .where(eq(restaurantSources.platform, "openrice"));

  const onlyUrls = process.argv.slice(2);
  const rows = onlyUrls.length > 0 ? allRows.filter((r) => onlyUrls.includes(r.url)) : allRows;

  log(`Found ${allRows.length} OpenRice source rows${onlyUrls.length > 0 ? `, retrying ${rows.length} of them` : ""}`);

  let changed = 0, unchanged = 0, failed = 0;
  let i = 0;

  for (const r of rows) {
    i++;
    log(`[${i}/${rows.length}] fetching ${r.url}`);
    try {
      const html = await withHardTimeout(fetchHtmlViaProxy(firecrawl, r.url), 35000);
      const ar = extractAcceptsReservations(html);
      const hasBooking = ar != null ? ar : textHeuristicBooking(html);

      const prevRaw = (r.raw_data as Record<string, unknown> | null) ?? {};
      const prevBooking = prevRaw.has_booking === true;

      if (prevBooking !== hasBooking) {
        await db
          .update(restaurantSources)
          .set({ raw_data: { ...prevRaw, has_booking: hasBooking }, fetched_at: new Date() })
          .where(eq(restaurantSources.id, r.id));
        log(`  -> changed ${r.restaurant_id}: ${prevBooking} -> ${hasBooking}`);
        changed++;
      } else {
        log(`  -> unchanged (${hasBooking})`);
        unchanged++;
      }
    } catch (e) {
      log(`  -> FAILED ${r.restaurant_id}: ${(e as Error).message}`);
      failed++;
    }

    await sleep(300);
  }

  log(`Done: ${changed} changed, ${unchanged} unchanged, ${failed} failed`);
  await client.end();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
