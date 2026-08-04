// Maps verbose Google cuisine strings to short canonical chip labels.
// Used client-side to normalize existing DB data for the filter chips.
const CUISINE_MAP: Record<string, string> = {
  "japanese restaurant":        "Japanese",
  "ramen restaurant":           "Japanese",
  "sushi restaurant":           "Japanese",
  "tempura restaurant":         "Japanese",
  "izakaya restaurant":         "Japanese",
  "yakitori restaurant":        "Japanese",
  "tonkatsu restaurant":        "Japanese",
  "chinese restaurant":         "Chinese",
  "chinese noodle restaurant":  "Chinese",
  "dim sum restaurant":         "Chinese",
  "hong kong restaurant":       "Chinese",
  "taiwanese restaurant":       "Chinese",
  "hotpot restaurant":          "Chinese",
  "cantonese restaurant":       "Cantonese",
  "korean restaurant":          "Korean",
  "thai restaurant":            "Thai",
  "vietnamese restaurant":      "Vietnamese",
  "italian restaurant":         "Italian",
  "pizza restaurant":           "Italian",
  "french restaurant":          "French",
  "american restaurant":        "American",
  "mexican restaurant":         "Mexican",
  "indian restaurant":          "Indian",
  "mediterranean restaurant":   "Mediterranean",
  "seafood restaurant":         "Seafood",
  "steak house":                "Steakhouse",
  "wine bar":                   "Bar",
  "cocktail bar":               "Bar",
  "pub":                        "Bar",
  "bar":                        "Bar",
  "cafe":                       "Café",
  "coffee shop":                "Café",
  "bakery":                     "Café",
};

export function normalizeCuisine(cuisine: string): string {
  const lower = cuisine.toLowerCase().trim();
  if (CUISINE_MAP[lower]) return CUISINE_MAP[lower]!;
  // Strip trailing " restaurant" as a generic fallback
  const stripped = cuisine.replace(/\s+restaurant$/i, "").trim();
  return stripped;
}
