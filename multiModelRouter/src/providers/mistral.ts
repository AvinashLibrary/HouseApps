import type { ModelConfig } from "../types.js";
import type { ProviderResponse } from "../index.js";

/**
 * Mistral's "La Plateforme" API is also OpenAI-shaped for chat completions.
 * Free ("Experiment") mode uses the same endpoint — the free/paid distinction
 * is on your account tier, not the URL or payload.
 */
export async function callMistral(
  model: ModelConfig,
  prompt: string
): Promise<ProviderResponse> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("Missing MISTRAL_API_KEY in environment.");

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model.apiModel,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Mistral API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const tokensUsed = data.usage?.total_tokens ?? 0;

  return { text, tokensUsed };
}
