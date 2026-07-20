import type { ModelConfig } from "./types.ts";
import { callGroq } from "./providers/groq";
import { callGemini } from "./providers/gemini";
import { callClaude } from "./providers/claude";
import { callCerebras } from "./providers/cerebras";
import { callMistral } from "./providers/mistral";
import { callOpenRouter } from "./providers/openrouter";
import {
  type Part,
} from "@google/generative-ai";



export interface ProviderResponse {
  text: string;
  /** Actual tokens used, if the provider reports it (preferred over estimate). */
  tokensUsed: number;
}


const parts: Part[] = [];

/**
 * Dispatches to the right provider SDK/fetch call based on model.provider.
 * Add a case here each time you wire up a new provider (Cerebras, Mistral,
 * OpenRouter) — they all follow the same shape.
 */
export async function callModel(
  model: ModelConfig,
  prompt: string,
  image: any
): Promise<ProviderResponse> {
  switch (model.provider) {
    case "groq":
      return callGroq(model, prompt);
    case "cerebras":
      return callCerebras(model, prompt);
    case "gemini":

      if (image) {
        parts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.base64,
          },
        });
      }

      parts.push({
        text: prompt,
      });
      return callGemini(model, parts);
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
