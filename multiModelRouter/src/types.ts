export interface ModelLimits {
  /** Requests per day. Use Infinity for no daily cap. */
  rpd: number;
  /** Requests per minute. Use Infinity for no per-minute cap. */
  rpm: number;
  /** Tokens per minute. Use Infinity for no per-minute token cap. */
  tpm: number;
  /** Tokens per day, if the provider caps daily volume instead of/alongside RPD. */
  tpd?: number;
}

export interface ModelConfig {
  /** Unique id used as the key in quota tracking, e.g. "groq:llama-3.3-70b" */
  id: string;
  /** Human label for logs. */
  label: string;
  provider: "groq" | "cerebras" | "gemini" | "mistral" | "openrouter" | "claude";
  /** The exact model string the provider's API expects. */
  apiModel: string;
  limits: ModelLimits;
  /** Rough cost tier, purely for sorting/logging — 0 = free. */
  costTier: 0 | 1 | 2;
}

export interface RouteResult {
  model: ModelConfig;
  estimatedTokens: number;
}

export interface UsageRecord {
  requests: number;
  tokens: number;
  /** Timestamps (ms) of recent requests, used for the sliding RPM/TPM window. */
  recentRequestTimestamps: number[];
  recentTokenEvents: { ts: number; tokens: number }[];
}

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64
  };
}
