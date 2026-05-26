import "server-only";
import { generateText } from "ai";
import { llm } from "@/server/ai/client";
import { AI_MODELS, MODEL_CONFIG } from "@/server/ai/models";
import { buildRecommendationPrompt } from "@/server/ai/prompts/recommendation";
import type { ScoredCandidate, RecommendationContext } from "@/shared/types/recommendation";
import type { UserPreferencesRow } from "@/server/db/schema";

interface ExplainerInput {
  candidates: ScoredCandidate[];
  preferences: UserPreferencesRow | null;
  query?: string;
  context: RecommendationContext;
}

export async function generateExplanation(
  input: ExplainerInput
): Promise<string> {
  const { candidates, preferences, query, context } = input;

  if (candidates.length === 0) return "";

  const bookmarkCount = preferences ? candidates.length : 0;
  const topAffinities = preferences?.cuisine_affinities ?? [];

  const prompt = buildRecommendationPrompt({
    candidates,
    topAffinities,
    query,
    context,
    bookmarkCount,
  });

  try {
    const { text } = await generateText({
      model: llm(AI_MODELS.primary),
      prompt,
      maxOutputTokens: MODEL_CONFIG.explanation.maxOutputTokens,
      temperature: MODEL_CONFIG.explanation.temperature,
    });
    return text.trim();
  } catch (error) {
    console.error("[explainer] AI call failed:", error);
    return "Here are your top-rated nearby options based on your bookmarks.";
  }
}
