import type { ModelConfig } from "../types.js";
import type { ProviderResponse } from "../index.js";

/**
 * Uses the official @google/generative-ai package.
 * npm install @google/generative-ai
 */
export async function callGemini(
  model: ModelConfig,
  prompt: string
): Promise<ProviderResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY in environment.");

  // Dynamic import keeps this optional dependency out of the way until used.
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({ model: model.apiModel });

  const result = await genModel.generateContent(prompt);
  const text = result.response.text();

  // Gemini's response includes usageMetadata with real token counts —
  // prefer this over your local estimate when recording usage.
  const usage = result.response.usageMetadata;
  const tokensUsed =
    (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0);

  return { text, tokensUsed };
}
