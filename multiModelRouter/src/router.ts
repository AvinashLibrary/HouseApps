import { countTokens } from "./tokenizer.js";
import { QuotaTracker } from "./quotaTracker.js";
import { MODEL_CASCADE } from "./modelConfig.js";
import type { ModelConfig, RouteResult } from "./types.js";

export interface RouteOptions {
  /**
   * Set true for requests you already know are complex/high-stakes
   * (long reasoning chains, high-value output) — skips straight to the
   * paid escalation tier(s) instead of trying free models first.
   */
  forceEscalate?: boolean;
  /** Restrict routing to a subset of model ids, if needed. */
  allowList?: string[];
}

export class LLMRouter {
  private quota: QuotaTracker;
  private cascade: ModelConfig[];

  constructor(cascade: ModelConfig[] = MODEL_CASCADE, statePath?: string) {
    this.quota = new QuotaTracker(statePath);
    this.cascade = cascade;
  }

  /** Pick the first model in the cascade that has room for this request. */
  route(prompt: string, options: RouteOptions = {}): RouteResult {
    const estimatedTokens = countTokens(prompt);

    let candidates = this.cascade;
    if (options.allowList) {
      candidates = candidates.filter((m) => options.allowList!.includes(m.id));
    }
    if (options.forceEscalate) {
      candidates = candidates.filter((m) => m.costTier > 0);
    }

    for (const model of candidates) {
      if (this.quota.hasQuota(model, estimatedTokens)) {
        return { model, estimatedTokens };
      }
    }

    throw new Error(
      "All models in the cascade are out of quota. Add a paid fallback " +
        "with no cap, queue the request, or wait for quotas to reset."
    );
  }

  /** Call after the provider call succeeds, with the *actual* tokens used
   * (prompt + completion), not just the estimate. */
  recordUsage(model: ModelConfig, actualTokensUsed: number): void {
    this.quota.recordUsage(model, actualTokensUsed);
  }

  getUsageSnapshot(modelId: string) {
    return this.quota.getUsageSnapshot(modelId);
  }
}
