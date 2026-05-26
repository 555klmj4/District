import "server-only";
import { createOpenAI } from "@ai-sdk/openai";

// LLM API is OpenAI-compatible at https://api.llmapi.ai/v1
export const llm = createOpenAI({
  baseURL: process.env.LLMAPI_BASE_URL ?? "https://api.llmapi.ai/v1",
  apiKey: process.env.LLMAPI_API_KEY!,
});
