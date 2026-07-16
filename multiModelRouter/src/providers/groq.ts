import type { ModelConfig } from "../types.ts";
import type { ProviderResponse } from "../index.ts";

/**
 * Groq's API is OpenAI-compatible, so a plain fetch works fine — no SDK
 * required, though `groq-sdk` exists if you'd rather use typed helpers.
 */
export async function callGroq(
  model: ModelConfig,
  prompt: string
): Promise<ProviderResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY in environment.");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
    throw new Error(`Groq API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const tokensUsed =
    data.usage?.total_tokens ?? // Groq reports usage like OpenAI does
    0;

  return { text, tokensUsed };
}
