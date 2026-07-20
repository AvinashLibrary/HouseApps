/**
 * Token counting is done locally via gpt-tokenizer — this is a pure
 * lookup/BPE algorithm, not an inference call, so it costs nothing and
 * has no rate limit. It's a close-enough proxy for other providers'
 * tokenizers (Gemini, Claude, etc. differ slightly, but the estimate is
 * fine for routing/quota decisions — you're not billing off this number).
 */
import { encode } from "gpt-tokenizer";

export function countTokens(text: string): number {
  if (!text) return 0;
  return encode(text).length;
}

/**
 * Very rough image token estimator. Real providers (Gemini, Claude) charge
 * per-image based on resolution tiers rather than raw pixel-to-token math,
 * so treat this as a placeholder you tune per provider once you know your
 * actual image sizes. Swap in provider-specific formulas as needed.
 */
export function estimateImageTokens(widthPx: number, heightPx: number): number {
  const megapixels = (widthPx * heightPx) / 1_000_000;
  // Placeholder heuristic: ~500 tokens per megapixel, floor of 100.
  return Math.max(100, Math.round(megapixels * 500));
}
