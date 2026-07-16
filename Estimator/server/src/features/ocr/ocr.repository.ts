import { config } from '../../core/config';
import type { OcrResult } from '../../types/constant_type';

const EXTRACTION_PROMPT = `You are extracting structured data from a photo of a purchase receipt or bill.
Respond with ONLY a JSON object — no markdown code fences, no explanation — matching exactly this shape:

{
  "merchant": string or null,      // the business/store name
  "amount": number or null,        // the final total amount paid, as a plain number (no currency symbol, no commas)
  "currency": string or null,      // the currency you see, e.g. "INR", "USD", or a symbol like "₹"
  "date": string or null,          // date on the receipt as YYYY-MM-DD if legible, else null
  "description": string or null    // a short summary (under 12 words) of what was purchased, e.g. "groceries and vegetables"
}

If the image is not a receipt/bill, or you can't confidently read a field, use null for that field. Never guess a value you can't actually see.`;

// Talks to Gemini's generateContent REST API — the "repository" here is an
// external HTTP service instead of JsonStore, but plays the same layering
// role: the only place that knows about the third-party API shape.
export class OcrRepository {
  async extractReceiptData(buffer: Buffer, mimeType: string): Promise<OcrResult> {
    if (!config.geminiApiKey) {
      throw new Error('Receipt scanning is not configured — GEMINI_API_KEY is missing on the server.');
    }

    const url = `${config.geminiApiUrl}/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`;
    const body = {
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: buffer.toString('base64') } },
          { text: EXTRACTION_PROMPT },
        ],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Gemini returned HTTP ${res.status}${errBody ? `: ${errBody.slice(0, 300)}` : ''}`);
    }

    const json: any = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned no content for this image.');
    }

    return this.parseModelJson(text);
  }

  // responseMimeType: 'application/json' should already prevent markdown
  // fences, but this strips them defensively in case that's ever ignored —
  // a model returning ```json ... ``` is a known, common failure mode.
  private parseModelJson(text: string): OcrResult {
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Couldn't understand that receipt — try a clearer photo.");
    }

    const amount = typeof parsed.amount === 'number' && Number.isFinite(parsed.amount) && parsed.amount > 0
      ? parsed.amount
      : null;

    return {
      merchant: typeof parsed.merchant === 'string' && parsed.merchant.trim() ? parsed.merchant.trim() : null,
      amount,
      currency: typeof parsed.currency === 'string' && parsed.currency.trim() ? parsed.currency.trim() : null,
      date: typeof parsed.date === 'string' && parsed.date.trim() ? parsed.date.trim() : null,
      description: typeof parsed.description === 'string' && parsed.description.trim() ? parsed.description.trim() : null,
    };
  }
}