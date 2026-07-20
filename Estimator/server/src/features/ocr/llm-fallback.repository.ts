import { config } from '../../core/config';
import * as fs from 'fs';
import { existsSync } from 'fs';
import * as path from 'path';

export const PROMPT_VERSION = 'v1';

export interface PromptOptions {
  /** When true, asks the model to assign a short category per line item. */
  categorizeItems?: boolean;
}

// Built dynamically rather than a single fixed string, so the schema/instructions
// can grow (e.g. item categorization) without duplicating the whole prompt.
function buildExtractionPrompt(instructionIntro: string, opts: PromptOptions = {}): string {
  const itemShape = opts.categorizeItems
    ? `{ "name": string, "amount": number or null, "category": string or null }`
    : `{ "name": string, "amount": number or null }`;

  const categorizeInstruction = opts.categorizeItems
    ? '\nFor each item, also assign a short category (e.g. "Grocery", "Electronics", "Pharmacy") based on what it is — use null if you genuinely can\'t tell.'
    : '';

  return `${instructionIntro}

Respond with ONLY a JSON object — no markdown fences, no explanation:
{
  "merchant": string or null,
  "invoiceNumber": string or null,
  "date": string or null,        // YYYY-MM-DD if determinable
  "currency": string or null,
  "subtotal": number or null,
  "tax": number or null,
  "discount": number or null,
  "total": number or null,
  "items": [${itemShape}]
}
${categorizeInstruction}
Use null for anything you can't confidently determine — never guess.`;
}

const TEXT_INTRO = `You are given OCR text extracted from a purchase receipt. The OCR may contain
mistakes (misread digits, garbled characters, merged words). Correct obvious
OCR errors and validate that the totals make sense (subtotal - discount + tax
≈ total) where those fields are present. Ignore headers, advertisements, and
legal/disclaimer text.`;

// Used only if AI_ROUTER_SUPPORTS_IMAGE is ever enabled — see the ⚠️ note on
// extractFromImage below.
const IMAGE_INTRO = fs.readFileSync(
  path.join(__dirname, "../../resources/bill_prompt.md"),
  "utf8"
);

// const IMAGE_INTRO = "sadsadsaada";


// const promptPath = path.join(__dirname, "../../resources/bill_prompt.md");

// console.log(promptPath);
// console.log(existsSync(promptPath));

export interface LlmFields {
  merchant: string | null;
  invoiceNumber: string | null;
  date: string | null;
  currency: string | null;
  subtotal: number | null;
  tax: number | null;
  discount: number | null;
  total: number | null;
  category:string | null;
  items: { name: string; amount: number | null; category?: string | null }[];
}

interface RouterResponse {
  model: string;
  label: string;
  response: string;
  tokensUsed: number;
}

function stripFences(text: string): string {
  return text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
}

function parseLlmJson(text: string): LlmFields {
  let parsed: any;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch {
    throw new Error('LLM fallback returned unparseable output.');
  }
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    merchant: str(parsed.merchant),
    invoiceNumber: str(parsed.invoiceNumber),
    date: str(parsed.date),
    currency: str(parsed.currency),
    subtotal: num(parsed.subtotal),
    tax: num(parsed.tax),
    discount: num(parsed.discount),
    total: num(parsed.total),
    category:str(parsed.category),
    items: Array.isArray(parsed.items)
      ? parsed.items
          .filter((it: any) => it && typeof it.name === 'string')
          .map((it: any) => ({ name: it.name.trim(), amount: num(it.amount), category: str(it.category) }))
      : [],
  };
}

export class LlmFallbackRepository {
  // Routine fallback path — cleaned OCR text only, never an image. The router
  // service picks its own underlying model; we just log which one it used,
  // for the "measure LLM usage" tracking the skill asks for
  async extractFromImage(
    buffer: Buffer,
    mimeType: string,
    opts: PromptOptions = {}
  ): Promise<LlmFields> {
    const prompt = IMAGE_INTRO;
    console.log(prompt);
  
    const res = await fetch(config.aiRouterUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image: {
          mimeType,
          base64: buffer.toString("base64"),
        },
      }),
    });
  
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(
        `AI router returned HTTP ${res.status}${
          errBody ? `: ${errBody.slice(0, 300)}` : ""
        }`
      );
    }
  
    const json = (await res.json()) as RouterResponse;
  
    if (!json.response) {
      throw new Error("AI router returned no content.");
    }
  
    console.log(
      `[ocr] image extraction via ${json.model} (${json.label}) - ${json.tokensUsed} tokens`
    );
    console.log(json.response);
    return parseLlmJson(json.response);
  }
}