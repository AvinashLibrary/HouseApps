import type { ModelConfig } from "../types.js";
import type { ProviderResponse } from "../index.js";

/**
 * OpenRouter is a gateway — same OpenAI-shaped payload, but the `model`
 * field picks which upstream provider/model actually serves the request.
 * Use a specific ":free" suffixed model string in modelConfig.ts rather
 * than a generic placeholder, e.g. "meta-llama/llama-3.3-70b-instruct:free".
 */
export async function callOpenRouter(
  model: ModelConfig,
  prompt: string
): Promise<ProviderResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY in environment.");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      // Optional but recommended by OpenRouter for attribution/rankings:
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost",
      "X-Title": process.env.APP_NAME ?? "llm-router",
    },
    body: JSON.stringify({
      model: model.apiModel,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const tokensUsed = data.usage?.total_tokens ?? 0;

  return { text, tokensUsed };
}
