import { streamText } from "ai";
import { llm } from "@/server/ai/client";
import { AI_MODELS, MODEL_CONFIG } from "@/server/ai/models";
import { buildRecommendationPrompt } from "@/server/ai/prompts/recommendation";
import { db } from "@/server/db";
import { recommendationHistory, userPreferences } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { historyId, query } = (await req.json()) as {
    historyId: string;
    query?: string;
  };

  // Fetch the history and preferences
  const [historyRows, prefRows] = await Promise.all([
    db
      .select()
      .from(recommendationHistory)
      .where(eq(recommendationHistory.id, historyId))
      .limit(1),
    db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.user_id, "default"))
      .limit(1),
  ]);

  if (historyRows.length === 0) {
    return new Response("History not found", { status: 404 });
  }

  const history = historyRows[0]!;
  const preferences = prefRows[0] ?? null;

  // Build a streaming prompt from the stored results
  const prompt = buildRecommendationPrompt({
    // results are stored ScoredResult rows — cast to minimal candidate shape for prompt building
    candidates: history.results as unknown as Parameters<typeof buildRecommendationPrompt>[0]["candidates"],
    topAffinities: preferences?.cuisine_affinities ?? [],
    query: query ?? history.query_text ?? undefined,
    context: history.context ?? {},
    bookmarkCount: history.results.length,
  });

  const result = streamText({
    model: llm(AI_MODELS.primary),
    prompt,
    maxOutputTokens: MODEL_CONFIG.explanation.maxOutputTokens,
    temperature: MODEL_CONFIG.explanation.temperature,
  });

  return result.toTextStreamResponse();
}
