import "server-only";
import { eq, and, sql } from "drizzle-orm";
import type { DB } from "@/server/db";
import { restaurants } from "@/server/db/schema";
import type { NormalizedPlace } from "./normalizer";

export interface DuplicateResult {
  restaurant_id: string;
  was_duplicate: true;
}

export async function findDuplicate(
  db: DB,
  candidate: NormalizedPlace,
  userId: string
): Promise<DuplicateResult | null> {
  // Level 1: Exact Google Place ID match
  if (candidate.google_place_id) {
    const rows = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(
        and(
          eq(restaurants.google_place_id, candidate.google_place_id),
          eq(restaurants.user_id, userId)
        )
      )
      .limit(1);

    if (rows.length > 0) {
      return { restaurant_id: rows[0]!.id, was_duplicate: true };
    }
  }

  // Level 2: Slug match
  if (candidate.slug) {
    const rows = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(
        and(
          eq(restaurants.slug, candidate.slug),
          eq(restaurants.user_id, userId)
        )
      )
      .limit(1);

    if (rows.length > 0) {
      return { restaurant_id: rows[0]!.id, was_duplicate: true };
    }
  }

  // Level 3: Fuzzy name + location match (requires pg_trgm and PostGIS)
  if (candidate.lat && candidate.lng) {
    const lat = parseFloat(candidate.lat);
    const lng = parseFloat(candidate.lng);

    const rows = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(
        and(
          eq(restaurants.user_id, userId),
          sql`similarity(${restaurants.name}, ${candidate.name}) > 0.7`,
          sql`ST_DWithin(
            ${restaurants.location},
            ST_MakePoint(${lng}, ${lat})::geography,
            300
          )`
        )
      )
      .limit(1);

    if (rows.length > 0) {
      return { restaurant_id: rows[0]!.id, was_duplicate: true };
    }
  }

  return null;
}
