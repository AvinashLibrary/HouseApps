# LLM Router

Cost-aware router: counts tokens locally (free), tracks each provider's
free-tier quota (RPM/TPM sliding window + daily RPD/TPD reset at Pacific
midnight), and cascades a request through free models first, escalating
to a cheap paid model (Claude Haiku) only when everything free is
exhausted or you explicitly flag a request as complex.

## Setup

```bash
npm install
cp .env.example .env   # fill in the API keys you actually plan to use
npm run dev            # runs src/index.ts directly via tsx (single example call)
npm run serve          # runs src/server.ts — starts the HTTP API on :3000
```

## HTTP API (src/server.ts)

**POST /v1/route**
```bash
curl -X POST http://localhost:3000/v1/route \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Summarize prompt caching in 2 sentences."}'
```
Response:
```json
{ "model": "groq:llama-3.3-70b", "label": "Groq — Llama 3.3 70B (free, fast)", "response": "...", "tokensUsed": 42 }
```

Optional body fields:
- `forceEscalate: true` — skip free tiers, go straight to the paid escalation model (Claude Haiku)
- `allowList: ["groq:llama-3.3-70b", "gemini:2.5-flash-lite"]` — restrict routing to specific model ids

A 503 response means every model in the cascade is currently out of quota — that's a "retry later" signal, not a server error.

**GET /v1/usage/:modelId**
```bash
curl http://localhost:3000/v1/usage/groq:llama-3.3-70b
```
Returns the current sliding-window (RPM/TPM) and daily (RPD/TPD) usage for that model — useful for a small dashboard or just debugging why the router picked what it picked.

## Structure

- `src/tokenizer.ts` — local, offline token counting (no API call, no cost)
- `src/quotaTracker.ts` — sliding-window RPM/TPM + daily RPD/TPD, persisted to JSON
- `src/modelConfig.ts` — the cascade order (edit limits here as providers change them)
- `src/router.ts` — picks the first model in the cascade with room for the request
- `src/providers/*.ts` — one adapter per provider (groq, cerebras, mistral,
  openrouter, gemini, claude) plus `index.ts` dispatching by `model.provider`
- `src/server.ts` — Express HTTP API wrapping the router (`POST /v1/route`, `GET /v1/usage/:modelId`)
- `src/index.ts` — example end-to-end usage

## Notes

- The JSON-file quota store is fine for a single process. For multiple
  workers, swap `quotaTracker.ts`'s file read/write for Redis or SQLite
  with atomic increments — a flat file will race under concurrency.
- Free-tier numbers in `modelConfig.ts` are approximate as of mid-2026 and
  providers change them without much notice — recheck against each
  provider's dashboard/docs periodically.
- Prefer the provider's reported token usage (returned in `callModel`'s
  `tokensUsed`) over the pre-call estimate when calling `recordUsage`.
