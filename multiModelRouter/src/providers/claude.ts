import type { ModelConfig } from "../types.js";
import type { ProviderResponse } from "../index.js";

/**
 * Uses the official @anthropic-ai/sdk package.
 * npm install @anthropic-ai/sdk
 * This is your paid escalation tier — no free quota, so it's only
 * reached when router.ts couldn't find room in any free-tier model,
 * or when you pass forceEscalate: true for known-complex requests.
 */
export async function callClaude(
  model: ModelConfig,
  prompt: string
): Promise<ProviderResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY in environment.");

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: model.apiModel,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .map((block: { type: string; text?: string }) =>
      block.type === "text" ? block.text ?? "" : ""
    )
    .join("");

  const tokensUsed =
    response.usage.input_tokens + response.usage.output_tokens;

  return { text, tokensUsed };
}
