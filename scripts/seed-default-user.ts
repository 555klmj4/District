/**
 * One-time migration: create a user from a passphrase and reassign all
 * data stored under user_id = "default" to that user's UUID.
 *
 * Usage:
 *   pnpm exec tsx scripts/seed-default-user.ts "your passphrase here"
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";

const { users, restaurants, bookmarks, userPreferences, recommendationHistory, recommendationFeedback } = schema;

const passphrase = process.argv[2];

if (!passphrase || passphrase.trim().length < 1) {
  console.error('Usage: pnpm exec tsx scripts/seed-default-user.ts "your passphrase"');
  process.exit(1);
}

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });

  const hash = await bcrypt.hash(passphrase, 12);
  const [user] = await db.insert(users).values({ passphrase_hash: hash }).returning();
  const userId = user.id;

  const [r, b, p, h, f] = await Promise.all([
    db.update(restaurants).set({ user_id: userId }).where(eq(restaurants.user_id, "default")).returning({ id: restaurants.id }),
    db.update(bookmarks).set({ user_id: userId }).where(eq(bookmarks.user_id, "default")).returning({ id: bookmarks.id }),
    db.update(userPreferences).set({ user_id: userId }).where(eq(userPreferences.user_id, "default")).returning({ id: userPreferences.id }),
    db.update(recommendationHistory).set({ user_id: userId }).where(eq(recommendationHistory.user_id, "default")).returning({ id: recommendationHistory.id }),
    db.update(recommendationFeedback).set({ user_id: userId }).where(eq(recommendationFeedback.user_id, "default")).returning({ id: recommendationFeedback.id }),
  ]);

  console.log(`\nUser created: ${userId}`);
  console.log(`Migrated:`);
  console.log(`  ${r.length} restaurants`);
  console.log(`  ${b.length} bookmarks`);
  console.log(`  ${p.length} user_preferences rows`);
  console.log(`  ${h.length} recommendation_history rows`);
  console.log(`  ${f.length} recommendation_feedback rows`);
  console.log(`\nDone. You can now log in with your passphrase.`);

  await client.end();
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
