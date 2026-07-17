import "dotenv/config";
import express, { type Request, type Response } from "express";
import { LLMRouter } from "./router.js";
import { callModel } from "./index.ts";

const app = express();

app.use(express.json({
  limit: "20mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "20mb"
}));

const router = new LLMRouter();

/**
 * POST /v1/route
 * Body: { "prompt": string, "forceEscalate"?: boolean, "allowList"?: string[] }
 *
 * Picks the cheapest available model with quota room, calls it, records
 * real usage, and returns the response plus which model actually served it
 * (useful for logging/debugging your cascade behavior).
 */
app.post("/v1/route", async (req: Request, res: Response) => {
  const { prompt, forceEscalate, allowList , image} = req.body ?? {};

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Body must include a string `prompt`." });
  }

  try {
    const { model, estimatedTokens } = router.route(prompt, {
      forceEscalate,
      allowList,
    });



    const { text, tokensUsed } = await callModel(model, prompt,image);
    router.recordUsage(model, tokensUsed || estimatedTokens);

    return res.json({
      model: model.id,
      label: model.label,
      response: text,
      tokensUsed: tokensUsed || estimatedTokens,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Quota-exhaustion errors from router.route() are still a 503, not a 500 —
    // it's a "try again later" condition, not a bug.
    const isQuotaExhausted = message.includes("out of quota");
    return res.status(isQuotaExhausted ? 503 : 500).json({ error: message });
  }
});

/**
 * GET /v1/usage/:modelId
 * Quick way to inspect current sliding-window and daily usage for a model,
 * e.g. GET /v1/usage/groq:llama-3.3-70b
 */
app.get("/v1/usage/:modelId", (req: Request, res: Response) => {
  const snapshot = router.getUsageSnapshot(req.params.modelId);
  res.json(snapshot);
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`llm-router listening on http://localhost:${PORT}`);
});
