export const AI_MODELS = {
  primary: "gpt-4o-mini",
} as const;

export const MODEL_CONFIG = {
  explanation: {
    model: AI_MODELS.primary,
    maxOutputTokens: 512,
    temperature: 0.6,
  },
  fast: {
    model: AI_MODELS.primary,
    maxOutputTokens: 256,
    temperature: 0.1,
  },
} as const;
