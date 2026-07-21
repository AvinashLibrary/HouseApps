import type { ModelConfig } from "./types.ts";

/**
 * Ordered cheapest/free-first. Figures are approximate public free-tier
 * numbers as of mid-2026 — providers change these without much notice,
 * so treat this as a starting config to verify against each provider's
 * live dashboard/docs periodically, not a permanent constant.
 *
 * Google (Gemini) note: each Gemini model on a given account has its OWN
 * independent free quota bucket (separate RPM/TPM/RPD), not a shared pool.
 * So it's worth cascading through every free Gemini text model before
 * falling through to other providers — you get several independent daily
 * allowances for the cost of zero extra API keys. Ordered below from
 * highest daily capacity to lowest, based on the account's live quota page,
 * so the router burns through the most generous buckets first and only
 * reaches the tighter ones (or other providers) once those are exhausted.
 */
export const MODEL_CASCADE: ModelConfig[] = [
  {
    id: "gemini:3.1-flash-lite",
    label: "Gemini 3.1 Flash-Lite (free — highest daily cap)",
    provider: "gemini",
    apiModel: "gemini-3.1-flash-lite",
    // RPM 15, TPM 250K, RPD 500
    limits: { rpm: 15, rpd: 500, tpm: 250_000 },
    costTier: 0,
  },
  {
    id: "gemini:2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite (free)",
    provider: "gemini",
    apiModel: "gemini-2.5-flash-lite",
    // RPM 10, TPM 250K, RPD 20
    limits: { rpm: 10, rpd: 20, tpm: 250_000 },
    costTier: 0,
  },
  {
    id: "gemini:3.5-flash",
    label: "Gemini 3.5 Flash (free)",
    provider: "gemini",
    apiModel: "gemini-3.5-flash",
    // RPM 5, TPM 250K, RPD 20
    limits: { rpm: 5, rpd: 20, tpm: 250_000 },
    costTier: 0,
  },
  {
    id: "gemini:2.5-flash",
    label: "Gemini 2.5 Flash (free)",
    provider: "gemini",
    apiModel: "gemini-2.5-flash",
    // RPM 5, TPM 250K, RPD 20
    limits: { rpm: 5, rpd: 20, tpm: 250_000 },
    costTier: 0,
  },
  {
    id: "gemini:3-flash",
    label: "Gemini 3 Flash (free)",
    provider: "gemini",
    apiModel: "gemini-3-flash",
    // RPM 5, TPM 250K, RPD 20
    limits: { rpm: 5, rpd: 20, tpm: 250_000 },
    costTier: 0,
  },
  {
    id: "gemini:gemma-4-31b",
    label: "Gemma 4 31B (free, open-weight via Gemini API)",
    provider: "gemini",
    apiModel: "gemma-4-31b",
    // RPM 30, TPM 16K, RPD 14.4K — huge daily cap, but tight per-minute
    // throughput, so it sits after the Flash models rather than before them.
    limits: { rpm: 30, rpd: 14_400, tpm: 16_000 },
    costTier: 0,
  },
  {
    id: "gemini:gemma-4-26b",
    label: "Gemma 4 26B (free, open-weight via Gemini API)",
    provider: "gemini",
    apiModel: "gemma-4-26b",
    // RPM 30, TPM 16K, RPD 14.4K
    limits: { rpm: 30, rpd: 14_400, tpm: 16_000 },
    costTier: 0,
  },
  {
    id: "groq:llama-3.3-70b",
    label: "Groq — Llama 3.3 70B (free, fast)",
    provider: "groq",
    apiModel: "llama-3.3-70b-versatile",
    limits: { rpm: 30, rpd: 1000, tpm: 12_000, tpd: 100_000 },
    costTier: 0,
  },
  {
    id: "cerebras:llama-3.3-70b",
    label: "Cerebras — Llama 3.3 70B (free, high daily volume)",
    provider: "cerebras",
    apiModel: "llama3.3-70b",
    limits: { rpm: 30, rpd: Infinity, tpm: 30_000, tpd: 1_000_000 },
    costTier: 0,
  },
  {
    id: "mistral:small-free",
    label: "Mistral Small — Free/Experiment tier",
    provider: "mistral",
    apiModel: "mistral-small-latest",
    limits: { rpm: 2, rpd: Infinity, tpm: 50_000, tpd: 1_000_000_000 / 30 }, // ~1B/month spread daily
    costTier: 0,
  },
  {
    id: "openrouter:llama-3.3-70b-free",
    label: "OpenRouter — Llama 3.3 70B (free pool, fallback)",
    provider: "openrouter",
    apiModel: "meta-llama/llama-3.3-70b-instruct:free",
    limits: { rpm: 20, rpd: 50, tpm: 50_000 },
    costTier: 0,
  },
  {
    id: "claude:haiku-4.5",
    label: "Claude Haiku 4.5 (cheap paid — escalation tier)",
    provider: "claude",
    apiModel: "claude-haiku-4-5-20251001",
    limits: { rpm: Infinity, rpd: Infinity, tpm: Infinity }, // paid — no free quota to cap
    costTier: 1,
  },
];