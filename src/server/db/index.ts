import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Use max:1 for serverless/edge — avoids connection pool exhaustion
const client = postgres(process.env.DATABASE_URL!, { max: 1 });

export const db = drizzle(client, { schema });
export type DB = typeof db;
