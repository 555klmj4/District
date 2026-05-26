import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  GOOGLE_PLACES_API_KEY: z.string().min(1),
  LLMAPI_API_KEY: z.string().min(1),
  LLMAPI_BASE_URL: z.string().url().default("https://api.llmapi.ai/v1"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export const env = envSchema.parse(process.env);
