import "server-only";
import { generateText } from "ai";
import { llm } from "./client";
import { AI_MODELS } from "./models";

export async function generateSignatureDishes(
  name: string,
  cuisine: string | null,
  reviewTexts: string[],
  language: "en" | "zh" = "en"
): Promise<string[]> {
  if (reviewTexts.length === 0) return [];

  const excerpts = reviewTexts
    .map((t) => t.slice(0, 300))
    .join("\n---\n");

  const langInstruction = language === "zh"
    ? 'Return dish names in Traditional Chinese (繁體中文), e.g. ["燒鵝", "雲吞麵", "叉燒飯"].'
    : 'Return dish names in English, e.g. ["Roast Goose", "Wonton Noodle Soup", "Char Siu Rice"].';

  const prompt = `You are a restaurant expert. Based on the restaurant name, cuisine type, and customer review excerpts below, identify 3–5 signature or popular dishes this restaurant is known for.

Restaurant: ${name}
Cuisine: ${cuisine ?? "unknown"}

Review excerpts:
${excerpts}

${langInstruction} Return ONLY a JSON array of strings. No explanation, no markdown, just the array.`;

  try {
    const { text } = await generateText({
      model: llm(AI_MODELS.primary),
      prompt,
      maxOutputTokens: 128,
      temperature: 0.2,
    });

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[])
      .filter((d): d is string => typeof d === "string")
      .slice(0, 5);
  } catch {
    return [];
  }
}
