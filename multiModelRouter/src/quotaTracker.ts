import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { ModelConfig, UsageRecord } from "./types.js";

const ONE_MINUTE_MS = 60_000;

/**
 * Persists usage state to a JSON file. Fine for a single-process
 * prototype. If you run multiple workers/processes, swap this for
 * Redis or SQLite with atomic increments — a flat file will race.
 */
export class QuotaTracker {
  private statePath: string;
  private state: Record<string, UsageRecord>;

  constructor(statePath = "quota_state.json") {
    this.statePath = statePath;
    this.state = this.load();
  }

  private load(): Record<string, UsageRecord> {
    if (existsSync(this.statePath)) {
      try {
        return JSON.parse(readFileSync(this.statePath, "utf-8"));
      } catch {
        return {};
      }
    }
    return {};
  }

  private save(): void {
    writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
  }

  private getRecord(modelId: string): UsageRecord {
    if (!this.state[modelId]) {
      this.state[modelId] = {
        requests: 0,
        tokens: 0,
        recentRequestTimestamps: [],
        recentTokenEvents: [],
      };
    }
    return this.state[modelId];
  }

  /** Requests/tokens accumulated so far in "today" (Pacific-time day boundary). */
  private dailyKey(): string {
    // Google resets quotas at midnight Pacific time — mirror that convention
    // so your daily counters roll over at the same point providers do.
    const pacificNow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
    );
    return pacificNow.toISOString().slice(0, 10); // YYYY-MM-DD in Pacific
  }

  private dailyRecord(modelId: string): UsageRecord {
    const key = `${modelId}::${this.dailyKey()}`;
    return this.getRecord(key);
  }

  /**
   * Checks whether a request of `incomingTokens` fits within rpm/tpm (sliding
   * 60s window) and rpd/tpd (daily, Pacific-time reset) for this model.
   */
  hasQuota(model: ModelConfig, incomingTokens: number): boolean {
    const now = Date.now();
    const sliding = this.getRecord(model.id);
    const daily = this.dailyRecord(model.id);

    // Prune sliding window entries older than 60s.
    sliding.recentRequestTimestamps = sliding.recentRequestTimestamps.filter(
      (ts) => now - ts < ONE_MINUTE_MS
    );
    sliding.recentTokenEvents = sliding.recentTokenEvents.filter(
      (e) => now - e.ts < ONE_MINUTE_MS
    );

    const rpmUsed = sliding.recentRequestTimestamps.length;
    const tpmUsed = sliding.recentTokenEvents.reduce((sum, e) => sum + e.tokens, 0);

    if (rpmUsed + 1 > model.limits.rpm) return false;
    if (tpmUsed + incomingTokens > model.limits.tpm) return false;
    if (daily.requests + 1 > model.limits.rpd) return false;
    if (model.limits.tpd !== undefined && daily.tokens + incomingTokens > model.limits.tpd) {
      return false;
    }

    return true;
  }

  /** Call this after a successful call to the provider. */
  recordUsage(model: ModelConfig, tokensUsed: number): void {
    const now = Date.now();
    const sliding = this.getRecord(model.id);
    const daily = this.dailyRecord(model.id);

    sliding.recentRequestTimestamps.push(now);
    sliding.recentTokenEvents.push({ ts: now, tokens: tokensUsed });
    sliding.requests += 1;
    sliding.tokens += tokensUsed;

    daily.requests += 1;
    daily.tokens += tokensUsed;

    this.save();
  }

  /** Snapshot for logging/debugging. */
  getUsageSnapshot(modelId: string) {
    return {
      sliding: this.getRecord(modelId),
      daily: this.dailyRecord(modelId),
    };
  }
}
