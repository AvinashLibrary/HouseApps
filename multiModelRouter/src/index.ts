import type { ModelConfig } from "./types.ts";
import { callGroq } from "./providers/groq.ts";
import { callGemini } from "./providers/gemini.ts";
import { callClaude } from "./providers/claude.ts";
import { callCerebras } from "./providers/cerebras.ts";
import { callMistral } from "./providers/mistral.ts";
import { callOpenRouter } from "./providers/openrouter.ts";

export interface ProviderResponse {
  text: string;
  /** Actual tokens used, if the provider reports it (preferred over estimate). */
  tokensUsed: number;
}

/**
 * Dispatches to the right provider SDK/fetch call based on model.provider.
 * Add a case here each time you wire up a new provider (Cerebras, Mistral,
 * OpenRouter) — they all follow the same shape.
 */
export async function callModel(
  model: ModelConfig,
  prompt: string
): Promise<ProviderResponse> {
  switch (model.provider) {
    case "groq":
      return callGroq(model, prompt);
    case "cerebras":
      return callCerebras(model, prompt);
    case "gemini":
      return callGemini(model, prompt);
    case "mistral":
      return callMistral(model, prompt);
    case "openrouter":
      return callOpenRouter(model, prompt);
    case "claude":
      return callClaude(model, prompt);
    default:
      throw new Error(
        `No provider adapter wired up yet for "${model.provider}". ` +
          `Add one in src/providers/${model.provider}.ts following the ` +
          `pattern in groq.ts / gemini.ts / claude.ts.`
      );
  }
}
