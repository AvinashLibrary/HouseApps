import "dotenv/config";
import { LLMRouter } from "../router.ts";
import { callModel } from "../index.ts";
import {
  type Part,
} from "@google/generative-ai";

async function main() {
  const router = new LLMRouter();

  const prompt = "Summarize the key benefits of prompt caching in 2 sentences.";

  // 1. Router picks the cheapest model that currently has quota.
  const { model, estimatedTokens } = router.route(prompt);
  console.log(`Routing to: ${model.label} (est. ${estimatedTokens} tokens)`);

  // 2. Call the actual provider.
  const image  = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5Xn4sAAAAASUVORK5CYII=";

  const { text, tokensUsed } = await callModel(model, prompt,image);
  console.log("Response:", text);

  // 3. Record real usage (prefer provider-reported tokens over the estimate).
  router.recordUsage(model, tokensUsed || estimatedTokens);

  // 4. Inspect current usage against quota, for debugging/dashboards.
  console.log("Usage snapshot:", router.getUsageSnapshot(model.id));
}

// Example of forcing escalation for a request you already know is complex:
async function complexExample() {
  const router = new LLMRouter();
  const prompt = "Do a multi-step legal analysis of ...";
  const { model } = router.route(prompt, { forceEscalate: true });
  console.log(`Forced escalation to: ${model.label}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
