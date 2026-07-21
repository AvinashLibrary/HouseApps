import type { ModelConfig } from "../types.js";
import type { ProviderResponse } from "../index.js";

import {
  GoogleGenerativeAI,
  type Part,
} from "@google/generative-ai";

export async function callGemini(
  model: ModelConfig,
  input: string | Part[]
): Promise<ProviderResponse> {
  const apiKey = process.env.GEMINI_API_KEY;


  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const genModel = genAI.getGenerativeModel({
    model: model.apiModel,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  console.log("this os input {}",input);

  const result = await genModel.generateContent(input);
  
  const response = result.response;
  const usage = response.usageMetadata;
  console.debug(response.text());
  return {
    text: response.text(),
    tokensUsed:
      (usage?.promptTokenCount ?? 0) +
      (usage?.candidatesTokenCount ?? 0),
  };
}