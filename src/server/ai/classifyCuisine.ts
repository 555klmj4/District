import "server-only";
import { generateText } from "ai";
import { llm } from "./client";
import { AI_MODELS } from "./models";

export const CUISINE_CATEGORIES = [
  "Japanese",
  "Chinese",
  "Korean",
  "Thai",
  "Vietnamese",
  "Western",
  "Café",
  "Bar",
  "Seafood",
  "Other",
] as const;

export type CuisineCategory = (typeof CUISINE_CATEGORIES)[number];

export async function classifyCuisine(input: {
  name: string;
  cuisine_primary: string | null;
  cuisine_tags: string[];
  types?: string[];
}): Promise<CuisineCategory> {
  const { name, cuisine_primary, cuisine_tags, types } = input;

  const prompt = `Classify this restaurant into exactly one of these categories:
${CUISINE_CATEGORIES.join(", ")}

Rules:
- Japanese = sushi, ramen, izakaya, tempura, yakitori, tonkatsu, omakase
- Chinese = Cantonese, dim sum, Hong Kong-style, Taiwanese, hotpot, noodles, BBQ
- Korean = Korean BBQ, bibimbap, fried chicken, Korean cuisine
- Thai = Thai cuisine
- Vietnamese = pho, banh mi, Vietnamese cuisine
- Western = Italian, French, American, European, pizza, steak, burger, Mediterranean
- Café = coffee shop, bakery, dessert, cake, brunch, tea room
- Bar = cocktail bar, wine bar, pub, beer, nightclub
- Seafood = seafood-focused restaurant
- Other = anything that doesn't fit above

Restaurant:
- Name: ${name}
- Primary cuisine: ${cuisine_primary ?? "unknown"}
- Tags: ${cuisine_tags.join(", ") || "none"}
- Google types: ${(types ?? []).join(", ") || "none"}

Reply with only the category name, nothing else.`;

  try {
    const { text } = await generateText({
      model: llm(AI_MODELS.primary),
      prompt,
      maxOutputTokens: 10,
      temperature: 0,
    });

    const trimmed = text.trim() as CuisineCategory;
    if ((CUISINE_CATEGORIES as readonly string[]).includes(trimmed)) {
      return trimmed;
    }
  } catch {
    // fall through to heuristic
  }

  // Heuristic fallback
  return heuristicClassify(cuisine_primary, cuisine_tags);
}

function heuristicClassify(
  cuisine_primary: string | null,
  cuisine_tags: string[]
): CuisineCategory {
  const all = [cuisine_primary ?? "", ...cuisine_tags].join(" ").toLowerCase();

  if (/japanese|sushi|ramen|izakaya|tempura|yakitori|tonkatsu/.test(all)) return "Japanese";
  if (/cantonese|dim.?sum|hong.?kong|chinese|taiwanese|hotpot/.test(all)) return "Chinese";
  if (/korean/.test(all)) return "Korean";
  if (/thai/.test(all)) return "Thai";
  if (/vietnamese|viet/.test(all)) return "Vietnamese";
  if (/italian|french|american|european|pizza|steak|burger|mediterranean|western/.test(all)) return "Western";
  if (/caf[eé]|coffee|bakery|dessert|cake|brunch|tea/.test(all)) return "Café";
  if (/bar|cocktail|wine|pub|beer/.test(all)) return "Bar";
  if (/seafood/.test(all)) return "Seafood";
  return "Other";
}
